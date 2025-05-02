import apiClient from './apiClient';
import { Notification } from '../context/NotificationContext';
import { withRetry } from '../utils/apiUtils';

// Local storage key for notifications
const NOTIFICATIONS_STORAGE_KEY = 'app_notifications';
const FAILED_NOTIFICATIONS_KEY = 'failed_notifications';

// Constants for storage optimization
const MAX_LOCAL_NOTIFICATIONS = 100;
const STORAGE_CLEANUP_INTERVAL_MS = 86400000; // 24 hours

// Constants for throttling and notification expiration
const NOTIFICATION_THROTTLE_MS = 500; // Min time between similar notifications
const NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for auto-cleanup of read notifications

// Constants for deduplication
const DEDUPLICATION_WINDOW_MS = 3000; // 3 seconds window for deduplication

// Throttling state
let lastNotificationTimestamp = 0;
let notificationCountMap = new Map<string, number>();
let recentNotifications = new Map<string, number>(); // Tracks fingerprints and their timestamps

// Helper function to generate a fingerprint for similar notifications
const getNotificationFingerprint = (notification: Notification): string => {
  // For better deduplication, normalize the message by removing timestamps, IDs, etc.
  const normalizedMessage = notification.message
    .replace(/\d{1,2}:\d{1,2}(:\d{1,2})?\s*(AM|PM)?/gi, '') // Remove time
    .replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, '')  // Remove dates
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
    
  return `${notification.type}:${normalizedMessage}:${notification.category}`;
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
  type: string;
  created_at: string;
  metadata?: {
    ticket_id?: string;
    comment_id?: string;
    [key: string]: any;
  };
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
    metadata?: any
  ): Promise<boolean> => {
    try {
      // Call the backend API to create a notification
      await apiClient.post('/notifications', {
        title,
        message,
        type,
        link,
        metadata
      });
      return true;
    } catch (error) {
      console.error('Failed to create backend notification:', error);
      return false;
    }
  },

  /**
   * Fetch notifications from the server
   * @param options Query options for fetching notifications
   * @returns Promise that resolves to notifications array
   */
  fetchNotifications: async (options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<Notification[]> => {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.unreadOnly) queryParams.append('unread', 'true');
      
      // Fetch notifications from backend with retry capability
      const responseData = await withRetry(
        () => apiClient.get<any>(`/notifications?${queryParams.toString()}`),
        3, // 3 retries
        1000 // 1 second initial delay
      );
      
      // Extract the notifications array from the response data
      // The response structure appears to be {success: boolean, data: {notifications: Array, pagination: Object}}
      let apiNotifications;
      
      // Handle different possible response structures
      if (responseData?.data?.notifications) {
        // API returns {success: true, data: {notifications: []}}
        apiNotifications = responseData.data.notifications;
      } else if (responseData?.notifications) {
        // API returns {notifications: []}
        apiNotifications = responseData.notifications;
      } else if (Array.isArray(responseData)) {
        // API returns notifications array directly
        apiNotifications = responseData;
      } else {
        // No recognizable structure
        console.error('Error fetching notifications: Unrecognized response structure', responseData);
        
        // Create a system notification for the user
        const errorNotification: Notification = {
          id: generateId(),
          message: 'Unable to process notifications due to server response format.',
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

      // Check if apiNotifications is actually an array before mapping
      if (!Array.isArray(apiNotifications)) {
        console.error('Error fetching notifications: Expected notifications array, but received:', apiNotifications);
        
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
      const transformedNotifications: Notification[] = apiNotifications.map((apiNotification: ApiNotification) => ({
        id: apiNotification.id.toString(),
        message: apiNotification.message || '',
        type: (apiNotification.type as any) || 'info',
        duration: 0, // App notifications don't auto-dismiss
        timestamp: new Date(apiNotification.created_at).getTime(),
        isRead: Boolean(apiNotification.is_read),
        title: apiNotification.title || '',
        category: 'app' // API notifications are always app notifications
      }));
      
      // Merge with existing notifications in local storage (keeping most recent 100)
      const existingNotifications = getNotificationsFromLocalStorage();
      const mergedNotifications = mergeNotifications(existingNotifications, transformedNotifications);
      
      // Update local storage with fetched notifications
      saveNotificationsToLocalStorage(mergedNotifications);
      
      return transformedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
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
      // Use POST instead of PATCH to avoid CORS issues
      await withRetry(
        () => apiClient.post(`/notifications/${id}/read`),
        3, // 3 retries
        1000 // 1 second initial delay
      );
      
      // Update local storage
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      );
      saveNotificationsToLocalStorage(updatedNotifications);
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      // Update local storage even if API fails
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
      await withRetry(() => apiClient.post('/notifications/read-all'), 3, 1000);
      
      // Update local storage
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification => ({ ...notification, isRead: true }));
      saveNotificationsToLocalStorage(updatedNotifications);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Update local storage even if API fails
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.map(notification => ({ ...notification, isRead: true }));
      saveNotificationsToLocalStorage(updatedNotifications);
    }
  },
  
  /**
   * Add a new notification
   * @param notification Notification to add
   * @returns Promise that resolves to the added notification
   */
  addNotification: async (notification: Notification): Promise<Notification> => {
    const now = Date.now();
    
    // Create a fingerprint for deduplication
    const fingerprint = getNotificationFingerprint(notification);
    
    // Check for duplicates within the deduplication window
    const lastSimilarTimestamp = recentNotifications.get(fingerprint);
    if (lastSimilarTimestamp && (now - lastSimilarTimestamp < DEDUPLICATION_WINDOW_MS)) {
      return notification; // Skip adding duplicate notification
    }
    
    // Track this notification fingerprint to detect future duplicates
    recentNotifications.set(fingerprint, now);
    
    // Clean up old fingerprints periodically
    if (recentNotifications.size > 100) {
      // Only keep recent entries
      const oldEntries = [...recentNotifications.entries()]
        .filter(([_, timestamp]) => now - timestamp > 60000); // Older than 1 minute
      oldEntries.forEach(([key]) => recentNotifications.delete(key));
    }
    
    // Create a fingerprint for counting similar notifications (same type/message)
    // Check if we've seen this notification recently for counter increments
    if (notificationCountMap.has(fingerprint)) {
      const count = notificationCountMap.get(fingerprint)!;
      
      // If this is a rapid repeat, increment counter instead of showing new notification
      if (now - lastNotificationTimestamp < NOTIFICATION_THROTTLE_MS) {
        notificationCountMap.set(fingerprint, count + 1);
        
        // Get stored notifications
        const notifications = getNotificationsFromLocalStorage();
        
        // Find the most recent similar notification
        const existingIndex = notifications.findIndex(n => 
          getNotificationFingerprint(n) === fingerprint
        );
        
        if (existingIndex >= 0) {
          // Update the existing notification with a count
          const updatedNotification = { 
            ...notifications[existingIndex],
            message: notification.message.replace(/ \(\d+\)$/, '') + ` (${count + 1})`,
            timestamp: now // Update timestamp to keep it recent
          };
          
          // Replace the old notification
          notifications[existingIndex] = updatedNotification;
          saveNotificationsToLocalStorage(notifications);
          
          return updatedNotification;
        }
      }
    }
    
    // New or non-throttled notification
    notificationCountMap.set(fingerprint, 1);
    lastNotificationTimestamp = now;
    
    // Store in local storage
    const notifications = getNotificationsFromLocalStorage();
    const updatedNotifications = [...notifications, notification];
    saveNotificationsToLocalStorage(updatedNotifications);
    
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
      console.error('Error clearing notifications:', error);
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
      // This endpoint would need to be implemented on the backend
      await apiClient.delete(`/notifications/${id}`);
      
      // Update local storage
      const notifications = getNotificationsFromLocalStorage();
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      saveNotificationsToLocalStorage(updatedNotifications);
    } catch (error) {
      console.error(`Error removing notification ${id}:`, error);
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
   * @returns Promise that resolves when operation completes
   */
  retryFailedNotifications: async (): Promise<void> => {
    console.warn('Skipping retryFailedNotifications as batching is removed.');
    return Promise.resolve();
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
      console.error('Error initializing notification service:', error);
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
  }
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
    // Check if we need to trim notifications before saving
    let notificationsToSave = notifications;
    
    if (notifications.length > MAX_LOCAL_NOTIFICATIONS) {
      // Keep all unread and then sort the rest by timestamp (newest first)
      const unread = notifications.filter(n => !n.isRead);
      const read = notifications.filter(n => n.isRead)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the most recent read notifications up to the limit
      notificationsToSave = [
        ...unread, 
        ...read.slice(0, MAX_LOCAL_NOTIFICATIONS - unread.length)
      ];
      
      console.log(`Trimmed notifications from ${notifications.length} to ${notificationsToSave.length}`);
    }
    
    // Save to localStorage
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
      const trimmed = allNotifications.slice(0, emergencyLimit);
      
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
        console.log(`Emergency trim complete, kept ${trimmed.length} notifications`);
      } catch (secondError) {
        console.error('Failed even with emergency trim, clearing notifications', secondError);
        localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      }
    }
  }
}

