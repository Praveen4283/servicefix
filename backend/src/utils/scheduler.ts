import { logger } from './logger';
import slaService from '../services/sla.service';
import { TicketStatus } from '../models/TicketStatus';
import { AppDataSource } from '../config/database';
import { Ticket } from '../models/Ticket';
import { SLAPolicyTicket } from '../models/SLAPolicyTicket';
import { Not, IsNull, LessThan } from 'typeorm';
import notificationService from '../services/notification.service';

// Track interval IDs for clean shutdown
let scheduledJobs: NodeJS.Timeout[] = [];

/**
 * Start all scheduled jobs
 */
export function startScheduledJobs() {
  logger.info('Starting scheduled jobs');
  
  // Check SLAs every 5 minutes
  const slaCheckIntervalId = setInterval(async () => {
    try {
      logger.info('Running scheduled SLA check');
      const processedCount = await slaService.processEscalations();
      logger.info(`Processed ${processedCount} SLA escalations`);
    } catch (error) {
      logger.error('Error in scheduled SLA check:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  scheduledJobs.push(slaCheckIntervalId);
  
  // Check for SLA breaches every 3 minutes
  const slaBreachCheckIntervalId = setInterval(async () => {
    try {
      logger.info('Running scheduled SLA breach check');
      await checkAndUpdateSLABreaches();
    } catch (error) {
      logger.error('Error in scheduled SLA breach check:', error);
    }
  }, 3 * 60 * 1000); // 3 minutes
  
  scheduledJobs.push(slaBreachCheckIntervalId);
  
  // Reset next response SLAs for tickets with new customer responses every 10 minutes
  const resetNextResponseIntervalId = setInterval(async () => {
    try {
      logger.info('Running scheduled next response SLA reset check');
      await resetNextResponseSLAs();
    } catch (error) {
      logger.error('Error in scheduled next response SLA reset:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes
  
  scheduledJobs.push(resetNextResponseIntervalId);
  
  // Auto-close resolved tickets based on SLA configuration
  const autoCloseIntervalId = setInterval(async () => {
    try {
      logger.info('Running auto-close for resolved tickets');
      await autoCloseResolvedTickets();
    } catch (error) {
      logger.error('Error in auto-close process:', error);
    }
  }, 60 * 60 * 1000); // Hourly
  
  scheduledJobs.push(autoCloseIntervalId);
}

/**
 * Check for SLA breaches and update ticket status
 */
async function checkAndUpdateSLABreaches() {
  const now = new Date();
  const ticketRepository = AppDataSource.getRepository(Ticket);
  const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
  
  // Find all SLA policy tickets that have due dates in the past but haven't been marked as breached
  const firstResponseBreaches = await slaPolicyTicketRepository.find({
    where: {
      firstResponseDueAt: LessThan(now),
      firstResponseMet: IsNull()
    },
    relations: ['ticket', 'ticket.assignee', 'ticket.status', 'slaPolicy', 'ticket.priority']
  });
  
  const resolutionBreaches = await slaPolicyTicketRepository.find({
    where: {
      resolutionDueAt: LessThan(now),
      resolutionMet: IsNull()
    },
    relations: ['ticket', 'ticket.assignee', 'ticket.status', 'slaPolicy', 'ticket.priority']
  });
  
  let firstResponseBreachCount = 0;
  let resolutionBreachCount = 0;
  
  // Update first response breach flags
  for (const slaPolicyTicket of firstResponseBreaches) {
    if (!slaPolicyTicket.ticket || slaPolicyTicket.ticket.resolvedAt || slaPolicyTicket.ticket.closedAt) {
      continue; // Skip resolved or closed tickets
    }
    
    try {
      // Update the SLA policy ticket
      slaPolicyTicket.firstResponseMet = false;
      await slaPolicyTicketRepository.save(slaPolicyTicket);
      
      // Update the ticket breach flag
      await ticketRepository.update(slaPolicyTicket.ticketId, {
        firstResponseSlaBreached: true,
        slaStatus: 'first_response_breached'
      });
      
      // Send notification to assignee
      if (slaPolicyTicket.ticket.assignee) {
        // Send in-app notification
        await notificationService.createInAppNotification(
          slaPolicyTicket.ticket.assigneeId.toString(), 
          {
            title: `SLA Breached: First Response Due`,
            message: `First response SLA breached for ticket #${slaPolicyTicket.ticketId}: ${slaPolicyTicket.ticket.subject}`,
            type: 'sla_breach',
            link: `/tickets/${slaPolicyTicket.ticketId}`
          }
        );
        
        // Send email notification if possible
        if (slaPolicyTicket.ticket.assignee.email) {
          await notificationService.sendEmail({
            to: slaPolicyTicket.ticket.assignee.email,
            subject: `[URGENT] SLA Breach: First Response Due - Ticket #${slaPolicyTicket.ticketId}`,
            html: `
              <h2>SLA Breach Alert</h2>
              <p>The first response SLA has been breached for:</p>
              <p><strong>Ticket #${slaPolicyTicket.ticketId}:</strong> ${slaPolicyTicket.ticket.subject}</p>
              <p><strong>Priority:</strong> ${slaPolicyTicket.ticket.priority?.name || 'Unknown'}</p>
              <p>Please respond to this ticket as soon as possible.</p>
              <p><a href="${process.env.FRONTEND_URL}/tickets/${slaPolicyTicket.ticketId}">View Ticket</a></p>
            `
          });
        }
      }
      
      firstResponseBreachCount++;
      logger.info(`First response SLA breached for ticket #${slaPolicyTicket.ticketId}`);
    } catch (error) {
      logger.error(`Error updating first response SLA breach for ticket ${slaPolicyTicket.ticketId}:`, error);
    }
  }
  
  // Update resolution breach flags
  for (const slaPolicyTicket of resolutionBreaches) {
    if (!slaPolicyTicket.ticket || slaPolicyTicket.ticket.resolvedAt || slaPolicyTicket.ticket.closedAt) {
      continue; // Skip resolved or closed tickets
    }
    
    try {
      // Update the SLA policy ticket
      slaPolicyTicket.resolutionMet = false;
      await slaPolicyTicketRepository.save(slaPolicyTicket);
      
      // Update the ticket breach flag
      await ticketRepository.update(slaPolicyTicket.ticketId, {
        resolutionSlaBreached: true,
        slaStatus: 'resolution_breached'
      });
      
      // Send notification to assignee
      if (slaPolicyTicket.ticket.assignee) {
        // Send in-app notification
        await notificationService.createInAppNotification(
          slaPolicyTicket.ticket.assigneeId.toString(), 
          {
            title: `SLA Breached: Resolution Due`,
            message: `Resolution SLA breached for ticket #${slaPolicyTicket.ticketId}: ${slaPolicyTicket.ticket.subject}`,
            type: 'sla_breach',
            link: `/tickets/${slaPolicyTicket.ticketId}`
          }
        );
        
        // Send email notification if possible
        if (slaPolicyTicket.ticket.assignee.email) {
          await notificationService.sendEmail({
            to: slaPolicyTicket.ticket.assignee.email,
            subject: `[URGENT] SLA Breach: Resolution Due - Ticket #${slaPolicyTicket.ticketId}`,
            html: `
              <h2>SLA Breach Alert</h2>
              <p>The resolution SLA has been breached for:</p>
              <p><strong>Ticket #${slaPolicyTicket.ticketId}:</strong> ${slaPolicyTicket.ticket.subject}</p>
              <p><strong>Priority:</strong> ${slaPolicyTicket.ticket.priority?.name || 'Unknown'}</p>
              <p>Please resolve this ticket as soon as possible.</p>
              <p><a href="${process.env.FRONTEND_URL}/tickets/${slaPolicyTicket.ticketId}">View Ticket</a></p>
            `
          });
        }
      }
      
      resolutionBreachCount++;
      logger.info(`Resolution SLA breached for ticket #${slaPolicyTicket.ticketId}`);
    } catch (error) {
      logger.error(`Error updating resolution SLA breach for ticket ${slaPolicyTicket.ticketId}:`, error);
    }
  }
  
  logger.info(`SLA breach check completed. First response breaches: ${firstResponseBreachCount}, Resolution breaches: ${resolutionBreachCount}`);
}

/**
 * Reset next response SLAs for tickets with new customer comments
 */
async function resetNextResponseSLAs() {
  // Get all active tickets
  const ticketRepository = AppDataSource.getRepository(Ticket);
  const tickets = await ticketRepository.find({
    where: {
      resolvedAt: IsNull(),
      closedAt: IsNull()
    },
    relations: ['comments']
  });
  
  let resetCount = 0;
  
  // For each ticket, check the latest comment
  for (const ticket of tickets) {
    if (!ticket.comments || ticket.comments.length === 0) continue;
    
    // Sort comments by newest first
    const sortedComments = ticket.comments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Check if the latest comment is from a customer
    const latestComment = sortedComments[0];
    if (latestComment && latestComment.userId !== ticket.assigneeId && !latestComment.isInternal) {
      try {
        await slaService.resetNextResponseSLA(ticket.id);
        resetCount++;
      } catch (error) {
        logger.error(`Error resetting next response SLA for ticket ${ticket.id}:`, error);
      }
    }
  }
  
  logger.info(`Reset next response SLAs for ${resetCount} tickets`);
}

/**
 * Auto-close resolved tickets based on SLA configuration
 */
async function autoCloseResolvedTickets() {
  // Get settings for auto-close days
  // This is a simplified implementation - in a real app you would load this from settings
  const autoCloseDays = 3; // Default 3 days
  
  if (autoCloseDays <= 0) {
    return; // Feature disabled
  }
  
  const ticketRepository = AppDataSource.getRepository(Ticket);
  const ticketStatusRepository = AppDataSource.getRepository(TicketStatus);
  
  // Find all resolved tickets that should be auto-closed
  const resolvedTickets = await ticketRepository.find({
    where: {
      resolvedAt: Not(IsNull()),
      closedAt: IsNull()
    },
    relations: ['status']
  });
  
  // Find a "closed" status to use
  const closedStatuses = await ticketStatusRepository.find({
    where: {
      isResolved: true
    }
  });
  
  if (closedStatuses.length === 0) {
    logger.error('No closed status found for auto-closing tickets');
    return;
  }
  
  const closedStatus = closedStatuses[0];
  const now = new Date();
  let closedCount = 0;
  
  for (const ticket of resolvedTickets) {
    const resolvedAt = new Date(ticket.resolvedAt);
    const daysSinceResolved = Math.floor((now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceResolved >= autoCloseDays) {
      try {
        ticket.closedAt = new Date();
        ticket.statusId = closedStatus.id;
        await ticketRepository.save(ticket);
        closedCount++;
      } catch (error) {
        logger.error(`Error auto-closing ticket ${ticket.id}:`, error);
      }
    }
  }
  
  logger.info(`Auto-closed ${closedCount} tickets`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs() {
  logger.info('Stopping scheduled jobs');
  
  scheduledJobs.forEach(intervalId => {
    clearInterval(intervalId);
  });
  
  scheduledJobs = [];
} 