import { Request, Response, NextFunction } from 'express';
import { pool, query } from '../config/database';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import ticketService from '../services/ticket.service';
import fs from 'fs';
import { Multer } from 'multer';
import { supabase, uploadFile } from '../utils/supabase';
import path from 'path';
import slaService from '../services/sla.service';
import { isPendingStatus, isInProgressStatus, logStatusChange } from '../utils/ticketUtils';
import { Ticket } from '../models/Ticket';
import { idToString, idToNumber } from '../utils/idUtils';
import slaApplicationService from '../services/slaApplicationService';

// Initialize Supabase client for direct operations
const bucketName = process.env.SUPABASE_BUCKET || 'ticket-attachments';

/**
 * Get all tickets with pagination, filtering, and sorting
 */
export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      priority,
      assignee,
      requester,
      department,
      search: searchTerm,
      tags,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as { [key: string]: string | undefined };

    // Apply user role-based filters
    let requesterId = requester;
    let assigneeId = assignee;

    if (req.user.role === 'customer') {
      // Customers can only see their own tickets
      requesterId = idToString(req.user.id);
    } else if (req.user.role === 'agent' && !assigneeId) {
      // Agents default to seeing their assigned tickets
      assigneeId = idToString(req.user.id);
    }

    // Use the ticket service to get paginated tickets with caching
    const result = await ticketService.getTickets({
      page: parseInt(page),
      limit: parseInt(limit),
      searchTerm,
      status: status as string | string[],
      priority: priority as string | string[],
      assigneeId,
      requesterId,
      departmentId: department,
      tags: tags as string | string[],
      dateFrom,
      dateTo,
      sortBy,
      sortDirection: (sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    });

    res.status(200).json({
      status: 'success',
      data: {
        tickets: result.tickets,
        pagination: result.pagination
      },
    });
  } catch (error) {
    logger.error('[getTickets] Error:', error);
    next(error);
  }
};

/**
 * Get a single ticket by ID
 */
export const getTicketById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Use the ticket service to get ticket by ID with caching
    const ticket = await ticketService.getTicketById(id);

    // Check if user has access to this ticket
    const ticketOrgId = ticket.organization?.id ? idToNumber(ticket.organization.id) : null;
    const userOrgId = idToNumber(req.user.organizationId);
    if (req.user.role !== 'admin' &&
      ticketOrgId && userOrgId &&
      ticketOrgId !== userOrgId) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }

    // Customers can only view their own tickets
    const requesterId = ticket.requester?.id ? idToNumber(ticket.requester.id) : null;
    const userId = idToNumber(req.user.id) || 0;
    if (req.user.role === 'customer' &&
      requesterId && userId &&
      requesterId !== userId) {
      throw new AppError('You can only view tickets you created', 403);
    }

    // Invalidate cache and fetch fresh data if needed
    const refresh = req.query.refresh;
    const shouldRefreshData = refresh === 'true';
    if (shouldRefreshData) {
      ticketService.invalidateTicketCache(id);
      return getTicketById(req, res, next);
    }

    res.status(200).json({
      status: 'success',
      data: { ticket }
    });
  } catch (error) {
    logger.error('[getTicketById] Error:', error);
    next(error);
  }
};

/**
 * Create a new ticket
 */
