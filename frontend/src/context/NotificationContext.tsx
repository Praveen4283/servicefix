import React, { createContext, useContext, useState, ReactNode, useRef, useCallback } from 'react';
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
  Paper
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
  Close as CloseIcon
} from '@mui/icons-material';

// Notification types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

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
  unreadCount: number;
  toggleNotificationMenu: (event: React.MouseEvent<HTMLElement>) => void;
  closeNotificationMenu: () => void;
  isNotificationMenuOpen: boolean;
  notificationMenuAnchorEl: HTMLElement | null;
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
  const isNotificationMenuOpen = Boolean(notificationMenuAnchorEl);

  // Generate unique ID
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Remove notification (stable reference needed)
  const removeNotification = useCallback((id: string): void => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []); // No external dependencies

  // Add notification (stable reference needed for dependent hooks)
  const addNotification = useCallback(
    (
      message: string,
      type: NotificationType = 'info',
      options?: { 
        title?: string, 
        duration?: number,
        category?: 'app' | 'system' 
      }
    ): void => {
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
  
      setNotifications((prev) => [...prev, newNotification]);
  
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
  const clearNotifications = useCallback((): void => {
    setNotifications([]);
  }, []); // No external dependencies

  // Mark all notifications as read (stable reference needed)
  const markAllAsRead = useCallback((): void => {
    setNotifications((prev) => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []); // No external dependencies

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

  // Context value
  const value: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markAllAsRead,
    unreadCount,
    toggleNotificationMenu,
    closeNotificationMenu,
    isNotificationMenuOpen,
    notificationMenuAnchorEl
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
    clearNotifications
  } = useNotification();

  // Filter for app notifications only
  const appNotifications = notifications.filter(n => n.category === 'app');

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={toggleNotificationMenu}
          size="large"
          color="inherit"
          aria-label="show notifications"
          sx={{ 
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1)
            }
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontWeight: 'bold',
                fontSize: '0.7rem',
                minWidth: '18px',
                height: '18px',
                animation: unreadCount > 0 ? 'pulse 1.5s infinite' : 'none',
              }
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={notificationMenuAnchorEl}
        open={isNotificationMenuOpen}
        onClose={closeNotificationMenu}
        PaperProps={{
          elevation: 3,
          sx: {
            width: 350,
            maxHeight: 450,
            mt: 1.5,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.black, 0.1) : alpha(theme.palette.common.black, 0.05),
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.6) : alpha(theme.palette.primary.main, 0.4),
              borderRadius: '3px',
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <Box>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={handleMarkAllRead}>
                  <MarkAllReadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {appNotifications.length > 0 && (
              <Tooltip title="Clear all notifications">
                <IconButton size="small" onClick={clearNotifications}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        {appNotifications.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              px: 2
            }}
          >
            <NotificationsOffIcon 
              sx={{ 
                fontSize: 40, 
                color: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.text.secondary, 0.6) 
                  : alpha(theme.palette.text.secondary, 0.4),
                mb: 1 
              }} 
            />
            <Typography color="textSecondary" align="center">
              No notifications to show
            </Typography>
          </Box>
        ) : (
          appNotifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => {
                // Mark as read when clicked
                if (!notification.isRead) {
                  markAllAsRead();
                }
                closeNotificationMenu();
              }}
              sx={{
                py: 1.5,
                borderLeft: notification.isRead ? 'none' : `3px solid ${
                  notification.type === 'error' ? theme.palette.error.main :
                  notification.type === 'warning' ? theme.palette.warning.main :
                  notification.type === 'success' ? theme.palette.success.main :
                  theme.palette.primary.main
                }`,
                bgcolor: !notification.isRead 
                  ? alpha(theme.palette.action.selected, 0.1) 
                  : 'transparent',
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.selected, 0.2),
                }
              }}
            >
              <ListItemIcon>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(
                      notification.type === 'error' ? theme.palette.error.main :
                      notification.type === 'warning' ? theme.palette.warning.main :
                      notification.type === 'success' ? theme.palette.success.main :
                      theme.palette.primary.main,
                      0.1
                    ),
                    color: notification.type === 'error' ? theme.palette.error.main :
                            notification.type === 'warning' ? theme.palette.warning.main :
                            notification.type === 'success' ? theme.palette.success.main :
                            theme.palette.primary.main
                  }}
                >
                  {getNotificationIcon(notification.type)}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" noWrap>
                    {notification.title || 
                      (notification.type === 'success' ? 'Success' :
                       notification.type === 'error' ? 'Error' :
                       notification.type === 'warning' ? 'Warning' : 'Information')}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                sx={{ 
                  ml: 1,
                  opacity: 0.6,
                  '&:hover': { opacity: 1 }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

// Toast Notification container (for display in layout) - only for system notifications (alerts, errors, etc.)
export const NotificationContainer: React.FC = () => {
  const theme = useTheme();
  const { notifications, removeNotification } = useNotification();

  // Filter for system notifications with duration > 0
  const systemToastNotifications = notifications.filter(n => n.duration > 0 && n.category === 'system');
  
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
        gap: 1,
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
      {systemToastNotifications.map((notification) => (
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
            animation: 'slideIn 0.3s ease forwards',
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
              transform: 'translateY(-2px)',
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

/*
USAGE EXAMPLES:

1. For system notifications (alerts, warnings, errors, confirmations)
   These appear as toast notifications at the bottom right and/or inline alerts

   // Option 1: Using the hook for toast notifications
   import { useSystemNotification } from '../../context/NotificationContext';

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

   // Option 2: Using the inline component for contextual messages
   import { SystemAlert } from '../../context/NotificationContext';

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

2. For app notifications (tickets, comments, SLA)
   These appear in the top-right notification menu when clicked

   import { useAppNotification } from '../../context/NotificationContext';

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
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }
  `;
  document.head.appendChild(styleElement);
};

// Run once when the file is imported
if (typeof window !== 'undefined') {
  addNotificationStyles();
} 