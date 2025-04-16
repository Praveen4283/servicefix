import { Ticket } from '../models/Ticket';
import { TicketStatus } from '../models/TicketStatus';
import { TicketPriority } from '../models/TicketPriority';
import { User, UserRole } from '../models/User';
import notificationService from './notification.service';

/**
 * SLA configuration based on ticket priority
 */
interface SLAConfig {
  firstResponseTime: number; // in minutes
  resolutionTime: number; // in minutes
}

/**
 * Map of SLA configurations by priority
 */
const SLA_CONFIGS: Record<string, SLAConfig> = {
  'low': {
    firstResponseTime: 24 * 60, // 24 hours
    resolutionTime: 7 * 24 * 60, // 7 days
  },
  'medium': {
    firstResponseTime: 12 * 60, // 12 hours
    resolutionTime: 3 * 24 * 60, // 3 days
  },
  'high': {
    firstResponseTime: 4 * 60, // 4 hours
    resolutionTime: 24 * 60, // 24 hours
  },
  'urgent': {
    firstResponseTime: 60, // 1 hour
    resolutionTime: 8 * 60, // 8 hours
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
 * Automation rule types
 */
enum AutomationTrigger {
  TICKET_CREATED = 'ticket_created',
  TICKET_UPDATED = 'ticket_updated',
  COMMENT_ADDED = 'comment_added',
  SLA_BREACHED = 'sla_breached',
  IDLE_TICKET = 'idle_ticket',
}

/**
 * Automation rule action types
 */
enum AutomationAction {
  ASSIGN_TICKET = 'assign_ticket',
  CHANGE_PRIORITY = 'change_priority',
  CHANGE_STATUS = 'change_status',
  SEND_NOTIFICATION = 'send_notification',
  ADD_INTERNAL_NOTE = 'add_internal_note',
  APPLY_TAGS = 'apply_tags',
}

/**
 * Automation rule condition types
 */
enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
}

/**
 * Automation rule definition
 */
interface AutomationRule {
  id: string;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: Array<{
    field: string;
    operator: ConditionOperator;
    value: any;
  }>;
  actions: Array<{
    type: AutomationAction;
    params: Record<string, any>;
  }>;
}

/**
 * Default automation rules
 */
const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'auto-1',
    name: 'Auto-assign password reset tickets',
    isActive: true,
    trigger: AutomationTrigger.TICKET_CREATED,
    conditions: [
      {
        field: 'subject',
        operator: ConditionOperator.CONTAINS,
        value: 'password',
      },
      {
        field: 'description',
        operator: ConditionOperator.CONTAINS,
        value: 'reset',
      },
    ],
    actions: [
      {
        type: AutomationAction.ASSIGN_TICKET,
        params: {
          agentId: 'system-account-team',
        },
      },
      {
        type: AutomationAction.CHANGE_PRIORITY,
        params: {
          priority: 'medium',
        },
      },
      {
        type: AutomationAction.APPLY_TAGS,
        params: {
          tags: ['password', 'account'],
        },
      },
    ],
  },
  {
    id: 'auto-2',
    name: 'Escalate urgent tickets with no response',
    isActive: true,
    trigger: AutomationTrigger.IDLE_TICKET,
    conditions: [
      {
        field: 'priority',
        operator: ConditionOperator.EQUALS,
        value: 'urgent',
      },
      {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'new',
      },
      {
        field: 'idleTime',
        operator: ConditionOperator.GREATER_THAN,
        value: 60, // 60 minutes
      },
    ],
    actions: [
      {
        type: AutomationAction.SEND_NOTIFICATION,
        params: {
          recipients: ['manager', 'admin'],
          template: 'urgent-ticket-idle',
        },
      },
      {
        type: AutomationAction.ADD_INTERNAL_NOTE,
        params: {
          content: 'This urgent ticket has been idle for over 60 minutes. Management has been notified.',
        },
      },
    ],
  },
];

class WorkflowService {
  private automationRules: AutomationRule[] = DEFAULT_AUTOMATION_RULES;

