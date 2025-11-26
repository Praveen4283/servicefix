import { io, Socket } from 'socket.io-client';
import apiClient from './apiClient';
import { notificationManager } from './notificationManager';

// Enhanced connection state tracking
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Event tracking
interface EventListener {
  event: string;
  callback: (data: any) => void;
}

// Log if triggered multiple times during single user session (indicates potential memory leak)
let setupCounter = 0;

// State to track if connection is active
let socket: Socket | null = null;
let connectionState: ConnectionState = 'disconnected';
let connectionPromise: Promise<void> | null = null;
let connectionId: string = '';
let isPageTransitioning = false;
let pageTransitionTimer: NodeJS.Timeout | null = null;
let pageTransitionCount = 0; // Count transitions to prevent excessive reconnects
let lastToken: string | null = null;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let eventListeners: EventListener[] = [];

// Track event listeners for custom events
const connectListeners: Array<() => void> = [];
const disconnectListeners: Array<() => void> = [];
const stateChangeListeners: Array<(state: ConnectionState) => void> = [];

// Enhanced reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL_MS = 2000;

// Increase the connection timeout and improve error handling
const connectionTimeoutMs = 30000; // Increase from 20000 to 30000 (30 seconds)

/**
 * Update the connection state and notify listeners
 * @param newState New connection state
 */
function updateConnectionState(newState: ConnectionState): void {
  const previousState = connectionState;
  connectionState = newState;
  
  // Only log state changes
  if (previousState !== newState) {
    console.log(`[Socket Service] Connection state changed: ${previousState} -> ${newState}`);
    
    // Notify state change listeners
    stateChangeListeners.forEach(listener => {
      try {
        listener(newState);
      } catch (err) {
        console.error("[Socket Service] Error in state change listener:", err);
      }
    });
  }
}

/**
 * Setup page transition listeners to manage socket during navigation
 */
function setupPageTransitionListeners() {
  // Handle page transitions by preserving connection during navigation
  window.addEventListener('beforeunload', () => {
    if (socket?.connected) {
      // Set a flag that we're disconnecting intentionally due to page reload
      localStorage.setItem('socket_intentional_disconnect', 'true');
    }
  });

  // Handle React Router transitions
  const originalPushState = window.history.pushState;
  window.history.pushState = function(state, title, url) {
    // Prevent excessive reconnections during multiple rapid page transitions
    if (!isPageTransitioning) {
      pageTransitionCount++;
      isPageTransitioning = true;
      
      // Clear any existing timer
      if (pageTransitionTimer) {
        clearTimeout(pageTransitionTimer);
      }
      
      // Set a timer to reset the transition flag
      pageTransitionTimer = setTimeout(() => {
        isPageTransitioning = false;
        
        // Only reset count after transitions have completed
        setTimeout(() => {
          pageTransitionCount = 0;
        }, 5000);
      }, 2000);
      
      console.log(`[Socket Service] Page transition detected (count: ${pageTransitionCount})`);
    }
    
    return originalPushState.apply(this, [state, title, url]);
  };
}

/**
 * Handle socket reconnection after page transitions
 * The goal is to only initiate a reconnection if needed after the SPA navigation completes
 */
function handlePageTransitionReconnection() {
  // If we're reconnecting too often, delay further attempts
  if (pageTransitionCount > 5) {
    console.log('[Socket Service] Too many transitions, delaying reconnection');
    
    // Wait longer before another reconnection attempt
    setTimeout(() => {
      if (connectionState !== 'connected' && connectionState !== 'connecting' && lastToken) {
        socketService.initializeSocket(lastToken);
      }
    }, 5000);
    
    return;
  }
  
  // Normal reconnection schedule
  setTimeout(() => {
    if (connectionState !== 'connected' && connectionState !== 'connecting' && lastToken) {
      console.log('[Socket Service] Attempting reconnection after page transition');
      socketService.initializeSocket(lastToken);
    }
  }, 2000);
}

// Set up transition listeners on load
setupPageTransitionListeners();

// Singleton connection management - track all active socket requests to prevent race conditions
let activeConnectionRequest: Promise<void> | null = null;
let connectionTimeout: NodeJS.Timeout | null = null;

/**
 * Socket service for real-time notifications and communication
 */
