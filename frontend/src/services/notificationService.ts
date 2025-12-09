import apiClient from './apiClient';
import { Notification } from '../context/NotificationContext';
import { withRetry } from '../utils/apiUtils';
import { MetadataObject, JsonObject } from '../types/common';
import { logger } from '../utils/frontendLogger';
import { TIME, LIMITS, DEFAULTS } from '../constants/app.constants';

// Local storage key for notifications
const NOTIFICATIONS_STORAGE_KEY = 'app_notifications';
const FAILED_NOTIFICATIONS_KEY = 'failed_notifications';

// Constants for storage optimization
const MAX_LOCAL_NOTIFICATIONS = LIMITS.MAX_LOCAL_NOTIFICATIONS;
const STORAGE_CLEANUP_INTERVAL_MS = TIME.NOTIFICATION_STORAGE_CLEANUP_INTERVAL_MS;

// Constants for throttling and notification expiration
const NOTIFICATION_THROTTLE_MS = TIME.NOTIFICATION_THROTTLE_MS;
const NOTIFICATION_TTL_MS = TIME.NOTIFICATION_TTL_MS;

// Constants for deduplication
const DEDUPLICATION_WINDOW_MS = TIME.NOTIFICATION_DEDUP_WINDOW_MS;

// Debug flag
const isDebugMode = process.env.NODE_ENV === 'development';

// Logger function
const debugLog = (message: string, ...args: unknown[]): void => {
  if (isDebugMode) {
    // console.log(message, ...args); // Removed this line
  }
};

// Throttling state
let lastNotificationTimestamp = 0;
let notificationCountMap = new Map<string, number>();
let recentNotifications = new Map<string, number>(); // Tracks fingerprints and their timestamps

// Helper function to generate a fingerprint for similar notifications
const getNotificationFingerprint = (notification: Notification, ignoreCategoryForCommonAuth: boolean = false): string => {
  // For better deduplication, normalize the message by removing timestamps, IDs, etc.
  const normalizedMessage = notification.message
    .replace(/\d{1,2}:\d{1,2}(:\d{1,2})?\s*(AM|PM)?/gi, '') // Remove time
    .replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, '')  // Remove dates
    .replace(/ \(.+\)$/, '') // Remove counts like (2)
    .replace(/ at \d{1,2}:\d{1,2}:\d{1,2}\s*(AM|PM)?/, '') // Remove specific time like "at 10:30:00 AM"
    .replace(/Welcome back, .+!/, 'Welcome back!') // Normalize welcome message
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();

  const categoryPart = (ignoreCategoryForCommonAuth && (normalizedMessage === 'Welcome back!' || normalizedMessage === 'Profile updated successfully'))
    ? 'common-auth' // Use a constant category for these specific messages if ignoring category
    : notification.category;

  return `${notification.type}:${normalizedMessage}:${categoryPart}`;
};

// Helper to generate unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Interface for API notification responses
 */
interface ApiNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  isRead?: boolean; // Support for camelCase format
  type: string;
  created_at: string;
  createdAt?: string; // Support for camelCase format
  metadata?: NotificationMetadata;
}

/**
 * Type for notification metadata
 */
interface NotificationMetadata {
  ticket_id?: string;
  comment_id?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Type for notification fetch options
 */
interface FetchNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  forceRefresh?: boolean; // Force bypassing cache and fetching fresh from server
  timestamp?: number; // Additional timestamp to force cache busting
}

/**
 * Type for API response containing notifications
 */
interface ApiNotificationResponse {
  success?: boolean;
  data?: {
    notifications?: ApiNotification[];
  };
  notifications?: ApiNotification[];
}

/**
 * Notification service to handle persistence of notifications
 */