  /**
   * Calculate SLA deadlines for a ticket
   * @param ticket Ticket to calculate SLA for
   * @returns SLA deadline timestamps
   */
  calculateSLADeadlines(ticket: Ticket): { 
    firstResponseDeadline: Date; 
    resolutionDeadline: Date;
  } {
    const priorityName = ticket.priority?.name?.toLowerCase() || 'medium';
    const slaConfig = SLA_CONFIGS[priorityName];
    const createdAt = new Date(ticket.createdAt);
    
    const firstResponseDeadline = new Date(createdAt);
    firstResponseDeadline.setMinutes(firstResponseDeadline.getMinutes() + slaConfig.firstResponseTime);
    
    const resolutionDeadline = new Date(createdAt);
    resolutionDeadline.setMinutes(resolutionDeadline.getMinutes() + slaConfig.resolutionTime);
    
    return {
      firstResponseDeadline,
      resolutionDeadline,
    };
  }
  
  /**
   * Check if a ticket is meeting its SLA
   * @param ticket Ticket to check
   * @returns SLA status information
   */
  checkSLAStatus(ticket: Ticket): {
    isFirstResponseBreached: boolean;
    isResolutionBreached: boolean;
    firstResponseRemainingMinutes: number;
    resolutionRemainingMinutes: number;
    firstResponsePercentage: number;
    resolutionPercentage: number;
  } {
    const now = new Date();
    const { firstResponseDeadline, resolutionDeadline } = this.calculateSLADeadlines(ticket);
    
    // Calculate remaining time in minutes
    const firstResponseRemainingMinutes = Math.floor((firstResponseDeadline.getTime() - now.getTime()) / 60000);
    const resolutionRemainingMinutes = Math.floor((resolutionDeadline.getTime() - now.getTime()) / 60000);
    
    // Calculate percentage of SLA time used
    const priorityName = ticket.priority?.name?.toLowerCase() || 'medium';
    const slaConfig = SLA_CONFIGS[priorityName];
    const createdAt = new Date(ticket.createdAt);
    const elapsedMinutesSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    
    const firstResponsePercentage = Math.min(
      100, 
      Math.floor((elapsedMinutesSinceCreation / slaConfig.firstResponseTime) * 100)
    );
    
    const resolutionPercentage = Math.min(
      100, 
      Math.floor((elapsedMinutesSinceCreation / slaConfig.resolutionTime) * 100)
    );
    
    return {
      isFirstResponseBreached: firstResponseRemainingMinutes <= 0,
      isResolutionBreached: resolutionRemainingMinutes <= 0,
      firstResponseRemainingMinutes,
      resolutionRemainingMinutes,
      firstResponsePercentage,
      resolutionPercentage,
    };
  }
  
  /**
   * Check for tickets needing escalation and apply escalation actions
   * @returns Number of tickets escalated
   */
  async processEscalations(): Promise<number> {
    // This would retrieve tickets from the database and check their SLA status
    // For now, this is a mock implementation
    console.log('Processing ticket escalations...');
    return 0;
  }
  
  /**
   * Execute an automation rule
   * @param rule Automation rule to execute
   * @param context Trigger context (ticket, etc.)
   * @returns Success status
   */
  async executeAutomationRule(rule: AutomationRule, context: any): Promise<boolean> {
    try {
      // Skip inactive rules
      if (!rule.isActive) {
        return false;
      }
      
      // Check if conditions match
      const conditionsMatch = rule.conditions.every(condition => {
        const fieldValue = context[condition.field];
        
        switch (condition.operator) {
          case ConditionOperator.EQUALS:
            return fieldValue === condition.value;
          case ConditionOperator.NOT_EQUALS:
            return fieldValue !== condition.value;
          case ConditionOperator.CONTAINS:
            return typeof fieldValue === 'string' && 
              fieldValue.toLowerCase().includes(condition.value.toLowerCase());
          case ConditionOperator.NOT_CONTAINS:
            return typeof fieldValue !== 'string' || 
              !fieldValue.toLowerCase().includes(condition.value.toLowerCase());
          case ConditionOperator.GREATER_THAN:
            return fieldValue > condition.value;
          case ConditionOperator.LESS_THAN:
            return fieldValue < condition.value;
          default:
            return false;
        }
      });
      
      // If conditions don't match, skip this rule
      if (!conditionsMatch) {
        return false;
      }
      
      // Execute actions
      for (const action of rule.actions) {
        await this.executeAction(action, context);
      }
      
      return true;
    } catch (error) {
      console.error(`Error executing automation rule ${rule.id}:`, error);
      return false;
    }
  }
  
