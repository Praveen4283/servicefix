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
import socketService, { useSocket, setupNotificationListeners } from '../services/socketService';
import { notificationManager } from '../services/notificationManager';
// Use direct imports from date-fns-tz for better debugging
import { formatInTimeZone, zonedTimeToUtc, format } from 'date-fns-tz';

// Auth context types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'customer';
  timezone: string;
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
  temporaryToasts: Notification[];
}

// Create the context
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Props interface for the provider
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [temporaryToasts, setTemporaryToasts] = useState<Notification[]>([]);
  const [notificationMenuAnchorEl, setNotificationMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusType>('online');
  const isNotificationMenuOpen = Boolean(notificationMenuAnchorEl);
  
  const { isAuthenticated } = useAuth();
  
  // We don't need this anymore since NotificationManager handles this
  // const socket = useSocket();
  
  // Log temporaryToasts when it changes for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NotificationContext] temporaryToasts updated:', temporaryToasts);
    }
  }, [temporaryToasts]);
  
  // Generate unique ID
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Internal function to add temporary toast directly to state
  const _addTemporaryToast = useCallback((
    message: string,
    type: NotificationType,
    options?: { title?: string, duration?: number, id?: string }
  ) => {
    const effectiveDuration = options?.duration ?? 5000;
    const toastId = options?.id || generateId(); // Use provided ID if available
    const toastNotification: Notification = {
      id: toastId,
      message,
      type,
      duration: effectiveDuration,
      timestamp: Date.now(),
      isRead: true, // Mark as read immediately, not relevant for transient toast
      title: options?.title,
      category: 'system' // Toasts are system category
    };

    // Add to the dedicated temporary toast state
    setTemporaryToasts(prev => [...prev, toastNotification].sort((a, b) => b.timestamp - a.timestamp));

    // Set timeout for removal from temporary state
    if (effectiveDuration > 0) {
      setTimeout(() => {
        setTemporaryToasts(prev => prev.filter(n => n.id !== toastId));
      }, effectiveDuration);
    }
  }, []); // No dependencies needed

  // Internal function to handle persistent notifications via the service
  const _addPersistentNotification = useCallback(async (
    notificationToAdd: Notification
  ): Promise<void> => {
    try {
      // Use the notification's ID if provided, otherwise generate one
      const notificationWithId = notificationToAdd.id 
        ? notificationToAdd
        : { ...notificationToAdd, id: generateId() };
      
      // Add or update the notification via the service
      const addedOrExistingNotification = await notificationService.addNotification(notificationWithId);

      // Update state based on the service result (handles deduplication/throttling)
      setNotifications(currentNotifications => {
         const existingInState = currentNotifications.find(n => n.id === addedOrExistingNotification.id);
         if (existingInState && JSON.stringify(existingInState) === JSON.stringify(addedOrExistingNotification)) {
             return currentNotifications; // No change
         }
         const existingIndex = currentNotifications.findIndex(n => n.id === addedOrExistingNotification.id);
         let newState;
         if (existingIndex === -1) {
           newState = [...currentNotifications, addedOrExistingNotification];
         } else {
           newState = [...currentNotifications];
           newState[existingIndex] = addedOrExistingNotification;
         }
         return newState.sort((a, b) => b.timestamp - a.timestamp);
       });

       // Note: Auto-removal for system notifications handled by _addTemporaryToast
       // Service-added notifications are typically category 'app' and don't auto-remove

    } catch (error) {
       console.error("Error processing notification via service:", error);
    }
  }, []); // No dependencies needed

  // Public function exposed by context (for useSystemNotification etc.)
  const addNotification = useCallback(
    async (
      message: string,
      type: NotificationType = 'info',
      options?: { title?: string, duration?: number, category?: 'app' | 'system' }
    ): Promise<void> => {
      // Use our notification manager to handle notifications
      const isPersistent = options?.category !== 'system';
      notificationManager.showDirectNotification({
        message,
        type,
        title: options?.title,
        duration: options?.duration || (type === 'error' ? 0 : 5000), // Errors don't auto-dismiss by default
        isPersistent,
        category: options?.category || 'app'
      });
    },
    [] // No dependencies needed with the manager
  );

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
    }
  }, []); // No external dependencies

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
    // Store the current target explicitly, as the event might not be valid later
    const currentTarget = event.currentTarget;
    
    // Verify the element is valid before setting it as the anchor
    if (currentTarget && document.body.contains(currentTarget)) {
      setNotificationMenuAnchorEl((prevAnchor) => (prevAnchor ? null : currentTarget));
    } else {
      // If the element is invalid, just close the menu
      setNotificationMenuAnchorEl(null);
    }
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
        // Fetch notifications from the service (which now handles deduplication internally)
        const serverResponse: any = await notificationService.fetchNotifications(options);

        // Correctly extract notifications array based on the actual API response structure
        let serverNotifications: Notification[] = [];
        
        // Handle different response formats
        if (serverResponse && serverResponse.data && Array.isArray(serverResponse.data.notifications)) {
          // Format: {success: true, data: {notifications: []}}
          serverNotifications = serverResponse.data.notifications;
        } else if (serverResponse && Array.isArray(serverResponse.notifications)) {
          // Format: {notifications: []}
          serverNotifications = serverResponse.notifications;
        } else if (Array.isArray(serverResponse)) {
          // Direct array format
          serverNotifications = serverResponse;
        } else if (serverResponse && serverResponse.success && serverResponse.data && Array.isArray(serverResponse.data.notifications)) {
          // Format: {success: true, data: {notifications: []}} - from the actual API response
          serverNotifications = serverResponse.data.notifications;
          console.log('Extracted notifications from nested response:', serverNotifications.length);
        } else {
          console.error('Unexpected notification response format:', serverResponse);
          serverNotifications = [];
        }

        // For the notification panel, we want to show all notifications including login ones
        // No need to filter login notifications for the panel display
        const notificationsForPanel = serverNotifications.map(notification => ({
          ...notification,
          category: 'app' as 'app' | 'system' // Ensure all backend notifications are treated as app notifications with proper type
        }));

        // Merge with existing system notifications, ensuring uniqueness
        setNotifications(prev => {
          // Keep existing system notifications
            const prevSystemNotifications = prev.filter(n => n.category === 'system');
          
          // Add server notifications (without filtering login ones)
          const merged = [...prevSystemNotifications, ...notificationsForPanel];
          merged.sort((a, b) => b.timestamp - a.timestamp);

          if (process.env.NODE_ENV === 'development') {
            console.log('[NotificationContext] fetchNotifications - merged notifications for main state:', JSON.stringify(merged));
          }
          return merged;
        });
      } else {
        // If not authenticated, just load from local storage
        const localNotifications = notificationService.getLocalNotifications();

        // For notification panel, show all app notifications including login ones
        const appNotifications = localNotifications.filter(n => n.category === 'app');

        // Merge with existing system notifications (ensuring uniqueness)
        setNotifications(prev => {
            const existingNotificationsMap = new Map<string, Notification>();

            // Keep existing system notifications
            prev.filter(n => n.category === 'system').forEach(n => {
                existingNotificationsMap.set(n.id, n);
            });

            // Add all app notifications for the panel
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
      // Use notification manager for error notification
      notificationManager.showError('Failed to load notifications.', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Only depend on isAuthenticated

  // Connect our context methods to the notification manager
  useEffect(() => {
    // Provide direct access to the context methods for the manager
    notificationManager.setContext({
      _addTemporaryToast,
      _addPersistentNotification,
      markAsRead,
      removeNotification
    });
  }, [_addTemporaryToast, _addPersistentNotification, markAsRead, removeNotification]);

  // Load notifications from localStorage on initial mount
  useEffect(() => {
    // Get stored notifications first for immediate display
    const storedNotifications = notificationService.getLocalNotifications();
    
    // Include all app notifications for the panel, including login notifications
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
      console.log('User logged in, fetching notifications immediately.');
      // Remove the delay
      fetchNotifications();
    };
    
    window.addEventListener('user:login-success', handleLoginSuccess);
    
    // ---> Add listener for profile update <---
    const handleProfileUpdate = () => {
      console.log('User profile updated, fetching notifications.');
      fetchNotifications();
    };
    window.addEventListener('user:profile-updated', handleProfileUpdate);
    // ---> End listener <---
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('user:login-success', handleLoginSuccess);
      // ---> Remove profile update listener <---
      window.removeEventListener('user:profile-updated', handleProfileUpdate);
      // ---> End remove listener <---
    };
  }, [isAuthenticated, fetchNotifications]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      notificationManager.showSuccess('You are back online. Syncing notifications...', { duration: 3000 });
      // Refetch notifications when back online
      fetchNotifications();
    };
    
    const handleOffline = () => {
      setNetworkStatus('offline');
      notificationManager.showWarning(
        'You are offline. Some notification features may be limited.',
        { duration: 0 } // Don't auto-dismiss this important message
      );
    };
    
    // Listen for connection status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for force logout event (from token expiration)
    const handleForceLogout = () => {
      notificationManager.showError(
        'Your session has expired. Please log in again.',
        { duration: 0 }
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
  }, [fetchNotifications]);

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
    networkStatus,
    temporaryToasts
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
  
  // Get user's timezone preference
  const { user } = useAuth();
  const userTimezone = user?.timezone || 'UTC';
  
  // Add state for expanded notification (to show full content)
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  
  // Add pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Handle scroll to implement infinite scroll
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Format date based on user's timezone preference
  const formatDateToUserTimezone = useCallback((timestamp: number | null): string => {
    if (!timestamp) return 'Unknown date';
    
    try {
      // Use browser's native Intl API for timezone formatting
      const options: Intl.DateTimeFormatOptions = {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      
      // Format the date using browser Intl API
      return new Intl.DateTimeFormat('en-US', options).format(new Date(timestamp));
    } catch (error) {
      console.error('Error in formatDateToUserTimezone:', error);
      return new Date(timestamp).toLocaleString();
    }
  }, [userTimezone]);
  
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
  
  // Handle notification click to toggle expansion
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Toggle expanded state
    setExpandedNotificationId(prevId => 
      prevId === notification.id ? null : notification.id
    );
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
            <NotificationsIcon sx={{ color: theme => theme.palette.text.primary }} />
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Only render the Menu when we have a valid anchor element */}
      {notificationMenuAnchorEl && document.body.contains(notificationMenuAnchorEl) && (
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
              {appNotifications.every(n => n.isRead) ? (
                <Tooltip title="Mark all as read">
                  <span>
                    <IconButton size="small" disabled>
                      <MarkAllReadIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={markAllAsRead}>
                    <MarkAllReadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              
              {appNotifications.length === 0 ? (
                <Tooltip title="Clear all notifications">
                  <span>
                    <IconButton size="small" disabled>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip title="Clear all notifications">
                  <IconButton size="small" onClick={clearNotifications}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
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
              displayedNotifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    borderLeft: notification.isRead ? 'none' : `4px solid ${theme.palette.primary.main}`,
                    pl: notification.isRead ? 2 : 1.5,
                    py: 1.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                    backgroundColor: notification.isRead 
                      ? 'transparent' 
                      : alpha(theme.palette.primary.main, 0.05),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
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
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box component="div">
                        <Typography
                          variant="body2"
                          component="div"
                          color="textPrimary"
                          sx={{ 
                            mb: 0.5,
                            fontWeight: notification.isRead ? 400 : 500,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: expandedNotificationId === notification.id ? 'clip' : 'ellipsis',
                            WebkitLineClamp: expandedNotificationId === notification.id ? 'unset' : 2,
                            maxHeight: expandedNotificationId === notification.id ? 'none' : '3em',
                            fontSize: '0.8rem',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '100%'
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
                          {formatDateToUserTimezone(notification.timestamp)}
                        </Typography>
                      </Box>
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
      )}
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

// Toast Notification container (for display in layout) - reads from temporaryToasts state
const NotificationContainerInternal: React.FC = () => {
  const theme = useTheme();
  // Read from temporaryToasts state
  const { temporaryToasts } = useNotification();
  // Note: removeNotification is now implicitly handled by the setTimeout in _addTemporaryToast

  // Sort by newest first and limit to 5 at a time to prevent overload
  // Also deduplicate by content + type to avoid showing identical notifications
  const uniqueToasts = new Map<string, Notification>();
  
  // Process notifications to get unique ones (keeping only the newest of each message+type)
  temporaryToasts.forEach(toast => {
    const key = `${toast.type}:${toast.message}`;
    const existing = uniqueToasts.get(key);
    
    // Keep the newest notification for each unique message+type
    if (!existing || toast.timestamp > existing.timestamp) {
      uniqueToasts.set(key, toast);
    }
  });
  
  // Convert to array, sort, and limit
  const toastsToShow = Array.from(uniqueToasts.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5); // Limit to showing maximum 5 notifications at once

  if (toastsToShow.length === 0) {
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
      {toastsToShow.map((notification, index) => (
        <Paper
          key={notification.id}
          elevation={3}
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
            backgroundColor: alpha(
              notification.type === 'success'
                ? theme.palette.success.main
                : notification.type === 'error'
                ? theme.palette.error.main
                : notification.type === 'warning'
                ? theme.palette.warning.main
                : theme.palette.info.main,
              0.12
            ),
            borderLeft: `4px solid ${
              notification.type === 'success'
                ? theme.palette.success.main
                : notification.type === 'error'
                ? theme.palette.error.main
                : notification.type === 'warning'
                ? theme.palette.warning.main
                : theme.palette.info.main
            }`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
            <Box sx={{ mr: 1.5 }}>
              {notification.type === 'success' ? (
                <SuccessIcon color="success" fontSize="medium" />
              ) : notification.type === 'error' ? (
                <ErrorIcon color="error" fontSize="medium" />
              ) : notification.type === 'warning' ? (
                <WarningIcon color="warning" fontSize="medium" />
              ) : (
                <InfoIcon color="info" fontSize="medium" />
              )}
            </Box>
            <Box sx={{ flex: 1, mr: 1 }}>
              {notification.title && (
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.3, fontSize: '0.85rem' }}>
                  {notification.title}
                </Typography>
              )}
              <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.8rem' }}>
                {notification.message}
              </Typography>
            </Box>
            <IconButton 
              aria-label="close notification"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                // We don't need removeNotification anymore since these toast notifications
                // are now automatically removed by timeout
              }}
              sx={{ 
                p: 0.5, 
                '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.15) } 
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

// Export the memoized version
export const NotificationContainer = React.memo(NotificationContainerInternal);

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
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        backgroundColor: alpha(
          type === 'success' ? theme.palette.success.main :
          type === 'error' ? theme.palette.error.main :
          type === 'warning' ? theme.palette.warning.main :
          theme.palette.info.main,
          theme.palette.mode === 'dark' ? 0.2 : 0.12
        ),
        borderLeft: `4px solid ${
          type === 'success' ? theme.palette.success.main :
          type === 'error' ? theme.palette.error.main :
          type === 'warning' ? theme.palette.warning.main :
          theme.palette.info.main
        }`,
        ...sx
      }}
    >
      <Box sx={{ mr: 1.5 }}>
        {type === 'success' ? (
          <SuccessIcon color="success" fontSize="medium" />
        ) : type === 'error' ? (
          <ErrorIcon color="error" fontSize="medium" />
        ) : type === 'warning' ? (
          <WarningIcon color="warning" fontSize="medium" />
        ) : (
          <InfoIcon color="info" fontSize="medium" />
        )}
      </Box>
      <Box sx={{ flex: 1, mr: 1 }}>
        {title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.3, fontSize: '0.85rem' }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.8rem' }}>
          {message}
        </Typography>
      </Box>
      {action || (onClose && (
        <IconButton 
          size="small" 
          onClick={onClose}
          sx={{ ml: 1, p: 0.5 }}
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