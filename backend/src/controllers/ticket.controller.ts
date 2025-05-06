import { Request, Response, NextFunction } from 'express';
import { pool, query } from '../config/database';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import ticketService from '../services/ticket.service'; // Import the ticket service
import fs from 'fs'; // Import fs for cleanup
import { Multer } from 'multer';
import { uploadFile } from '../utils/supabase';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Initialize Supabase client for direct operations
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const bucketName = process.env.SUPABASE_BUCKET || 'ticket-attachments';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

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
      page = 1,
      limit = 10,
      status,
      isOpen,
      priority,
      requester,
      assignee,
      type,
      department,
      search,
      tags,
      dateFrom,
      dateTo,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query as { [key: string]: string | undefined };

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let whereClauses: string[] = [];
    
    // Organization filter based on user role
    if (req.user.role !== 'admin') {
      params.push(req.user.organizationId);
      whereClauses.push(`t.organization_id = $${params.length}`);
      
      if (req.user.role === 'customer') {
        params.push(req.user.id);
        whereClauses.push(`t.requester_id = $${params.length}`);
      }
    }

    if (status) {
      const statusNames = (status as string).split(',').map(s => s.trim());
      if (statusNames.length > 0) {
        const statusPlaceholders = statusNames.map((_, i) => `$${params.length + i + 1}`).join(',');
        params.push(...statusNames);
        whereClauses.push(`ts.name ILIKE ANY(ARRAY[${statusPlaceholders}])`);
      }
    }
    
    if (isOpen === 'true') {
      whereClauses.push(`ts.is_resolved = FALSE`);
    }
    
    if (priority) {
      const priorityNames = (priority as string).split(',').map(p => p.trim());
      if (priorityNames.length > 0) {
        const priorityPlaceholders = priorityNames.map((_, i) => `$${params.length + i + 1}`).join(',');
        params.push(...priorityNames);
        whereClauses.push(`tp.name ILIKE ANY(ARRAY[${priorityPlaceholders}])`); 
      }
    }
    
    if (requester) {
      params.push(requester);
      whereClauses.push(`t.requester_id = $${params.length}`);
    }
    
    const assigneeFilterValue = assignee || (req.user.role === 'agent' ? req.user.id : undefined);
    if (assigneeFilterValue) {
        params.push(assigneeFilterValue);
        whereClauses.push(`t.assignee_id = $${params.length}`);
    }
    
    if (type) {
      params.push(type as string);
      whereClauses.push(`tt.name ILIKE $${params.length}`);
    }
    
    if (department) {
      params.push(department);
      whereClauses.push(`d.name ILIKE $${params.length}`);
    }
    
    if (search) {
      params.push(`%${search}%`);
      const searchParamIndex = params.length;
      whereClauses.push(`(t.subject ILIKE $${searchParamIndex} OR t.description ILIKE $${searchParamIndex} OR CAST(t.id AS TEXT) ILIKE $${searchParamIndex})`);
    }

    if (tags) {
      const tagNames = (tags as string).split(',').map(t => t.trim().toLowerCase());
      if (tagNames.length > 0) {
        const tagPlaceholders = tagNames.map((_, i) => `$${params.length + i + 1}`).join(',');
        params.push(...tagNames);
        whereClauses.push(`EXISTS (SELECT 1 FROM ticket_tags ttg JOIN tags tag ON ttg.tag_id = tag.id WHERE ttg.ticket_id = t.id AND LOWER(tag.name) = ANY(ARRAY[${tagPlaceholders}]))`);
      }
    }

    if (dateFrom) {
      params.push(dateFrom as string);
      whereClauses.push(`t.created_at >= $${params.length}`);
    }
    if (dateTo) {
      params.push(dateTo as string);
      whereClauses.push(`t.created_at <= $${params.length}`);
    }
    
    const whereClauseString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const validSortBy = ['id', 'subject', 'created_at', 'updated_at', 'due_date', 'status_name', 'priority_name'];
    const safeSortBy = validSortBy.includes(sortBy as string) ? sortBy : 'created_at';
    const safeSortOrder = (sortOrder as string).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let orderByClause = `ORDER BY t.${safeSortBy} ${safeSortOrder}`;
    if (safeSortBy === 'status_name') {
      orderByClause = `ORDER BY ts.name ${safeSortOrder}`;
    }
    if (safeSortBy === 'priority_name') {
      orderByClause = `ORDER BY tp.name ${safeSortOrder}`;
    }

    const ticketsQuery = `
      SELECT 
        t.id, 
        t.subject, 
        t.description,
        t.created_at,
        t.updated_at,
        t.resolved_at,
        t.closed_at,
        t.due_date,
        t.sentiment_score,
        t.ai_summary,
        t.source,
        t.is_spam,
        json_build_object(
          'id', req.id,
          'email', req.email,
          'firstName', req.first_name,
          'lastName', req.last_name
        ) as requester,
        CASE WHEN t.assignee_id IS NOT NULL THEN
          json_build_object(
            'id', asn.id,
            'email', asn.email,
            'firstName', asn.first_name,
            'lastName', asn.last_name
          )
        ELSE NULL END as assignee,
        json_build_object(
          'id', ts.id,
          'name', ts.name,
          'color', ts.color
        ) as status,
        CASE WHEN t.priority_id IS NOT NULL THEN
          json_build_object(
            'id', tp.id,
            'name', tp.name,
            'color', tp.color
          )
        ELSE NULL END as priority,
        CASE WHEN t.department_id IS NOT NULL THEN
          json_build_object(
            'id', d.id,
            'name', d.name
          )
        ELSE NULL END as department,
        CASE WHEN t.type_id IS NOT NULL THEN
          json_build_object(
            'id', tt.id,
            'name', tt.name
          )
        ELSE NULL END as type,
        (SELECT json_agg(json_build_object(
          'id', tag.id,
          'name', tag.name,
          'color', tag.color
        )) FROM ticket_tags ttg
        JOIN tags tag ON ttg.tag_id = tag.id
        WHERE ttg.ticket_id = t.id) as tags,
        (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.ticket_id = t.id) as comment_count
      FROM tickets t
      JOIN users req ON t.requester_id = req.id
      LEFT JOIN users asn ON t.assignee_id = asn.id
      JOIN ticket_statuses ts ON t.status_id = ts.id
      LEFT JOIN ticket_priorities tp ON t.priority_id = tp.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN ticket_types tt ON t.type_id = tt.id
      ${whereClauseString}
      ${orderByClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const queryParamsForTickets = [...params, Number(limit), offset];
    
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) FROM tickets t
      JOIN users req ON t.requester_id = req.id
      LEFT JOIN users asn ON t.assignee_id = asn.id
      JOIN ticket_statuses ts ON t.status_id = ts.id
      LEFT JOIN ticket_priorities tp ON t.priority_id = tp.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN ticket_types tt ON t.type_id = tt.id
      ${whereClauseString}
    `;
    
    const queryParamsForCount = params; // No limit/offset for count
        
    logger.debug('[getTickets] Tickets Query:', ticketsQuery);
    logger.debug('[getTickets] Tickets Params:', JSON.stringify(queryParamsForTickets));
    logger.debug('[getTickets] Count Query:', countQuery);
    logger.debug('[getTickets] Count Params:', JSON.stringify(queryParamsForCount));

    const [ticketsResult, countResult] = await Promise.all([
      pool.query(ticketsQuery, queryParamsForTickets),
      pool.query(countQuery, queryParamsForCount)
    ]);
    
    const tickets = ticketsResult.rows;
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / Number(limit));
    
    // Map to ensure frontend gets consistent field names (e.g., priority.name, status.name)
    const formattedTickets = tickets.map(ticket => ({
      ...ticket,
      id: ticket.id.toString(), // Ensure ID is string
      status: ticket.status?.name, // Extract name for frontend
      priority: ticket.priority?.name, // Extract name for frontend
      tags: ticket.tags || [], // Ensure tags is an array
      requester: ticket.requester,
      assignee: ticket.assignee,
      department: ticket.department,
      type: ticket.type,
      comment_count: parseInt(ticket.comment_count || '0', 10),
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      due_date: ticket.due_date,
      subject: ticket.subject,
      description: ticket.description,
      resolved_at: ticket.resolved_at,
      closed_at: ticket.closed_at,
      sentiment_score: ticket.sentiment_score,
      ai_summary: ticket.ai_summary,
      source: ticket.source,
      is_spam: ticket.is_spam
    })); 

    res.status(200).json({
      status: 'success',
      data: {
        tickets: formattedTickets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages,
        },
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
) => {
  try {
    const { id } = req.params;
    
    // Get ticket details
    const ticketQuery = `
      SELECT 
        t.id, 
        t.subject, 
        t.description,
        t.created_at,
        t.updated_at,
        t.resolved_at,
        t.closed_at,
        t.due_date,
        t.sentiment_score,
        t.ai_summary,
        t.source,
        t.is_spam,
        json_build_object(
          'id', req.id,
          'email', req.email,
          'firstName', req.first_name,
          'lastName', req.last_name
        ) as requester,
        CASE WHEN t.assignee_id IS NOT NULL THEN
          json_build_object(
            'id', asn.id,
            'email', asn.email,
            'firstName', asn.first_name,
            'lastName', asn.last_name
          )
        ELSE NULL END as assignee,
        json_build_object(
          'id', ts.id,
          'name', ts.name,
          'color', ts.color
        ) as status,
        CASE WHEN t.priority_id IS NOT NULL THEN
          json_build_object(
            'id', tp.id,
            'name', tp.name,
            'color', tp.color
          )
        ELSE NULL END as priority,
        CASE WHEN t.department_id IS NOT NULL THEN
          json_build_object(
            'id', d.id,
            'name', d.name
          )
        ELSE NULL END as department,
        CASE WHEN t.type_id IS NOT NULL THEN
          json_build_object(
            'id', tt.id,
            'name', tt.name
          )
        ELSE NULL END as type,
        (SELECT json_agg(json_build_object(
          'id', tag.id,
          'name', tag.name,
          'color', tag.color
        )) FROM ticket_tags ttg
        JOIN tags tag ON ttg.tag_id = tag.id
        WHERE ttg.ticket_id = t.id) as tags,
        t.organization_id
      FROM tickets t
      JOIN users req ON t.requester_id = req.id
      LEFT JOIN users asn ON t.assignee_id = asn.id
      JOIN ticket_statuses ts ON t.status_id = ts.id
      LEFT JOIN ticket_priorities tp ON t.priority_id = tp.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN ticket_types tt ON t.type_id = tt.id
      WHERE t.id = $1
    `;
    
    const ticketResult = await query(ticketQuery, [id]);
    
    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }
    
    const ticket = ticketResult.rows[0];
    
    // Check if user has access to this ticket
    if (req.user.role !== 'admin' && ticket.organization_id !== req.user.organizationId) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }
    
    // Get comments
    const commentsQuery = `
      SELECT 
        tc.id,
        tc.content,
        tc.is_internal,
        tc.is_system,
        tc.sentiment_score,
        tc.created_at,
        tc.updated_at,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'avatar', u.avatar_url
        ) as user,
        (SELECT json_agg(json_build_object(
          'id', ta.id,
          'fileName', ta.file_name,
          'filePath', ta.file_path,
          'fileType', ta.file_type,
          'fileSize', ta.file_size
        )) FROM ticket_attachments ta
        WHERE ta.comment_id = tc.id) as attachments
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    
    // Get ticket history
    const historyQuery = `
      SELECT 
        th.id,
        th.field_name,
        th.old_value,
        th.new_value,
        th.created_at,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'firstName', u.first_name,
          'lastName', u.last_name
        ) as user
      FROM ticket_history th
      LEFT JOIN users u ON th.user_id = u.id
      WHERE th.ticket_id = $1
      ORDER BY th.created_at DESC
    `;
    
    // Get ticket-level attachments (comment_id is NULL)
    const attachmentsQuery = `
      SELECT 
        id,
        file_name as "originalName", -- Match frontend expectation
        file_path as "filePath",
        file_type as "mimeType",
        file_size as "size",
        created_at as "createdAt"
      FROM ticket_attachments
      WHERE ticket_id = $1 AND comment_id IS NULL
      ORDER BY created_at ASC
    `;
    
    // Execute parallel queries
    const [commentsResult, historyResult, attachmentsResult] = await Promise.all([
      query(commentsQuery, [id]),
      query(historyQuery, [id]),
      query(attachmentsQuery, [id]) // Fetch attachments
    ]);

    const comments = commentsResult.rows;
    const history = historyResult.rows;
    const attachments = attachmentsResult.rows;
    
    // Return ticket with comments, history, and attachments
    res.status(200).json({
      status: 'success',
      data: {
        ticket: {
          ...ticket,
          comments,
          history,
          attachments, // Include attachments in the response
        },
      },
    });
  } catch (error) {
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
  console.log('[CreateTicket] Received request. Body:', req.body); // Log body
  console.log('[CreateTicket] Received files:', req.files); // Log files
  
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
    } = req.body;
    
    // Revert back to Express.Multer.File
    const files = req.files as Express.Multer.File[];

    const actualRequesterId = requesterId || req.user.id;
    const statusResult = await query(
      'SELECT id FROM ticket_statuses WHERE is_default = true AND organization_id = $1 LIMIT 1',
      [req.user.organizationId]
    );

    if (statusResult.rows.length === 0) {
      throw new AppError('Default ticket status not found', 500);
    }
    const statusId = statusResult.rows[0].id;

    const client = await pool.connect();
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
        RETURNING id`,
        [
          subject,
          description,
          actualRequesterId,
          assigneeId || null,
          departmentId || null,
          priorityId || null,
          statusId,
          typeId || null,
          req.user.organizationId,
          dueDate || null,
          sentimentScore,
          aiSummary,
          'web',
        ]
      );
      
      const newTicketId = ticketResult.rows[0].id;
      
      // --- Handle Tags --- 
      const tagIds: number[] = [];
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const organizationId = req.user.organizationId;
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
            console.error(`[CreateTicket] Error uploading file to Supabase:`, uploadError);
            throw new AppError('File upload failed', 500);
          }
        }

        const attachmentQuery = `
          INSERT INTO ticket_attachments (
            ticket_id, comment_id, file_name, file_path, 
            file_type, file_size, uploaded_by
          ) VALUES ${attachmentPlaceholders.join(',')}
        `;
        
        console.log(`[CreateTicket] Attempting to insert ${files.length} attachments for ticket ${newTicketId}. Query: ${attachmentQuery.substring(0, 100)}...`);
        try {
          await client.query(attachmentQuery, attachmentValues);
          console.log(`[CreateTicket] Successfully inserted attachments for ticket ${newTicketId}`); // Log after DB insert
          logger.info(`Added ${files.length} attachments for ticket ${newTicketId}`);
        } catch (dbError) {
          console.error(`[CreateTicket] Database error inserting attachments for ticket ${newTicketId}:`, dbError); // Log DB error specifically
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
      // Clean up uploaded files if transaction fails
      if (files && files.length > 0) {
        files.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) logger.error(`Failed to delete uploaded file ${file.path} after transaction rollback:`, err);
          });
        });
      }
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
) => {
  console.log('[updateTicket] Received PUT request');
  console.log('[updateTicket] req.params:', JSON.stringify(req.params));
  console.log('[updateTicket] req.body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { id } = req.params;
    const {
      subject,
      description,
      assigneeId,
      departmentId,
      priorityId,
      statusId,
      typeId,
      dueDate,
      tags,
    } = req.body;
    
    console.log('[updateTicket] Extracted assigneeId:', assigneeId, typeof assigneeId);
    console.log('[updateTicket] req.user.id:', req.user?.id, typeof req.user?.id); // Log user ID
    
    // Get ticket to check access and track changes
    const ticketResult = await query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );
    
    if (ticketResult.rows.length === 0) {
      throw new AppError('Ticket not found', 404);
    }
    
    const ticket = ticketResult.rows[0];
    
    // Check if user has access to update this ticket
    if (req.user.role !== 'admin' && ticket.organization_id !== req.user.organizationId) {
      throw new AppError('You do not have permission to update this ticket', 403);
    }
    
    // Customers can only update their own tickets
    if (
      req.user.role === 'customer' && 
      ticket.requester_id !== req.user.id
    ) {
      throw new AppError('You can only update tickets you created', 403);
    }
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Track changes for history
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      
      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (subject !== undefined && subject !== ticket.subject) {
        updateFields.push(`subject = $${paramCount}`);
        values.push(subject);
        changes.push({ field: 'subject', oldValue: ticket.subject, newValue: subject });
        paramCount++;
      }
      
      if (description !== undefined && description !== ticket.description) {
        updateFields.push(`description = $${paramCount}`);
        values.push(description);
        changes.push({ field: 'description', oldValue: ticket.description, newValue: description });
        paramCount++;
        
        // Re-process with AI if description changed
        if (process.env.OPENAI_API_KEY) {
          try {
            // OpenAI is no longer used
            // Set default values for sentiment and summary
            const sentimentScore = 0;
            
            updateFields.push(`sentiment_score = $${paramCount}`);
            values.push(sentimentScore);
            paramCount++;
            
            // Generate summary if description is long
            if (description.length > 100) {
              const aiSummary = "AI summary not available";
              
              updateFields.push(`ai_summary = $${paramCount}`);
              values.push(aiSummary);
              paramCount++;
            }
          } catch (error) {
            // Log AI error but continue with ticket update
            logger.error('Error processing ticket update with AI', error);
          }
        }
      }
      
      if (assigneeId !== undefined && assigneeId !== ticket.assignee_id) {
        updateFields.push(`assignee_id = $${paramCount}`);
        values.push(assigneeId || null);
        changes.push({ field: 'assignee', oldValue: ticket.assignee_id, newValue: assigneeId });
        paramCount++;
      }
      
      if (departmentId !== undefined && departmentId !== ticket.department_id) {
        updateFields.push(`department_id = $${paramCount}`);
        values.push(departmentId || null);
        changes.push({ field: 'department', oldValue: ticket.department_id, newValue: departmentId });
        paramCount++;
      }
      
      if (priorityId !== undefined && priorityId !== ticket.priority_id) {
        updateFields.push(`priority_id = $${paramCount}`);
        values.push(priorityId || null);
        changes.push({ field: 'priority', oldValue: ticket.priority_id, newValue: priorityId });
        paramCount++;
      }
      
      if (typeId !== undefined && typeId !== ticket.type_id) {
        updateFields.push(`type_id = $${paramCount}`);
        values.push(typeId || null);
        changes.push({ field: 'type', oldValue: ticket.type_id, newValue: typeId });
        paramCount++;
      }
      
      if (dueDate !== undefined && dueDate !== ticket.due_date) {
        updateFields.push(`due_date = $${paramCount}`);
        values.push(dueDate || null);
        changes.push({ field: 'dueDate', oldValue: ticket.due_date, newValue: dueDate });
        paramCount++;
      }
      
      // Handle status change separately to update resolved/closed timestamps
      if (statusId !== undefined && statusId !== ticket.status_id) {
        updateFields.push(`status_id = $${paramCount}`);
        values.push(statusId);
        changes.push({ field: 'status', oldValue: ticket.status_id, newValue: statusId });
        paramCount++;
        
        // Check if new status is resolved or closed
        const statusResult = await client.query(
          'SELECT is_resolved FROM ticket_statuses WHERE id = $1',
          [statusId]
        );
        
        if (statusResult.rows.length > 0) {
          const { is_resolved } = statusResult.rows[0];
          
          if (is_resolved) {
            // If ticket was not previously resolved, set resolved_at
            if (!ticket.resolved_at) {
              updateFields.push(`resolved_at = $${paramCount}`);
              values.push(new Date());
              paramCount++;
            }
            
            // Check if this status means closed (e.g., "Closed" vs "Resolved")
            if (statusId !== ticket.status_id) {
              updateFields.push(`closed_at = $${paramCount}`);
              values.push(new Date());
              paramCount++;
            }
          }
        }
      }
      
      // Update ticket if there are changes
      if (updateFields.length > 0) {
        values.push(id);
        
        // Log the values array right before the query
        console.log('[updateTicket] Values array before query:', JSON.stringify(values));
        console.log('[updateTicket] updateFields:', updateFields.join(', '));
        
        const updateQuery = `
          UPDATE tickets
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE id = $${values.length}
        `;
        
        console.log('[updateTicket] Executing update query:', updateQuery);
        await client.query(updateQuery, values);
        
        // Add changes to history
        for (const change of changes) {
          let oldValueLabel = change.oldValue;
          let newValueLabel = change.newValue;
          
          // For relations, get the name instead of the ID
          if (['status', 'priority', 'type', 'department', 'assignee'].includes(change.field)) {
            if (change.field === 'assignee') {
              if (change.oldValue) {
                const oldUserResult = await client.query(
                  'SELECT first_name, last_name FROM users WHERE id = $1',
                  [change.oldValue]
                );
                if (oldUserResult.rows.length > 0) {
                  const user = oldUserResult.rows[0];
                  oldValueLabel = `${user.first_name} ${user.last_name}`;
                }
              } else {
                oldValueLabel = 'Unassigned';
              }
              
              if (change.newValue) {
                const newUserResult = await client.query(
                  'SELECT first_name, last_name, email FROM users WHERE id = $1', // Select email as well
                  [change.newValue]
                );
                if (newUserResult.rows.length > 0) {
                  const user = newUserResult.rows[0];
                  // Update the label to include name and email
                  newValueLabel = `${user.first_name} ${user.last_name} (${user.email})`; 
                }
              } else {
                newValueLabel = 'Unassigned';
              }
            } else {
              // Get name for other relations
              let tableName = '';
              if (change.field === 'department') {
                tableName = 'departments';
              } else if (change.field === 'status') {
                tableName = 'ticket_statuses'; // Correct table name for status
              } else if (change.field === 'priority') {
                tableName = 'ticket_priorities'; // Correct table name for priority
              } else {
                // Default logic for type (ticket_types is correct)
                tableName = `ticket_${change.field}s`; 
              }
              
              if (change.oldValue) {
                const oldResult = await client.query(
                  `SELECT name FROM ${tableName} WHERE id = $1`,
                  [change.oldValue]
                );
                if (oldResult.rows.length > 0) {
                  oldValueLabel = oldResult.rows[0].name;
                }
              } else {
                oldValueLabel = 'None';
              }
              
              if (change.newValue) {
                const newResult = await client.query(
                  `SELECT name FROM ${tableName} WHERE id = $1`,
                  [change.newValue]
                );
                if (newResult.rows.length > 0) {
                  newValueLabel = newResult.rows[0].name;
                }
              } else {
                newValueLabel = 'None';
              }
            }
          }
          
          // Ensure IDs are numbers for the history table
          const numericTicketId = parseInt(id, 10);
          const numericUserId = parseInt(req.user.id, 10);
          
          // Log before inserting into history
          console.log(`[updateTicket] Inserting history: ticketId=${numericTicketId}, userId=${numericUserId}, field=${change.field}, old=${oldValueLabel}, new=${newValueLabel}`);

          await client.query(
            `INSERT INTO ticket_history (
              ticket_id,
              user_id,
              field_name,
              old_value,
              new_value
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              numericTicketId, // Use numeric ticket ID
              numericUserId,   // Use numeric user ID
              change.field,
              oldValueLabel,
              newValueLabel,
            ]
          );
        }
      }
      
      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tags
        await client.query(
          'DELETE FROM ticket_tags WHERE ticket_id = $1',
          [id]
        );
        
        // Add new tags (assuming tags are passed as an array of *numeric IDs*)
        if (Array.isArray(tags) && tags.length > 0) {
          const numericTagIds = tags.map(tag => typeof tag === 'string' ? parseInt(tag, 10) : tag).filter(tag => typeof tag === 'number');
          if (numericTagIds.length > 0) {
            const tagValuesPlaceholders = numericTagIds.map((_, index) => `($1, $${index + 2})`).join(',');
            const ticketTagQuery = `INSERT INTO ticket_tags (ticket_id, tag_id) VALUES ${tagValuesPlaceholders}`;
            await client.query(ticketTagQuery, [id, ...numericTagIds]);
          }
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Ticket updated successfully',
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
    if (req.user.role !== 'admin' && ticket.organization_id !== req.user.organizationId) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }
    
    // Customers can only add comments to their own tickets
    if (
      req.user.role === 'customer' && 
      ticket.requester_id !== req.user.id
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
        req.user.id,
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
      (ticket.organization_id !== req.user.organizationId || req.user.role !== 'agent')
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
    const departments = await ticketService.getDepartments(req.user.organizationId);
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
    const priorities = await ticketService.getPriorities(req.user.organizationId);
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
    const ticketTypes = await ticketService.getTypes(req.user.organizationId);
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
    const statuses = await ticketService.getStatuses(req.user.organizationId);
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
    if (req.user.role !== 'admin' && ticket.organization_id !== req.user.organizationId) {
      throw new AppError('You do not have permission to upload attachments to this ticket', 403);
    }
    
    // Customers can only add attachments to their own tickets
    if (
      req.user.role === 'customer' && 
      ticket.requester_id !== req.user.id
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
            const { data, error } = await supabaseClient.storage
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
            const { data: urlData } = supabaseClient.storage
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
              req.user.id
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
            [id, req.user.id, 'attachment_added', file.originalname]
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
      attachment.organization_id !== req.user.organizationId
    ) {
      throw new AppError('You do not have permission to download this attachment', 403);
    }
    
    // Customers can only download attachments from their own tickets
    if (
      req.user.role === 'customer' && 
      attachment.requester_id !== req.user.id
    ) {
      throw new AppError('You can only download attachments from tickets you created', 403);
    }
    
    try {
      // Generate signed URL from Supabase
      const { data, error } = await supabaseClient.storage
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
          filename: attachment.original_name
        }
      });
    } catch (supabaseError) {
      logger.error('Supabase error:', supabaseError);
      
      // Fallback - try to get a public URL if file is public
      try {
        const { data } = supabaseClient.storage
          .from(bucketName)
          .getPublicUrl(attachment.file_path);
          
        if (data && data.publicUrl) {
          return res.status(200).json({
            status: 'success',
            data: {
              downloadUrl: data.publicUrl,
              filename: attachment.original_name
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
    if (req.user.role !== 'admin' && ticket.organization_id !== req.user.organizationId) {
      throw new AppError('You do not have permission to view this ticket history', 403);
    }
    
    // Customers can only view history of their own tickets
    if (
      req.user.role === 'customer' && 
      ticket.requester_id !== req.user.id
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
    if (req.user.role !== 'admin' && ticket.organization_id !== req.user.organizationId) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }
    
    // Customers can only add comments to their own tickets
    if (
      req.user.role === 'customer' && 
      ticket.requester_id !== req.user.id
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
          req.user.id,
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