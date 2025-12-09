import { v4 as uuidv4 } from 'uuid';
import socketService from './socketService';
import notificationService from './notificationService';
import { Notification, NotificationType } from '../context/NotificationContext';
import { logger } from '../utils/frontendLogger';
import { TIME } from '../constants/app.constants';

// Type for notification context interface the manager will use
interface NotificationContextInterface {
  _addTemporaryToast: (message: string, type: NotificationType, options?: { title?: string, duration?: number, id?: string }) => void;
  _addPersistentNotification: (notification: Notification) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

// Extended notification type with additional fields for the manager
interface ManagedNotification extends Notification {
  isPersistent?: boolean;
  directlySent?: boolean;
  source?: 'direct' | 'socket';
}

// Type for showing notifications
interface ShowNotificationOptions {
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
  isPersistent?: boolean;
  category?: 'app' | 'system';
  metadata?: any;
}

interface NotificationOptions {
  title?: string;
  duration?: number;
  isPersistent?: boolean;
  category?: 'app' | 'system';
  isRead?: boolean;
}

interface ShowDirectOptions extends NotificationOptions {
  message: string;
  type: NotificationType;
}

interface NotificationContext {
  _addTemporaryToast: (message: string, type: NotificationType, options?: any) => void;
  _addPersistentNotification: (notification: Notification) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

/**
 * A centralized notification manager that handles all notifications
 */
class NotificationManager {
  private activeNotificationIds = new Set<string>();
  private pendingSyncNotifications = new Map<string, ManagedNotification>();
  private isSocketConnected = false;
  private notificationContext: NotificationContextInterface | null = null;
  private fingerprints = new Map<string, number>(); // For deduplication
  private recentNotifications = new Map<string, number>(); // For detecting immediate duplicates
  private _context: NotificationContext | null = null;
  private _queue: { type: string, payload: any }[] = [];
  private isDebugMode = process.env.NODE_ENV === 'development';

  constructor() {
    // Initialize socket listeners when the manager is created
    this.initializeSocketListeners();
  }

  // Helper method for conditional logging
  private log(message: string, ...args: any[]) {
    if (this.isDebugMode) {
      // console.log(message, ...args); // Removed this line
    }
  }

  // Set up socket connection listeners
  private initializeSocketListeners() {
    socketService.onConnect(() => {
      this.log('[NotificationManager] Socket connected');
      this.isSocketConnected = true;
      this.syncPendingNotifications();
    });

    socketService.onDisconnect(() => {
      this.log('[NotificationManager] Socket disconnected');
      this.isSocketConnected = false;
    });

    socketService.subscribeToNotifications((notification: any) => {
      this.log('[NotificationManager] Socket notification received:', notification);
      this.processSocketNotification(notification);
    });
  }

  // Set notification context from NotificationContext.tsx
  setContext(context: NotificationContext) {
    this.log('[NotificationManager] Context set');
    this._context = context;

    // Process any queued messages
    if (this._queue.length > 0) {
      this.log(`[NotificationManager] Processing ${this._queue.length} queued notifications`);
      const queueCopy = [...this._queue];
      this._queue = [];

      queueCopy.forEach(item => {
        if (item.type === 'direct') {
          this.showDirectNotification(item.payload);
        } else if (item.type === 'success') {
          this.showSuccess(item.payload.message, item.payload.options);
        } else if (item.type === 'error') {
          this.showError(item.payload.message, item.payload.options);
        } else if (item.type === 'warning') {
          this.showWarning(item.payload.message, item.payload.options);
        } else if (item.type === 'info') {
          this.showInfo(item.payload.message, item.payload.options);
        }
      });
    }
  }

  // Generate a fingerprint for deduplication
  private getFingerprint(notification: { type: string; message: string; title?: string }): string {
    return `${notification.type}:${notification.message}:${notification.title || ''}`;
  }