export const createTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info('[CreateTicket] Received request', { body: req.body, fileCount: req.files ? (req.files as any[]).length : 0 });

  try {
    const {
      subject,
      description,
      requesterId,
      assigneeId,
      departmentId,
      priorityId,
      typeId,
      dueDate,
      tags,
      source,
    } = req.body;

    // Revert back to Express.Multer.File
    const files = req.files as Express.Multer.File[];

    const actualRequesterId = requesterId || idToString(req.user.id);
    const statusResult = await query(
      'SELECT id FROM ticket_statuses WHERE is_default = true AND organization_id = $1 LIMIT 1',
      [idToString(req.user.organizationId) || null]
    );

    if (statusResult.rows.length === 0) {
      throw new AppError('Default ticket status not found', 500);
    }
    const statusId = statusResult.rows[0].id;

    const client = await pool.connect();
    let newTicketId: number;

    try {
      await client.query('BEGIN');

      // Process description with AI for sentiment analysis and summary
      let sentimentScore = null;
      let aiSummary = null;

      if (process.env.OPENAI_API_KEY) {
        try {
          // OpenAI is no longer used
          // Just set default values for sentiment and summary
          sentimentScore = 0;

          // Generate summary for long descriptions
          if (description.length > 100) {
            aiSummary = "AI summary not available";
          }
        } catch (error) {
          // Log AI error but continue with ticket creation
          logger.error('Error processing ticket with AI', error);
        }
      }

      // Create ticket
      const ticketResult = await client.query(
        `INSERT INTO tickets (
          subject,
          description,
          requester_id,
          assignee_id,
          department_id,
          priority_id,
          status_id,
          type_id,
          organization_id,
          due_date,
          sentiment_score,
          ai_summary,
          source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, due_date`,
        [
          subject,
          description,
          actualRequesterId,
          assigneeId || null,
          departmentId || null,
          priorityId || null,
          statusId,
          typeId || null,
          idToString(req.user.organizationId) || null,
          dueDate || null, // Due date will be set by the trigger
          sentimentScore,
          aiSummary,
          source || 'web',
        ]
      );

      newTicketId = ticketResult.rows[0].id;

      // --- Handle Tags --- 
      const tagIds: number[] = [];
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const organizationId = idToString(req.user.organizationId) || null;
        if (!organizationId) {
          logger.warn(`Organization ID missing for user ${actualRequesterId}, cannot process tags for ticket ${newTicketId}`);
        } else {
          for (const tagNameOrId of tags) {
            if (typeof tagNameOrId === 'number') {
              tagIds.push(tagNameOrId);
            } else if (typeof tagNameOrId === 'string' && /^[1-9]\d*$/.test(tagNameOrId)) {
              tagIds.push(parseInt(tagNameOrId, 10));
            } else if (typeof tagNameOrId === 'string' && tagNameOrId.trim()) {
              const sanitizedTagName = tagNameOrId.trim().toLowerCase();
              try {
                let tagResult = await client.query(
                  'SELECT id FROM tags WHERE LOWER(name) = $1 AND organization_id = $2',
                  [sanitizedTagName, organizationId]
                );

                let currentTagId: number;
                if (tagResult.rows.length > 0) {
                  currentTagId = tagResult.rows[0].id;
                } else {
                  const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
                  const newTagResult = await client.query(
                    'INSERT INTO tags (name, color, organization_id) VALUES ($1, $2, $3) RETURNING id',
                    [sanitizedTagName, randomColor, organizationId]
                  );
                  currentTagId = newTagResult.rows[0].id;
                  logger.info(`Created new tag '${sanitizedTagName}' with ID ${currentTagId} for org ${organizationId}`);
                }
                tagIds.push(currentTagId);
              } catch (tagError) {
                logger.error(`Error processing tag '${sanitizedTagName}' for ticket ${newTicketId}:`, tagError);
              }
            } else {
              logger.warn(`Invalid tag format received: ${tagNameOrId}`);
            }
          }
        }
      }

      // Insert into ticket_tags using the found/created tag IDs
      if (tagIds.length > 0) {
        const tagValuesPlaceholders = tagIds.map((_, index) => `($1, $${index + 2})`).join(',');
        const ticketTagQuery = `INSERT INTO ticket_tags (ticket_id, tag_id) VALUES ${tagValuesPlaceholders}`;
        await client.query(ticketTagQuery, [newTicketId, ...tagIds]);
      }
      // --- End Handle Tags --- 

      // --- Handle Attachments --- 
      if (files && files.length > 0) {
        const attachmentValues: any[] = [];
        const attachmentPlaceholders = [];

        // Upload files to Supabase storage and get URLs
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            // Upload to Supabase and get public URL
            const publicUrl = await uploadFile(file, 'tickets', newTicketId);

            // Add to values for DB insert
            attachmentValues.push(
              newTicketId, // ticket_id
              null, // comment_id (null for ticket-level attachments)
              file.originalname, // file_name
              publicUrl, // file_path (now a Supabase URL)
              file.mimetype, // file_type
              file.size, // file_size
              actualRequesterId // uploaded_by
            );

            // Create placeholder for this file
            const paramIndex = i * 7; // 7 params per file
            attachmentPlaceholders.push(
              `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
            );
          } catch (uploadError) {
            logger.error(`[CreateTicket] Error uploading file to Supabase:`, uploadError);
            throw new AppError('File upload failed', 500);
          }
        }

        const attachmentQuery = `
          INSERT INTO ticket_attachments (
            ticket_id, comment_id, file_name, file_path, 
            file_type, file_size, uploaded_by
          ) VALUES ${attachmentPlaceholders.join(',')}
        `;

        logger.info(`[CreateTicket] Attempting to insert ${files.length} attachments for ticket ${newTicketId}`);
        try {
          await client.query(attachmentQuery, attachmentValues);
          logger.info(`[CreateTicket] Successfully inserted attachments for ticket ${newTicketId}`);
          logger.info(`Added ${files.length} attachments for ticket ${newTicketId}`);
        } catch (dbError) {
          logger.error(`[CreateTicket] Database error inserting attachments for ticket ${newTicketId}:`, dbError);
          // Re-throw the error to trigger the main catch block for rollback/cleanup
          throw dbError;
        }
      }
      // --- End Handle Attachments ---

      // Add system comment for ticket creation
      await client.query(
        `INSERT INTO ticket_comments (
          ticket_id,
          user_id,
          content,
          is_internal,
          is_system
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          newTicketId,
          req.user.id,
          'Ticket created',
          false,
          true,
        ]
      );

      // Add ticket creation to history
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id,
          user_id,
          field_name,
          new_value
        ) VALUES ($1, $2, $3, $4)`,
        [
          newTicketId,
          req.user.id,
          'status',
          'created',
        ]
      );

      // Commit transaction
      await client.query('COMMIT');

      // After transaction is committed, create SLA policy tickets record
      if (priorityId) {
        try {
          // Check if SLA policy ticket already exists
          const existingSlaTicket = await query(
            'SELECT id FROM sla_policy_tickets WHERE ticket_id = $1',
            [newTicketId]
          );

          // Only proceed if no SLA policy ticket exists
          if (existingSlaTicket.rows.length === 0) {
            // Get or create SLA policy
            const slaPolicyResult = await query(
              `SELECT id FROM sla_policies 
               WHERE organization_id = $1 AND ticket_priority_id = $2`,
              [idToString(req.user.organizationId) || null, priorityId]
            );

            let slaPolicyId: number | null = null;

            if (slaPolicyResult.rows.length === 0) {
              // Create a new SLA policy
              const priorityResult = await query(
                'SELECT name, sla_hours FROM ticket_priorities WHERE id = $1',
                [priorityId]
              );

              if (priorityResult.rows.length > 0) {
                const priority = priorityResult.rows[0];
                const slaHours = priority.sla_hours;

                const newPolicyResult = await query(
                  `INSERT INTO sla_policies (
                    name,
                    description,
                    organization_id,
                    ticket_priority_id,
                    first_response_hours,
                    next_response_hours,
                    resolution_hours,
                    business_hours_only
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                  RETURNING id`,
                  [
                    `${priority.name} Priority SLA`,
                    `Default SLA policy for ${priority.name} priority tickets`,
                    idToString(req.user.organizationId) || null,
                    priorityId,
                    Math.max(1, Math.floor(slaHours / 4)),
                    Math.max(2, Math.floor(slaHours / 2)),
                    slaHours,
                    true
                  ]
                );

                slaPolicyId = newPolicyResult.rows[0].id;
              }
            } else {
              slaPolicyId = slaPolicyResult.rows[0].id;
            }

            if (slaPolicyId) {
              // Get policy details
              const policyResult = await query(
                'SELECT * FROM sla_policies WHERE id = $1',
                [slaPolicyId]
              );

              if (policyResult.rows.length > 0) {
                const policy = policyResult.rows[0];
                const createdAt = new Date();

                // Calculate due dates
                const firstResponseDue = new Date(createdAt.getTime() + policy.first_response_hours * 60 * 60 * 1000);
                const nextResponseDue = new Date(createdAt.getTime() + policy.next_response_hours * 60 * 60 * 1000);
                const resolutionDue = new Date(createdAt.getTime() + policy.resolution_hours * 60 * 60 * 1000);

                // Create metadata
                const metadata = {
                  ticket_id: newTicketId,
                  subject,
                  priority_id: priorityId,
                  type_id: typeId,
                  department_id: departmentId,
                  requester_id: actualRequesterId,
                  assignee_id: assigneeId,
                  created_at: createdAt,
                  sla_policy: {
                    id: policy.id,
                    name: policy.name,
                    first_response_hours: policy.first_response_hours,
                    next_response_hours: policy.next_response_hours,
                    resolution_hours: policy.resolution_hours,
                    business_hours_only: policy.business_hours_only
                  },
                  pausePeriods: [],
                  totalPausedTime: 0
                };

                // Create SLA policy ticket
                await query(
                  `INSERT INTO sla_policy_tickets (
                    ticket_id,
                    sla_policy_id,
                    first_response_due_at,
                    next_response_due_at,
                    resolution_due_at,
                    first_response_met,
                    next_response_met,
                    resolution_met,
                    metadata
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                  [
                    newTicketId,
                    slaPolicyId,
                    firstResponseDue,
                    nextResponseDue,
                    resolutionDue,
                    false,
                    false,
                    false,
                    JSON.stringify(metadata)
                  ]
                );

                // Update ticket with SLA status if not already set by trigger
                const ticketResult = await query(
                  'SELECT due_date FROM tickets WHERE id = $1',
                  [newTicketId]
                );

                if (!ticketResult.rows[0].due_date) {
                  await query(
                    'UPDATE tickets SET sla_status = $1, due_date = $2 WHERE id = $3',
                    ['active', resolutionDue, newTicketId]
                  );
                }
              }
            }
          } else {
            logger.info(`SLA policy ticket already exists for ticket ${newTicketId}, skipping creation`);
          }
        } catch (slaError) {
          // Log SLA error but don't fail the request
          logger.error('Error creating SLA policy ticket:', slaError);
        }
      }

      // Return created ticket ID
      res.status(201).json({
        status: 'success',
        data: {
          id: newTicketId,
          message: 'Ticket created successfully',
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      // When using memory storage, there are no files to clean up
      // (files are stored in memory as buffers, not on disk)
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update a ticket
 */
export const updateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get current ticket data before update
    const currentTicket = await ticketService.getTicketById(id);
    if (!currentTicket) {
      throw new AppError('Ticket not found', 404);
    }

    // Check permissions
    if (req.user.role !== 'admin' && currentTicket.organization?.id !== idToString(req.user.organizationId)) {
      throw new AppError('You do not have permission to update this ticket', 403);
    }

    // Update the ticket using the service
    const updatedTicket = await ticketService.updateTicket(Number(id), updateData);

    // Handle SLA logic in application layer instead of database triggers
    let slaResult = null;

    // Handle status change
    if (updateData.statusId && currentTicket.status?.id !== updateData.statusId) {
      slaResult = await slaApplicationService.handleStatusChange(
        Number(id),
        Number(currentTicket.status?.id),
        updateData.statusId
      );
    }

    // Handle priority change
    if (updateData.priorityId && currentTicket.priority?.id !== updateData.priorityId) {
      const priorityResult = await slaApplicationService.handlePriorityChange(
        Number(id),
        Number(currentTicket.priority?.id),
        updateData.priorityId
      );

      // If status change didn't trigger SLA action, use priority result
      if (!slaResult || slaResult.action === 'none') {
        slaResult = priorityResult;
      }
    }

    // Invalidate cache
    ticketService.invalidateTicketCache(id);

    // Prepare response
    const response: any = {
      status: 'success',
      data: { ticket: updatedTicket }
    };

    // Add SLA information to response if there was an SLA action
    if (slaResult && slaResult.action !== 'none') {
      response.slaAction = {
        action: slaResult.action,
        message: slaResult.message
      };
    }

    res.status(200).json(response);
  } catch (error) {
    logger.error('[updateTicket] Error:', error);
    next(error);
  }
};

/**
 * Add a comment to a ticket
 */
export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { content, isInternal = false } = req.body;

    // Check if ticket exists and user has access
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = ticketResult.rows[0];

    // Check permissions
    if (req.user.role !== 'admin' && ticket.organization_id !== idToString(req.user.organizationId)) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }

    // Customers can only add comments to their own tickets
    if (
      req.user.role === 'customer' &&
      ticket.requester_id !== idToString(req.user.id)
    ) {
      throw new AppError('You can only add comments to tickets you created', 403);
    }

    // Customers cannot add internal comments
    if (req.user.role === 'customer' && isInternal) {
      throw new AppError('Customers cannot add internal comments', 403);
    }

    // Process sentiment if AI is enabled
    let sentimentScore = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        // OpenAI is no longer used
        // Set default sentiment score
        sentimentScore = 0;
      } catch (error) {
        logger.error('Error analyzing sentiment for comment', error);
      }
    }

    // Add the comment
    await query(
      `INSERT INTO ticket_comments (
        ticket_id,
        user_id,
        content,
        is_internal,
        sentiment_score
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at`,
      [
        id,
        idToString(req.user.id),
        content,
        isInternal,
        sentimentScore,
      ]
    );

    // Update ticket updated_at timestamp
    await query(
      'UPDATE tickets SET updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.status(201).json({
      status: 'success',
      data: {
        message: 'Comment added successfully.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a ticket
 */
export const deleteTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if ticket exists
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = ticketResult.rows[0];

    // Only admin or agent from same organization can delete tickets
    if (
      req.user.role !== 'admin' &&
      (ticket.organization_id !== idToString(req.user.organizationId) || req.user.role !== 'agent')
    ) {
      throw new AppError('You do not have permission to delete this ticket', 403);
    }

    // Delete ticket (PostgreSQL cascades to comments, history, etc.)
    await query('DELETE FROM tickets WHERE id = $1', [id]);

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// --- Add Controller functions for fetching options --- 

export const getAllDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const departments = await ticketService.getDepartments(idToString(req.user.organizationId) || null);
    res.status(200).json({ status: 'success', data: { departments } });
  } catch (error) {
    next(error);
  }
};

