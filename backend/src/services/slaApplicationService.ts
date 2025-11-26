import { Ticket } from '../models/Ticket';
import { TicketStatus } from '../models/TicketStatus';
import { TicketPriority } from '../models/TicketPriority';
import { SLAPolicyTicket } from '../models/SLAPolicyTicket';
import { getRepository } from '../config/database';
import slaService from './sla.service';
import { logger } from '../utils/logger';
import { isPendingStatus, isInProgressStatus, isResolvedStatus } from '../utils/ticketUtils';

export interface SLAStatusChange {
  ticketId: number;
  oldStatusId: number;
  newStatusId: number;
  oldStatusName: string;
  newStatusName: string;
  shouldPause: boolean;
  shouldResume: boolean;
  shouldComplete: boolean;
}

export interface SLAApplicationResult {
  success: boolean;
  action: 'paused' | 'resumed' | 'completed' | 'none';
  message: string;
  error?: string;
}

class SLAApplicationService {
  /**
   * Handle SLA status changes when ticket status is updated
   */
  async handleStatusChange(
    ticketId: number,
    oldStatusId: number,
    newStatusId: number
  ): Promise<SLAApplicationResult> {
    try {
      const statusRepository = getRepository(TicketStatus);
      const [oldStatus, newStatus] = await Promise.all([
        statusRepository.findOne({ where: { id: oldStatusId } as any }),
        statusRepository.findOne({ where: { id: newStatusId } as any })
      ]);

      if (!oldStatus || !newStatus) {
        return {
          success: false,
          action: 'none',
          message: 'Status not found',
          error: 'Invalid status ID'
        };
      }

      const oldStatusName = oldStatus.name.toLowerCase();
      const newStatusName = newStatus.name.toLowerCase();

      // Determine SLA actions based on status change
      const shouldPause = isPendingStatus(newStatusName) && !isPendingStatus(oldStatusName);
      const shouldResume = isInProgressStatus(newStatusName) && isPendingStatus(oldStatusName);
      const shouldComplete = isResolvedStatus(newStatusName) && !isResolvedStatus(oldStatusName);

      let action: 'paused' | 'resumed' | 'completed' | 'none' = 'none';
      let message = '';

      if (shouldPause) {
        await slaService.pauseSLA(ticketId);
        action = 'paused';
        message = `SLA paused for ticket ${ticketId} due to status change to ${newStatus.name}`;
        logger.info(`SLA paused for ticket ${ticketId} - status changed to ${newStatus.name}`);
      } else if (shouldResume) {
        await slaService.resumeSLA(ticketId);
        action = 'resumed';
        message = `SLA resumed for ticket ${ticketId} due to status change to ${newStatus.name}`;
        logger.info(`SLA resumed for ticket ${ticketId} - status changed to ${newStatus.name}`);
      } else if (shouldComplete) {
        await slaService.processResolutionSLA(ticketId);
        action = 'completed';
        message = `SLA completed for ticket ${ticketId} due to status change to ${newStatus.name}`;
        logger.info(`SLA completed for ticket ${ticketId} - status changed to ${newStatus.name}`);
      }

      return {
        success: true,
        action,
        message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error handling SLA status change for ticket ${ticketId}: ${errorMessage}`);
      return {
        success: false,
        action: 'none',
        message: 'Failed to handle SLA status change',
        error: errorMessage
      };
    }
  }

  /**
   * Handle SLA policy assignment when ticket priority changes
   */
  async handlePriorityChange(
    ticketId: number,
    oldPriorityId: number,
    newPriorityId: number
  ): Promise<SLAApplicationResult> {
    try {
      if (oldPriorityId === newPriorityId) {
        return {
          success: true,
          action: 'none',
          message: 'Priority unchanged'
        };
      }

      // Get the ticket with current data
      const ticketRepository = getRepository(Ticket);
      const ticket = await ticketRepository.findOne({
        where: { id: ticketId } as any,
        relations: ['priority']
      });

      if (!ticket) {
        return {
          success: false,
          action: 'none',
          message: 'Ticket not found',
          error: 'Invalid ticket ID'
        };
      }

      // Auto-assign new SLA policy based on new priority
      const slaPolicyTicket = await slaService.autoAssignSLAPolicy(ticket);
      
      if (slaPolicyTicket) {
        logger.info(`SLA policy reassigned for ticket ${ticketId} due to priority change`);
        return {
          success: true,
          action: 'completed',
          message: `SLA policy updated for ticket ${ticketId} based on new priority`
        };
      } else {
        return {
          success: true,
          action: 'none',
          message: `No SLA policy available for ticket ${ticketId} with new priority`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error handling SLA priority change for ticket ${ticketId}: ${errorMessage}`);
      return {
        success: false,
        action: 'none',
        message: 'Failed to handle SLA priority change',
        error: errorMessage
      };
    }
  }

