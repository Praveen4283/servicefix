import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Avatar,
  IconButton,
  Badge,
  Tooltip,
  useTheme,
  alpha,
  CircularProgress,
  Paper,
  Button,
  Chip
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  DoneAll as MarkAllReadIcon,
  Close as CloseIcon,
  CheckCircleOutline as ReadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from './AuthContext';
import { NotificationEventType, NotificationEventDetail } from './AuthContext';
import notificationService from '../services/notificationService';
import socketService, { useSocket, setupNotificationHandlers } from '../services/socketService';

// Auth context types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'customer';
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
}

// Notification types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

// Network status type
export type NetworkStatusType = 'online' | 'offline' | 'reconnecting';

// Notification interface
export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  timestamp: number;
  isRead: boolean;
  title?: string;
  category: 'app' | 'system'; // 'app' for ticket updates, comments, SLA notifications; 'system' for alerts, errors, etc.
}

// Context value interface
interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType, options?: { title?: string, duration?: number, category?: 'app' | 'system' }) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  unreadCount: number;
  toggleNotificationMenu: (event: React.MouseEvent<HTMLElement>) => void;
  closeNotificationMenu: () => void;
  isNotificationMenuOpen: boolean;
  notificationMenuAnchorEl: HTMLElement | null;
  loading: boolean;
  fetchNotifications: (options?: { limit?: number; offset?: number; unreadOnly?: boolean }) => Promise<void>;
  networkStatus: NetworkStatusType;
}

