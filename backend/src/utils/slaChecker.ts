import { query } from '../config/database';
import { logger } from './logger';
import { AppDataSource } from '../config/database';
import { SLAPolicyTicket } from '../models/SLAPolicyTicket';

/**
 * Utility to check and fix missed SLA first responses
 * This runs as a periodic job to make sure SLA first responses 
 * aren't missed when agents respond to tickets
 */
export async function checkMissedFirstResponses(limit = 100): Promise<number> {
  try {
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
          
          logger.info(`[SLA Checker] Fixed missed first response SLA for ticket #${ticket.id}. Within SLA: ${isWithinSLA}`);
        }
      } catch (ticketError) {
        logger.error(`[SLA Checker] Error processing missed first response for ticket #${ticket.id}:`, ticketError);
      }
    }
    
    return ticketsProcessed.length;
  } catch (error) {
    logger.error('[SLA Checker] Error checking missed first responses:', error);
    return 0;
  }
}

/**
 * Check for SLA breaches that might not have been properly updated in the tickets table
 */
export async function updateSLABreachStatuses(limit = 100): Promise<number> {
  try {
    // Find tickets with active SLAs
    const result = await query(`
      SELECT 
        t.id,
        t.first_response_sla_breached,
        t.resolution_sla_breached,
        t.sla_status,
        spt.first_response_due_at,
        spt.resolution_due_at
      FROM tickets t
      JOIN sla_policy_tickets spt ON t.id = spt.ticket_id
      WHERE t.resolved_at IS NULL 
        AND t.closed_at IS NULL
        AND spt.resolution_met IS NULL
      LIMIT $1
    `, [limit]);
    
    const now = new Date();
    let updatedCount = 0;
    
    for (const ticket of result.rows) {
      try {
        // Check if SLAs should be breached based on current time
        const firstResponseDueAt = new Date(ticket.first_response_due_at);
        const resolutionDueAt = new Date(ticket.resolution_due_at);
        
        const isFirstResponseBreached = firstResponseDueAt < now;
        const isResolutionBreached = resolutionDueAt < now;
        
        // If status needs updating
        if (isFirstResponseBreached !== ticket.first_response_sla_breached || 
            isResolutionBreached !== ticket.resolution_sla_breached) {
          
          // Determine SLA status value
          let slaStatus = ticket.sla_status;
          
          // Only update status if it's not paused
          if (slaStatus !== 'paused') {
            if (isResolutionBreached) {
              slaStatus = 'breached';
            } else {
              // Calculate resolution percentage
              const createdAt = await query(
                'SELECT created_at FROM tickets WHERE id = $1',
                [ticket.id]
              );
              
              if (createdAt.rows.length > 0) {
                const ticketCreatedAt = new Date(createdAt.rows[0].created_at);
                const totalResolutionMinutes = Math.floor((resolutionDueAt.getTime() - ticketCreatedAt.getTime()) / 60000);
                const elapsedMinutes = Math.floor((now.getTime() - ticketCreatedAt.getTime()) / 60000);
                const resolutionPercentage = Math.min(100, Math.floor((elapsedMinutes / totalResolutionMinutes) * 100));
                
                if (resolutionPercentage >= 90) {
                  slaStatus = 'critical';
                } else if (resolutionPercentage >= 75) {
                  slaStatus = 'warning';
                } else {
                  slaStatus = 'active';
                }
              }
            }
          }
          
          // Update the ticket
          await query(
            `UPDATE tickets 
             SET first_response_sla_breached = $1, 
                 resolution_sla_breached = $2,
                 sla_status = $3
             WHERE id = $4`,
            [isFirstResponseBreached, isResolutionBreached, slaStatus, ticket.id]
          );
          
          updatedCount++;
          logger.info(`[SLA Checker] Updated SLA breach status for ticket #${ticket.id}. First response breached: ${isFirstResponseBreached}, Resolution breached: ${isResolutionBreached}, Status: ${slaStatus}`);
        }
      } catch (ticketError) {
        logger.error(`[SLA Checker] Error updating SLA breach status for ticket #${ticket.id}:`, ticketError);
      }
    }
    
    return updatedCount;
  } catch (error) {
    logger.error('[SLA Checker] Error updating SLA breach statuses:', error);
    return 0;
  }
}

/**
 * Fix breached SLAs that aren't properly marked in the tickets table
 * This specifically addresses tickets where first_response_sla_breached is false
 * but the deadline has passed
 */
