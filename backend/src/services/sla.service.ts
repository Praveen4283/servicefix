import { getRepository, Between, In, Not } from 'typeorm';
import { SLAPolicy } from '../models/SLAPolicy';
import { SLAPolicyTicket } from '../models/SLAPolicyTicket';
import { Ticket } from '../models/Ticket';
import { TicketPriority } from '../models/TicketPriority';
import notificationService from './notification.service';
import { logger } from '../utils/logger';
import { addBusinessHours, isWithinBusinessHours, createUTCDate } from '../utils/dateUtils';
import { AppDataSource } from '../config/database';

/**
 * SLA configuration based on ticket priority
 */
interface SLAConfig {
  firstResponseHours: number;
  resolutionHours: number;
}

/**
 * Map of default SLA configurations by priority
 */
const DEFAULT_SLA_CONFIGS: Record<string, SLAConfig> = {
  'low': {
    firstResponseHours: 24, // 24 hours
    resolutionHours: 7 * 24, // 7 days
  },
  'medium': {
    firstResponseHours: 12, // 12 hours
    resolutionHours: 3 * 24, // 3 days
  },
  'high': {
    firstResponseHours: 4, // 4 hours
    resolutionHours: 24, // 24 hours
  },
  'urgent': {
    firstResponseHours: 1, // 1 hour
    resolutionHours: 8, // 8 hours
  },
};

/**
 * Escalation level configuration
 */
interface EscalationLevel {
  level: number;
  percentageOfSLA: number; // Percentage of SLA time passed to trigger this level
  actions: Array<'notify_agent' | 'notify_manager' | 'reassign' | 'increase_priority'>;
}

/**
 * Escalation levels configuration
 */
const ESCALATION_LEVELS: EscalationLevel[] = [
  {
    level: 1,
    percentageOfSLA: 75, // 75% of SLA time passed
    actions: ['notify_agent'],
  },
  {
    level: 2,
    percentageOfSLA: 90, // 90% of SLA time passed
    actions: ['notify_agent', 'notify_manager'],
  },
  {
    level: 3,
    percentageOfSLA: 100, // 100% of SLA time (SLA breached)
    actions: ['notify_agent', 'notify_manager', 'reassign'],
  },
  {
    level: 4,
    percentageOfSLA: 120, // 120% of SLA time passed
    actions: ['notify_agent', 'notify_manager', 'reassign', 'increase_priority'],
  },
];

/**
 * Interface to track SLA pause periods
 */
interface SLAPausePeriod {
  startedAt: Date;
  endedAt?: Date;
}

class SLAService {
  /**
   * Calculate SLA deadlines for a ticket
   * @param ticket Ticket to calculate SLA for
   * @returns SLA deadline timestamps
   */
  async calculateSLADeadlines(ticket: Ticket): Promise<{ 
    firstResponseDueAt: Date; 
    resolutionDueAt: Date;
  }> {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);

    // Check if ticket has SLA policy already assigned
    const existingSLA = await slaPolicyTicketRepository.findOne({
      where: { ticketId: ticket.id } as any,
      relations: ['slaPolicy']
    });

    let slaConfig: { firstResponseHours: number; resolutionHours: number };
    let useBusinessHours = true;

    if (existingSLA && existingSLA.slaPolicy) {
      // Use the SLA policy configuration
      slaConfig = {
        firstResponseHours: existingSLA.slaPolicy.firstResponseHours,
        resolutionHours: existingSLA.slaPolicy.resolutionHours,
      };
      useBusinessHours = existingSLA.slaPolicy.businessHoursOnly;
    } else {
      // Use default SLA based on priority
      const fullTicket = await ticketRepository.findOne({
        where: { id: ticket.id },
        relations: ['priority']
      });

      const priorityName = fullTicket?.priority?.name?.toLowerCase() || 'medium';
      slaConfig = DEFAULT_SLA_CONFIGS[priorityName] || DEFAULT_SLA_CONFIGS['medium'];
    }

    const createdAt = createUTCDate(ticket.createdAt);
    
    let firstResponseDueAt, resolutionDueAt;
    
    // Calculate deadlines based on business hours setting
    firstResponseDueAt = addBusinessHours(createdAt, slaConfig.firstResponseHours, useBusinessHours);
    resolutionDueAt = addBusinessHours(createdAt, slaConfig.resolutionHours, useBusinessHours);
    
