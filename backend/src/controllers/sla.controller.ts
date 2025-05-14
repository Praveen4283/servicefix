import { Request, Response, NextFunction } from 'express';
import slaService from '../services/sla.service';
import { SLAPolicy } from '../models/SLAPolicy';
import { AppDataSource } from '../config/database';
import { Ticket } from '../models/Ticket';
import { logger } from '../utils/logger';
import { TicketPriority } from '../models/TicketPriority';
import { createUTCDate } from '../utils/dateUtils';

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
}

export default new SLAController(); 