export async function fixBreachedSLAs(limit = 100): Promise<number> {
  try {
    const now = new Date();
    
    // Find tickets where first response deadline has passed but breach flag is false
    const result = await query(`
      SELECT 
        t.id,
        t.first_response_sla_breached,
        t.resolution_sla_breached,
        spt.id as sla_policy_ticket_id,
        spt.first_response_due_at,
        spt.first_response_met,
        spt.resolution_due_at,
        spt.resolution_met
      FROM tickets t
      JOIN sla_policy_tickets spt ON t.id = spt.ticket_id
      WHERE 
        (
          -- First response: Find cases where deadline has passed but breach flag is false
          (spt.first_response_due_at < NOW() AND (t.first_response_sla_breached = false OR t.first_response_sla_breached IS NULL))
          OR
          -- Resolution: Find cases where deadline has passed but breach flag is false 
          (spt.resolution_due_at < NOW() AND (t.resolution_sla_breached = false OR t.resolution_sla_breached IS NULL))
        )
        -- Only consider tickets that aren't resolved yet
        AND t.resolved_at IS NULL
        -- Skip tickets with paused SLAs
        AND t.sla_status != 'paused'
      LIMIT $1
    `, [limit]);
    
    let updatedCount = 0;
    
    for (const ticket of result.rows) {
      try {
        const ticketId = ticket.id;
        const firstResponseDueAt = new Date(ticket.first_response_due_at);
        const resolutionDueAt = new Date(ticket.resolution_due_at);
        
        const isFirstResponseBreached = firstResponseDueAt < now && ticket.first_response_met !== true;
        const isResolutionBreached = resolutionDueAt < now && ticket.resolution_met !== true;
        
        // Determine appropriate SLA status
        let slaStatus = 'active';
        if (isResolutionBreached) {
          slaStatus = 'breached';
        } else {
          // Calculate resolution percentage
          const createdAt = await query(
            'SELECT created_at FROM tickets WHERE id = $1',
            [ticketId]
          );
          
          if (createdAt.rows.length > 0) {
            const ticketCreatedAt = new Date(createdAt.rows[0].created_at);
            const totalResolutionMinutes = Math.floor((resolutionDueAt.getTime() - ticketCreatedAt.getTime()) / 60000);
            const elapsedMinutes = Math.floor((now.getTime() - ticketCreatedAt.getTime()) / 60000);
            const resolutionPercentage = Math.min(100, Math.floor((elapsedMinutes / totalResolutionMinutes) * 100));
            
            if (resolutionPercentage >= 90) {
              slaStatus = 'critical';
            } else if (resolutionPercentage >= 75) {
              slaStatus = 'warning';
            }
          }
        }
        
        // Also update SLA policy ticket if needed
        if (isFirstResponseBreached && ticket.first_response_met === null) {
          await query(
            'UPDATE sla_policy_tickets SET first_response_met = false WHERE id = $1',
            [ticket.sla_policy_ticket_id]
          );
          logger.info(`[SLA Checker] Updated SLA policy ticket ${ticket.sla_policy_ticket_id} with first_response_met = false`);
        }
        
        if (isResolutionBreached && ticket.resolution_met === null) {
          await query(
            'UPDATE sla_policy_tickets SET resolution_met = false WHERE id = $1',
            [ticket.sla_policy_ticket_id]
          );
          logger.info(`[SLA Checker] Updated SLA policy ticket ${ticket.sla_policy_ticket_id} with resolution_met = false`);
        }
        
        // Update the ticket
        await query(
          `UPDATE tickets 
           SET first_response_sla_breached = $1, 
               resolution_sla_breached = $2,
               sla_status = $3
           WHERE id = $4`,
          [isFirstResponseBreached, isResolutionBreached, slaStatus, ticketId]
        );
        
        updatedCount++;
        logger.info(`[SLA Checker] Fixed SLA breach status for ticket #${ticketId}. First response breached: ${isFirstResponseBreached}, Resolution breached: ${isResolutionBreached}, Status: ${slaStatus}`);
      } catch (ticketError) {
        logger.error(`[SLA Checker] Error fixing SLA breach status for ticket #${ticket.id}:`, ticketError);
      }
    }
    
    return updatedCount;
  } catch (error) {
    logger.error('[SLA Checker] Error fixing breached SLAs:', error);
    return 0;
  }
} 