  /**
   * Execute an automation action
   * @param action Action to execute
   * @param context Action context
   */
  private async executeAction(action: { type: AutomationAction; params: Record<string, any> }, context: any): Promise<void> {
    const ticket = context.ticket;
    
    switch (action.type) {
      case AutomationAction.ASSIGN_TICKET:
        // In a real implementation, this would update the database
        console.log(`Assigning ticket ${ticket.id} to agent ${action.params.agentId}`);
        break;
        
      case AutomationAction.CHANGE_PRIORITY:
        console.log(`Changing ticket ${ticket.id} priority to ${action.params.priority}`);
        break;
        
      case AutomationAction.CHANGE_STATUS:
        console.log(`Changing ticket ${ticket.id} status to ${action.params.status}`);
        break;
        
      case AutomationAction.SEND_NOTIFICATION:
        const recipients = action.params.recipients;
        
        if (recipients.includes('requester') && ticket.requester?.email) {
          await notificationService.sendTicketUpdateNotification(
            ticket.requester.email,
            ticket.id,
            ticket.subject,
            'automation'
          );
        }
        
        // Additional notification logic would go here...
        console.log(`Sending notification for ticket ${ticket.id} to ${recipients.join(', ')}`);
        break;
        
      case AutomationAction.ADD_INTERNAL_NOTE:
        console.log(`Adding internal note to ticket ${ticket.id}: ${action.params.content}`);
        break;
        
      case AutomationAction.APPLY_TAGS:
        console.log(`Applying tags to ticket ${ticket.id}: ${action.params.tags.join(', ')}`);
        break;
    }
  }
  
  /**
   * Trigger automation rules on an event
   * @param trigger Trigger type
   * @param context Trigger context
   * @returns Number of rules executed
   */
  async triggerAutomation(trigger: AutomationTrigger, context: any): Promise<number> {
    // Find rules matching this trigger
    const matchingRules = this.automationRules.filter(rule => rule.trigger === trigger);
    
    let executedCount = 0;
    
    // Execute matching rules
    for (const rule of matchingRules) {
      const executed = await this.executeAutomationRule(rule, context);
      if (executed) {
        executedCount++;
      }
    }
    
    return executedCount;
  }
  
  /**
   * Get all automation rules
   * @returns List of automation rules
   */
  getAutomationRules(): AutomationRule[] {
    return this.automationRules;
  }
  
  /**
   * Add or update an automation rule
   * @param rule Rule to add or update
   * @returns Added/updated rule
   */
  saveAutomationRule(rule: AutomationRule): AutomationRule {
    const existingIndex = this.automationRules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      // Update existing rule
      this.automationRules[existingIndex] = rule;
    } else {
      // Add new rule
      this.automationRules.push(rule);
    }
    
    return rule;
  }
  
  /**
   * Delete an automation rule
   * @param ruleId ID of rule to delete
   * @returns Success status
   */
  deleteAutomationRule(ruleId: string): boolean {
    const initialLength = this.automationRules.length;
    this.automationRules = this.automationRules.filter(rule => rule.id !== ruleId);
    
    return this.automationRules.length < initialLength;
  }
}

export default new WorkflowService();
export { 
  AutomationTrigger, 
  AutomationAction, 
  ConditionOperator,
  type AutomationRule
}; 