// Create the context
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Props interface for the provider
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationMenuAnchorEl, setNotificationMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusType>('online');
  const isNotificationMenuOpen = Boolean(notificationMenuAnchorEl);
  
  // Handle the case when AuthProvider is not available
  let isAuthenticated = false;
  let user: User | null = null;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
    user = auth.user;
  } catch (error) {
    console.warn('AuthContext not available, defaulting to unauthenticated state');
  }
  
  const socket = useSocket();
  
  // Generate unique ID
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Remove notification (stable reference needed)
  const removeNotification = useCallback(async (id: string): Promise<void> => {
    // Find the notification first to check its category
    let notificationCategory: 'app' | 'system' | undefined = undefined;
    setNotifications((prev) => {
      const remaining = prev.filter((notification) => {
        if (notification.id === id) {
          notificationCategory = notification.category;
          return false; // Remove from state
        }
        return true; // Keep in state
      });
      return remaining;
    });
    
    // Only attempt backend deletion if it was an 'app' notification
    if (notificationCategory === 'app') {
      await notificationService.removeNotification(id);
    } else {
      // console.log(`Skipping backend delete for non-app notification ID: ${id}`); // Optional debug log
    }
  }, []); // No external dependencies

  // Add notification (stable reference needed for dependent hooks)
  const addNotification = useCallback(
    async (
      message: string,
      type: NotificationType = 'info',
      options?: { 
        title?: string, 
        duration?: number,
        category?: 'app' | 'system' 
      }
    ): Promise<void> => {
      const duration = options?.duration ?? 5000;
      const id = generateId(); // Internal helper doesn't need to be a dependency
      const newNotification: Notification = {
        id,
        message,
        type,
        duration,
        timestamp: Date.now(),
        isRead: false,
        title: options?.title,
        category: options?.category || 'app'
      };
  
      // Update state immediately for responsiveness
      setNotifications((prev) => [...prev, newNotification]);
      
      // Persist the notification
      await notificationService.addNotification(newNotification);
  
      // Auto-remove toast notifications
      if (duration > 0) {
        setTimeout(() => {
          // Use the memoized removeNotification inside setTimeout
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification] // Depends on the stable removeNotification
  );

  // Clear all notifications (stable reference needed)
  const clearNotifications = useCallback(async (): Promise<void> => {
    // Update state immediately for responsiveness
    setNotifications((prev) => prev.filter(n => n.category === 'system'));
    
    // Then update persistence layer
    await notificationService.clearNotifications();
  }, []); // No external dependencies

  // Mark all notifications as read (stable reference needed)
  const markAllAsRead = useCallback(async (): Promise<void> => {
    // Update state immediately for responsiveness
    setNotifications((prev) => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    
    // Then update persistence layer
    await notificationService.markAllAsRead();
  }, []); // No dependencies after removing isAuthenticated dependency

  // Mark a specific notification as read
  const markAsRead = useCallback(async (id: string): Promise<void> => {
    // Update state immediately for responsiveness
    setNotifications((prev) => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
    
    // Then update persistence layer
    await notificationService.markAsRead(id);
  }, []); // No dependencies after removing isAuthenticated dependency

  // Calculate unread count - only for app notifications
  const unreadCount = notifications.filter(notification => !notification.isRead && notification.category === 'app').length;

  // Toggle notification menu (stable reference needed)
  const toggleNotificationMenu = useCallback((event: React.MouseEvent<HTMLElement>): void => {
    setNotificationMenuAnchorEl((prevAnchor) => (prevAnchor ? null : event.currentTarget));
  }, []); // No external dependencies

  // Close notification menu (stable reference needed)
  const closeNotificationMenu = useCallback((): void => {
    setNotificationMenuAnchorEl(null);
  }, []); // No external dependencies
  
  // Fetch notifications - from both API and local storage
  const fetchNotifications = useCallback(async (options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<void> => {
    setLoading(true);

    try {
      // If authenticated, fetch from server and update local storage
      if (isAuthenticated) {
        const serverNotifications = await notificationService.fetchNotifications(options);

        // Merge with existing system notifications, ensuring uniqueness
        setNotifications(prev => {
          const existingNotificationsMap = new Map<string, Notification>();

          // Keep existing system notifications
          prev.filter(n => n.category === 'system').forEach(n => {
            existingNotificationsMap.set(n.id, n);
          });

          // Add or update with server notifications (app category)
          serverNotifications.forEach(n => {
            existingNotificationsMap.set(n.id, n);
          });

          // Convert map values back to an array and sort by timestamp descending
          const merged = Array.from(existingNotificationsMap.values());
          merged.sort((a, b) => b.timestamp - a.timestamp);
          return merged;
        });
      } else {
        // If not authenticated, just load from local storage
        const localNotifications = notificationService.getLocalNotifications();

        // Only use app notifications from local storage if not authenticated
        const appNotifications = localNotifications.filter(n => n.category === 'app');

        // Merge with existing system notifications (ensuring uniqueness)
        setNotifications(prev => {
            const existingNotificationsMap = new Map<string, Notification>();

            // Keep existing system notifications
            prev.filter(n => n.category === 'system').forEach(n => {
                existingNotificationsMap.set(n.id, n);
            });

            // Add local app notifications
            appNotifications.forEach(n => {
                existingNotificationsMap.set(n.id, n);
            });

            // Convert map values back to an array and sort
            const merged = Array.from(existingNotificationsMap.values());
            merged.sort((a, b) => b.timestamp - a.timestamp);
            return merged;
        });
      }
    } catch (error) {
      console.error('Error fetching or processing notifications:', error);
      // Optionally set an error state or show a system notification
      addNotification('Failed to load notifications.', 'error', { category: 'system', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, addNotification]); // Include addNotification dependency

  // Load notifications from localStorage on initial mount
  useEffect(() => {
    // Get stored notifications first for immediate display
    const storedNotifications = notificationService.getLocalNotifications();
    
    // Only use app notifications from local storage
    const appNotifications = storedNotifications.filter(n => n.category === 'app');
    
    // Set initial state with stored notifications
    setNotifications(prev => {
      const systemNotifications = prev.filter(n => n.category === 'system');
      return [...systemNotifications, ...appNotifications];
    });
    
    // Then fetch from server if authenticated
    if (isAuthenticated) {
      fetchNotifications();
    }
    
    // Set up login event listener to refresh notifications when user logs in
    const handleLoginSuccess = () => {
      console.log('User logged in, fetching notifications');
      fetchNotifications();
    };
    
    window.addEventListener('user:login-success', handleLoginSuccess);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('user:login-success', handleLoginSuccess);
    };
  }, [isAuthenticated, fetchNotifications]);

  // Initialize socket connection when authenticated
  useEffect(() => {
    // If authenticated, connect to socket for real-time notifications
    const connectToSocket = async () => {
      if (isAuthenticated) {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          try {
            const socket = await socketService.initializeSocket(authToken);
            
            // Setup notification socket handlers
            const unsubscribe = socketService.subscribeToNotifications((notification) => {
              console.log('Socket notification received:', notification);
              // Handle notifications from the socket
              if (!notification) return;
              
              // Create a notification object from socket data
              const newNotification = {
                id: notification.id || generateId(),
                message: notification.message || '',
                type: notification.type || 'info',
                duration: 0, // App notifications don't auto-dismiss
                timestamp: notification.timestamp || Date.now(),
                isRead: notification.isRead || false,
                title: notification.title || '',
                category: 'app' // Socket notifications are always app notifications
              };
              
              // Add to our state and local storage
              addNotification(newNotification.message, newNotification.type, {
                title: newNotification.title,
                duration: newNotification.duration,
                category: (newNotification.category as 'app' | 'system')
              });
            });
            
            // Setup system notification handlers
            setupNotificationHandlers({
              showSuccess: (message: string, options?: any) => {
                addNotification(message, 'success', { ...options, category: 'system' });
              },
              showError: (message: string, options?: any) => {
                addNotification(message, 'error', { ...options, category: 'system' });
              },
              showWarning: (message: string, options?: any) => {
                addNotification(message, 'warning', { ...options, category: 'system' });
              },
              showInfo: (message: string, options?: any) => {
                addNotification(message, 'info', { ...options, category: 'system' });
              }
            });
            
            // Fetch initial notifications
            fetchNotifications();
            
            return () => {
              unsubscribe();
            };
          } catch (error) {
            console.error('Error connecting to notification socket:', error);
          }
        }
      }
    };
    
    connectToSocket();
  }, [isAuthenticated, addNotification, fetchNotifications]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      addNotification(
        'You are back online. Syncing notifications...',
        'success',
        {
          duration: 3000,
          category: 'system'
        }
      );
      // Refetch notifications when back online
      fetchNotifications();
    };
    
    const handleOffline = () => {
      setNetworkStatus('offline');
      addNotification(
        'You are offline. Some notification features may be limited.',
        'warning',
        {
          duration: 0, // Don't auto-dismiss this important message
          category: 'system'
        }
      );
    };
    
    // Listen for connection status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for force logout event (from token expiration)
    const handleForceLogout = () => {
      addNotification(
        'Your session has expired. Please log in again.',
        'error',
        {
          duration: 0,
          category: 'system'
        }
      );
      // The actual logout will be handled by AuthContext listening to same event
    };
    
    window.addEventListener('user:force-logout', handleForceLogout);
    
    // Initial check
    if (!navigator.onLine) {
      setNetworkStatus('offline');
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('user:force-logout', handleForceLogout);
    };
  }, [addNotification, fetchNotifications]);

  // Listen for notification events from AuthContext
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent<NotificationEventDetail>) => {
      if (event.detail) {
        const { message, type, title, duration } = event.detail;
        console.log('Auth success event received:', message);
        
        // Add notification with the system category
        addNotification(message, type, {
          title,
          duration: duration || 5000,
          category: 'system'
        });
      }
    };

    const handleAuthError = (event: CustomEvent<NotificationEventDetail>) => {
      if (event.detail) {
        const { message, type, title, duration } = event.detail;
        console.log('Auth error event received:', message);
        
        // Add notification with the system category
        addNotification(message, type, {
          title,
          duration: duration || 5000,
          category: 'system'
        });
      }
    };

    // Add event listeners
    window.addEventListener(NotificationEventType.AUTH_SUCCESS, handleAuthSuccess as EventListener);
    window.addEventListener(NotificationEventType.AUTH_ERROR, handleAuthError as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(NotificationEventType.AUTH_SUCCESS, handleAuthSuccess as EventListener);
      window.removeEventListener(NotificationEventType.AUTH_ERROR, handleAuthError as EventListener);
    };
  }, [addNotification]);

  // Context value
  const value: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markAllAsRead,
    markAsRead,
    unreadCount,
    toggleNotificationMenu,
    closeNotificationMenu,
    isNotificationMenuOpen,
    notificationMenuAnchorEl,
    loading,
    fetchNotifications,
    networkStatus
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// Custom hook for using notification context
export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <SuccessIcon color="success" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'info':
    default:
      return <InfoIcon color="info" />;
  }
};

