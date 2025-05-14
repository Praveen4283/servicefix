import { logger } from './logger';

/**
 * Common statuses that indicate a ticket is in a "pending" state
 * where the SLA timer should be paused
 */
const PENDING_STATUS_KEYWORDS = [
  'pending',
  'awaiting',
  'waiting',
  'on hold',
  'customer response',
  'client response',
  'suspended',
  'deferred'
];

/**
 * Common statuses that indicate a ticket is in "in progress" state
 * where SLA timers should be running
 */
const IN_PROGRESS_STATUS_KEYWORDS = [
  'open',
  'in progress',
  'active',
  'assigned',
  'processing',
  'responded'
];

/**
 * Checks if a status name indicates a pending status
 * @param statusName The name of the status to check
 * @returns True if the status indicates the ticket is pending
 */
export function isPendingStatus(statusName: string): boolean {
  if (!statusName) return false;
  
  const normalizedStatus = statusName.toLowerCase().trim();
  
  return PENDING_STATUS_KEYWORDS.some(keyword => 
    normalizedStatus.includes(keyword)
  );
}

/**
 * Checks if a status name indicates an in-progress status
 * @param statusName The name of the status to check
 * @returns True if the status indicates the ticket is in progress
 */
export function isInProgressStatus(statusName: string): boolean {
  if (!statusName) return false;
  
  const normalizedStatus = statusName.toLowerCase().trim();
  
  // Not pending and not resolved/closed
  return IN_PROGRESS_STATUS_KEYWORDS.some(keyword => 
    normalizedStatus.includes(keyword)
  ) && !normalizedStatus.includes('resolved') && !normalizedStatus.includes('closed');
}

/**
 * Checks if a status name indicates the ticket is resolved
 * @param statusName The name of the status to check
 * @returns True if the status indicates the ticket is resolved
 */
export function isResolvedStatus(statusName: string): boolean {
  if (!statusName) return false;
  
  const normalizedStatus = statusName.toLowerCase().trim();
  
  return normalizedStatus.includes('resolved') || normalizedStatus.includes('closed');
}

/**
 * Logs a ticket's status change for debugging purposes
 * @param ticketId The ID of the ticket
 * @param oldStatus The old status
 * @param newStatus The new status
 */
export function logStatusChange(ticketId: number, oldStatus: string, newStatus: string): void {
  logger.info(`Ticket #${ticketId} status changed from "${oldStatus}" to "${newStatus}"`);
  
  // Log SLA implications
  if (isPendingStatus(newStatus) && !isPendingStatus(oldStatus)) {
    logger.info(`SLA implication: Timer should PAUSE for ticket #${ticketId}`);
  } else if (isInProgressStatus(newStatus) && isPendingStatus(oldStatus)) {
    logger.info(`SLA implication: Timer should RESUME for ticket #${ticketId}`);
  } else if (isResolvedStatus(newStatus) && !isResolvedStatus(oldStatus)) {
    logger.info(`SLA implication: Resolution time should be recorded for ticket #${ticketId}`);
  }
} 