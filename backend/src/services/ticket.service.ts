import { TicketStatus } from '../models/TicketStatus';
import { TicketPriority } from '../models/TicketPriority';
import { TicketType } from '../models/TicketType';
import { Department } from '../models/Department';
import { pool, query, getRepository } from '../config/database';
import slaService from './sla.service';
import { Ticket } from '../models/Ticket';
import { logger } from '../utils/logger';
import { AppDataSource } from '../config/database';
import { Comment } from '../models/Comment';
import { Attachment } from '../models/Attachment';
import { User } from '../models/User';
import { AppError } from '../utils/errorHandler';
import cacheService from './cache.service';

export interface TicketPaginationOptions {
  page: number;
  limit: number;
  searchTerm?: string;
  status?: string | string[];
  priority?: string | string[];
  assigneeId?: string;
  requesterId?: string;
  departmentId?: string;
  tags?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface TicketStats {
  total: number;
  open: number;
  closed: number;
  resolved: number;
  pending: number;
  unassigned: number;
  overdue: number;
  highPriority: number;
}

class TicketService {
  /**
   * Get all ticket statuses for an organization
   * @param organizationId Organization ID
   * @returns Array of ticket statuses
   */
  async getStatuses(organizationId: string | null): Promise<TicketStatus[]> {
    try {
      // If organizationId is null, only fetch global statuses
      const queryText = organizationId === null
        ? `SELECT id, name, color, is_default, is_resolved 
           FROM ticket_statuses 
           WHERE organization_id IS NULL
           ORDER BY name`
        : `SELECT id, name, color, is_default, is_resolved 
           FROM ticket_statuses 
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY name`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching ticket statuses:', error);
      throw error;
    }
  }

  /**
   * Get all ticket priorities for an organization
   * @param organizationId Organization ID
   * @returns Array of ticket priorities
   */
  async getPriorities(organizationId: string | null): Promise<TicketPriority[]> {
    try {
      // If organizationId is null, only fetch global priorities
      const queryText = organizationId === null
        ? `SELECT id, name, color, sla_hours
           FROM ticket_priorities 
           WHERE organization_id IS NULL
           ORDER BY sla_hours DESC`
        : `SELECT id, name, color, sla_hours
           FROM ticket_priorities 
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY sla_hours DESC`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching ticket priorities:', error);
      throw error;
    }
  }

  /**
   * Get all ticket types for an organization
   * @param organizationId Organization ID
   * @returns Array of ticket types
   */
  async getTypes(organizationId: string | null): Promise<TicketType[]> {
    try {
      // If organizationId is null, only fetch global types
      const queryText = organizationId === null
        ? `SELECT id, name, description
           FROM ticket_types
           WHERE organization_id IS NULL
           ORDER BY name`
        : `SELECT id, name, description
           FROM ticket_types
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY name`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching ticket types:', error);
      throw error;
    }
  }