const socketService = {
  /**
   * Initialize the socket connection
   * @param token JWT token for authentication
   * @returns Promise that resolves when connection is established
   */
  initializeSocket: async (token: string): Promise<void> => {
    // Store token for reconnection purposes
    lastToken = token;
    
    // Generate a unique connection ID for this attempt
    const attemptId = Math.random().toString(36).substring(2, 10);
    
    // If already connected with the same token, resolve immediately
    if (socket?.connected && connectionState === 'connected') {
      return Promise.resolve();
    }
    
    // Use a singleton connection promise to prevent multiple parallel connection attempts
    if (activeConnectionRequest) {
      console.log('[Socket Service] Connection already in progress, reusing request');
      return activeConnectionRequest;
    }
    
    // If we're in a page transition, delay socket initialization
    if (isPageTransitioning) {
      console.log('[Socket Service] In page transition, delaying new socket connection');
      return new Promise((resolve) => {
        setTimeout(() => {
          // Check if another connection attempt has succeeded while we were waiting
          if (socket?.connected && connectionState === 'connected') {
            resolve();
          } else {
            socketService.initializeSocket(token).then(resolve);
          }
        }, 2000);
      });
    }

    // Update state and store connection ID
    updateConnectionState('connecting');
    connectionId = attemptId;
    console.log(`[Socket Service] Starting new connection (${connectionId})`);
    
    // Create a new connection promise with timeout handling
    const connectionPromiseWithTimeout = new Promise<void>((resolve, reject) => {
      // Clean up any existing socket connection first
      if (socket) {
        console.log(`[Socket Service] Cleaning up existing socket before creating new one (${connectionId})`);
        socket.disconnect();
        socket.removeAllListeners();
        socket = null;
      }

      // Cancel any existing timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Set a new connection timeout
      connectionTimeout = setTimeout(() => {
        console.error(`[Socket Service] Connection timeout after ${connectionTimeoutMs/1000}s (${connectionId})`);
        if (connectionState === 'connecting') {
          updateConnectionState('error');
          if (socket) {
            // Force disconnect the socket to clean up resources
            socket.disconnect();
            socket = null;
          }
          
          // Clear the active connection request
          activeConnectionRequest = null;
          
          // Schedule a reconnect attempt after a delay
          setTimeout(() => {
            if (lastToken && connectionState !== 'connected') {
              console.log(`[Socket Service] Attempting recovery after timeout`);
              socketService.initializeSocket(lastToken);
            }
          }, 3000);
          
          reject(new Error('Connection timeout'));
        }
      }, connectionTimeoutMs);
      
      // Create socket connection with better auth handling
      try {
        // Determine the base URL for Socket.IO connection
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const socketUrl = apiUrl.replace(/\/api$/, '') || 'http://localhost:5000'; 
        
        console.log(`[Socket Service] Creating new socket connection to ${socketUrl} (${connectionId})`);
        socket = io(socketUrl, {
          path: '/socket.io',
          // Use auth token and cookies together for double validation
          auth: { token },
          reconnection: false, // We'll handle reconnection manually
          timeout: connectionTimeoutMs, // Increased from 10000 to match our timeout
          withCredentials: true, // Essential for cookie-based auth
          transports: ['websocket', 'polling'], // Prefer websocket but fallback to polling
          forceNew: true, // Force a new connection to avoid reuse issues
          extraHeaders: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Define handlers first
        const onConnect = () => {
          console.log(`[Socket Service] Connected successfully (${connectionId})`);
          
          // Clear timeout once connected
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          updateConnectionState('connected');
          reconnectAttempts = 0;
          
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          
          // Re-register any event listeners that were registered
          eventListeners.forEach(listener => {
            socket?.on(listener.event, listener.callback);
          });
          
          // Notify custom connect listeners
          connectListeners.forEach(listener => {
            try {
              listener();
            } catch (err) {
              console.error("[Socket Service] Error in connect listener:", err);
            }
          });
          
          // Clear the active connection request
          activeConnectionRequest = null;
          
          resolve();
        };

        const onConnectError = (error: Error) => {
          console.error(`[Socket Service] Connection error (${connectionId}):`, error.message);
          updateConnectionState('error');
          
          // Only attempt reconnection if not during page transition
          if (!isPageTransitioning) {
            // Handle reconnect with backoff
            handleReconnect(token, connectionId);
          }
          
          // Reject for this specific connection attempt
          if (connectionId === attemptId) {
            connectionPromise = null;
            reject(error);
          }
        };

        const onError = (error: Error) => {
          console.error(`[Socket Service] Socket error (${connectionId}):`, error.message);
          updateConnectionState('error');
          
          // Only reject if this is still the current connection attempt
          if (connectionId === attemptId) {
            connectionPromise = null;
            reject(error);
          }
        };

        const onDisconnect = (reason: Socket.DisconnectReason) => {
          console.log(`[Socket Service] Disconnected (${connectionId}), reason: ${reason}`);
          updateConnectionState('disconnected');
          
          // Notify custom disconnect listeners
          disconnectListeners.forEach(listener => {
            try {
              listener();
            } catch (err) {
              console.error("[Socket Service] Error in disconnect listener:", err);
            }
          });
          
          // Determine if we should reconnect
          const isIntentionalDisconnect = reason === 'io client disconnect' || reason === 'io server disconnect';
          
          if (!isIntentionalDisconnect && !isPageTransitioning) {
            // Normal reconnection for connection drops
            handleReconnect(token, connectionId);
          } else if (isPageTransitioning) {
            // For page transitions, we'll handle reconnection separately
            console.log('[Socket Service] Page transition detected, scheduling reconnect');
            handlePageTransitionReconnection();
          }
        };
        
        const onTokenExpired = async () => {
          console.log(`[Socket Service] Token expired (${connectionId}), attempting refresh`);
          
          try {
            // Attempt to refresh the token
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              console.error(`[Socket Service] No refresh token available (${connectionId})`);
              throw new Error('No refresh token available');
            }
            
            const response = await apiClient.post('/auth/refresh-token', { refreshToken });
            const { token: newToken } = response;
            
            console.log(`[Socket Service] Token refreshed successfully (${connectionId}), reconnecting`);
            
            // Save the new token
            localStorage.setItem('authToken', newToken);
            lastToken = newToken;
            
            // Reconnect with new token
            socket?.disconnect();
            setTimeout(() => {
              socketService.initializeSocket(newToken);
            }, 500);

          } catch (error) {
            console.error(`[Socket Service] Token refresh failed (${connectionId}):`, error);
            // Force logout on token refresh failure
            window.dispatchEvent(new CustomEvent('user:force-logout'));
          }
        };

        // Attach listeners
        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('error', onError);
        socket.on('disconnect', onDisconnect);
        socket.on('token_expired', onTokenExpired);

      } catch (error) {
        console.error(`[Socket Service] Error during socket creation (${connectionId}):`, error);
        updateConnectionState('error');
        
        // Clear timeout on error
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        activeConnectionRequest = null;
        reject(error);
      }
    });
    
    // Set the active connection request
    activeConnectionRequest = connectionPromiseWithTimeout;
    
    // Ensure active request is cleared on error/completion
    connectionPromiseWithTimeout.catch(() => {
      activeConnectionRequest = null;
    });
    
    // Return the promise
    return connectionPromiseWithTimeout;
  },

  /**
   * Disconnect the socket
   */
  disconnect: (): void => {
    if (socket) {
      console.log('[Socket Service] Manually disconnecting socket');
      
      // Clear any reconnection timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      reconnectAttempts = 0;
      
      // Update state before disconnecting to prevent reconnect attempts
      updateConnectionState('disconnected');
      connectionPromise = null;
      
      socket.disconnect();
      socket = null;
      connectionId = '';
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
   * Register a handler for notifications
   * @param callback Function to execute when notification is received
   * @returns Function to unregister the handler
   */
  onNotification: (callback: (notification: any) => void): () => void => {
    // Register the callback with Socket.IO
    if (socket) {
      socket.on('notification', callback);
    }
    
    // Add to list of notification listeners to re-register on reconnect
    const listener = { event: 'notification', callback };
    eventListeners.push(listener);
    
    // Return cleanup function
    return () => {
      // Remove from socket
      if (socket) {
        socket.off('notification', callback);
      }
      
      // Remove from our tracking array
      const index = eventListeners.findIndex(
        (l: EventListener) => l.event === 'notification' && l.callback === callback
      );
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    };
  },

  /**
   * Check if socket is connected
   * @returns True if connected, false otherwise
   */
  isConnected: (): boolean => {
    return socket?.connected || false;
  },
  
  /**
   * Get current connection state
   * @returns Current connection state
   */
  getConnectionState: (): ConnectionState => {
    return connectionState;
  },
  
  /**
   * Subscribe to connection state changes
   * @param listener Function to call when connection state changes
   * @returns Function to unsubscribe
   */
  onStateChange: (listener: (state: ConnectionState) => void): (() => void) => {
    stateChangeListeners.push(listener);
    
    // Call the listener with current state immediately
    setTimeout(() => listener(connectionState), 0);
    
    // Return unsubscribe function
    return () => {
      const index = stateChangeListeners.indexOf(listener);
      if (index !== -1) {
        stateChangeListeners.splice(index, 1);
      }
    };
  },
  
  /**
   * Add a listener for socket connect events
   * @param listener Function to call when socket connects
   * @returns Function to remove the listener
   */
  onConnect: (listener: () => void): (() => void) => {
    connectListeners.push(listener);
    
    // If already connected, call the listener immediately
    if (socket?.connected) {
      setTimeout(() => listener(), 0);
    }
    
    // Return unsubscribe function
    return () => {
      const index = connectListeners.indexOf(listener);
      if (index !== -1) {
        connectListeners.splice(index, 1);
      }
    };
  },
  
  /**
   * Add a listener for socket disconnect events
   * @param listener Function to call when socket disconnects
   * @returns Function to remove the listener
   */
  onDisconnect: (listener: () => void): (() => void) => {
    disconnectListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = disconnectListeners.indexOf(listener);
      if (index !== -1) {
        disconnectListeners.splice(index, 1);
      }
    };
  },
  
  /**
   * Force reconnection with the last token
   * @returns Promise that resolves when reconnected
   */
  reconnect: async (): Promise<void> => {
    if (lastToken) {
      return socketService.initializeSocket(lastToken);
    }
    throw new Error('No token available for reconnection');
  },
  
  /**
   * Emit an event to the server
   * @param event Event name
   * @param data Event data
   * @returns True if event was emitted, false otherwise
   */
  emit: (event: string, data: any): boolean => {
    if (!socket?.connected) {
      console.warn(`[Socket Service] Cannot emit ${event}, socket not connected`);
      return false;
    }
    
    try {
      socket.emit(event, data);
      return true;
    } catch (error) {
      console.error(`[Socket Service] Error emitting ${event}:`, error);
      return false;
    }
  }
};

/**
 * Handle reconnect attempts with exponential backoff
 * @param token JWT token for authentication 
 * @param originalConnectionId The ID of the connection attempt that triggered this reconnect
 */
const handleReconnect = (token: string, originalConnectionId: string): void => {
  if (reconnectTimer) {
    // Clear any existing reconnect timer
    clearTimeout(reconnectTimer);
  }
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[Socket Service] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
    updateConnectionState('error');
    // Dispatch global event that can be handled by UI to show an error
    window.dispatchEvent(new CustomEvent('socket:max-reconnects-failed'));
    return;
  }
  
  // Calculate backoff delay with jitter
  const baseDelay = Math.min(30000, RECONNECT_INTERVAL_MS * Math.pow(1.5, reconnectAttempts));
  const jitter = Math.floor(Math.random() * 1000); // Add up to 1s of jitter
  const delay = baseDelay + jitter;
  
  reconnectAttempts++;
  updateConnectionState('reconnecting');
  
  console.log(`[Socket Service] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
  
  reconnectTimer = setTimeout(() => {
    console.log(`[Socket Service] Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    
    // Check if another connection has been established while we were waiting
    if (connectionState === 'connected' && socket?.connected) {
      console.log('[Socket Service] Already reconnected via another path, canceling reconnect');
      return;
    }
    
    // Try to reconnect
    socketService.initializeSocket(token)
      .catch(error => {
        console.error(`[Socket Service] Reconnection attempt ${reconnectAttempts} failed:`, error.message);
        
        // Prevent a race condition if multiple callbacks hit
        if (connectionState !== 'connected') {
          handleReconnect(token, originalConnectionId);
        }
      });
  }, delay);
};

/**
 * Hook for accessing socket service in React components
 * @returns Socket service
 */
export function useSocket() {
  return socketService;
}

/**
 * Set up socket notification listeners for the application
 * @returns Cleanup function
 */
export function setupNotificationListeners() {
  const unsubscribe = socketService.subscribeToNotifications((notification) => {
    if (notification && notification.type) {
      switch (notification.type) {
        case 'success':
          notificationManager.showSuccess(notification.message, { 
            title: notification.title || 'Success',
            isPersistent: true
          });
          break;
        case 'error':
          notificationManager.showError(notification.message, { 
            title: notification.title || 'Error',
            isPersistent: true
          });
          break;
        case 'warning':
          notificationManager.showWarning(notification.message, { 
            title: notification.title || 'Warning',
            isPersistent: true
          });
          break;
        case 'info':
        default:
          notificationManager.showInfo(notification.message, { 
            title: notification.title || 'Information',
            isPersistent: true
          });
      }
    }
  });
  
  return unsubscribe;
}

export default socketService; 