// Notification menu component (for display in AppBar) - only for app notifications
export const NotificationMenu: React.FC = () => {
  const theme = useTheme();
  const { 
    notifications, 
    unreadCount, 
    toggleNotificationMenu, 
    closeNotificationMenu,
    isNotificationMenuOpen,
    notificationMenuAnchorEl,
    removeNotification,
    markAllAsRead,
    markAsRead,
    clearNotifications,
    loading,
    fetchNotifications
  } = useNotification();
  
  // Add pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filter to show only app notifications in the menu
  const appNotifications = useMemo(() => 
    notifications.filter(notification => notification.category === 'app')
  , [notifications]);
  
  // Update displayed notifications when app notifications change
  useEffect(() => {
    // Calculate the number of items to display based on current page
    const endIndex = (page + 1) * ITEMS_PER_PAGE;
    setDisplayedNotifications(appNotifications.slice(0, endIndex));
    
    // Check if we have more to load
    setHasMore(appNotifications.length > endIndex);
  }, [appNotifications, page]);
  
  // Function to load more notifications
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    try {
      // If we already have enough loaded locally, just increment page
      if ((page + 1) * ITEMS_PER_PAGE < appNotifications.length) {
        setPage(p => p + 1);
      } else {
        // Otherwise fetch more from server
        await fetchNotifications({
          offset: appNotifications.length,
          limit: ITEMS_PER_PAGE
        });
        setPage(p => p + 1);
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [appNotifications.length, fetchNotifications, hasMore, loadingMore, page]);
  
  // Handle scroll to implement infinite scroll
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!menuRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = menuRef.current;
      
      // If scrolled to bottom (with a 20px threshold), load more
      if (scrollHeight - scrollTop - clientHeight < 20 && hasMore && !loadingMore) {
        handleLoadMore();
      }
    };
    
    const currentMenuRef = menuRef.current;
    if (currentMenuRef) {
      currentMenuRef.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentMenuRef) {
        currentMenuRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasMore, handleLoadMore, loadingMore]);
  
  // Handle mark all read action
  const handleMarkAllRead = () => {
    markAllAsRead();
    // Don't close the menu
  };
  
  // Handle clear notifications action
  const handleClearNotifications = () => {
    clearNotifications();
    // Don't close the menu
  };
  
  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Handle any links or actions
    // ...
    
    // Close notification menu
    closeNotificationMenu();
  };

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}>
        <IconButton
          onClick={toggleNotificationMenu}
          size="large"
          color="inherit"
          aria-label="show notifications"
        >
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? (
              <NotificationsIcon />
            ) : (
              <NotificationsOffIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={notificationMenuAnchorEl}
        open={isNotificationMenuOpen}
        onClose={closeNotificationMenu}
        PaperProps={{
          sx: {
            width: { xs: 320, sm: 360 },
            maxHeight: { xs: 400, sm: 480 },
            overflowY: 'hidden', // Handle custom scrolling with our ref
            mt: 1.5,
            boxShadow: theme.shadows[4],
            borderRadius: 2
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          <Box>
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={handleMarkAllRead} disabled={appNotifications.every(n => n.isRead)}>
                <MarkAllReadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear all notifications">
              <IconButton size="small" onClick={handleClearNotifications} disabled={appNotifications.length === 0}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider />
        
        <Box 
          ref={menuRef}
          sx={{ 
            overflowY: 'auto', 
            maxHeight: { xs: 320, sm: 400 },
            pb: 1
          }}
        >
          {displayedNotifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="textSecondary" variant="body2">
                No notifications
              </Typography>
            </Box>
          ) : (
            displayedNotifications.map(notification => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderLeft: notification.isRead ? 'none' : `4px solid ${theme.palette.primary.main}`,
                  backgroundColor: notification.isRead ? 'inherit' : alpha(theme.palette.primary.light, 0.1),
                  '&:hover': {
                    backgroundColor: notification.isRead ? 
                      alpha(theme.palette.action.hover, 0.1) : 
                      alpha(theme.palette.primary.light, 0.15)
                  }
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" component="span" sx={{ fontWeight: notification.isRead ? 400 : 600 }}>
                      {notification.title || 'Notification'}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        component="span"
                        color="textPrimary"
                        sx={{ 
                          mb: 0.5,
                          fontWeight: notification.isRead ? 400 : 500,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          WebkitLineClamp: 2,
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        component="span"
                        color="textSecondary"
                        sx={{ display: 'block' }}
                      >
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                    </>
                  }
                  sx={{ margin: 0 }}
                />
                <Tooltip title="Remove">
                  <IconButton
                    size="small"
                    edge="end"
                    sx={{ ml: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </MenuItem>
            ))
          )}
          
          {/* Loading indicator at bottom */}
          {(hasMore || loadingMore) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
              {loadingMore ? (
                <CircularProgress size={24} />
              ) : (
                <Button 
                  size="small" 
                  onClick={handleLoadMore}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Load more
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Menu>
    </>
  );
};

// Helper functions to create notifications with the right category
export const useSystemNotification = () => {
  const { addNotification } = useNotification();

  // Memoize the notification functions
  const showSuccess = useCallback((message: string, options?: { title?: string, duration?: number }) => {
    addNotification(message, 'success', { ...options, category: 'system' });
  }, [addNotification]); // Dependency: addNotification

  const showError = useCallback((message: string, options?: { title?: string, duration?: number }) => {
    addNotification(message, 'error', { ...options, category: 'system' });
  }, [addNotification]); // Dependency: addNotification

  const showWarning = useCallback((message: string, options?: { title?: string, duration?: number }) => {
    addNotification(message, 'warning', { ...options, category: 'system' });
  }, [addNotification]); // Dependency: addNotification

  const showInfo = useCallback((message: string, options?: { title?: string, duration?: number }) => {
    addNotification(message, 'info', { ...options, category: 'system' });
  }, [addNotification]); // Dependency: addNotification

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

// Helper functions for app notifications (tickets, comments, SLA)
export const useAppNotification = () => {
  const { addNotification } = useNotification();

  return {
    showTicketUpdate: (message: string, options?: { title?: string, duration?: number }) => {
      addNotification(message, 'info', { 
        title: options?.title || 'Ticket Update', 
        duration: options?.duration || 0, // App notifications default to not auto-dismiss
        category: 'app' 
      });
    },
    showComment: (message: string, options?: { title?: string, duration?: number }) => {
      addNotification(message, 'info', { 
        title: options?.title || 'New Comment', 
        duration: options?.duration || 0,
        category: 'app' 
      });
    },
    showSLA: (message: string, options?: { title?: string, duration?: number }) => {
      addNotification(message, 'warning', { 
        title: options?.title || 'SLA Alert', 
        duration: options?.duration || 0,
        category: 'app' 
      });
    }
  };
};

// Toast Notification container (for display in layout) - only for system notifications (alerts, errors, etc.)
export const NotificationContainer: React.FC = () => {
  const theme = useTheme();
  const { notifications, removeNotification } = useNotification();

  // Filter for system notifications with duration > 0
  // Sort by newest first and limit to 5 at a time to prevent overload
  const systemToastNotifications = notifications
    .filter(n => n.duration > 0 && n.category === 'system')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5); // Limit to showing maximum 5 notifications at once
  
  if (systemToastNotifications.length === 0) {
    return null;
  }

  return (
    <Box 
      className="notification-container"
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8, // Increased gap between notifications for better visual separation
        maxWidth: 350,
        maxHeight: '80vh',
        overflowY: 'auto',
        p: 1,
        pointerEvents: 'none',
        '&::-webkit-scrollbar': {
          width: 0,
          background: 'transparent'
        }
      }}
    >
      {systemToastNotifications.map((notification, index) => (
        <Paper
          key={notification.id}
          elevation={3}
          onClick={() => removeNotification(notification.id)}
          sx={{
            p: 1.5,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 1,
            animation: `slideIn 0.3s ease ${index * 0.1}s forwards`, // Staggered animation based on index
            transform: 'translate3d(0, 0, 0)', // Ensures proper stacking context
            zIndex: 9999 - index, // Decreasing z-index for proper stacking
            pointerEvents: 'auto',
            backgroundColor: notification.type === 'success' ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.8 : 0.1) :
                            notification.type === 'error' ? alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.8 : 0.1) :
                            notification.type === 'warning' ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.8 : 0.1) :
                            alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.8 : 0.1),
            color: notification.type === 'success' ? theme.palette.success.main :
                  notification.type === 'error' ? theme.palette.error.main :
                  notification.type === 'warning' ? theme.palette.warning.main :
                  theme.palette.info.main,
            backdropFilter: 'blur(4px)',
            border: '1px solid',
            borderColor: notification.type === 'success' ? alpha(theme.palette.success.main, 0.3) :
                          notification.type === 'error' ? alpha(theme.palette.error.main, 0.3) :
                          notification.type === 'warning' ? alpha(theme.palette.warning.main, 0.3) :
                          alpha(theme.palette.info.main, 0.3),
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
              transform: 'translateY(-2px) translate3d(0, 0, 0)', // Maintain proper stacking context
              transition: 'all 0.2s ease'
            }
          }}
        >
          <Box display="flex" alignItems="flex-start" gap={1.5}>
            <ListItemIcon sx={{ minWidth: 'auto', mt: 0.5, color: 'inherit' }}>
              {getNotificationIcon(notification.type)}
            </ListItemIcon>
            <Box>
              {notification.title && (
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {notification.title}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                {notification.message}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
            sx={{ 
              color: theme.palette.text.secondary,
              p: 0.5,
              ml: 1,
              '&:hover': {
                color: theme.palette.text.primary
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Paper>
      ))}
    </Box>
  );
};

// SystemAlert component for direct inline use of system notifications in components
interface SystemAlertProps {
  message: string;
  type?: NotificationType;
  title?: string;
  onClose?: () => void;
  action?: React.ReactNode;
  elevation?: number;
  sx?: any;
}

export const SystemAlert: React.FC<SystemAlertProps> = ({
  message,
  type = 'info',
  title,
  onClose,
  action,
  elevation = 1,
  sx = {}
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={elevation}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        borderLeft: `4px solid ${
          type === 'error' ? theme.palette.error.main :
          type === 'warning' ? theme.palette.warning.main :
          type === 'success' ? theme.palette.success.main :
          theme.palette.info.main
        }`,
        backgroundColor: type === 'success' ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.05) :
                        type === 'error' ? alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.05) :
                        type === 'warning' ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.2 : 0.05) :
                        alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.2 : 0.05),
        display: 'flex',
        alignItems: 'flex-start',
        ...sx
      }}
    >
      <ListItemIcon sx={{ 
        minWidth: 'auto', 
        mr: 2, 
        mt: 0, 
        color: type === 'error' ? theme.palette.error.main :
               type === 'warning' ? theme.palette.warning.main :
               type === 'success' ? theme.palette.success.main :
               theme.palette.info.main
      }}>
        {getNotificationIcon(type)}
      </ListItemIcon>
      <Box sx={{ flex: 1 }}>
        {title && (
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {title}
          </Typography>
        )}
        <Typography variant="body2">
          {message}
        </Typography>
      </Box>
      {action || (onClose && (
        <IconButton 
          size="small" 
          onClick={onClose}
          sx={{ ml: 1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      ))}
    </Paper>
  );
};