  /**
   * Get all departments for an organization
   * @param organizationId Organization ID
   * @returns Array of departments
   */
  async getDepartments(organizationId: string | null): Promise<Department[]> {
    try {
      // If organizationId is null, only fetch global departments
      const queryText = organizationId === null
        ? `SELECT id, name, description
           FROM departments
           WHERE organization_id IS NULL
           ORDER BY name`
        : `SELECT id, name, description
           FROM departments
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY name`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  /**
   * Get default ticket status ID
   * @param organizationId Organization ID
   * @returns Status ID
   */
  async getDefaultStatusId(organizationId: string | null): Promise<string> {
    try {
      // If organizationId is null, only fetch global default status
      const queryText = organizationId === null
        ? `SELECT id FROM ticket_statuses 
           WHERE organization_id IS NULL 
           AND is_default = true 
           LIMIT 1`
        : `SELECT id FROM ticket_statuses 
           WHERE (organization_id = $1 OR organization_id IS NULL) 
           AND is_default = true 
           LIMIT 1`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Default ticket status not found');
      }
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error fetching default ticket status:', error);
      throw error;
    }
  }

  async createTicket(ticketData: any) {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const newTicket = ticketRepository.create(ticketData);
    const savedTicket = await ticketRepository.save(newTicket);
    
    // Auto-assign SLA policy based on ticket priority if SLA is enabled
    if (savedTicket && typeof savedTicket === 'object' && 'priorityId' in savedTicket) {
      try {
        // Ensure we're passing a single Ticket object
        const ticketForSLA = Array.isArray(savedTicket) ? savedTicket[0] : savedTicket;
        await slaService.autoAssignSLAPolicy(ticketForSLA);
      } catch (error) {
        logger.error('Error auto-assigning SLA policy:', error);
        // Continue with ticket creation even if SLA assignment fails
      }
    }
    
    return savedTicket;
  }

  /**
   * Update a ticket with new data
   * @param ticketId Ticket ID to update
   * @param ticketData New ticket data
   * @returns Updated ticket
   */
  async updateTicket(ticketId: number, ticketData: Partial<Ticket>): Promise<Ticket> {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    
    // Get the current ticket
    const currentTicket = await ticketRepository.findOne({ 
      where: { id: ticketId } 
    });
    
    if (!currentTicket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Check if priority is changing
    const priorityChanged = 
      ticketData.priorityId !== undefined && 
      currentTicket.priorityId !== ticketData.priorityId;

    // Update the ticket
    await ticketRepository.update(ticketId, ticketData);
    
    // Get the updated ticket
    const updatedTicket = await ticketRepository.findOne({ 
      where: { id: ticketId } 
    });
    
    if (!updatedTicket) {
      throw new Error(`Failed to retrieve updated ticket with ID ${ticketId}`);
    }
    
    // If priority changed, update SLA policy
    if (priorityChanged) {
      try {
        await slaService.autoAssignSLAPolicy(updatedTicket);
        logger.info(`Updated SLA policy for ticket ${ticketId} due to priority change`);
      } catch (error) {
        logger.error(`Error updating SLA policy for ticket ${ticketId}:`, error);
        // Continue with ticket update even if SLA update fails
      }
    }
    
    return updatedTicket;
  }

  /**
   * Get paginated list of tickets with filters
   */
  public async getTickets(options: TicketPaginationOptions) {
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      status,
      priority,
      assigneeId,
      requesterId,
      departmentId,
      tags,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortDirection = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    
    // Create a cache key based on query parameters
    const cacheKeyParts = [
      `tickets:list:${page}:${limit}`,
      searchTerm && `search:${searchTerm}`,
      status && `status:${status}`,
      priority && `priority:${priority}`,
      assigneeId && `assignee:${assigneeId}`,
      requesterId && `requester:${requesterId}`,
      departmentId && `department:${departmentId}`,
      tags && `tags:${tags}`,
      dateFrom && `from:${dateFrom}`,
      dateTo && `to:${dateTo}`,
      sortBy && `sort:${sortBy}:${sortDirection}`
    ].filter(Boolean).join(':');
    
    return cacheService.getOrSet(cacheKeyParts, async () => {
      try {
        const ticketRepository = getRepository(Ticket);
        
        // Build query with QueryBuilder to avoid N+1 queries
        const query = ticketRepository.createQueryBuilder('ticket')
          // Join all necessary relations in a single query
          .leftJoinAndSelect('ticket.requester', 'requester')
          .leftJoinAndSelect('ticket.assignee', 'assignee')
          .leftJoinAndSelect('ticket.status', 'status')
          .leftJoinAndSelect('ticket.priority', 'priority')
          .leftJoinAndSelect('ticket.department', 'department')
          .leftJoinAndSelect('ticket.type', 'type')
          .orderBy(`ticket.${sortBy}`, sortDirection)
          .skip(offset)
          .take(limit);
          
        // Apply filters
        if (searchTerm) {
          query.andWhere(
            '(ticket.subject ILIKE :search OR ticket.description ILIKE :search OR requester.firstName ILIKE :search OR requester.lastName ILIKE :search)',
            { search: `%${searchTerm}%` }
          );
        }
        
        if (status) {
          if (Array.isArray(status) || status.includes(',')) {
            const statusArray = Array.isArray(status) ? status : status.split(',');
            query.andWhere('status.name IN (:...statusArray)', { statusArray });
          } else {
            query.andWhere('status.name = :status', { status });
          }
        }
        
        if (priority) {
          if (Array.isArray(priority) || priority.includes(',')) {
            const priorityArray = Array.isArray(priority) ? priority : priority.split(',');
            query.andWhere('priority.name IN (:...priorityArray)', { priorityArray });
          } else {
            query.andWhere('priority.name = :priority', { priority });
          }
        }
        
        if (assigneeId) {
          if (assigneeId === 'null' || assigneeId === 'unassigned') {
            query.andWhere('ticket.assigneeId IS NULL');
          } else {
            query.andWhere('ticket.assigneeId = :assigneeId', { assigneeId });
          }
        }
        
        if (requesterId) {
          query.andWhere('ticket.requesterId = :requesterId', { requesterId });
        }
        
        if (departmentId) {
          query.andWhere('ticket.departmentId = :departmentId', { departmentId });
        }
        
        // Filter by date range
        if (dateFrom) {
          query.andWhere('ticket.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
        }
        
        if (dateTo) {
          query.andWhere('ticket.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
        }
        
        // Get total count and paginated tickets
        const [tickets, totalTickets] = await query.getManyAndCount();
        
        // Process tickets to ensure consistent response format
        const processedTickets = tickets.map(ticket => ({
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          requester: {
            id: ticket.requester?.id,
            name: ticket.requester ? `${ticket.requester.firstName} ${ticket.requester.lastName}` : 'Unknown',
            email: ticket.requester?.email
          },
          assignee: ticket.assignee ? {
            id: ticket.assignee.id,
            name: `${ticket.assignee.firstName} ${ticket.assignee.lastName}`,
            email: ticket.assignee.email
          } : null,
          department: ticket.department,
          type: ticket.type,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          dueDate: ticket.dueDate,
          resolvedAt: ticket.resolvedAt,
          closedAt: ticket.closedAt,
          slaStatus: ticket.slaStatus
        }));
        
        return {
          tickets: processedTickets,
          pagination: {
            total: totalTickets,
            page,
            limit,
            totalPages: Math.ceil(totalTickets / limit)
          }
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Error fetching tickets: ${errorMessage}`);
        throw new AppError('Failed to fetch tickets', 500);
      }
    }, 60); // Cache for 1 minute
  }
  
  /**
   * Get ticket by ID with all related data
   */
  public async getTicketById(ticketId: string) {
    const cacheKey = `tickets:${ticketId}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        const ticketRepository = getRepository(Ticket);
        const commentRepository = getRepository(Comment);
        const attachmentRepository = getRepository(Attachment);
        
        // Fetch ticket with related data
        const ticket = await ticketRepository.findOne({
          where: { id: ticketId } as any,
          relations: [
            'requester',
            'assignee',
            'status',
            'priority',
            'department',
            'type',
            'organization'
          ]
        });
        
        if (!ticket) {
          throw new AppError('Ticket not found', 404);
        }
        
        // Fetch comments and attachments in parallel
        const [comments, attachments] = await Promise.all([
          commentRepository.find({
            where: { ticketId: Number(ticketId) } as any,
            relations: ['user'],
            order: { createdAt: 'ASC' }
          }),
          attachmentRepository.find({
            where: { ticketId: Number(ticketId) } as any,
            relations: ['uploadedBy']
          })
        ]);
        
        // Process ticket with consistent format
        return {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          requester: ticket.requester ? {
            id: ticket.requester.id,
            name: `${ticket.requester.firstName} ${ticket.requester.lastName}`,
            email: ticket.requester.email,
            avatarUrl: ticket.requester.avatarUrl
          } : null,
          assignee: ticket.assignee ? {
            id: ticket.assignee.id,
            name: `${ticket.assignee.firstName} ${ticket.assignee.lastName}`,
            email: ticket.assignee.email,
            avatarUrl: ticket.assignee.avatarUrl
          } : null,
          department: ticket.department,
          type: ticket.type,
          organization: ticket.organization,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          dueDate: ticket.dueDate,
          resolvedAt: ticket.resolvedAt,
          closedAt: ticket.closedAt,
          slaStatus: ticket.slaStatus,
          comments: comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            isInternal: comment.isInternal,
            isSystem: comment.isSystem,
            createdAt: comment.createdAt,
            user: comment.user ? {
              id: comment.user.id,
              name: `${comment.user.firstName} ${comment.user.lastName}`,
              avatarUrl: comment.user.avatarUrl,
              role: comment.user.role
            } : null
          })),
          attachments: attachments.map(attachment => ({
            id: attachment.id,
            fileName: attachment.fileName,
            filePath: attachment.filePath,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            uploadedBy: attachment.uploadedBy ? {
              id: attachment.uploadedBy.id,
              name: `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`
            } : null,
            createdAt: attachment.createdAt
          }))
        };
      } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Error fetching ticket by ID: ${errorMessage}`);
        throw new AppError('Failed to fetch ticket data', 500);
      }
    }, 60); // Cache for 1 minute
  }
  
  /**
   * Get ticket statistics
   */
  public async getTicketStats() {
    const cacheKey = 'tickets:stats';
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        const ticketRepository = getRepository(Ticket);
        const statusQuery = ticketRepository.createQueryBuilder('ticket')
          .innerJoin('ticket.status', 'status')
          .leftJoin('ticket.priority', 'priority')
          .select('status.name', 'statusName')
          .addSelect('COUNT(ticket.id)', 'count')
          .groupBy('status.name');
          
        const statusCounts = await statusQuery.getRawMany();
        
        // Count unassigned tickets using QueryBuilder instead of repository count
        const unassignedCount = await ticketRepository
          .createQueryBuilder('ticket')
          .where('ticket.assigneeId IS NULL')
          .getCount();
        
        // Count overdue tickets using QueryBuilder
        const overdueCount = await ticketRepository
          .createQueryBuilder('ticket')
          .where('ticket.dueDate < :now', { now: new Date() })
          .andWhere('ticket.resolvedAt IS NULL')
          .andWhere('ticket.closedAt IS NULL')
          .getCount();
        
        // Count high priority tickets
        const highPriorityCount = await ticketRepository
          .createQueryBuilder('ticket')
          .innerJoin('ticket.priority', 'priority')
          .where('priority.name IN (:...highPriorities)', { 
            highPriorities: ['High', 'Urgent', 'Critical']
          })
          .getCount();
        
        // Calculate total tickets
        const totalCount = await ticketRepository.count();
        
        // Convert status counts to a record for easier access
        const statusCountMap: Record<string, number> = {};
        statusCounts.forEach(item => {
          statusCountMap[item.statusName.toLowerCase()] = parseInt(item.count);
        });
        
        return {
          total: totalCount,
          open: statusCountMap.open || 0,
          closed: statusCountMap.closed || 0,
          resolved: statusCountMap.resolved || 0,
          pending: statusCountMap.pending || 0,
          unassigned: unassignedCount,
          overdue: overdueCount,
          highPriority: highPriorityCount
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Error fetching ticket stats: ${errorMessage}`);
        throw new AppError('Failed to fetch ticket statistics', 500);
      }
    }, 300); // Cache for 5 minutes
  }
  
  /**
   * Invalidate ticket-related caches when data changes
   */
  public invalidateTicketCache(ticketId?: string | number | null) {
    if (ticketId) {
      // Invalidate specific ticket cache
      cacheService.delete(`tickets:${ticketId}`);
    }
    
    // Invalidate list and stats caches
    cacheService.deleteByPattern('tickets:list:*');
    cacheService.delete('tickets:stats');
  }

  /**
   * Get a status by ID
   * @param statusId Status ID
   * @returns Status object or null if not found
   */
  public async getStatusById(statusId: number | string): Promise<TicketStatus | null> {
    try {
      const statusRepository = getRepository(TicketStatus);
      const status = await statusRepository.findOne({
        where: { id: Number(statusId) } as any
      });
      
      return status;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Error fetching status by ID ${statusId}: ${errorMessage}`);
      return null;
    }
  }
}

export default new TicketService();