export const getAllPriorities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const priorities = await ticketService.getPriorities(idToString(req.user.organizationId) || null);
    res.status(200).json({ status: 'success', data: { priorities } });
  } catch (error) {
    next(error);
  }
};

export const getAllTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ticketTypes = await ticketService.getTypes(idToString(req.user.organizationId) || null);
    res.status(200).json({ status: 'success', data: { ticketTypes } });
  } catch (error) {
    next(error);
  }
};

export const getAllStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statuses = await ticketService.getStatuses(idToString(req.user.organizationId) || null);
    res.status(200).json({ status: 'success', data: { statuses } });
  } catch (error) {
    next(error);
  }
};

// --- End Controller functions for fetching options --- 

/**
 * Upload attachments to a ticket
 */
export const uploadTicketAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded',
      });
    }

    // Check if ticket exists
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = ticketResult.rows[0];

    // Check if user has access to this ticket
    if (req.user.role !== 'admin' && ticket.organization_id !== idToString(req.user.organizationId)) {
      throw new AppError('You do not have permission to upload attachments to this ticket', 403);
    }

    // Customers can only add attachments to their own tickets
    if (
      req.user.role === 'customer' &&
      ticket.requester_id !== idToString(req.user.id)
    ) {
      throw new AppError('You can only add attachments to tickets you created', 403);
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const attachments = [];

      // Process each file
      for (const file of files) {
        try {
          // Upload to Supabase Storage
          const fileName = `${id}/${uuidv4()}${path.extname(file.originalname)}`;

          // Upload to Supabase using the helper or direct client
          let publicUrl: string;

          if (typeof uploadFile === 'function') {
            // Use the existing helper function if available
            publicUrl = await uploadFile(file, 'tickets', parseInt(id));
          } else {
            // Upload directly with supabaseClient
            if (!supabase) {
              logger.error('Supabase client is not initialized');
              throw new AppError('Storage service not available', 500);
            }

            const { data, error } = await supabase.storage
              .from(bucketName)
              .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
              });

            if (error) {
              logger.error('Supabase upload error:', error);
              throw new AppError('Failed to upload file to storage', 500);
            }

            // Get the public URL
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(fileName);

            publicUrl = urlData.publicUrl;
          }

          // Save attachment record in database
          const result = await client.query(
            `INSERT INTO ticket_attachments 
             (ticket_id, file_name, file_path, file_type, file_size, uploaded_by) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, created_at`,
            [
              id,
              file.originalname,
              fileName, // Store the path in Supabase
              file.mimetype,
              file.size,
              idToString(req.user.id)
            ]
          );

          const attachment = {
            id: result.rows[0].id,
            originalName: file.originalname,
            filePath: publicUrl,
            mimeType: file.mimetype,
            size: file.size,
            createdAt: result.rows[0].created_at
          };

          attachments.push(attachment);

          // Add to ticket history
          await client.query(
            `INSERT INTO ticket_history 
             (ticket_id, user_id, field_name, new_value) 
             VALUES ($1, $2, $3, $4)`,
            [id, idToString(req.user.id), 'attachment_added', file.originalname]
          );
        } catch (fileError) {
          logger.error(`Error processing file ${file.originalname}:`, fileError);
          throw fileError; // Re-throw to trigger rollback
        }
      }

      // Update ticket's last activity timestamp
      await client.query(
        'UPDATE tickets SET updated_at = NOW() WHERE id = $1',
        [id]
      );

      // Commit transaction
      await client.query('COMMIT');

      res.status(201).json({
        status: 'success',
        data: {
          message: 'Attachments uploaded successfully',
          attachments,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Download an attachment
 */
export const downloadTicketAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { attachmentId } = req.params;

    // Get attachment details
    const attachmentResult = await query(
      `SELECT ta.*, t.organization_id, t.requester_id
       FROM ticket_attachments ta
       JOIN tickets t ON ta.ticket_id = t.id
       WHERE ta.id = $1`,
      [attachmentId]
    );

    if (attachmentResult.rows.length === 0) {
      throw new AppError('Attachment not found', 404);
    }

    const attachment = attachmentResult.rows[0];

    // Check if user has access to this attachment
    if (
      req.user.role !== 'admin' &&
      attachment.organization_id !== idToString(req.user.organizationId)
    ) {
      throw new AppError('You do not have permission to download this attachment', 403);
    }

    // Customers can only download attachments from their own tickets
    if (
      req.user.role === 'customer' &&
      attachment.requester_id !== idToString(req.user.id)
    ) {
      throw new AppError('You can only download attachments from tickets you created', 403);
    }

    try {
      // Generate signed URL from Supabase
      if (!supabase) {
        logger.error('Supabase client is not initialized');
        throw new AppError('Storage service not available', 500);
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(attachment.file_path, 300); // URL valid for 5 minutes

      if (error) {
        logger.error('Error generating signed URL:', error);
        throw new AppError('Failed to generate download URL', 500);
      }

      if (!data || !data.signedUrl) {
        throw new AppError('Failed to generate download URL', 500);
      }

      // Return the signed URL to the client instead of redirecting
      // This allows the frontend to handle the download
      return res.status(200).json({
        status: 'success',
        data: {
          downloadUrl: data.signedUrl,
          filename: attachment.file_name
        }
      });
    } catch (supabaseError) {
      logger.error('Supabase error:', supabaseError);

      // Fallback - try to get a public URL if file is public
      try {
        if (!supabase) {
          logger.error('Supabase client is not initialized');
          throw new AppError('Storage service not available', 500);
        }

        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(attachment.file_path);

        if (data && data.publicUrl) {
          return res.status(200).json({
            status: 'success',
            data: {
              downloadUrl: data.publicUrl,
              filename: attachment.file_name
            }
          });
        } else {
          throw new AppError('Failed to generate download URL', 500);
        }
      } catch (fallbackError) {
        logger.error('Public URL fallback error:', fallbackError);
        throw new AppError('Failed to generate download URL', 500);
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket history
 */
export const getTicketHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if ticket exists
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = ticketResult.rows[0];

    // Check if user has access to this ticket
    if (req.user.role !== 'admin' && ticket.organization_id !== idToString(req.user.organizationId)) {
      throw new AppError('You do not have permission to view this ticket history', 403);
    }

    // Customers can only view history of their own tickets
    if (
      req.user.role === 'customer' &&
      ticket.requester_id !== idToString(req.user.id)
    ) {
      throw new AppError('You can only view history of tickets you created', 403);
    }

    // Get ticket history
    const historyResult = await query(
      `SELECT th.*,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.avatar_url
       FROM ticket_history th
       LEFT JOIN users u ON th.user_id = u.id
       WHERE th.ticket_id = $1
       ORDER BY th.created_at DESC`,
      [id]
    );

    // Format history data
    const history = historyResult.rows.map((row: {
      id: number;
      ticket_id: number;
      field_name: string;
      old_value: string;
      new_value: string;
      created_at: string;
      user_id?: number;
      first_name?: string;
      last_name?: string;
      email?: string;
      avatar_url?: string;
    }) => {
      return {
        id: row.id,
        ticketId: row.ticket_id,
        field_name: row.field_name,
        old_value: row.old_value,
        new_value: row.new_value,
        created_at: row.created_at,
        user: row.user_id ? {
          id: row.user_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          avatar: row.avatar_url
        } : null
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enhanced version of addComment to properly support the frontend
 */
export const addTicketComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { content, isInternal = false } = req.body;

    // Check if ticket exists
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = ticketResult.rows[0];

    // Check permissions
    if (req.user.role !== 'admin' && ticket.organization_id !== idToString(req.user.organizationId)) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }

    // Customers can only add comments to their own tickets
    if (
      req.user.role === 'customer' &&
      ticket.requester_id !== idToString(req.user.id)
    ) {
      throw new AppError('You can only add comments to tickets you created', 403);
    }

    // Customers cannot add internal comments
    if (req.user.role === 'customer' && isInternal) {
      throw new AppError('Customers cannot add internal comments', 403);
    }

    // Process sentiment if AI is enabled (placeholder for future implementation)
    let sentimentScore = null;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Add the comment
      const commentResult = await client.query(
        `INSERT INTO ticket_comments (
          ticket_id,
          user_id,
          content,
          is_internal,
          sentiment_score
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at`,
        [
          id,
          idToString(req.user.id),
          content,
          isInternal,
          sentimentScore,
        ]
      );

      const commentId = commentResult.rows[0].id;
      const createdAt = commentResult.rows[0].created_at;

      // Update ticket updated_at timestamp
      await client.query(
        'UPDATE tickets SET updated_at = NOW() WHERE id = $1',
        [id]
      );

      // Add to ticket history
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id,
          user_id,
          field_name,
          new_value
        ) VALUES ($1, $2, $3, $4)`,
        [
          id,
          req.user.id,
          'comment_added',
          isInternal ? 'Internal comment' : 'Public comment',
        ]
      );

      // Get user info
      const userResult = await client.query(
        `SELECT id, first_name, last_name, email, avatar_url
         FROM users
         WHERE id = $1`,
        [req.user.id]
      );

      const user = userResult.rows[0];

      // Commit transaction
      await client.query('COMMIT');

      // If user is not a customer (agent, admin, or manager), process SLA first response
      if (req.user.role !== 'customer' && !isInternal) {
        // Process SLA first response outside the transaction to avoid blocking
        try {
          const ticketId = parseInt(id, 10);
          const userId = idToNumber(req.user.id) || 0;

          // Only trigger first response for public (non-internal) comments
          await slaService.processFirstResponse(ticketId, userId);
          logger.info(`SLA first response processed for ticket #${id} by user ${req.user.id}`);

          // Immediately update SLA breach status and sla_status in the tickets table
          const ticketToUpdate = await slaService.getTicketById(ticketId);
          if (ticketToUpdate) {
            await slaService.updateTicketSLABreachStatus(ticketId);
            logger.info(`SLA status updated for ticket #${id} after first response.`);
          }
        } catch (slaError) {
          logger.error(`Error processing SLA first response or updating status for ticket #${id}:`, slaError);
          // Don't block the comment creation if SLA processing fails
        }
      }

      // Return the created comment with user info for frontend
      res.status(201).json({
        status: 'success',
        data: {
          comment: {
            id: commentId,
            content,
            createdAt,
            isInternal,
            user: {
              id: user.id,
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              avatar: user.avatar_url
            }
          }
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Update SLA for a ticket after priority change
 * This endpoint can be used to manually trigger SLA update
 */
export const updateTicketSLA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Ticket ID is required', 400);
    }

    // Get ticket
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }

    const ticket = ticketResult.rows[0];

    // Auto-assign SLA policy based on current priority
    const slaPolicyTicket = await slaService.autoAssignSLAPolicy(ticket);

    if (!slaPolicyTicket) {
      return res.status(200).json({
        status: 'warning',
        data: {
          message: 'No SLA policy found for ticket',
          ticketId: ticket.id,
          priorityId: ticket.priority_id
        }
      });
    }

    // Update the due_date in tickets table based on SLA
    await query(
      'UPDATE tickets SET due_date = $1 WHERE id = $2',
      [slaPolicyTicket.resolutionDueAt, id]
    );

    // Get updated ticket
    const updatedTicketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    res.status(200).json({
      status: 'success',
      data: {
        message: 'SLA updated successfully',
        ticket: updatedTicketResult.rows[0],
        sla: slaPolicyTicket
      }
    });
  } catch (error) {
    next(error);
  }
};