const notificationService = {
  /**
   * Create a notification in the backend database
   * @param title Notification title
   * @param message Notification message
   * @param type Notification type
   * @param link Optional link to navigate to
   * @param metadata Optional metadata
   * @returns Promise that resolves to success status
   */
  createBackendNotification: async (
    title: string,
    message: string,
    type: string = 'info',
    link?: string,
    metadata?: NotificationMetadata
  ): Promise<boolean> => {
    try {
      // Check if this is a post-login notification
      const isFreshLogin = window.__freshLogin === true;

      if (isFreshLogin) {
        logger.debug('Detected fresh login notification, adding extra delay');
        // Wait a bit longer for proper cookie synchronization
        await new Promise(resolve => setTimeout(resolve, TIME.NOTIFICATION_RETRY_DELAY_MS));
      }

      // Call the backend API to create a notification with retry capability
      const result = await withRetry(
        async () => {
          try {
            // Create the notification with post-login status included in the payload
            await apiClient.post('/notifications', {
              title,
              message,
              type,
              link,
              metadata: {
                ...(metadata || {}),
                // Include post-login flag in the metadata
                isPostLogin: isFreshLogin
              }
            });

            logger.debug('Notification created successfully',
              isFreshLogin ? '(with post-login metadata)' : '');

            return true;
          } catch (error: any) {
            // Check for CSRF error
            if (error?.status === 403 && error?.code === 'CSRF_ERROR') {
              logger.warn('CSRF error, will retry with new token');

              // Wait longer before retry to ensure cookies are properly set
              await new Promise(resolve => setTimeout(resolve, TIME.NOTIFICATION_CSRF_RETRY_DELAY_MS));

              throw error; // Rethrow to trigger retry
            }

            // For other errors, log and continue
            logger.error('[NotificationService] Error creating notification:', error);

            // Store failed notification for retry later
            storeFailedNotification({
              title,
              message,
              type,
              link,
              metadata,
              timestamp: Date.now()
            });

            throw error; // Rethrow to trigger retry
          }
        },
        3, // 3 retries
        TIME.NOTIFICATION_FETCH_RETRY_DELAY_MS
      );

      return result === true;
    } catch (error) {
      logger.error('Failed to create backend notification after retries:', error);
      return false;
    }
  },

  /**
   * Fetch notifications from the server
   * @param options Query options for fetching notifications
   * @returns Promise that resolves to notifications array
   */
  fetchNotifications: async (options: FetchNotificationsOptions = {}): Promise<Notification[]> => {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.unreadOnly) queryParams.append('unread', 'true');

      // Always include recent flag to ensure we get the latest notifications
      queryParams.append('recent', 'true');

      // Add cache-busting parameter if forceRefresh is true
      if (options.forceRefresh) {
        queryParams.append('_t', Date.now().toString());
      }

      // Use explicit timestamp if provided
      if (options.timestamp) {
        queryParams.append('_ts', options.timestamp.toString());
      }

      // Always request a reasonable limit if not specified
      if (!options.limit) {
        queryParams.append('limit', '50');
      }

      logger.debug('Fetching notifications with params:', queryParams.toString());

      // Fetch notifications from backend with retry capability
      const responseData = await withRetry(
        () => apiClient.get<ApiNotificationResponse>(`/notifications?${queryParams.toString()}`),
        3, // 3 retries
        TIME.NOTIFICATION_MARK_READ_RETRY_DELAY_MS
      );

      // Log the actual response structure for debugging
      logger.debug('API response:', responseData);

      // Extract the notifications array from the response data
      let apiNotifications: ApiNotification[] | undefined;

      // Handle different possible response structures
      if (responseData?.data?.notifications) {
        // API returns {success: true, data: {notifications: []}}
        apiNotifications = responseData.data.notifications;
        debugLog('Extracted notifications from data.notifications:', apiNotifications.length);
      } else if (responseData?.notifications) {
        // API returns {notifications: []}
        apiNotifications = responseData.notifications;
        debugLog('Extracted notifications from responseData.notifications:', apiNotifications.length);
      } else if (Array.isArray(responseData)) {
        // API returns notifications array directly
        apiNotifications = responseData as ApiNotification[];
        debugLog('Response was direct array:', apiNotifications.length);
      } else if (responseData?.success && responseData?.data) {
        // API returns {success: true, data: []} OR {success: true, data: {notifications: []}}
        if (Array.isArray(responseData.data)) {
          apiNotifications = responseData.data;
          debugLog('Extracted from success/data array structure:', apiNotifications.length);
        } else if (responseData.data.notifications && Array.isArray(responseData.data.notifications)) {
          apiNotifications = responseData.data.notifications;
          debugLog('Extracted from success/data/notifications structure:', apiNotifications.length);
        } else {
          logger.error('Data property exists but contains unexpected format:', responseData.data);
          apiNotifications = [];
        }
      } else {
        // No recognizable structure
        logger.error('Error fetching notifications: Unrecognized response structure', responseData);

        // Create a system notification for the user
        const errorNotification: Notification = {
          id: generateId(),
          message: 'Unable to process notifications due to server response format.',
          type: 'warning',
          duration: TIME.TOAST_DURATION_MS,
          timestamp: Date.now(),
          isRead: false,
          title: 'Notification Error',
          category: 'system'
        };

        // Add the error notification to local storage
        await notificationService.addNotification(errorNotification);

        return getNotificationsFromLocalStorage();
      }

      // Check if apiNotifications is actually an array before mapping
      if (!Array.isArray(apiNotifications)) {
        logger.error('Error fetching notifications: Expected notifications array, but received:', apiNotifications);

        // Create a system notification for the user
        const errorNotification: Notification = {
          id: generateId(),
          message: 'Unable to process notifications data from server.',
          type: 'warning',
          duration: 5000,
          timestamp: Date.now(),
          isRead: false,
          title: 'Notification Error',
          category: 'system'
        };

        // Add the error notification to local storage
        await notificationService.addNotification(errorNotification);

        return getNotificationsFromLocalStorage();
      }

      // Transform API notifications to our format
      const transformedNotifications: Notification[] = apiNotifications.map((apiNotification: ApiNotification) => {
        // Handle timestamp creation with extensive debugging
        let timestamp: number;
        try {
          // Try to parse the timestamp from various possible formats
          const dateSource = apiNotification.created_at || apiNotification.createdAt;

          if (isDebugMode) {
            debugLog('------- Notification Timestamp Debug -------');
            debugLog(`Original date source: ${dateSource}`);
            debugLog(`Type of date source: ${typeof dateSource}`);
          }

          if (typeof dateSource === 'number') {
            // If it's already a numeric timestamp
            timestamp = dateSource;
            if (isDebugMode) {
              debugLog(`Using numeric timestamp directly: ${timestamp}`);
            }
          } else if (typeof dateSource === 'string') {
            // If it's a string date (ISO format from backend)
            // IMPORTANT: Force the date to UTC first, then get timestamp
            const dateObj = new Date(dateSource);
            timestamp = dateObj.getTime();

            if (isDebugMode) {
              debugLog(`Parsed date object: ${dateObj.toString()}`);
              debugLog(`Date ISO string: ${dateObj.toISOString()}`);
              debugLog(`Resulting timestamp: ${timestamp}`);
            }

            if (isNaN(timestamp)) {
              logger.warn('Invalid date string from notification:', dateSource);
              timestamp = Date.now(); // Fallback to current time
              if (isDebugMode) {
                debugLog(`Using fallback timestamp (now): ${timestamp}`);
              }
            }
          } else {
            // If neither string nor number, use current time
            logger.warn('Unexpected date format:', dateSource);
            timestamp = Date.now();
            if (isDebugMode) {
              debugLog(`Using fallback timestamp (now): ${timestamp}`);
            }
          }
        } catch (err) {
          logger.error('Error parsing date:', err);
          timestamp = Date.now(); // Fallback to current time
          if (isDebugMode) {
            debugLog(`Using fallback timestamp after error (now): ${timestamp}`);
          }
        }

        // Handle read status - support both snake_case and camelCase
        const isRead =
          apiNotification.hasOwnProperty('is_read') ? Boolean(apiNotification.is_read) :
            apiNotification.hasOwnProperty('isRead') ? Boolean(apiNotification.isRead) :
              false;

        return {
          id: apiNotification.id.toString(),
          message: apiNotification.message || '',
          type: (apiNotification.type as any) || 'info',
          duration: 0, // App notifications don't auto-dismiss
          timestamp: timestamp,
          isRead: isRead,
          title: apiNotification.title || '',
          category: 'app' // API notifications are always app notifications
        };
      });

      logger.debug(`Transformed ${transformedNotifications.length} notifications from API response`);

      // Merge with existing notifications in local storage (keeping most recent 100)
      const existingNotifications = getNotificationsFromLocalStorage();
      const mergedNotifications = mergeNotifications(existingNotifications, transformedNotifications);

      // Update local storage with fetched notifications
      saveNotificationsToLocalStorage(mergedNotifications);

      // Return the original transformed list (no filtering here)
      return transformedNotifications;
    } catch (error) {
      logger.error('Error fetching notifications:', error);

      // Create a helpful system notification about the error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorNotification: Notification = {
        id: generateId(),
        message: `Unable to fetch notifications: ${errorMessage}. Using local data.`,
        type: 'error',
        duration: 5000,
        timestamp: Date.now(),
        isRead: false,
        title: 'Connection Error',
        category: 'system'
      };

      // Add the error notification to local storage without using API (which failed)
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = [...notifications, errorNotification];
      saveNotificationsToLocalStorage(updatedNotifications);

      // Return local notifications + the error notification
      return [...getNotificationsFromLocalStorage(), errorNotification];
    }
  },

  /**
   * Mark a notification as read
   * @param id Notification ID
   * @returns Promise that resolves when operation completes
   */
  markAsRead: async (id: string): Promise<void> => {
    try {
      // console.log(`Marking notification ${id} as read`); // Removed this line

      // Update local storage immediately for UI responsiveness
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      );
      saveNotificationsToLocalStorage(updatedNotifications);

      // Then update server
      try {
        // Use POST instead of PATCH to avoid CORS issues
        await withRetry(
          () => apiClient.post(`/notifications/${id}/read`),
          3, // 3 retries
          TIME.NOTIFICATION_MARK_READ_RETRY_DELAY_MS
        );
        // console.log(`Successfully marked notification ${id} as read on server`); // Removed this line
      } catch (apiError) {
        // Log the error but keep the local update
        logger.error(`Error marking notification ${id} as read on server:`, apiError);
      }
    } catch (error) {
      logger.error(`Error in markAsRead for notification ${id}:`, error);
      // Still update local storage even if error occurs
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      );
      saveNotificationsToLocalStorage(updatedNotifications);
    }
  },

  /**
   * Mark all notifications as read
   * @returns Promise that resolves when operation completes
   */
  markAllAsRead: async (): Promise<void> => {
    try {
      // Use POST instead of PATCH to avoid CORS issues
      await withRetry(() => apiClient.post('/notifications/read-all'), DEFAULTS.MAX_RETRIES, TIME.NOTIFICATION_MARK_READ_RETRY_DELAY_MS);

      // Update local storage
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification => ({ ...notification, isRead: true }));
      saveNotificationsToLocalStorage(updatedNotifications);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      // Update local storage even if API fails
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification => ({ ...notification, isRead: true }));
      saveNotificationsToLocalStorage(updatedNotifications);
    }
  },

  /**
   * Add a new notification, applying deduplication logic.
   * @param notification Notification to add
   * @returns Promise that resolves to the added notification or the existing one if deduplicated
   */
  addNotification: async (notification: Notification): Promise<Notification> => {
    const now = Date.now();

    // Ensure login notifications are properly categorized
    if ((notification.title && notification.title.includes('Login')) ||
      (notification.message && notification.message.includes('Welcome back'))) {
      logger.debug('Login notification detected, ensuring app category and unread status');
      notification.category = 'app';
      notification.isRead = false;
    }

    // Create a fingerprint for deduplication (ignoring category for specific messages)
    const isCommonAuthMessage = notification.message.startsWith('Welcome back') || notification.message === 'Profile updated successfully';
    const fingerprint = getNotificationFingerprint(notification, isCommonAuthMessage);

    // Check for duplicates within the deduplication window
    const lastSimilarTimestamp = recentNotifications.get(fingerprint);
    if (lastSimilarTimestamp && (now - lastSimilarTimestamp < DEDUPLICATION_WINDOW_MS)) {
      // console.log('[Deduplication] Skipping notification:', notification.message); // Removed this line
      // Return the *existing* similar notification from storage if possible, or the current one
      const existing = getNotificationsFromLocalStorage().find(n => getNotificationFingerprint(n, isCommonAuthMessage) === fingerprint);
      return existing || notification;
    }

    // Track this notification fingerprint to detect future duplicates
    recentNotifications.set(fingerprint, now);

    // Clean up old fingerprints periodically (simple cleanup)
    if (recentNotifications.size > 100) {
      const cutoff = now - 60000; // Older than 1 minute
      recentNotifications.forEach((timestamp, key) => {
        if (timestamp < cutoff) {
          recentNotifications.delete(key);
        }
      });
    }

    // Throttling logic based on *exact* fingerprint (including category now)
    const throttleFingerprint = getNotificationFingerprint(notification, false); // Use exact fingerprint for throttling
    if (notificationCountMap.has(throttleFingerprint)) {
      const count = notificationCountMap.get(throttleFingerprint)!;

      // If this is a rapid repeat, increment counter instead of showing new notification
      if (now - lastNotificationTimestamp < NOTIFICATION_THROTTLE_MS) {
        notificationCountMap.set(throttleFingerprint, count + 1);

        // Get stored notifications
        const notifications = getNotificationsFromLocalStorage();

        // Find the most recent similar notification (using exact fingerprint)
        const existingIndex = notifications.findIndex(n =>
          getNotificationFingerprint(n, false) === throttleFingerprint
        );

        if (existingIndex >= 0) {
          // Update the existing notification with a count
          const updatedNotification = {
            ...notifications[existingIndex],
            message: notifications[existingIndex].message.replace(/ \(\d+\)$/, '') + ` (${count + 1})`,
            timestamp: now // Update timestamp to keep it recent
          };

          // Replace the old notification
          notifications[existingIndex] = updatedNotification;
          saveNotificationsToLocalStorage(notifications);
          // console.log('[Throttling] Updated count for:', updatedNotification.message); // Removed this line
          return updatedNotification;
        }
      }
    }

    // New or non-throttled notification
    notificationCountMap.set(throttleFingerprint, 1);
    lastNotificationTimestamp = now;

    // Store in local storage
    const notifications = getNotificationsFromLocalStorage();
    // Ensure the new notification doesn't already exist by ID before adding
    if (!notifications.some(n => n.id === notification.id)) {
      const updatedNotifications = [...notifications, notification];
      saveNotificationsToLocalStorage(updatedNotifications);
      logger.debug('Added to local storage:', { id: notification.id, message: notification.message, category: notification.category, isRead: notification.isRead });
    } else {
      // console.log('[Notification Skipped] Already exists by ID:', notification.message); // Removed this line
      // Optionally update the existing one if needed, but for now, just skip adding
      return notifications.find(n => n.id === notification.id) || notification;
    }

    return notification;
  },

  /**
   * Clear all notifications (app category only)
   * @returns Promise that resolves when operation completes
   */
  clearNotifications: async (): Promise<void> => {
    try {
      await apiClient.delete('/notifications');

      // Keep system notifications, remove app notifications
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.filter(n => n.category === 'system');
      saveNotificationsToLocalStorage(updatedNotifications);
    } catch (error) {
      logger.error('Error clearing notifications:', error);
      // Update local storage even if API fails
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.filter(n => n.category === 'system');
      saveNotificationsToLocalStorage(updatedNotifications);
    }
  },

  /**
   * Remove a specific notification
   * @param id Notification ID
   * @returns Promise that resolves when operation completes
   */
  removeNotification: async (id: string): Promise<void> => {
    try {
      // Call backend delete endpoint
      await apiClient.delete(`/notifications/${id}`);

      // Update local storage
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      saveNotificationsToLocalStorage(updatedNotifications);
    } catch (error) {
      logger.error(`Error removing notification ${id}:`, error);
      // Update local storage even if API fails
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      saveNotificationsToLocalStorage(updatedNotifications);
    }
  },

  /**
   * Get notifications from local storage (for initial load/offline support)
   * @returns Array of notifications
   */
  getLocalNotifications: (): Notification[] => {
    return getNotificationsFromLocalStorage();
  },

  /**
   * Retry sending failed notifications
   * @returns Promise that resolves when retry attempt is complete
   */
  retryFailedNotifications: async (): Promise<void> => {
    try {
      const failedNotifications = getFailedNotificationsFromStorage();
      if (failedNotifications.length === 0) return;

      logger.info(`Attempting to resend ${failedNotifications.length} failed notifications`);

      // Try to get a fresh CSRF token first with multiple attempts
      let csrfSuccess = false;
      for (let i = 0; i < 3 && !csrfSuccess; i++) {
        try {
          await apiClient.get('/auth/csrf-token');
          csrfSuccess = true;
          logger.debug('Successfully refreshed CSRF token for retries');
          // Wait for cookie to be set
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          logger.error('[NotificationService] Failed to refresh CSRF token for retries:', error);
          // Wait before trying again
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!csrfSuccess) {
        logger.error('[NotificationService] Could not refresh CSRF token after multiple attempts, aborting retries');
        return;
      }

      const successfulRetries: number[] = [];

      // Try to send each failed notification with a small delay between them
      for (let i = 0; i < failedNotifications.length; i++) {
        try {
          // Add a small delay between requests to avoid overwhelming the server
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          const notification = failedNotifications[i];
          const success = await notificationService.createBackendNotification(
            notification.title || 'Notification',
            notification.message,
            notification.type,
            notification.link,
            notification.metadata
          );

          if (success) {
            successfulRetries.push(i);
            logger.debug(`Successfully resent notification ${i + 1}/${failedNotifications.length}`);
          }
        } catch (error) {
          logger.error(`[NotificationService] Failed to retry notification ${i + 1}/${failedNotifications.length}:`, error);
        }
      }

      // Remove successful retries from storage
      if (successfulRetries.length > 0) {
        const remainingNotifications = failedNotifications.filter((_, index) =>
          !successfulRetries.includes(index)
        );
        saveFailedNotificationsToStorage(remainingNotifications);
        logger.info(`Successfully resent ${successfulRetries.length}/${failedNotifications.length} notifications`);
      }
    } catch (error) {
      logger.error('[NotificationService] Error during retry of failed notifications:', error);
    }
  },

  /**
   * Initialize notification service
   * Call this when the app starts or user logs in
   */
  initialize: async (): Promise<void> => {
    try {
      // Retry any failed notifications from previous sessions
      await notificationService.retryFailedNotifications();

      // Clear any stale notification counts
      notificationCountMap.clear();
      lastNotificationTimestamp = 0;
    } catch (error) {
      logger.error('Error initializing notification service:', error);
    }
  },

  /**
   * Start periodic cleanup of local storage
   */
  startStorageCleanup: () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }

    // Run cleanup immediately
    cleanupStorage();

    // Then set up interval
    cleanupInterval = setInterval(cleanupStorage, STORAGE_CLEANUP_INTERVAL_MS);
  },

  /**
   * Stop periodic cleanup
   */
  stopStorageCleanup: () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  },

  /**
   * Sync notifications with local storage
   * This replaces the current notifications with the provided ones
   * @param notifications Array of notifications to sync
   */
  syncNotifications: (notifications: Notification[]): void => {
    try {
      logger.debug(`Syncing ${notifications.length} notifications to local storage`);

      // Replace the local storage content with the provided notifications
      saveNotificationsToLocalStorage(notifications);
    } catch (error) {
      logger.error('Error syncing notifications to local storage:', error);
    }
  },

  /**
   * Clear all notifications from local storage (used on logout)
   */
  clearLocalStorage: (): void => {
    try {
      logger.debug('Clearing all notifications from local storage');
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      localStorage.removeItem(FAILED_NOTIFICATIONS_KEY);

      // Reset the notification state
      lastNotificationTimestamp = 0;
      notificationCountMap.clear();
      recentNotifications.clear();
    } catch (error) {
      logger.error('Error clearing notifications from local storage:', error);
    }
  },

  /**
   * Get unread notification count from local storage
   * @returns Number of unread notifications
   */
  getUnreadCountFromLocalStorage: (): number => {
    const notifications = getNotificationsFromLocalStorage();
    return notifications.filter(n => !n.isRead).length;
  },

  /**
   * Get notifications from local storage
   * @returns Array of notifications from local storage
   */
  getNotificationsFromLocalStorage: (): Notification[] => {
    return getNotificationsFromLocalStorage();
  },

  /**
   * Sync notifications to local storage
   * @param notifications Notifications to sync
   */
  syncNotificationsToLocalStorage: (notifications: Notification[]): void => {
    saveNotificationsToLocalStorage(notifications);
  },
};