/**
 * Clean up old notifications periodically
 */
const cleanupStorage = () => {
  try {
    const notifications = getNotificationsFromLocalStorage();
    const now = Date.now();
    
    // Keep efficient storage by removing old notifications
    const validNotifications = notifications.filter(notification => {
      // Always keep unread notifications
      if (!notification.isRead) return true;
      
      // Remove read notifications older than TTL
      return (now - notification.timestamp) < NOTIFICATION_TTL_MS;
    });
    
    if (validNotifications.length > MAX_LOCAL_NOTIFICATIONS) {
      console.log(`Running scheduled cleanup of notifications (${validNotifications.length} > ${MAX_LOCAL_NOTIFICATIONS})`);
      
      // Keep all unread and then sort the rest by timestamp (newest first)
      const unread = validNotifications.filter(n => !n.isRead);
      const read = validNotifications.filter(n => n.isRead)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the most recent read notifications up to the limit
      const toKeep = [
        ...unread, 
        ...read.slice(0, MAX_LOCAL_NOTIFICATIONS - unread.length)
      ];
      
      saveNotificationsToLocalStorage(toKeep);
      console.log(`Cleanup complete, kept ${toKeep.length} notifications`);
    } else if (validNotifications.length < notifications.length) {
      // If we removed any expired notifications, update storage
      saveNotificationsToLocalStorage(validNotifications);
      console.log(`Removed ${notifications.length - validNotifications.length} expired notifications`);
    }
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
};

// Set up periodic cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

// Run cleanup on module load
setTimeout(() => {
  notificationService.startStorageCleanup();
}, 10000); // Delay by 10 seconds after module loads

export default notificationService; 