    return {
      firstResponseDueAt,
      resolutionDueAt,
    };
  }
  
  /**
   * Check if a ticket is meeting its SLA
   * @param ticket Ticket to check
   * @returns SLA status information
   */
  async checkSLAStatus(ticket: Ticket): Promise<{
    isFirstResponseBreached: boolean;
    isResolutionBreached: boolean;
    firstResponseRemainingMinutes: number;
    resolutionRemainingMinutes: number;
    firstResponsePercentage: number;
    resolutionPercentage: number;
    slaInfo: SLAPolicyTicket | null;
  }> {
    const now = createUTCDate();
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    
    // Get SLA information for the ticket
    const slaInfo = await slaPolicyTicketRepository.findOne({
      where: { ticketId: ticket.id } as any,
      relations: ['slaPolicy']
    });

    let firstResponseDueAt, resolutionDueAt;
    
    if (slaInfo) {
      firstResponseDueAt = slaInfo.firstResponseDueAt;
      resolutionDueAt = slaInfo.resolutionDueAt;
    } else {
      // Calculate SLA deadlines if not found
      const deadlines = await this.calculateSLADeadlines(ticket);
      firstResponseDueAt = deadlines.firstResponseDueAt;
      resolutionDueAt = deadlines.resolutionDueAt;
    }
    
    // Check if the SLA is currently paused
    let isPaused = false;
    if (slaInfo?.metadata) {
      try {
        let metadata;
        
        // Check if metadata is already an object or needs to be parsed from string
        if (typeof slaInfo.metadata === 'string') {
          metadata = JSON.parse(slaInfo.metadata);
        } else {
          metadata = slaInfo.metadata;
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
    
    // If SLA is paused, return special values
    if (isPaused) {
      return {
        isFirstResponseBreached: false,
        isResolutionBreached: false,
        // Return high values for remaining minutes when paused
        firstResponseRemainingMinutes: 999999,
        resolutionRemainingMinutes: 999999,
        // Use low percentages to indicate "not counting" while paused
        firstResponsePercentage: 0,
        resolutionPercentage: 0,
        slaInfo
      };
    }
    
    // Calculate remaining time in minutes
    const firstResponseRemainingMinutes = Math.floor((firstResponseDueAt.getTime() - now.getTime()) / 60000);
    const resolutionRemainingMinutes = Math.floor((resolutionDueAt.getTime() - now.getTime()) / 60000);
    
    // Calculate percentage of SLA time used
    const createdAt = createUTCDate(ticket.createdAt);
    const totalFirstResponseMinutes = Math.floor((firstResponseDueAt.getTime() - createdAt.getTime()) / 60000);
    const totalResolutionMinutes = Math.floor((resolutionDueAt.getTime() - createdAt.getTime()) / 60000);
    
    // For elapsed time, consider pause periods if they exist
    let elapsedMinutesSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    
    // Subtract any pause periods from the elapsed time
    if (slaInfo?.metadata) {
      try {
        let metadata;
        
        // Check if metadata is already an object or needs to be parsed from string
        if (typeof slaInfo.metadata === 'string') {
          metadata = JSON.parse(slaInfo.metadata);
        } else {
          metadata = slaInfo.metadata;
        }
        
        if (Array.isArray(metadata.pausePeriods)) {
          let totalPausedMinutes = 0;
          
          for (const period of metadata.pausePeriods) {
            if (period.startedAt) {
              const startDate = createUTCDate(period.startedAt);
              // For periods with an end time, use it; otherwise use current time (for ongoing pauses)
              const endDate = period.endedAt ? createUTCDate(period.endedAt) : now;
              
              // Only count if the pause started after ticket creation
              if (startDate > createdAt) {
                const pausedMs = endDate.getTime() - startDate.getTime();
                const pausedMinutes = Math.max(0, Math.ceil(pausedMs / (1000 * 60)));
                totalPausedMinutes += pausedMinutes;
              }
            }
          }
          
          // Subtract pause time from elapsed time
          elapsedMinutesSinceCreation = Math.max(0, elapsedMinutesSinceCreation - totalPausedMinutes);
        }
      } catch (err) {
        logger.error('Error calculating pause durations:', err);
      }
    }
    
    // Calculate SLA percentages based on adjusted elapsed time
    const firstResponsePercentage = Math.min(
      100, 
      Math.floor((elapsedMinutesSinceCreation / totalFirstResponseMinutes) * 100)
    );
    
    const resolutionPercentage = Math.min(
      100, 
      Math.floor((elapsedMinutesSinceCreation / totalResolutionMinutes) * 100)
    );
    
    return {
      isFirstResponseBreached: firstResponseRemainingMinutes <= 0,
      isResolutionBreached: resolutionRemainingMinutes <= 0,
      firstResponseRemainingMinutes,
      resolutionRemainingMinutes,
      firstResponsePercentage,
      resolutionPercentage,
      slaInfo,
    };
  }

  /**
   * Assign an SLA policy to a ticket
   */
  async assignSLAToTicket(ticketId: number, slaPolicyId: number): Promise<SLAPolicyTicket> {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);

    // Get ticket and SLA policy
    const ticket = await ticketRepository.findOneOrFail({ where: { id: ticketId } });
    const slaPolicy = await slaPolicyRepository.findOneOrFail({ where: { id: slaPolicyId } });

    // Calculate SLA deadlines
    const createdAt = createUTCDate(ticket.createdAt);
    let firstResponseDueAt, resolutionDueAt;

    if (slaPolicy.businessHoursOnly) {
      firstResponseDueAt = addBusinessHours(createdAt, slaPolicy.firstResponseHours);
      resolutionDueAt = addBusinessHours(createdAt, slaPolicy.resolutionHours);
    } else {
      firstResponseDueAt = createUTCDate(createdAt);
      firstResponseDueAt.setHours(firstResponseDueAt.getHours() + slaPolicy.firstResponseHours);

      resolutionDueAt = createUTCDate(createdAt);
      resolutionDueAt.setHours(resolutionDueAt.getHours() + slaPolicy.resolutionHours);
    }

    // Check if ticket already has an SLA policy
    let slaPolicyTicket = await slaPolicyTicketRepository.findOne({ 
      where: { ticketId } as any 
    });

    if (slaPolicyTicket) {
      // Update existing SLA policy ticket
      slaPolicyTicket.slaPolicyId = slaPolicyId;
      slaPolicyTicket.firstResponseDueAt = firstResponseDueAt;
      slaPolicyTicket.resolutionDueAt = resolutionDueAt;
      slaPolicyTicket.firstResponseMet = undefined;
      slaPolicyTicket.resolutionMet = undefined;
    } else {
      // Create new SLA policy ticket
      slaPolicyTicket = slaPolicyTicketRepository.create({
        ticketId,
        slaPolicyId,
        firstResponseDueAt,
        resolutionDueAt,
      });
    }

    // Save SLA policy ticket
    await slaPolicyTicketRepository.save(slaPolicyTicket);

    return slaPolicyTicket;
  }

  /**
   * Process ticket first response and update SLA status
   */
  async processFirstResponse(ticketId: number): Promise<void> {
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    const now = createUTCDate();

    // Get SLA information for the ticket
    const slaInfo = await slaPolicyTicketRepository.findOne({ 
      where: { ticketId } as any 
    });

    if (slaInfo && slaInfo.firstResponseMet === undefined) {
      // Check if response is within SLA
      const isWithinSLA = now <= slaInfo.firstResponseDueAt;
      
      // Update SLA status
      slaInfo.firstResponseMet = isWithinSLA;
      await slaPolicyTicketRepository.save(slaInfo);

      logger.info(`Ticket ${ticketId} first response processed. Within SLA: ${isWithinSLA}`);
    }
  }

  /**
   * Process ticket resolution and update SLA status
   */
  async processResolution(ticketId: number): Promise<void> {
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    const now = createUTCDate();

    // Get SLA information for the ticket
    const slaInfo = await slaPolicyTicketRepository.findOne({ 
      where: { ticketId } as any 
    });

    if (slaInfo && slaInfo.resolutionMet === undefined) {
      // Check if resolution is within SLA
      const isWithinSLA = now <= slaInfo.resolutionDueAt;
      
      // Update SLA status
      slaInfo.resolutionMet = isWithinSLA;
      await slaPolicyTicketRepository.save(slaInfo);

      logger.info(`Ticket ${ticketId} resolution processed. Within SLA: ${isWithinSLA}`);
    }
  }
  
  /**
   * Check for tickets needing escalation and apply escalation actions
   * @returns Number of tickets escalated
   */
  async processEscalations(): Promise<number> {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    
    // Get all active tickets with SLA policies
    const slaTickets = await slaPolicyTicketRepository.find({
      relations: ['ticket', 'ticket.assignee', 'slaPolicy'],
      where: {
        resolutionMet: undefined, // Only unresolved tickets
      } as any
    });
    
    let escalatedCount = 0;
    const now = createUTCDate();
    
    for (const slaTicket of slaTickets) {
      // Calculate SLA percentage
      const createdAt = createUTCDate(slaTicket.ticket.createdAt);
      const totalResolutionMinutes = Math.floor((slaTicket.resolutionDueAt.getTime() - createdAt.getTime()) / 60000);
      const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
      const slaPercentage = Math.floor((elapsedMinutes / totalResolutionMinutes) * 100);
      
      // Find applicable escalation level
      for (const level of ESCALATION_LEVELS) {
        if (slaPercentage >= level.percentageOfSLA) {
          // Apply escalation actions
          await this.applyEscalationActions(slaTicket.ticket, level);
          escalatedCount++;
          break;
        }
      }
    }
    
    return escalatedCount;
  }
  
  /**
   * Apply escalation actions to a ticket
   */
  private async applyEscalationActions(ticket: Ticket, escalationLevel: EscalationLevel): Promise<void> {
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const priorityRepository = AppDataSource.getRepository(TicketPriority);
    
    for (const action of escalationLevel.actions) {
      switch (action) {
        case 'notify_agent':
          if (ticket.assignee) {
            // Use a simple notification instead
            logger.info(`SLA escalation level ${escalationLevel.level} for ticket ${ticket.id}: Agent notification to ${ticket.assignee.email}`);
          }
          break;
          
        case 'notify_manager':
          // This would require fetching the manager's email
          // For now, we'll just log it
          logger.info(`SLA escalation level ${escalationLevel.level} for ticket ${ticket.id}: Manager notification`);
          break;
          
        case 'reassign':
          // In a real implementation, this would reassign to another agent
          // For now, we'll just log it
          logger.info(`SLA escalation level ${escalationLevel.level} for ticket ${ticket.id}: Reassignment needed`);
          break;
          
        case 'increase_priority':
          if (ticket.priority) {
            // Use a simple order without 'level' property
            const priorities = await priorityRepository.find({
              where: { organizationId: ticket.organizationId }
            });
            
            // Sort by level if it exists, otherwise just use the array order
            priorities.sort((a, b) => {
              // @ts-ignore - level might exist as a property even if not defined in type
              if (a.level !== undefined && b.level !== undefined) {
                // @ts-ignore
                return b.level - a.level; // Sort DESC
              }
              return 0;
            });
            
            const currentPriorityIndex = priorities.findIndex(p => p.id === ticket.priorityId);
            
            if (currentPriorityIndex > 0) {
              // Increase to next higher priority
              const higherPriority = priorities[currentPriorityIndex - 1];
              await ticketRepository.update(ticket.id, { priorityId: higherPriority.id });
              logger.info(`SLA escalation level ${escalationLevel.level} for ticket ${ticket.id}: Priority increased to ${higherPriority.name}`);
            }
          }
          break;
      }
    }
  }

  /**
   * Get all SLA policies for an organization
   */
  async getAllSLAPolicies(organizationId: number): Promise<SLAPolicy[]> {
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    return slaPolicyRepository.find({
      where: { organizationId },
      relations: ['ticketPriority'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get SLA policy by ID
   */
  async getSLAPolicyById(id: number): Promise<SLAPolicy | null> {
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    return slaPolicyRepository.findOne({
      where: { id },
      relations: ['ticketPriority']
    });
  }

  /**
   * Get SLA policies for a ticket priority
   */
  async getSLAPoliciesByPriority(priorityId: number): Promise<SLAPolicy[]> {
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    return slaPolicyRepository.find({
      where: { ticketPriorityId: priorityId },
      relations: ['ticketPriority'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Create SLA policy
   */
  async createSLAPolicy(data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    
    // Check if policy already exists for this priority
    const existingPolicy = await slaPolicyRepository.findOne({
      where: { 
        organizationId: data.organizationId, 
        ticketPriorityId: data.ticketPriorityId 
      }
    });
    
    if (existingPolicy) {
      throw new Error('An SLA policy already exists for this priority');
    }
    
    const slaPolicy = slaPolicyRepository.create(data);
    return slaPolicyRepository.save(slaPolicy);
  }

  /**
   * Update SLA policy
   */
  async updateSLAPolicy(id: number, data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    const slaPolicy = await this.getSLAPolicyById(id);
    
    if (!slaPolicy) {
      throw new Error(`SLA policy with ID ${id} not found`);
    }
    
    // Check if priorityId is changing and if there's already a policy for that priority
    if (data.ticketPriorityId && data.ticketPriorityId !== slaPolicy.ticketPriorityId) {
      const existingPolicy = await slaPolicyRepository.findOne({
        where: { 
          organizationId: slaPolicy.organizationId, 
          ticketPriorityId: data.ticketPriorityId,
          id: Not(id) // Exclude the current policy
        } as any
      });
      
      if (existingPolicy) {
        throw new Error('An SLA policy already exists for this priority');
      }
    }
    
    // Merge the new data with the existing policy
    Object.assign(slaPolicy, data);
    
    // Save the updated policy
    const updatedPolicy = await slaPolicyRepository.save(slaPolicy);
    logger.info(`SLA policy ${id} updated: ${JSON.stringify(updatedPolicy)}`);
    
    // Explicitly fetch the policy again to ensure we have the latest data
    const refreshedPolicy = await this.getSLAPolicyById(id);
    if (!refreshedPolicy) {
      logger.error(`Failed to retrieve updated SLA policy ${id} after save`);
      return updatedPolicy; // Return what we have if refresh fails
    }
    
    return refreshedPolicy;
  }

  /**
   * Delete SLA policy
   */
  async deleteSLAPolicy(id: number): Promise<boolean> {
    const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
    const slaPolicy = await this.getSLAPolicyById(id);
    
    if (!slaPolicy) {
      return false;
    }
    
    await slaPolicyRepository.remove(slaPolicy);
    return true;
  }

  /**
   * Automatically assign SLA policy based on ticket priority
   */
  async autoAssignSLAPolicy(ticket: Ticket): Promise<SLAPolicyTicket | null> {
    if (!ticket.priorityId) {
      logger.warn(`Cannot assign SLA policy to ticket ${ticket.id}: No priority assigned`);
      return null;
    }
    
    try {
      const slaPolicyRepository = AppDataSource.getRepository(SLAPolicy);
      const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
      const ticketRepository = AppDataSource.getRepository(Ticket);
      
      // Find SLA policy for this priority
      const slaPolicy = await slaPolicyRepository.findOne({
        where: { 
          organizationId: ticket.organizationId,
          ticketPriorityId: ticket.priorityId
        }
      }) as SLAPolicy | null;
      
      // Get ticket with priority information
      const fullTicket = await ticketRepository.findOne({
        where: { id: ticket.id },
        relations: ['priority']
      });
      
      // If no direct policy match, try to find policy based on priority name
      let matchingPolicy: SLAPolicy | null = slaPolicy;
      if (!matchingPolicy && fullTicket?.priority?.name) {
        const priorityName = fullTicket.priority.name.toLowerCase();
        logger.info(`No direct SLA policy match, trying to find default SLA for priority name: ${priorityName}`);
        
        // Look for any policy matching the priority name pattern
        const policies = await slaPolicyRepository.find({
          where: { organizationId: ticket.organizationId }
        });
        
        // Try to find a policy with a name containing the priority name
        matchingPolicy = policies.find(p => 
          p.name.toLowerCase().includes(priorityName) || 
          (p.description && p.description.toLowerCase().includes(priorityName))
        ) || null; // Convert undefined to null
        
        if (matchingPolicy) {
          logger.info(`Found matching SLA policy ${matchingPolicy.id} for priority name ${priorityName}`);
        }
      }
      
      if (!matchingPolicy) {
        logger.warn(`No SLA policy found for ticket ${ticket.id} with priority ID ${ticket.priorityId}`);
        return null;
      }
      
      // Check if SLA is already assigned to this ticket
      const existingSLA = await slaPolicyTicketRepository.findOne({
        where: { ticketId: ticket.id } as any,
        relations: ['slaPolicy']
      });
      
      // If same policy is already assigned, check if we need to update it
      if (existingSLA && existingSLA.slaPolicyId === matchingPolicy.id) {
        logger.info(`Ticket ${ticket.id} already has SLA policy ${existingSLA.slaPolicyId} assigned`);
        return existingSLA;
      }
      
      // If priority changed, we need to update the SLA policy
      logger.info(`Assigning/updating SLA policy ${matchingPolicy.id} to ticket ${ticket.id} based on priority ID ${ticket.priorityId}`);
      
      // Create new SLA assignment or update existing one
      return this.assignSLAToTicket(ticket.id, matchingPolicy.id);
    } catch (error) {
      logger.error(`Error auto-assigning SLA policy to ticket ${ticket.id}:`, error);
      return null;
    }
  }

  /**
   * Calculate SLA deadlines based on policy settings and current time
   */
  calculateDeadlines(policy: SLAPolicy, startTime: Date) {
    // In a real implementation, you would:
    // 1. Calculate business hours if policy.businessHoursOnly is true
    // 2. Add the appropriate hours to the startTime
    
    // For now, we'll use a simple implementation
    const startTimeUTC = createUTCDate(startTime);
    
    const firstResponseDue = createUTCDate(startTimeUTC);
    firstResponseDue.setHours(firstResponseDue.getHours() + (policy.firstResponseHours || 0));
    
    const nextResponseDue = createUTCDate(startTimeUTC);
    nextResponseDue.setHours(nextResponseDue.getHours() + (policy.nextResponseHours || 0));
    
    const resolutionDue = createUTCDate(startTimeUTC);
    resolutionDue.setHours(resolutionDue.getHours() + (policy.resolutionHours || 0));
    
    return { firstResponseDue, nextResponseDue, resolutionDue };
  }

  /**
   * Get SLA metrics for a specific time period
   */
  async getSLAMetrics(organizationId: number, startDate: Date, endDate: Date): Promise<{
    totalTickets: number;
    responseSlaMet: number;
    responseSlaMissed: number;
    resolutionSlaMet: number;
    resolutionSlaMissed: number;
    responseCompliancePercentage: number;
    resolutionCompliancePercentage: number;
  }> {
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    const ticketRepository = AppDataSource.getRepository(Ticket);

    // Get tickets created within the time period
    const tickets = await ticketRepository.find({
      where: {
        organizationId,
        createdAt: Between(startDate, endDate) as any
      }
    });

    const ticketIds = tickets.map(t => t.id);

    // Get SLA data for those tickets
    const slaData = await slaPolicyTicketRepository.find({
      where: { 
        ticketId: In(ticketIds) as any
      }
    });

    const responseSlaMet = slaData.filter(s => s.firstResponseMet === true).length;
    const responseSlaMissed = slaData.filter(s => s.firstResponseMet === false).length;
    const resolutionSlaMet = slaData.filter(s => s.resolutionMet === true).length;
    const resolutionSlaMissed = slaData.filter(s => s.resolutionMet === false).length;

    const totalResponseMeasured = responseSlaMet + responseSlaMissed;
    const totalResolutionMeasured = resolutionSlaMet + resolutionSlaMissed;

    return {
      totalTickets: tickets.length,
      responseSlaMet,
      responseSlaMissed,
      resolutionSlaMet,
      resolutionSlaMissed,
      responseCompliancePercentage: totalResponseMeasured ? (responseSlaMet / totalResponseMeasured) * 100 : 100,
      resolutionCompliancePercentage: totalResolutionMeasured ? (resolutionSlaMet / totalResolutionMeasured) * 100 : 100,
    };
  }

  /**
   * Reset next response SLA for a ticket when a customer responds
   * @param ticketId Ticket ID to reset SLA for
   * @returns True if SLA was reset successfully
   */
  async resetNextResponseSLA(ticketId: number): Promise<boolean> {
    try {
      const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
      const ticketRepository = AppDataSource.getRepository(Ticket);
      
      // Get SLA information for the ticket
      const slaInfo = await slaPolicyTicketRepository.findOne({ 
        where: { ticketId } as any,
        relations: ['slaPolicy']
      });
      
      // Get ticket
      const ticket = await ticketRepository.findOne({
        where: { id: ticketId }
      });
      
      if (!slaInfo || !ticket || !slaInfo.slaPolicy) {
        logger.warn(`Cannot reset next response SLA for ticket ${ticketId}: SLA info not found`);
        return false;
      }
      
      // If there's a next_response_hours setting, calculate new due date
      if (slaInfo.slaPolicy.nextResponseHours) {
        const now = createUTCDate();
        let nextResponseDueAt: Date;
        
        if (slaInfo.slaPolicy.businessHoursOnly) {
          // Use direct interval calculation instead of manipulating hours
          // This preserves the exact time without rounding to specific hours
          const exactHours = slaInfo.slaPolicy.nextResponseHours;
          const exactMinutes = exactHours * 60;
          
          // Convert hours to milliseconds for precise calculation
          const millisToAdd = exactMinutes * 60 * 1000;
          nextResponseDueAt = new Date(now.getTime() + millisToAdd);
          
          logger.info(`Calculated next response due time based on exact hours: ${nextResponseDueAt}`);
        } else {
          // For non-business hours, continue to use direct hour addition
          nextResponseDueAt = createUTCDate();
          nextResponseDueAt.setTime(now.getTime() + (slaInfo.slaPolicy.nextResponseHours * 60 * 60 * 1000));
          logger.info(`Calculated next response due time without business hours: ${nextResponseDueAt}`);
        }
        
        // Update SLA policy ticket with new next response due date
        slaInfo.nextResponseDueAt = nextResponseDueAt;
        slaInfo.nextResponseMet = undefined; // Reset the met status
        await slaPolicyTicketRepository.save(slaInfo);
        
        logger.info(`Reset next response SLA for ticket ${ticketId} to ${nextResponseDueAt}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error resetting next response SLA for ticket ${ticketId}:`, error);
      return false;
    }
  }

  /**
   * Pause SLA for a ticket (when moved to pending)
   * @param ticketId Ticket ID to pause SLA for
   * @returns Updated SLA policy ticket or null if none exists
   */
  async pauseSLA(ticketId: number): Promise<SLAPolicyTicket | null> {
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    
    // Find SLA policy ticket
    const slaInfo = await slaPolicyTicketRepository.findOne({
      where: { ticketId } as any,
      relations: ['slaPolicy']
    });
    
    if (!slaInfo) {
      return null;
    }
    
    // Check if SLA is already paused to prevent duplicate pause entries
    let isPaused = false;
    let pausePeriods: SLAPausePeriod[] = [];
    
    // Parse existing metadata
    if (slaInfo.metadata) {
      try {
        const metadata = JSON.parse(slaInfo.metadata);
        if (Array.isArray(metadata.pausePeriods)) {
          pausePeriods = metadata.pausePeriods;
          
          // Check if already paused (last period has no end date)
          const lastPausePeriod = pausePeriods[pausePeriods.length - 1];
          if (lastPausePeriod && !lastPausePeriod.endedAt) {
            isPaused = true;
            // Already paused, no need to add new entry
            logger.info(`SLA for ticket ${ticketId} is already paused.`);
            return slaInfo;
          }
        }
      } catch (err) {
        logger.error('Error parsing SLA pause metadata:', err);
        // Continue with empty pause periods if parsing fails
        pausePeriods = [];
      }
    }
    
    // If not already paused, add new pause period
    if (!isPaused) {
      const now = createUTCDate();
      pausePeriods.push({ startedAt: now });
      
      // Update the SLA policy ticket with pause info
      slaInfo.metadata = JSON.stringify({ pausePeriods });
      logger.info(`SLA for ticket ${ticketId} has been paused at ${now.toISOString()}`);
    }
    
    // Save the updated SLA information
    return await slaPolicyTicketRepository.save(slaInfo);
  }
  
  /**
   * Resume SLA for a ticket (when moved back to in-progress)
   * @param ticketId Ticket ID to resume SLA for
   * @returns Updated SLA policy ticket or null if none exists
   */
  async resumeSLA(ticketId: number): Promise<SLAPolicyTicket | null> {
    const slaPolicyTicketRepository = AppDataSource.getRepository(SLAPolicyTicket);
    
    // Find SLA policy ticket
    const slaInfo = await slaPolicyTicketRepository.findOne({
      where: { ticketId } as any,
      relations: ['slaPolicy']
    });
    
    if (!slaInfo) {
      return null;
    }
    
    // Check if SLA is currently paused
    let isPaused = false;
    let pausePeriods: SLAPausePeriod[] = [];
    let latestPausePeriodIndex = -1;
    let totalPausedMinutes = 0;
    const now = createUTCDate();
    
    // Parse existing metadata
    if (slaInfo.metadata) {
      try {
        const metadata = JSON.parse(slaInfo.metadata);
        if (Array.isArray(metadata.pausePeriods)) {
          pausePeriods = metadata.pausePeriods;
          
          // Find the latest pause period that hasn't ended yet
          latestPausePeriodIndex = pausePeriods.findIndex((period, index) => 
            !period.endedAt && index === pausePeriods.length - 1
          );
          
          if (latestPausePeriodIndex >= 0) {
            isPaused = true;
          }
        }
      } catch (err) {
        logger.error('Error parsing SLA pause metadata:', err);
        // Continue with empty pause periods if parsing fails
        pausePeriods = [];
      }
    }
    
    // If not paused, nothing to resume
    if (!isPaused) {
      logger.info(`SLA for ticket ${ticketId} is not currently paused. No action needed.`);
      return slaInfo;
    }
    
    // Update the latest pause period with end time
    pausePeriods[latestPausePeriodIndex].endedAt = now;
    
    // Calculate total pause duration across all periods
    for (const period of pausePeriods) {
      if (period.startedAt && period.endedAt) {
        // Convert date strings to Date objects if needed
        const startDate = period.startedAt instanceof Date ? period.startedAt : createUTCDate(period.startedAt);
        const endDate = period.endedAt instanceof Date ? period.endedAt : createUTCDate();
        
        // Calculate minutes this period was paused
        const pausedMs = endDate.getTime() - startDate.getTime();
        const pausedMinutes = Math.ceil(pausedMs / (1000 * 60));
        
        // Only count positive durations
        if (pausedMinutes > 0) {
          totalPausedMinutes += pausedMinutes;
        }
      }
    }
    
    // Update SLA deadlines based on paused time
    if (totalPausedMinutes > 0 && slaInfo.slaPolicy) {
      const useBusinessHours = slaInfo.slaPolicy.businessHoursOnly;
      
      // Extend deadlines by the pause duration
      if (slaInfo.firstResponseDueAt && !slaInfo.firstResponseMet) {
        // Convert paused minutes to hours (rounding up)
        const pausedHours = Math.ceil(totalPausedMinutes / 60);
        slaInfo.firstResponseDueAt = addBusinessHours(
          createUTCDate(slaInfo.firstResponseDueAt),
          pausedHours,
          useBusinessHours
        );
        logger.info(`Extended first response deadline for ticket ${ticketId} by ${pausedHours} hours due to pause.`);
      }
      
      if (slaInfo.nextResponseDueAt && !slaInfo.nextResponseMet) {
        const pausedHours = Math.ceil(totalPausedMinutes / 60);
        slaInfo.nextResponseDueAt = addBusinessHours(
          createUTCDate(slaInfo.nextResponseDueAt),
          pausedHours,
          useBusinessHours
        );
        logger.info(`Extended next response deadline for ticket ${ticketId} by ${pausedHours} hours due to pause.`);
      }
      
      if (slaInfo.resolutionDueAt && !slaInfo.resolutionMet) {
        const pausedHours = Math.ceil(totalPausedMinutes / 60);
        slaInfo.resolutionDueAt = addBusinessHours(
          createUTCDate(slaInfo.resolutionDueAt),
          pausedHours,
          useBusinessHours
        );
        logger.info(`Extended resolution deadline for ticket ${ticketId} by ${pausedHours} hours due to pause.`);
      }
    }
    
    // Update the metadata
    slaInfo.metadata = JSON.stringify({ pausePeriods });
    logger.info(`SLA for ticket ${ticketId} has been resumed at ${now.toISOString()}.`);
    
    // Save the updated SLA information
    return await slaPolicyTicketRepository.save(slaInfo);
  }
}

export default new SLAService(); 