/**
 * Merge notifications from different sources by ID
 * @param existing Existing notifications
 * @param incoming New notifications
 * @returns Merged notifications array
 */
function mergeNotifications(existing: Notification[], incoming: Notification[]): Notification[] {
  const result = [...existing];

  incoming.forEach(notification => {
    const existingIndex = result.findIndex(n => n.id === notification.id);
    if (existingIndex >= 0) {
      // Update existing notification
      result[existingIndex] = notification;
    } else {
      // Add new notification
      result.push(notification);
    }
  });

  return result;
}

/**
 * Get notifications from local storage
 * @returns Array of notifications
 */
function getNotificationsFromLocalStorage(): Notification[] {
  try {
    const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (storedNotifications) {
      return JSON.parse(storedNotifications);
    }
  } catch (error) {
    console.error('Error retrieving notifications from local storage:', error);
  }
  return [];
}

/**
 * Save notifications to local storage
 * @param notifications Array of notifications to save
 */
function saveNotificationsToLocalStorage(notifications: Notification[]): void {
  try {
    let notificationsToSave = notifications;
    if (notifications.length > MAX_LOCAL_NOTIFICATIONS) {
      // Trim older notifications if exceeding max limit
      notificationsToSave = notifications.slice(0, MAX_LOCAL_NOTIFICATIONS);
      // console.log(`Trimmed notifications from ${notifications.length} to ${notificationsToSave.length}`); // Removed this line
    }
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsToSave));
  } catch (error) {
    console.error('Error saving notifications to local storage:', error);

    // If the error is likely due to localStorage being full
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.warn('Local storage quota exceeded, performing emergency cleanup');

      // Emergency cleanup - force trim to half the normal limit
      const emergencyLimit = MAX_LOCAL_NOTIFICATIONS / 2;

      // Keep only unread and newest notifications up to the emergency limit
      const allNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);
      let trimmed = allNotifications.slice(0, emergencyLimit);

      // Fallback: if filtering fails, keep the newest MAX_LOCAL_NOTIFICATIONS / 2
      if (trimmed.length < MAX_LOCAL_NOTIFICATIONS / 2 && notifications.length > MAX_LOCAL_NOTIFICATIONS / 2) {
        trimmed = notifications.slice(0, MAX_LOCAL_NOTIFICATIONS / 2);
      }
      // console.log(`Emergency trim complete, kept ${trimmed.length} notifications`); // Removed this line
      saveNotificationsToLocalStorage(trimmed);
    }
  }
}