  /**
   * Check if a notification with similar content already exists
   */
  private isDuplicate(notification: ShowNotificationOptions): boolean {
    // Create a fingerprint for the notification
    const fingerprint = `${notification.type}:${notification.title}:${notification.message}`;
    const currentTime = Date.now();

    // Check against active notifications within the last 5 seconds
    for (const [existingFingerprint, timestamp] of this.recentNotifications.entries()) {
      // If similar notification was shown in last 5 seconds, consider it a duplicate
      if (existingFingerprint === fingerprint && (currentTime - timestamp) < TIME.TOAST_DUPLICATE_WINDOW_MS) {
        this.log(`[NotificationManager] Blocked duplicate notification: ${fingerprint}`);
        return true;
      }
    }

    // Add this notification to prevent immediate duplicates
    this.recentNotifications.set(fingerprint, currentTime);

    // Remove old notifications from tracking (older than 10 seconds)
    const keysToRemove: string[] = [];
    this.recentNotifications.forEach((timestamp, key) => {
      if (currentTime - timestamp > TIME.TOAST_CLEANUP_OLD_MS) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.recentNotifications.delete(key));

    return false;
  }

  /**
   * Set the connection status
   * @param connected Whether the WebSocket is connected
   */
  setConnected(connected: boolean) {
    this.log('[NotificationManager] Socket ' + (connected ? 'connected' : 'disconnected'));
    this.isSocketConnected = connected;
  }

  // Show notification directly in UI
  showDirectNotification(options: ShowDirectOptions) {
    this.log('[NotificationManager] Showing notification:', options);

    if (!this._context) {
      console.warn('[NotificationManager] Context not set, queueing notification');
      this._queue.push({ type: 'direct', payload: options });
      return;
    }

    // Ensure login notifications are always app category
    let effectiveCategory = options.category || 'system';
    if ((options.type === 'success' && options.message.includes('Welcome back')) ||
      (options.title && options.title === 'Login Successful')) {
      logger.debug('Detected login notification, forcing app category');
      effectiveCategory = 'app';
    }

    // Create notification object
    const notification: Notification = {
      id: uuidv4(),
      message: options.message,
      type: options.type,
      title: options.title,
      duration: options.duration || TIME.TOAST_DURATION_MS,
      timestamp: Date.now(),
      isRead: options.isRead || false,
      category: effectiveCategory
    };

    logger.debug('Notification object created:', notification);

    try {
      // Different handling based on persistence
      if (options.isPersistent || effectiveCategory === 'app') {
        // For persistent notifications or app category, add to backend and panel
        this._context?._addPersistentNotification(notification)
          .then(() => {
            // After adding to backend/storage, also show a toast if it's a new notification
            if (!options.isRead && this._context) {
              this._context._addTemporaryToast(
                options.message,
                options.type,
                {
                  title: options.title,
                  duration: options.duration || TIME.TOAST_DURATION_MS,
                  id: notification.id
                }
              );
            }
          })
          .catch(error => {
            console.error('[NotificationManager] Error adding persistent notification:', error);
          });
      } else {
        // For non-persistent, just add as toast
        this.log('[NotificationManager] Adding to UI:', notification);
        this._context._addTemporaryToast(
          options.message,
          options.type,
          {
            title: options.title,
            duration: options.duration || TIME.TOAST_DURATION_MS,
            id: notification.id
          }
        );
      }

      // For login notifications, also add directly to local storage as a backup
      if ((options.type === 'success' && options.message.includes('Welcome back')) ||
        (options.title && options.title === 'Login Successful')) {
        logger.debug('Adding login notification directly to local storage as backup');
        import('../services/notificationService').then(({ default: notificationService }) => {
          notificationService.addNotification({
            ...notification,
            category: 'app', // Always set app category for login notifications
            isRead: false
          });
        });
      }
    } catch (error) {
      console.error('[NotificationManager] Error showing notification:', error);
    }
  }

  // Process incoming socket notification
  private processSocketNotification(notification: any) {
    logger.socket.event('notification', notification);

    // Add required fields if missing
    const processedNotification: ManagedNotification = {
      id: notification.id || uuidv4(),
      message: notification.message || '',
      type: notification.type || 'info',
      duration: notification.duration || 0,
      timestamp: notification.timestamp || Date.now(),
      isRead: notification.isRead || false,
      title: notification.title || '',
      category: notification.category || 'app',
      source: 'socket'
    };

    // Add to UI and store
    this.addToUI(processedNotification);
  }

  // Add a notification to the UI via the context
  private addToUI(notification: ManagedNotification) {
    logger.debug('Adding notification to UI:', notification);

    if (!this._context) {
      console.warn('[NotificationManager] Context not set, queueing notification:', notification);
      this._queue.push({
        type: 'direct',
        payload: {
          message: notification.message,
          type: notification.type,
          title: notification.title,
          duration: notification.duration,
          isPersistent: notification.category === 'app',
          category: notification.category,
          isRead: notification.isRead
        }
      });
      return;
    }

    // Always add persistent notifications to the backend/panel
    if (notification.category === 'app') {
      this._context._addPersistentNotification(notification)
        .then(() => {
          // Double check context is still available
          if (this._context) {
            // If the notification is new and not marked as read, also show a toast
            if (!notification.isRead) {
              this._context._addTemporaryToast(
                notification.message,
                notification.type,
                {
                  title: notification.title,
                  duration: notification.duration || 5000,
                  id: notification.id
                }
              );
            }
          }
        })
        .catch(error => {
          console.error('[NotificationManager] Error adding notification to persistent storage:', error);
        });
    } else {
      // For system notifications, just show toast
      this._context._addTemporaryToast(
        notification.message,
        notification.type,
        {
          title: notification.title,
          duration: notification.duration,
          id: notification.id
        }
      );
    }
  }

  // Sync pending notifications to server when connected
  private syncPendingNotifications() {
    if (!this.isSocketConnected || this.pendingSyncNotifications.size === 0) return;

    this.log(`[NotificationManager] Syncing ${this.pendingSyncNotifications.size} pending notifications`);

    this.pendingSyncNotifications.forEach((notification, id) => {
      socketService.emit('client:notification', {
        ...notification,
        directlySent: true  // Flag that we already showed this to the user
      });
      this.pendingSyncNotifications.delete(id);
    });
  }

  // Show success notification
  showSuccess(message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) {
    return this.showDirectNotification({
      message,
      type: 'success',
      title: options?.title || 'Success',
      duration: options?.duration || 5000,
      isPersistent: options?.isPersistent !== undefined ? options.isPersistent : false, // Default to false for toast display
      category: 'system'
    });
  }

  // Show error notification
  showError(message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) {
    return this.showDirectNotification({
      message,
      type: 'error',
      title: options?.title || 'Error',
      duration: options?.duration || 0, // Errors don't auto-dismiss by default
      isPersistent: options?.isPersistent !== undefined ? options.isPersistent : false, // Default to false for toast display
      category: 'system'
    });
  }

  // Show warning notification
  showWarning(message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) {
    return this.showDirectNotification({
      message,
      type: 'warning',
      title: options?.title || 'Warning',
      duration: options?.duration || 7000,
      isPersistent: options?.isPersistent !== undefined ? options.isPersistent : false, // Default to false for toast display
      category: 'system'
    });
  }

  // Show info notification
  showInfo(message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) {
    return this.showDirectNotification({
      message,
      type: 'info',
      title: options?.title || 'Information',
      duration: options?.duration || 5000,
      isPersistent: options?.isPersistent !== undefined ? options.isPersistent : false, // Default to false for toast display
      category: 'system'
    });
  }
}

// Export a singleton instance
export const notificationManager = new NotificationManager();

// Helper function to generate IDs if not provided elsewhere
export function generateNotificationId(): string {
  return Math.random().toString(36).substring(2, 9);
} 