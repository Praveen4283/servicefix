import { AppDataSource } from '../config/database';
import { logger } from './logger';
import * as slaChecker from './slaChecker';

// Store interval IDs so we can clear them during shutdown
let slaCheckIntervalId: NodeJS.Timeout | null = null;
let quickCheckIntervalId: NodeJS.Timeout | null = null;

/**
 * Initialize the SLA checker with periodic runs
 */
export function initSLAChecker() {
  logger.info('Initializing SLA checker...');
  
  // Set up scheduled tasks for SLA checks
  const runSLAChecks = async () => {
    try {
      logger.info('[SLA Checker] Running periodic SLA checks...');
      
      // Check for missed first responses
      const fixedFirstResponses = await slaChecker.checkMissedFirstResponses();
      if (fixedFirstResponses > 0) {
        logger.info(`[SLA Checker] Fixed ${fixedFirstResponses} missed first response SLAs`);
      }
      
      // Update breach statuses in tickets table
      const updatedBreachStatuses = await slaChecker.updateSLABreachStatuses();
      if (updatedBreachStatuses > 0) {
        logger.info(`[SLA Checker] Updated ${updatedBreachStatuses} ticket SLA breach statuses`);
      }
      
      // Fix SLAs that are breached but not marked correctly
      const fixedBreachedSLAs = await slaChecker.fixBreachedSLAs();
      if (fixedBreachedSLAs > 0) {
        logger.info(`[SLA Checker] Fixed ${fixedBreachedSLAs} incorrectly marked SLA breaches`);
      }
    } catch (error) {
      logger.error('[SLA Checker] Error running scheduled SLA checks:', error);
    }
  };

  // Run complete SLA checks every 5 minutes
  slaCheckIntervalId = setInterval(runSLAChecks, 5 * 60 * 1000);
  
  // Run only the breach fix checker more frequently (every minute)
  quickCheckIntervalId = setInterval(async () => {
    try {
      const fixedBreachedSLAs = await slaChecker.fixBreachedSLAs();
      if (fixedBreachedSLAs > 0) {
        logger.info(`[SLA Checker] Quick check: Fixed ${fixedBreachedSLAs} incorrectly marked SLA breaches`);
      }
    } catch (error) {
      logger.error('[SLA Checker] Error running breach fix check:', error);
    }
  }, 60 * 1000); // Run every minute

  // Run once at startup after a 30 second delay to ensure DB is ready
  setTimeout(runSLAChecks, 30 * 1000);
  
  logger.info('SLA checker initialized and scheduled');
}

/**
 * Start the SLA checker after confirming database connection
 */
export async function startSLAChecker() {
  try {
    // Make sure database is initialized before starting the checker
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database initialized for SLA checker');
    }
    
    // Initialize the SLA checker
    initSLAChecker();
    return true;
  } catch (error) {
    logger.error('Failed to initialize SLA checker:', error);
    return false;
  }
}

/**
 * Stop the SLA checker and clean up resources
 */
export async function stopSLAChecker() {
  logger.info('Stopping SLA checker...');
  
  // Clear the intervals
  if (slaCheckIntervalId) {
    clearInterval(slaCheckIntervalId);
    slaCheckIntervalId = null;
  }
  
  if (quickCheckIntervalId) {
    clearInterval(quickCheckIntervalId);
    quickCheckIntervalId = null;
  }
  
  logger.info('SLA checker stopped');
  return true;
} 