/**
 * Clean up old notifications periodically
 */
const cleanupStorage = () => {
  const notifications = getNotificationsFromLocalStorage();
  const now = Date.now();

  // Filter out notifications that are read and older than TTL
  const validNotifications = notifications.filter(n => {
    if (n.isRead && n.timestamp) {
      return (now - n.timestamp) < NOTIFICATION_TTL_MS;
    }
    return true; // Keep unread or timeless notifications
  });

  if (validNotifications.length > MAX_LOCAL_NOTIFICATIONS) {
    // console.log(`Running scheduled cleanup of notifications (${validNotifications.length} > ${MAX_LOCAL_NOTIFICATIONS})`); // Removed this line
    // If still over limit after removing expired, sort by timestamp (newest first) and take the top MAX_LOCAL_NOTIFICATIONS
    const sorted = validNotifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const toKeep = sorted.slice(0, MAX_LOCAL_NOTIFICATIONS);
    saveNotificationsToLocalStorage(toKeep);
    // console.log(`Cleanup complete, kept ${toKeep.length} notifications`); // Removed this line
  } else if (validNotifications.length < notifications.length) {
    // If only expired notifications were removed, save the valid ones
    saveNotificationsToLocalStorage(validNotifications);
    // console.log(`Removed ${notifications.length - validNotifications.length} expired notifications`); // Removed this line
  }
};

