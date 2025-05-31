import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';
import slaService from '../services/sla.service';
import { logger } from '../utils/logger';
import { AppDataSource } from '../config/database';
import { SLAPolicy } from '../models/SLAPolicy';
import { Ticket } from '../models/Ticket';
import { TicketPriority } from '../models/TicketPriority';
import { createUTCDate } from '../utils/dateUtils';
import { query } from '../config/database';
import { SLAPolicyTicket } from '../models/SLAPolicyTicket';
import * as slaChecker from '../utils/slaChecker';

class SLAController {
  /**
   * Get all SLA policies for organization
   */
  async getAllSLAPolicies(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = parseInt(req.params.organizationId || req.body.organizationId);
      
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }
      
      const slaPolicies = await slaService.getAllSLAPolicies(organizationId);
      res.json(slaPolicies);
    } catch (error) {
      logger.error('Error getting SLA policies:', error);
      res.status(500).json({ error: 'Failed to retrieve SLA policies' });
    }
  }
  
  /**
   * Get SLA policy by ID
   */
  async getSLAPolicyById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        res.status(400).json({ error: 'SLA policy ID is required' });
        return;
      }
      
      const slaPolicy = await slaService.getSLAPolicyById(id);
      
      if (!slaPolicy) {
        res.status(404).json({ error: 'SLA policy not found' });
        return;
      }
      
      res.json(slaPolicy);
    } catch (error) {
      logger.error('Error getting SLA policy:', error);
      res.status(500).json({ error: 'Failed to retrieve SLA policy' });
    }
  }
  
  /**
   * Get SLA policies by ticket priority
   */
  async getSLAPoliciesByPriority(req: Request, res: Response): Promise<void> {
    try {
      const priorityId = parseInt(req.params.priorityId);
      
      if (!priorityId) {
        res.status(400).json({ error: 'Priority ID is required' });
        return;
      }
      
      const slaPolicies = await slaService.getSLAPoliciesByPriority(priorityId);
      res.json(slaPolicies);
    } catch (error) {
      logger.error('Error getting SLA policies by priority:', error);
      res.status(500).json({ error: 'Failed to retrieve SLA policies' });
    }
  }
  
  /**
   * Create a new SLA policy
   */
  async createSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        organizationId,
        ticketPriorityId,
        firstResponseHours,
        nextResponseHours,
        resolutionHours,
        businessHoursOnly
      } = req.body;
      
      if (!name || !organizationId || !ticketPriorityId || !firstResponseHours || !resolutionHours) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      
      // Verify the ticket priority exists and belongs to the organization
      const priorityRepository = AppDataSource.getRepository(TicketPriority);
      const priority = await priorityRepository.findOne({ 
        where: { id: ticketPriorityId, organizationId }
      });
      
      if (!priority) {
        res.status(404).json({ error: 'Ticket priority not found or does not belong to this organization' });
        return;
      }
      
      const newPolicy = await slaService.createSLAPolicy({
        name,
        description,
        organizationId,
        ticketPriorityId,
        firstResponseHours,
        nextResponseHours,
        resolutionHours,
        businessHoursOnly: businessHoursOnly !== undefined ? businessHoursOnly : true
      });
      
      // Update the SLA hours in the priority
      priority.slaHours = resolutionHours;
      await priorityRepository.save(priority);
      
      res.status(201).json(newPolicy);
    } catch (error) {
      logger.error('Error creating SLA policy:', error);
      res.status(500).json({ error: 'Failed to create SLA policy' });
    }
  }
  
  /**
   * Update an SLA policy
   */
  async updateSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        res.status(400).json({ error: 'SLA policy ID is required' });
        return;
      }
      
      const {
        name,
        description,
        ticketPriorityId,
        firstResponseHours,
        nextResponseHours,
        resolutionHours,
        businessHoursOnly
      } = req.body;
      
      // Get existing policy
      const existingPolicy = await slaService.getSLAPolicyById(id);
      if (!existingPolicy) {
        res.status(404).json({ error: 'SLA policy not found' });
        return;
      }
      
      // If ticket priority is being changed, verify it exists and belongs to the organization
      if (ticketPriorityId && ticketPriorityId !== existingPolicy.ticketPriorityId) {
        const priorityRepository = AppDataSource.getRepository(TicketPriority);
        const priority = await priorityRepository.findOne({ 
          where: { id: ticketPriorityId, organizationId: existingPolicy.organizationId }
        });
        
        if (!priority) {
          res.status(404).json({ error: 'Ticket priority not found or does not belong to this organization' });
          return;
        }
      }
      
      const updatedPolicy = await slaService.updateSLAPolicy(id, {
        name,
        description,
        ticketPriorityId,
        firstResponseHours,
        nextResponseHours,
        resolutionHours,
        businessHoursOnly
      });
      
      // Update the SLA hours in the priority if resolution time changed
      if (resolutionHours) {
        const priorityRepository = AppDataSource.getRepository(TicketPriority);
        const priorityId = ticketPriorityId || existingPolicy.ticketPriorityId;
        const priority = await priorityRepository.findOne({ where: { id: priorityId } });
        
        if (priority) {
          priority.slaHours = resolutionHours;
          await priorityRepository.save(priority);
        }
      }
      
      logger.info(`SLA policy updated successfully: ${JSON.stringify(updatedPolicy)}`);
      
      // Ensure we're returning the full updated policy
      if (!updatedPolicy) {
        throw new Error('Failed to update SLA policy - no data returned from service');
      }
      
      res.json(updatedPolicy);
    } catch (error) {
      logger.error('Error updating SLA policy:', error);
      res.status(500).json({ error: 'Failed to update SLA policy' });
    }
  }
  
  /**
   * Delete an SLA policy
   */
  async deleteSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        res.status(400).json({ error: 'SLA policy ID is required' });
        return;
      }
      
      const success = await slaService.deleteSLAPolicy(id);
      
      if (!success) {
        res.status(404).json({ error: 'SLA policy not found or could not be deleted' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting SLA policy:', error);
      res.status(500).json({ error: 'Failed to delete SLA policy' });
    }
  }
  
  /**
   * Assign SLA policy to a ticket
   */
  async assignSLAToTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId, slaPolicyId } = req.body;
      
      if (!ticketId || !slaPolicyId) {
        res.status(400).json({ error: 'Ticket ID and SLA policy ID are required' });
        return;
      }
      
      const slaPolicyTicket = await slaService.assignSLAToTicket(ticketId, slaPolicyId);
      res.json(slaPolicyTicket);
    } catch (error) {
      logger.error('Error assigning SLA to ticket:', error);
      res.status(500).json({ error: 'Failed to assign SLA policy to ticket' });
    }
  }
  
  /**
   * Get SLA status for a ticket
   */
  async getTicketSLAStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      // Extract numeric ID safely, handling different formats
      let ticketId: number;
      
      try {
        // First try to get just the numeric part if it's a string with non-numeric characters
        const idStr = req.params.ticketId;
        const matches = idStr.match(/(\d+)/);
        
        if (matches && matches[1]) {
          ticketId = parseInt(matches[1], 10);
        } else {
          ticketId = parseInt(idStr, 10);
        }
        
        if (isNaN(ticketId)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid ticket ID format'
          });
        }
      } catch (err) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID format'
        });
      }
      
      // First verify the ticket exists - use a simpler query that avoids the problematic fields
      const ticketRepository = AppDataSource.getRepository(Ticket);
      // We only need the ID, so fetch just that without any relations to avoid schema issues
      const ticket = await ticketRepository.findOne({ 
        select: ['id', 'priorityId', 'createdAt'],
        where: { id: ticketId } 
      });
      
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }
      
      // Now check if an SLA policy exists
      try {
        const status = await slaService.checkSLAStatus(ticket);
        
        // Check if SLA is paused by examining metadata
        let isPaused = false;
        
        if (status.slaInfo?.metadata) {
          try {
            let metadata;
            
            // Check if metadata is already an object or needs to be parsed from string
            if (typeof status.slaInfo.metadata === 'string') {
              metadata = JSON.parse(status.slaInfo.metadata);
            } else {
              metadata = status.slaInfo.metadata;
            }
            
            if (Array.isArray(metadata.pausePeriods) && metadata.pausePeriods.length > 0) {
              // Check if the last pause period doesn't have an end date
              const lastPausePeriod = metadata.pausePeriods[metadata.pausePeriods.length - 1];
              isPaused = lastPausePeriod && !lastPausePeriod.endedAt;
            }
          } catch (err) {
            logger.error('Error parsing SLA metadata:', err);
          }
        }
        
        // Return in standard format that the frontend expects
        return res.json({
          status: 'success',
          data: {
            ...status,
            isPaused
          }
        });
      } catch (error) {
        // If error is from SLA service, it might be that no SLA policy exists
        logger.error(`SLA service error for ticket ${ticketId}:`, error);
        return res.status(404).json({
          status: 'error',
          message: 'No SLA policy found for this ticket'
        });
      }
    } catch (error) {
      logger.error(`Unexpected error in getTicketSLAStatus for ticket ${req.params.ticketId}:`, error);
      next(error);
    }
  }
  
  /**
   * Get SLA metrics
   */
  async getSLAMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, startDate, endDate } = req.query;
      
      if (!organizationId || !startDate || !endDate) {
        res.status(400).json({ error: 'Organization ID, start date, and end date are required' });
        return;
      }
      
      const metrics = await slaService.getSLAMetrics(
        parseInt(organizationId as string),
        createUTCDate(startDate as string),
        createUTCDate(endDate as string)
      );
      
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting SLA metrics:', error);
      res.status(500).json({ error: 'Failed to get SLA metrics' });
    }
  }
  
  /**
   * Auto-assign SLA policy for a ticket based on its current priority
   */
  async autoAssignSLAForTicket(req: Request, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      if (!ticketId) {
        res.status(400).json({ error: 'Valid ticket ID is required' });
        return;
      }
      
      // Get the ticket with its priority
      const ticketRepository = AppDataSource.getRepository(Ticket);
      const ticket = await ticketRepository.findOne({ 
        where: { id: ticketId },
        relations: ['priority']
      });
      
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      
      // Auto-assign SLA policy based on the ticket's priority
      const slaPolicyTicket = await slaService.autoAssignSLAPolicy(ticket);
      
      if (!slaPolicyTicket) {
        res.status(404).json({ 
          error: 'No SLA policy found for the ticket\'s priority',
          ticketId,
          priorityId: ticket.priorityId,
          priorityName: ticket.priority?.name
        });
        return;
      }
      
      res.json(slaPolicyTicket);
    } catch (error) {
      logger.error('Error auto-assigning SLA policy:', error);
      res.status(500).json({ error: 'Failed to auto-assign SLA policy' });
    }
  }
  
  /**
   * Pause SLA for a ticket (typically when status changes to "pending")
   */
  async pauseSLA(req: Request, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      if (!ticketId) {
        res.status(400).json({ error: 'Valid ticket ID is required' });
        return;
      }
      
      // Pause the SLA
      const updatedSLA = await slaService.pauseSLA(ticketId);
      
      if (!updatedSLA) {
        res.status(404).json({ 
          error: 'No SLA found for this ticket or SLA could not be paused',
          ticketId
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'SLA paused successfully',
        data: updatedSLA
      });
    } catch (error) {
      logger.error('Error pausing SLA:', error);
      res.status(500).json({ error: 'Failed to pause SLA' });
    }
  }
  
  /**
   * Resume SLA for a ticket (typically when status changes from "pending" to another status)
   */
  async resumeSLA(req: Request, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      if (!ticketId) {
        res.status(400).json({ error: 'Valid ticket ID is required' });
        return;
      }
      
      // Resume the SLA
      const updatedSLA = await slaService.resumeSLA(ticketId);
      
      if (!updatedSLA) {
        res.status(404).json({ 
          error: 'No SLA found for this ticket or SLA could not be resumed',
          ticketId
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'SLA resumed successfully',
        data: updatedSLA
      });
    } catch (error) {
      logger.error('Error resuming SLA:', error);
      res.status(500).json({ error: 'Failed to resume SLA' });
    }
  }
  
  /**
   * Check tickets for missed SLA first responses
   * This handles cases where an agent has responded to a ticket but the SLA system
   * hasn't marked the first response as completed.
   */
  async checkMissedFirstResponses(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { limit = 100 } = req.query;
      
      // Only admins can run this check
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Only administrators can run SLA system checks'
        });
      }
      
      // Query tickets that have comments but first response SLA is still not marked
      const result = await query(`
        WITH ticket_with_agent_comments AS (
          SELECT 
            t.id as ticket_id,
            MIN(tc.created_at) as first_agent_comment_time
          FROM tickets t
          JOIN ticket_comments tc ON t.id = tc.ticket_id
          JOIN users u ON tc.user_id = u.id
          WHERE u.role != 'customer' 
            AND tc.is_internal = false
            AND tc.is_system = false
          GROUP BY t.id
        )
        SELECT 
          t.id,
          twac.first_agent_comment_time,
          spt.first_response_met,
          spt.id as sla_policy_ticket_id
        FROM tickets t
        JOIN ticket_with_agent_comments twac ON t.id = twac.ticket_id
        JOIN sla_policy_tickets spt ON t.id = spt.ticket_id
        WHERE spt.first_response_met IS NULL
        LIMIT $1
      `, [limit]);
      
      const ticketsProcessed = [];
      
      // Process each ticket with missed first response
      for (const ticket of result.rows) {
        try {
          // Mark first response as met based on agent comment time
          const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
          const slaPolicyTicket = await slaPolicyTicketRepository.findOne({ 
            where: { id: ticket.sla_policy_ticket_id } as any 
          });
          
          if (slaPolicyTicket) {
            // Determine if the first agent comment was within SLA
            const firstAgentCommentTime = new Date(ticket.first_agent_comment_time);
            const isWithinSLA = firstAgentCommentTime <= slaPolicyTicket.firstResponseDueAt;
            
            // Update SLA status
            slaPolicyTicket.firstResponseMet = isWithinSLA;
            await slaPolicyTicketRepository.save(slaPolicyTicket);
            
            // Update ticket record
            await query(
              'UPDATE tickets SET first_response_sla_breached = $1 WHERE id = $2',
              [!isWithinSLA, ticket.id]
            );
            
            // Add to processed list
            ticketsProcessed.push({
              ticketId: ticket.id,
              firstResponseWithinSLA: isWithinSLA,
              firstAgentCommentTime
            });
            
            logger.info(`Fixed missed first response SLA for ticket #${ticket.id}. Within SLA: ${isWithinSLA}`);
          }
        } catch (ticketError) {
          logger.error(`Error processing missed first response for ticket #${ticket.id}:`, ticketError);
        }
      }
      
      return res.json({
        status: 'success',
        data: {
          ticketsProcessed,
          count: ticketsProcessed.length
        }
      });
    } catch (error) {
      logger.error('Error in checkMissedFirstResponses:', error);
      next(error);
    }
  }
  
  /**
   * Force recalculation of SLA status for a specific ticket
   * This is useful to manually fix SLA status issues
   */
  async recalculateTicketSLA(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID'
        });
      }
      
      // Get the ticket
      const ticketRepository = AppDataSource.getRepository(Ticket);
      const ticket = await ticketRepository.findOne({
        where: { id: ticketId }
      });
      
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }
      
      // Get SLA policy ticket
      const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
      const slaPolicyTicket = await slaPolicyTicketRepository.findOne({
        where: { ticketId } as any,
        relations: ['slaPolicy']
      });
      
      if (!slaPolicyTicket) {
        // No SLA policy ticket exists, try to create one
        const newSLAPolicyTicket = await slaService.autoAssignSLAPolicy(ticket);
        
        if (!newSLAPolicyTicket) {
          return res.status(404).json({
            status: 'error',
            message: 'No SLA policy found for this ticket'
          });
        }
        
        return res.status(200).json({
          status: 'success',
          message: 'SLA policy assigned to ticket',
          data: {
            slaInfo: newSLAPolicyTicket
          }
        });
      }
      
      // Check if SLA is paused
      let isPaused = false;
      if (slaPolicyTicket.metadata) {
        try {
          let metadata;
          if (typeof slaPolicyTicket.metadata === 'string') {
            metadata = JSON.parse(slaPolicyTicket.metadata);
          } else {
            metadata = slaPolicyTicket.metadata;
          }
          
          if (Array.isArray(metadata.pausePeriods) && metadata.pausePeriods.length > 0) {
            const lastPausePeriod = metadata.pausePeriods[metadata.pausePeriods.length - 1];
            if (lastPausePeriod && !lastPausePeriod.endedAt) {
              isPaused = true;
            }
          }
        } catch (err) {
          logger.error('Error parsing SLA metadata:', err);
        }
      }
      
      // Force update breach status
      const updatedTicket = await slaService.updateTicketSLABreachStatus(ticketId);
      
      // Check for ticket comments from agents to mark first response
      if (slaPolicyTicket.firstResponseMet === undefined) {
        const result = await query(`
          SELECT 
            MIN(tc.created_at) as first_agent_comment_time
          FROM ticket_comments tc
          JOIN users u ON tc.user_id = u.id
          WHERE tc.ticket_id = $1 
            AND u.role != 'customer'
            AND tc.is_internal = false
            AND tc.is_system = false
        `, [ticketId]);
        
        if (result.rows.length > 0 && result.rows[0].first_agent_comment_time) {
          // Found an agent comment, check if it meets SLA
          const firstAgentCommentTime = new Date(result.rows[0].first_agent_comment_time);
          const isWithinSLA = firstAgentCommentTime <= slaPolicyTicket.firstResponseDueAt;
          
          // Update SLA status
          slaPolicyTicket.firstResponseMet = isWithinSLA;
          await slaPolicyTicketRepository.save(slaPolicyTicket);
          
          // Update ticket record
          await query(
            'UPDATE tickets SET first_response_sla_breached = $1 WHERE id = $2',
            [!isWithinSLA, ticketId]
          );
          
          logger.info(`Fixed first response SLA for ticket #${ticketId}. Within SLA: ${isWithinSLA}`);
        }
      }
      
      // Get fresh SLA status after updates
      const slaStatus = await slaService.checkSLAStatus(ticket);
      
      return res.status(200).json({
        status: 'success',
        message: 'SLA status recalculated',
        data: {
          ...slaStatus,
          isPaused,
          ticket: updatedTicket
        }
      });
    } catch (error) {
      logger.error(`Error recalculating SLA for ticket ${req.params.ticketId}:`, error);
      next(error);
    }
  }
  
  /**
   * Fix SLA breach status for all tickets or a specific ticket
   * This is useful when SLA breach statuses are not properly reflected in the database
   */
  async fixSLABreachStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { ticketId } = req.params;
      
      // If a specific ticket ID is provided, fix just that one
      if (ticketId) {
        const id = parseInt(ticketId, 10);
        if (isNaN(id)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid ticket ID'
          });
        }
        
        // Get the ticket with its SLA info
        const ticketRepository = AppDataSource.getRepository(Ticket);
        const ticket = await ticketRepository.findOne({
          where: { id },
          relations: ['priority']
        });
        
        if (!ticket) {
          return res.status(404).json({
            status: 'error',
            message: 'Ticket not found'
          });
        }
        
        // Get SLA policy ticket
        const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
        const slaPolicyTicket = await slaPolicyTicketRepository.findOne({
          where: { ticketId: id } as any,
          relations: ['slaPolicy']
        });
        
        if (!slaPolicyTicket) {
          return res.status(404).json({
            status: 'error',
            message: 'No SLA policy associated with this ticket'
          });
        }
        
        const now = new Date();
        const firstResponseDueAt = new Date(slaPolicyTicket.firstResponseDueAt);
        const resolutionDueAt = new Date(slaPolicyTicket.resolutionDueAt);
        
        // Determine if SLAs are breached
        const isFirstResponseBreached = firstResponseDueAt < now && slaPolicyTicket.firstResponseMet !== true;
        const isResolutionBreached = resolutionDueAt < now && slaPolicyTicket.resolutionMet !== true;
        
        // Update the SLA policy ticket if needed
        if (isFirstResponseBreached && slaPolicyTicket.firstResponseMet === undefined) {
          slaPolicyTicket.firstResponseMet = false;
          await slaPolicyTicketRepository.save(slaPolicyTicket);
        }
        
        if (isResolutionBreached && slaPolicyTicket.resolutionMet === undefined) {
          slaPolicyTicket.resolutionMet = false;
          await slaPolicyTicketRepository.save(slaPolicyTicket);
        }
        
        // Update the ticket
        ticket.firstResponseSlaBreached = isFirstResponseBreached;
        ticket.resolutionSlaBreached = isResolutionBreached;
        
        // Update SLA status if not paused
        if (ticket.slaStatus !== 'paused') {
          if (isResolutionBreached) {
            ticket.slaStatus = 'breached';
          } else {
            // Calculate the percentage
            const ticketCreatedAt = new Date(ticket.createdAt);
            const totalResolutionMinutes = Math.floor((resolutionDueAt.getTime() - ticketCreatedAt.getTime()) / 60000);
            const elapsedMinutes = Math.floor((now.getTime() - ticketCreatedAt.getTime()) / 60000);
            const resolutionPercentage = Math.min(100, Math.floor((elapsedMinutes / totalResolutionMinutes) * 100));
            
            if (resolutionPercentage >= 90) {
              ticket.slaStatus = 'critical';
            } else if (resolutionPercentage >= 75) {
              ticket.slaStatus = 'warning';
            } else {
              ticket.slaStatus = 'active';
            }
          }
        }
        
        await ticketRepository.save(ticket);
        
        return res.status(200).json({
          status: 'success',
          message: 'SLA breach status fixed',
          data: {
            ticketId: id,
            firstResponseBreached: isFirstResponseBreached,
            resolutionBreached: isResolutionBreached,
            slaStatus: ticket.slaStatus
          }
        });
      }
      
      // If no ticket ID, fix all tickets with incorrect breach status
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const fixedCount = await slaChecker.fixBreachedSLAs(limit);
      
      return res.status(200).json({
        status: 'success',
        message: `Fixed SLA breach status for ${fixedCount} tickets`,
        data: {
          count: fixedCount
        }
      });
    } catch (error) {
      logger.error('Error fixing SLA breach status:', error);
      next(error);
    }
  }
}

export default new SLAController(); 