// Add CSS animation for notification entry
const addNotificationStyles = () => {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
      }
    }
    
    .notification-container > *:nth-child(1) { transform: translateY(0); }
    .notification-container > *:nth-child(2) { transform: translateY(0); }
    .notification-container > *:nth-child(3) { transform: translateY(0); }
    .notification-container > *:nth-child(4) { transform: translateY(0); }
    .notification-container > *:nth-child(5) { transform: translateY(0); }
  `;
  document.head.appendChild(styleElement);
};

// Run once when the file is imported
if (typeof window !== 'undefined') {
  addNotificationStyles();
}

/*
USAGE EXAMPLES:

1. For system notifications (alerts, warnings, errors, confirmations)
   These appear as toast notifications at the bottom right

   // Using the hook for toast notifications
   import { useSystemNotification } from '../context/NotificationContext';

   const MyComponent = () => {
     const { showSuccess, showError, showWarning, showInfo } = useSystemNotification();
     
     const handleSave = async () => {
       try {
         await saveData();
         showSuccess('Your changes have been saved successfully!', { title: 'Success' });
       } catch (error) {
         showError('Failed to save changes. Please try again.');
       }
     };

     return <Button onClick={handleSave}>Save</Button>;
   };

2. For inline alerts in components

   // Using the inline component for contextual messages
   import { SystemAlert } from '../context/NotificationContext';

   const FormWithWarning = () => {
     const [showWarning, setShowWarning] = useState(true);
     
     return (
       <Box>
         {showWarning && (
           <SystemAlert 
             type="warning"
             title="Unsaved Changes"
             message="You have unsaved changes. Are you sure you want to leave this page?"
             onClose={() => setShowWarning(false)}
             action={
               <Box>
                 <Button size="small" onClick={handleStay} color="inherit">Stay</Button>
                 <Button size="small" onClick={handleLeave} color="warning">Leave</Button>
               </Box>
             }
           />
         )}
         <form>...</form>
       </Box>
     );
   };

3. For app notifications (tickets, comments, SLA)
   These appear in the top-right notification menu when clicked

   import { useAppNotification } from '../context/NotificationContext';

   const TicketComponent = () => {
     const { showTicketUpdate, showComment, showSLA } = useAppNotification();
     
     useEffect(() => {
       // Show notification when a ticket is assigned
       showTicketUpdate('Ticket #1234 has been assigned to you');
       
       // Show notification for a new comment
       showComment('John added a comment to Ticket #1234');
       
       // Show an SLA notification
       showSLA('Ticket #1234 is approaching its SLA deadline');
     }, []);

     return <div>Ticket component</div>;
   };
*/ 