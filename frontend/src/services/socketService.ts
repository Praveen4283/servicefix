import { io, Socket } from 'socket.io-client';
import { useNotification, useSystemNotification } from '../context/NotificationContext';
import apiClient from './apiClient';

// State to track if connection is active
let socket: Socket | null = null;
let isConnecting = false;
let connectionPromise: Promise<void> | null = null;

// Enhanced reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL_MS = 2000;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Socket service for real-time notifications and communication
 */
const socketService = {
  /**
   * Initialize the socket connection
   * @param token JWT token for authentication
   * @returns Promise that resolves when connection is established
   */
  initializeSocket: (token: string): Promise<void> => {
    // If already connected, resolve immediately
    if (socket?.connected) {
      return Promise.resolve();
    }
    
    // If connection attempt already running, return the existing promise
    if (isConnecting && connectionPromise) {
      return connectionPromise;
    }

    isConnecting = true; // Set flag immediately
    
    // Create a new connection promise
    connectionPromise = new Promise((resolve, reject) => {
      // Determine the base URL for Socket.IO connection
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      // Remove trailing '/api' if present for socket connection
      const socketUrl = apiUrl.replace(/\/api$/, '') || 'http://localhost:5000'; 

      // Create socket connection
      try {
        socket = io(socketUrl, {
          path: '/socket.io',
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        // Define handlers first
        const onConnect = () => {
          isConnecting = false; // Unset flag
          reconnectAttempts = 0;
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          // Remove listeners after resolving/rejecting
          removeListeners(); 
          resolve();
        };

        const onError = (error: Error) => {
          isConnecting = false; // Unset flag
          connectionPromise = null; // Clear the promise
          // Remove listeners after resolving/rejecting
          removeListeners();
          reject(error);
          // Trigger manual reconnect if initial connection fails
          handleReconnect(token); 
        };

        const onDisconnect = (reason: Socket.DisconnectReason) => {
          isConnecting = false; // Ensure flag is unset on disconnect
          // Attempt to reconnect if it was not an intentional disconnect
          if (reason !== 'io client disconnect') {
            handleReconnect(token);
          }
        };
        
        const onTokenExpired = async () => {
          try {
            // Attempt to refresh the token
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }
            
            const response = await apiClient.post('/auth/refresh-token', { refreshToken });
            const { token: newToken } = response;
            
            // Save the new token
            localStorage.setItem('authToken', newToken);
            
            // Reconnect with new token
            socket?.disconnect();
            setTimeout(() => {
              socketService.initializeSocket(newToken);
            }, 500);

          } catch (error) {
            // Force logout on token refresh failure
            window.dispatchEvent(new CustomEvent('user:force-logout'));
          }
        };

        // Helper to remove listeners
        const removeListeners = () => {
          socket?.off('connect', onConnect);
          socket?.off('connect_error', onError);
          socket?.off('disconnect', onDisconnect);
          socket?.off('token_expired', onTokenExpired);
        }

        // Attach listeners
        socket.on('connect', onConnect);
        socket.on('connect_error', onError);
        socket.on('disconnect', onDisconnect);
        socket.on('token_expired', onTokenExpired);

      } catch (error) {
        isConnecting = false; // Ensure flag is unset on immediate error
        connectionPromise = null; // Clear the promise
        reject(error);
      }
    });
    
    return connectionPromise;
  },

  /**
   * Disconnect the socket
   */
  disconnect: (): void => {
    if (socket) {
      // Clear any reconnection timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      reconnectAttempts = 0;
      isConnecting = false;
      connectionPromise = null;
      
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * Subscribe to notifications
   * @param callback Function to call when a notification is received
   * @returns Function to unsubscribe
   */
  subscribeToNotifications: (callback: (notification: any) => void): (() => void) => {
    if (!socket) {
      return () => {};
    }

    socket.on('notification', callback);
    return () => {
      if (socket) {
        socket.off('notification', callback);
      }
    };
  },

  /**
   * Check if socket is connected
   * @returns True if connected, false otherwise
   */
  isConnected: (): boolean => {
    return socket?.connected || false;
  }
};

/**
 * Handle socket reconnection with exponential backoff
 * @param token JWT token for authentication
 */
const handleReconnect = (token: string) => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return;
  }
  
  if (reconnectTimer) clearTimeout(reconnectTimer);
  
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    socketService.initializeSocket(token)
      .then(() => {
        reconnectAttempts = 0;
      })
      .catch(() => {
        // Only try to reconnect again if we haven't exceeded the max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          handleReconnect(token);
        }
      });
  }, RECONNECT_INTERVAL_MS * Math.min(reconnectAttempts + 1, 5)); // Exponential backoff capped at 5x
};

/**
 * Hook for using socket connection in React components
 */
export function useSocket() {
  return socketService;
}

/**
 * Register real-time notification handlers
 * @param notificationHandlers Object containing notification handlers
 */
export function setupNotificationHandlers(notificationHandlers: {
  showSuccess?: (message: string, options?: any) => void;
  showError?: (message: string, options?: any) => void;
  showWarning?: (message: string, options?: any) => void;
  showInfo?: (message: string, options?: any) => void;
}) {
  if (!socket) {
    return;
  }

  // Handle notifications from the server
  socket.on('notification', (notification) => {
    if (!notification) return;

    // Handle different notification actions
    if (notification.action === 'mark_read' || notification.action === 'mark_all_read') {
      // These are handled by the context, no need to add a notification
      return;
    }

    // For actual notifications
    if (notification.title && notification.message) {
      // Select the appropriate notification function based on type
      switch (notification.type) {
        case 'success':
          notificationHandlers.showSuccess?.(notification.message, { title: notification.title });
          break;
        case 'error':
          notificationHandlers.showError?.(notification.message, { title: notification.title });
          break;
        case 'warning':
          notificationHandlers.showWarning?.(notification.message, { title: notification.title });
          break;
        default:
          notificationHandlers.showInfo?.(notification.message, { title: notification.title });
          break;
      }
    }
  });
}

export default socketService; 