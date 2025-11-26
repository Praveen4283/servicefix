import { logger } from './logger';
import slaApplicationService from '../services/slaApplicationService';
import { AppDataSource } from '../config/database';

interface SLASchedulerConfig {
  statusCheckInterval: number; // in minutes
  escalationCheckInterval: number; // in minutes
  batchSize: number;
  enabled: boolean;
}

class SLAScheduler {
  private statusCheckTimer: NodeJS.Timeout | null = null;
  private escalationCheckTimer: NodeJS.Timeout | null = null;
  private config: SLASchedulerConfig = {
    statusCheckInterval: 5, // Check every 5 minutes
    escalationCheckInterval: 15, // Check escalations every 15 minutes
    batchSize: 100,
    enabled: true
  };

  /**
   * Start the SLA scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('SLA Scheduler is disabled');
      return;
    }

    logger.info('Starting SLA Scheduler...');

    // Start status check timer
    this.statusCheckTimer = setInterval(async () => {
      await this.runStatusChecks();
    }, this.config.statusCheckInterval * 60 * 1000);

    // Start escalation check timer
    this.escalationCheckTimer = setInterval(async () => {
      await this.runEscalationChecks();
    }, this.config.escalationCheckInterval * 60 * 1000);

    // Run initial checks
    this.runStatusChecks();
    this.runEscalationChecks();

    logger.info(`SLA Scheduler started - Status checks every ${this.config.statusCheckInterval} minutes, Escalation checks every ${this.config.escalationCheckInterval} minutes`);
  }

  /**
   * Stop the SLA scheduler
   */
  stop(): void {
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }

    if (this.escalationCheckTimer) {
      clearInterval(this.escalationCheckTimer);
      this.escalationCheckTimer = null;
    }

    logger.info('SLA Scheduler stopped');
  }

  /**
   * Run SLA status checks for all active tickets
   */
  private async runStatusChecks(): Promise<void> {
    try {
      logger.info('Running SLA status checks...');
      
      const result = await slaApplicationService.checkAndUpdateSLAStatuses(this.config.batchSize);
      
      logger.info(`SLA status check completed - Processed: ${result.processed}, Updated: ${result.updated}, Errors: ${result.errors}`);
      
      if (result.errors > 0) {
        logger.warn(`SLA status check had ${result.errors} errors`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in SLA status check: ${errorMessage}`);
    }
  }

  /**
   * Run SLA escalation checks
   */
  private async runEscalationChecks(): Promise<void> {
    try {
      logger.info('Running SLA escalation checks...');
      
      const result = await slaApplicationService.processSLAEscalations();
      
      logger.info(`SLA escalation check completed - Processed: ${result.processed}, Escalated: ${result.escalated}, Errors: ${result.errors}`);
      
      if (result.escalated > 0) {
        logger.info(`Triggered ${result.escalated} SLA escalations`);
      }
      
      if (result.errors > 0) {
        logger.warn(`SLA escalation check had ${result.errors} errors`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in SLA escalation check: ${errorMessage}`);
    }
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SLASchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('SLA Scheduler configuration updated', this.config);
  }

  /**
   * Get current scheduler status
   */
  getStatus(): {
    running: boolean;
    config: SLASchedulerConfig;
    lastStatusCheck?: Date;
    lastEscalationCheck?: Date;
  } {
    return {
      running: !!(this.statusCheckTimer && this.escalationCheckTimer),
      config: this.config
    };
  }

  /**
   * Manually trigger a status check
   */
  async triggerStatusCheck(): Promise<void> {
    logger.info('Manually triggering SLA status check...');
    await this.runStatusChecks();
  }

  /**
   * Manually trigger an escalation check
   */
  async triggerEscalationCheck(): Promise<void> {
    logger.info('Manually triggering SLA escalation check...');
    await this.runEscalationChecks();
  }
}

// Create singleton instance
const slaScheduler = new SLAScheduler();

export default slaScheduler; 