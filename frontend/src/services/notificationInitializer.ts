import notificationService from './notificationService';
import socketService from './socketService';
import { notificationManager } from './notificationManager';

// Debug mode flag
const isDebugMode = process.env.NODE_ENV === 'development';

// Debug logger
const debugLog = (message: string) => {
  if (isDebugMode) {
    // console.log(message); // Removed this line
  }
};

/**
 * Initializes all notification services
 * Call this during app initialization or when user logs in
 */
export const initializeNotificationSystem = async (authToken?: string): Promise<void> => {
  debugLog('Initializing notification system');

  try {
    // Start storage cleanup for notifications
    notificationService.startStorageCleanup();

    // Initialize socket if token is available
    if (authToken) {
      try {
        // Connect socket
        await socketService.initializeSocket(authToken);
        debugLog('Notification socket connected successfully');

        // Notify notification manager that system is ready
        // This is already handled by notification manager's listeners
      } catch (error) {
        console.error('Failed to initialize notification socket:', error);
        // Socket connection will be retried by the enhanced socketService

        // Show offline state notification
        notificationManager.showWarning('Running in offline mode. Some features may be limited.');
      }
    }
  } catch (error) {
    console.error('Error initializing notification system:', error);
  }
};

/**
 * Clean up notification services
 * Call this during app shutdown or when user logs out
 */
export const shutdownNotificationSystem = (): void => {
  debugLog('Shutting down notification system');

  // Disconnect socket
  socketService.disconnect();

  // Stop periodic storage cleanup
  notificationService.stopStorageCleanup();
};

export default {
  initializeNotificationSystem,
  shutdownNotificationSystem
}; 