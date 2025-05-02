import notificationService from './notificationService';
import socketService from './socketService';

/**
 * Initializes all notification services
 * Call this during app initialization or when user logs in
 */
export const initializeNotificationSystem = async (authToken?: string): Promise<void> => {
  console.log('Initializing notification system');
  
  try {
    // Start storage cleanup for notifications
    notificationService.startStorageCleanup();
    
    // Retry failed notifications from previous sessions
    await notificationService.retryFailedNotifications();
    
    // Initialize socket if token is available
    if (authToken) {
      try {
        await socketService.initializeSocket(authToken);
        console.log('Notification socket connected successfully');
      } catch (error) {
        console.error('Failed to initialize notification socket:', error);
        // Socket connection will be retried by the enhanced socketService
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
  console.log('Shutting down notification system');
  
  // Disconnect socket
  socketService.disconnect();
  
  // Stop periodic storage cleanup
  notificationService.stopStorageCleanup();
};

// Auto-initialize if a token exists
const authToken = localStorage.getItem('authToken');
if (authToken) {
  setTimeout(() => {
    initializeNotificationSystem(authToken);
  }, 1000); // Slight delay to ensure other services are initialized
}

export default {
  initializeNotificationSystem,
  shutdownNotificationSystem
}; 