  /**
   * Check and update SLA statuses for all active tickets
   * This replaces the database trigger functionality
   */
  async checkAndUpdateSLAStatuses(limit: number = 100): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    try {
      const ticketRepository = getRepository(Ticket);
      
      // Get active tickets that need SLA status updates
      const activeTickets = await ticketRepository.find({
        where: {
          slaStatus: 'active' // Only check active SLA tickets
        } as any,
        relations: ['status', 'priority'],
        take: limit
      });

      let updated = 0;
      let errors = 0;

      for (const ticket of activeTickets) {
        try {
          const slaStatus = await slaService.checkSLAStatus(ticket);
          
          // Update ticket SLA breach status if needed
          if (slaStatus.isFirstResponseBreached || slaStatus.isResolutionBreached) {
            await ticketRepository.update(ticket.id, {
              firstResponseSlaBreached: slaStatus.isFirstResponseBreached,
              resolutionSlaBreached: slaStatus.isResolutionBreached
            });
            updated++;
          }
        } catch (error) {
          errors++;
          logger.error(`Error checking SLA status for ticket ${ticket.id}: ${error}`);
        }
      }

      return {
        processed: activeTickets.length,
        updated,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in batch SLA status check: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Process SLA escalations for tickets approaching or breaching deadlines
   */
  async processSLAEscalations(): Promise<{
    processed: number;
    escalated: number;
    errors: number;
  }> {
    try {
      const ticketRepository = getRepository(Ticket);
      
      // Get tickets that are approaching SLA deadlines
      const ticketsNeedingEscalation = await ticketRepository.find({
        where: {
          slaStatus: 'active'
        } as any,
        relations: ['status', 'priority', 'assignee', 'requester'],
        take: 50 // Process in smaller batches
      });

      let escalated = 0;
      let errors = 0;

      for (const ticket of ticketsNeedingEscalation) {
        try {
          const slaStatus = await slaService.checkSLAStatus(ticket);
          
          // Check if escalation is needed (e.g., 80% of SLA time passed)
          const needsEscalation = 
            slaStatus.firstResponsePercentage >= 80 || 
            slaStatus.resolutionPercentage >= 80;

          if (needsEscalation) {
            // Trigger escalation actions
            await this.triggerEscalationActions(ticket, slaStatus);
            escalated++;
          }
        } catch (error) {
          errors++;
          logger.error(`Error processing escalation for ticket ${ticket.id}: ${error}`);
        }
      }

      return {
        processed: ticketsNeedingEscalation.length,
        escalated,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in SLA escalation processing: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Trigger escalation actions for a ticket
   */
  private async triggerEscalationActions(ticket: Ticket, slaStatus: any): Promise<void> {
    // This would integrate with notification service and other escalation actions
    logger.info(`Escalation triggered for ticket ${ticket.id} - SLA at ${slaStatus.firstResponsePercentage}%`);
    
    // TODO: Implement actual escalation actions
    // - Send notifications to managers
    // - Increase ticket priority
    // - Reassign to senior agent
    // - Create escalation ticket
  }
}

export default new SLAApplicationService(); 