// Set up periodic cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

// Run cleanup on module load
setTimeout(() => {
  notificationService.startStorageCleanup();
}, 10000); // Delay by 10 seconds after module loads

// Helper functions for failed notifications storage
function storeFailedNotification(notification: {
  title?: string;
  message: string;
  type: string;
  link?: string;
  metadata?: any;
  timestamp: number;
}): void {
  try {
    const failedNotifications = getFailedNotificationsFromStorage();
    failedNotifications.push(notification);

    // Keep only the latest 50 failed notifications
    if (failedNotifications.length > 50) {
      failedNotifications.splice(0, failedNotifications.length - 50);
    }

    saveFailedNotificationsToStorage(failedNotifications);
  } catch (error) {
    console.error('Error storing failed notification:', error);
  }
}

function getFailedNotificationsFromStorage(): Array<{
  title?: string;
  message: string;
  type: string;
  link?: string;
  metadata?: any;
  timestamp: number;
}> {
  try {
    const storedData = localStorage.getItem(FAILED_NOTIFICATIONS_KEY);
    if (!storedData) return [];

    const parsed = JSON.parse(storedData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading failed notifications from storage:', error);
    return [];
  }
}

function saveFailedNotificationsToStorage(notifications: Array<{
  title?: string;
  message: string;
  type: string;
  link?: string;
  metadata?: any;
  timestamp: number;
}>): void {
  try {
    localStorage.setItem(FAILED_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving failed notifications to storage:', error);
  }
}

export default notificationService; 