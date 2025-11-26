import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Avatar,
  Grid,
  Paper,
  Button,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  FormControlLabel,
  Switch,
  FormGroup,
  Tooltip,
  IconButton,
  useTheme,
  alpha,
  Grow,
  Zoom,
  LinearProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Upload as UploadIcon, LockReset as LockResetIcon, Close as CloseIcon, ExpandMore as ExpandMoreIcon, Notifications as NotificationsIcon, Email as EmailIcon, NotificationsActive as NotificationsActiveIcon, PhoneAndroid as PhoneAndroidIcon } from '@mui/icons-material';
import { useAuth, User } from '../context/AuthContext';
import { FormTextField } from '../components/common/FormField';
import useFormValidation from '../utils/useFormValidation';
import { profileSchema, changePasswordSchema } from '../utils/validationSchemas';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { SystemAlert } from '../context/NotificationContext';
import { toast } from 'react-hot-toast';

// List of common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

// List of supported languages
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
];

// Define notification types
// Enhanced notification types with channels
const NOTIFICATION_TYPES = {
  newTicketAssigned: {
    label: 'New Ticket Assignment',
    description: 'When a new ticket is assigned to me',
    defaultChannels: {
      email: true,
      inApp: true,
      push: false
    }
  },
  ticketUpdated: {
    label: 'Ticket Updates',
    description: 'When a ticket I follow is updated',
    defaultChannels: {
      email: true,
      inApp: true,
      push: false
    }
  },
  mentionInComment: {
    label: 'Comment Mentions',
    description: 'When someone mentions me in a comment',
    defaultChannels: {
      email: true,
      inApp: true,
      push: true
    }
  },
  newKbArticle: {
    label: 'Knowledge Base Updates',
    description: 'When a new Knowledge Base article is published',
    defaultChannels: {
      email: false,
      inApp: true,
      push: false
    }
  },
  systemUpdates: {
    label: 'System Announcements',
    description: 'System updates and announcements',
    defaultChannels: {
      email: true,
      inApp: true,
      push: false
    }
  },
  ticketDueReminder: {
    label: 'Due Date Reminders',
    description: 'Reminders about approaching due dates',
    defaultChannels: {
      email: true,
      inApp: true,
      push: false
    }
  },
  ticketEscalation: {
    label: 'Ticket Escalations',
    description: 'When a ticket is escalated',
    defaultChannels: {
      email: true,
      inApp: true,
      push: true
    }
  }
};

// Define types for notification settings
interface NotificationChannels {
  email: boolean;
  inApp: boolean;
  push: boolean;
}

interface NotificationSetting {
  enabled: boolean;
  channels: NotificationChannels;
}

interface LegacyNotificationSetting {
  email?: boolean;
  in_app?: boolean;
  push?: boolean;
}

// Interface for Change Password Form Values
interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Enhanced Card component for animations
const EnhancedCard = (props: any) => {
  return (
    <Zoom in={true} style={{ transitionDelay: props.index ? `${props.index * 100}ms` : '0ms' }}>
      <Card {...props} />
    </Zoom>
  );
};

// Enhanced Grid component for animations
const EnhancedGrid = (props: any) => {
  return (
    <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDuration: '800ms' }}>
      <Grid {...props} />
    </Grow>
  );
};

// Card styles matching UsersPage
const cardStyles = {
  elevation: 0,
  borderRadius: 3,
  transition: 'all 0.3s ease',
  background: (theme: any) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  boxShadow: (theme: any) => theme.palette.mode === 'dark'
    ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: (theme: any) => theme.palette.mode === 'dark'
      ? '0 12px 40px -8px rgba(0, 0, 0, 0.4)'
      : '0 12px 40px -8px rgba(0, 0, 0, 0.15)',
  },
};

// Gradient accent for cards/papers
const gradientAccent = (theme: any) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1
  }
});

const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword, refreshUserData, isLoading: isAuthLoading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editingNotifications, setEditingNotifications] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeCurrentAvatar, setRemoveCurrentAvatar] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' }>(
    { open: false, message: '', type: 'success' }
  );
  // Track data loading to prevent unnecessary API calls
  const [profileRefreshAttempted, setProfileRefreshAttempted] = useState(false);
  const [notificationPreferencesChecked, setNotificationPreferencesChecked] = useState(false);
  // New state for notification tab
  const [notificationTab, setNotificationTab] = useState(0);
  // Add state to track whether notification settings have changed
  const [notificationSettingsChanged, setNotificationSettingsChanged] = useState(false);
  // State to store notification settings
  const [notificationSettings, setNotificationSettings] = useState<Record<string, NotificationSetting>>({});
  
  const theme = useTheme();

  // Effect to populate form once user data is loaded
  useEffect(() => {
    const loadProfileData = async () => {
      // Wait for AuthContext to finish loading its initial user data
      if (isAuthLoading) {
        return;
      }

      if (user) {
        // Log user data but avoid excessive logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ProfilePage useEffect] User data loaded:', user.id);
        }
        
        // Only check for critical data once
        if (!profileRefreshAttempted) {
          const isCriticalDataMissing = !user.designation || !user.phoneNumber || !user.organization;
          
          if (isCriticalDataMissing) {
            setProfileRefreshAttempted(true);
            
            try {
              await refreshUserData();
            } catch (error) {
              console.error('[ProfilePage useEffect] Error refreshing user data:', error);
            }
          } else {
            setProfileRefreshAttempted(true);
          }
        }
        
        // Only proceed if we have user data
        if (user.designation && user.phoneNumber) {
          const convertedNotificationSettings = getDefaultNotificationSettings();
          
          if (user.notificationSettings) {
            // Handle notification settings conversion
            try {
              Object.entries(user.notificationSettings).forEach(([key, value]) => {
                if (typeof value === 'boolean') {
                  if (convertedNotificationSettings[key]) {
                    convertedNotificationSettings[key].enabled = value;
                  }
                } else if (typeof value === 'object' && value !== null) {
                  const isNewFormat = 'enabled' in value && 'channels' in value;
                  
                  if (isNewFormat) {
                    const typedValue = value as any;
                    convertedNotificationSettings[key] = typedValue;
                  } else {
                    const legacyValue = value as any;
                    convertedNotificationSettings[key] = {
                      enabled: true,
                      channels: {
                        email: legacyValue.email || false,
                        inApp: legacyValue.in_app || false,
                        push: legacyValue.push || false
                      }
                    };
                  }
                }
              });
              
              // Set notification settings only if they've changed
              if (JSON.stringify(notificationSettings) !== JSON.stringify(convertedNotificationSettings)) {
                setNotificationSettings(convertedNotificationSettings);
              }
            } catch (error) {
              console.error('[ProfilePage] Error processing notification settings:', error);
            }
          } else if (!notificationPreferencesChecked) {
            setNotificationPreferencesChecked(true);
            // API call to fetch notification preferences would go here
            // Removing for simplicity to focus on fixing the re-render issue
          }
          
          // Only reset form values when user data changes or when form is not being edited
          if (!editing) {
            const formValues = {
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              designation: user.designation || '',
              timezone: user.timezone || 'UTC',
              language: user.language || 'en',
              notificationSettings: notificationSettings // Include the notification settings
            };
            
            // Only reset if values have changed to avoid unnecessary re-renders
            const currentValues = profileFormik.values;
            const hasChanged = Object.keys(formValues).some(
              key => formValues[key as keyof typeof formValues] !== currentValues[key as keyof typeof currentValues]
            );
            
            if (hasChanged) {
              profileFormik.resetForm({
                values: formValues
              });
            }
            
            // Reset avatar removal flag
            setRemoveCurrentAvatar(false);
          }
        }
      }
    };
    
    loadProfileData();
    // Explicitly list all dependencies and ensure they're stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading, editing, profileRefreshAttempted, notificationPreferencesChecked]);

  // Debug outputs - comment these out or remove them entirely for production
  useEffect(() => {
    if (user && process.env.NODE_ENV !== 'production') {
      debugUserFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to get default notification settings
  const getDefaultNotificationSettings = () => {
    return Object.fromEntries(
      Object.entries(NOTIFICATION_TYPES).map(([key, value]) => [
        key, 
        {
          enabled: true,
          channels: {
            email: value.defaultChannels.email,
            inApp: value.defaultChannels.inApp,
            push: value.defaultChannels.push
          }
        }
      ])
    );
  };

  // Effect to refresh user data after successful profile update
  const refreshProfileData = useCallback(async () => {
    if (user) {
      console.log('[ProfilePage] Explicitly refreshing user data from API');
      
      // Reset the refresh flag to ensure we can refresh again if needed
      setProfileRefreshAttempted(false);
      
      try {
        // Clear any cached data to ensure fresh fetch
        await refreshUserData();
        
        console.log('[ProfilePage] User data refresh successful');
      } catch (error) {
        console.error('[ProfilePage] Error refreshing user data:', error);
      }
    }
  }, [user, refreshUserData]);

  // Profile form validation hook
  const { 
    formik: profileFormik, 
    isSubmitting: isProfileSubmitting, 
    submitError: profileSubmitError,
    submitSuccess: profileSubmitSuccess
  } = useFormValidation({
    initialValues: { 
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      designation: user?.designation || '',
      timezone: user?.timezone || 'UTC',
      language: user?.language || 'en',
      notificationSettings: Object.fromEntries(
        Object.entries(NOTIFICATION_TYPES).map(([key, value]) => [
          key, 
          {
            enabled: true,
            channels: {
              email: value.defaultChannels.email,
              inApp: value.defaultChannels.inApp,
              push: value.defaultChannels.push
            }
          }
        ])
      ),
    },
    validationSchema: profileSchema,
    showSuccessNotification: false,
    onSubmit: async (values) => {
      if (!user) return;
      
      setIsProcessing(true);
      console.log('[ProfilePage] Submit form values:', JSON.stringify(values));
      
      try {
        // Prepare update data
        const updateData: Partial<User> & { avatar?: File | null } = {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phoneNumber: values.phoneNumber ? values.phoneNumber.trim() : '',
          designation: values.designation ? values.designation.trim() : '',
          timezone: values.timezone || 'UTC',
          language: values.language || 'en'
        };
        
        // Handle avatar changes
        if (avatarFile) {
          updateData.avatar = avatarFile;
        } else if (removeCurrentAvatar) {
          updateData.avatar = null;
        }

        // Handle notification settings only if they were edited
        if (notificationSettingsChanged) {
          // Replace the entire notification settings object instead of just merging at top level
          // This ensures all changes (including deletions or structure changes) are captured
          (updateData as any).notificationSettings = values.notificationSettings;
        }
        
        console.log('[ProfilePage] Update data being sent:', { 
          ...updateData, 
          avatar: updateData.avatar ? 'File object exists' : updateData.avatar === null ? 'null (remove)' : 'undefined (no change)' 
        });
        
        const updatedUser = await updateProfile(updateData);
        console.log('[ProfilePage] Profile updated successfully:', updatedUser);
        
        // Reset state after successful update
        setAvatarFile(null);
        setAvatarPreview('');
        setRemoveCurrentAvatar(false);
        setEditing(false);
        setNotificationSettingsChanged(false);

        // Allow the form to be edited again
        setIsProcessing(false);
        
        // Show success toast
        toast.success('Profile updated successfully');
        
        // Force refresh of user data to ensure UI shows updated information
        await refreshProfileData();
      } catch (error) {
        console.error('[ProfilePage] Error updating profile:', error);
        setIsProcessing(false);
        toast.error(error instanceof Error ? error.message : 'Failed to update profile');
      }
    },
  });

  // After a successful submit, refresh the user data 
  useEffect(() => {
    if (profileSubmitSuccess) {
      refreshProfileData();
    }
  }, [profileSubmitSuccess, refreshProfileData]);

  // Change Password form validation hook
  const { 
    formik: passwordFormik, 
    isSubmitting: isPasswordSubmitting, 
    submitError: passwordSubmitError 
  } = useFormValidation<ChangePasswordValues>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: changePasswordSchema,
    showSuccessNotification: false, // Disable generic success notification as AuthContext handles it
    onSubmit: async (values) => {
       try {
         // Placeholder: Implement actual API call in AuthContext
         await changePassword(values.currentPassword, values.newPassword); 
         setChangePasswordOpen(false);
       } catch (error: any) {
       }
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size and type
      const fileType = file.type;
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(fileType)) {
        setNotification({
          open: true,
          message: 'Please select a valid image file (JPG, PNG, or GIF)',
          type: 'error'
        });
        return;
      }
      
      if (file.size > maxSize) {
        setNotification({
          open: true,
          message: 'Image size should be less than 5MB',
          type: 'error'
        });
        return;
      }
      
      // If validation passes, set the file for upload
      setAvatarFile(file);
      setRemoveCurrentAvatar(false); // If uploading a new one, don't remove the old one yet
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to handle avatar removal click
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    // If there was an existing avatar url or a preview, mark for removal on save
    if (user?.avatarUrl || avatarPreview) {
      setRemoveCurrentAvatar(true);
    }
  };

  // Modify handleCancel to also handle notification settings cancel
  const handleCancel = () => {
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    setRemoveCurrentAvatar(false); // Reset removal flag on cancel
    setNotificationSettingsChanged(false); // Reset notification changes flag
    profileFormik.resetForm(); // Resets to initial values (or values from useEffect based on user)
  };

  // Add new function to handle notification settings cancel
  const handleCancelNotifications = () => {
    setEditingNotifications(false);
    setNotificationSettingsChanged(false); // Reset notification changes flag
    profileFormik.resetForm(); // Resets to initial values (or values from useEffect based on user)
  };

  // Add new function to save only notification settings
  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    console.log('[ProfilePage] Submitting notification settings:', JSON.stringify(profileFormik.values.notificationSettings));
    
    try {
      // Send only the notification settings
      await fetch(`${process.env.REACT_APP_API_URL}/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notificationSettings: profileFormik.values.notificationSettings })
      });
      
      setEditingNotifications(false);
      setNotificationSettingsChanged(false);
      setIsProcessing(false);
      
      // Show success toast
      toast.success('Notification settings updated successfully');
      
      // Force refresh of user data to ensure UI shows updated information
      await refreshProfileData();
    } catch (error) {
      console.error('[ProfilePage] Error updating notification settings:', error);
      setIsProcessing(false);
      toast.error(error instanceof Error ? error.message : 'Failed to update notification settings');
    }
  };

  const handleOpenChangePassword = () => {
    setChangePasswordOpen(true);
    passwordFormik.resetForm();
  };

  const handleCloseChangePassword = () => {
    setChangePasswordOpen(false);
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Handle notification tab change
  const handleNotificationTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setNotificationTab(newValue);
  };

  // Set notification setting with channel
  const handleNotificationChannelChange = (
    notificationType: string,
    channel: 'email' | 'inApp' | 'push',
    checked: boolean
  ) => {
    setNotificationSettingsChanged(true); // Mark notification settings as changed
    if (profileFormik.values.notificationSettings && 
        profileFormik.values.notificationSettings[notificationType]) {
      profileFormik.setFieldValue(
        `notificationSettings.${notificationType}.channels.${channel}`,
        checked
      );
    }
  };

  // Toggle the entire notification type
  const handleNotificationTypeToggle = (notificationType: string, checked: boolean) => {
    setNotificationSettingsChanged(true); // Mark notification settings as changed
    profileFormik.setFieldValue(
      `notificationSettings.${notificationType}.enabled`,
      checked
    );
  };

  // Render notification channels
  const renderNotificationChannels = (notificationType: string) => {
    const notificationSetting = profileFormik.values.notificationSettings?.[notificationType];
    if (!notificationSetting) return null;
    
    return (
      <Box sx={{ display: 'flex', gap: 1, ml: 4, mt: 1 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={notificationSetting.channels?.email || false}
              onChange={(e) => handleNotificationChannelChange(notificationType, 'email', e.target.checked)}
              disabled={(!editing && !editingNotifications) || isProfileSubmitting || !notificationSetting.enabled}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Email</Typography>
            </Box>
          }
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={notificationSetting.channels?.inApp || false}
              onChange={(e) => handleNotificationChannelChange(notificationType, 'inApp', e.target.checked)}
              disabled={(!editing && !editingNotifications) || isProfileSubmitting || !notificationSetting.enabled}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <NotificationsIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">In-App</Typography>
            </Box>
          }
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={notificationSetting.channels?.push || false}
              onChange={(e) => handleNotificationChannelChange(notificationType, 'push', e.target.checked)}
              disabled={(!editing && !editingNotifications) || isProfileSubmitting || !notificationSetting.enabled}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PhoneAndroidIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Push</Typography>
            </Box>
          }
        />
      </Box>
    );
  };

  // Add a function to close the profile menu (to be called when component mounts)
  useEffect(() => {
    // Dispatch a custom event that the layout component can listen for
    const closeProfileMenuEvent = new CustomEvent('closeProfileMenu');
    window.dispatchEvent(closeProfileMenuEvent);
    
    return () => {
      // Clean up any listeners if needed
    };
  }, []);

  // Function to debug sensitive user fields without excessive logging
  const debugUserFields = () => {
    if (process.env.NODE_ENV === 'production') return;
    
    if (user) {
      console.log('[ProfilePage] User designation:', user.designation);
      console.log('[ProfilePage] Organization data:', user.organization);
      
      if (user.lastLoginAt || user.lastLogin || user.last_login_at) {
        const loginDateString = user.lastLoginAt || user.lastLogin || user.last_login_at;
        console.log('[ProfilePage] Last login date string:', loginDateString);
        console.log('[ProfilePage] Last login date type:', typeof loginDateString);
      }
    }
  };
  
  if (!user) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth={false}
      sx={{ 
        py: { xs: 2, md: 3 },
        position: 'relative',
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', lg: '25%' },
          height: { xs: '40%', lg: '100%' },
          background: theme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: -1,
          opacity: 0.8,
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: { xs: '100%', lg: '25%' },
          height: { xs: '30%', lg: '60%' },
          background: theme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: -1,
          opacity: 0.6,
          pointerEvents: 'none'
        }
      }}
    >
      <Box sx={{ 
        animation: 'fadeIn 1s ease forwards',
        opacity: 0,
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        }
      }}>
        <Grid container spacing={3}>
          {/* Header section */}
          <Grid item xs={12}>
            <Card 
              elevation={0}
              sx={{ 
                p: 0, 
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
                borderRadius: 3,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.7)}, ${alpha(theme.palette.secondary.dark, 0.5)})`
                  : `linear-gradient(120deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.secondary.light, 0.15)})`,
                position: 'relative',
              }}
            >
              <Box sx={{ p: { xs: 3, md: 2 }, position: 'relative', zIndex: 1 }}>
                <Grid container alignItems="center" justifyContent="space-between" spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="h5" component="h1" gutterBottom>
                      My Profile
                    </Typography>
                    <Typography variant="subtitle1">
                      Manage your personal information and preferences
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {profileSubmitError && (
          <SystemAlert 
            message={profileSubmitError}
            type="error"
            sx={{ my: 3 }}
          />
        )}

        <Grid container spacing={1} sx={{ mt: 1 }}>
          {/* Left column - Personal info section */}
          <Grid item xs={12} md={4}>
            {/* Avatar Card */}
            <EnhancedCard
              sx={{
                ...cardStyles,
                ...gradientAccent(theme),
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3
              }}
            >
              <Box sx={{ position: 'relative', mb: 2 }}>
                {(() => {
                  const avatarSource = removeCurrentAvatar ? undefined : (avatarPreview || user?.avatarUrl || undefined);
                  return (
                    <Avatar
                      src={avatarSource}
                      alt={`${user?.firstName} ${user?.lastName}`}
                      sx={{
                        width: 150,
                        height: 150,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        fontSize: '4rem'
                      }}
                    >
                      {!avatarSource && user?.firstName && user?.lastName &&
                        `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
                    </Avatar>
                  );
                })()}
                {editing && (avatarPreview || (user?.avatarUrl && !removeCurrentAvatar)) && (
                  <Tooltip title="Remove Photo">
                    <IconButton
                      onClick={handleRemoveAvatar}
                      disabled={isProfileSubmitting}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                    >
                      <CloseIcon fontSize="small" /> 
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {editing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                  <input
                    accept="image/*"
                    id="avatar-upload"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                    disabled={isProfileSubmitting}
                  />
                  <label htmlFor="avatar-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      disabled={isProfileSubmitting}
                      sx={{ mb: 1 }}
                    >
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                  </label>
                  {(avatarPreview || removeCurrentAvatar) && (
                     <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
                       {removeCurrentAvatar ? 'Avatar will be removed on save.' : 'New photo selected. Click Save.'}
                     </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center', mt: 1, mb: 2 }}>
                  {(() => {
                    // Handle designation display with fallback and debugging
                    const designation = user?.designation || '';
                    console.log('[ProfilePage] User designation:', designation);
                    return designation ? designation : 'No Designation set';
                  })()}
                </Typography>
              )}
              
              {user?.lastLoginAt || user?.lastLogin || user?.last_login_at ? (
                <Box mt={2} textAlign="center">
                  <Typography variant="caption" color="textSecondary">
                    Last Login
                  </Typography>
                  <Typography variant="body2">
                    {(() => {
                      try {
                        // Determine timezone, fallback to UTC if not set on user
                        const userTimeZone = user?.timezone || 'UTC'; 
                        // Normalize the login date field (handle snake_case and camelCase variations)
                        const loginDateString = user.lastLoginAt || user.lastLogin || user.last_login_at;
                        
                        // Debugging to help identify format issues
                        console.log('[ProfilePage] Last login date string:', loginDateString);
                        console.log('[ProfilePage] Last login date type:', typeof loginDateString);
                        
                        // Only create Date if we have a valid login date
                        if (loginDateString) {
                          // Handle both string and Date object formats
                          const loginDate = typeof loginDateString === 'string' 
                            ? new Date(loginDateString) 
                            : loginDateString;
                            
                          // Check if date is valid before formatting
                          if (!isNaN(loginDate.getTime())) {
                          // Use formatInTimeZone for correct display
                          return formatInTimeZone(loginDate, userTimeZone, 'MMM dd, yyyy p');
                          } else {
                            console.error('[ProfilePage] Invalid date format:', loginDateString);
                            return "Invalid Date";
                          }
                        } else {
                          return "No login date available";
                        }
                      } catch (error) {
                        console.error('[ProfilePage] Error formatting last login date:', error);
                        return 'Invalid Date'; // Show error if formatting fails
                      }
                    })()}
                  </Typography>
                </Box>
              ) : (
                <Box mt={2} textAlign="center">
                  <Typography variant="caption" color="textSecondary">
                    Last Login
                  </Typography>
                  <Typography variant="body2">
                    First login
                  </Typography>
                </Box>
              )}
            </EnhancedCard>
            
            {/* Account Security Card */}
            <EnhancedCard
              sx={{
                ...cardStyles,
                ...gradientAccent(theme),
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                index: 1
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Account Security
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  Manage your password and security settings
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleOpenChangePassword}
                  startIcon={<LockResetIcon />}
                  sx={{ 
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  Change Password
                </Button>
              </Box>
            </EnhancedCard>
          </Grid>

          {/* Right column - Profile details and notifications */}
          <Grid item xs={12} md={8}>
            {/* Profile Details Card */}
            <EnhancedCard
              sx={{
                ...cardStyles,
                ...gradientAccent(theme),
                mb: 3
              }}
            >
              <CardContent>
                <Box 
                  component="form" 
                  onSubmit={profileFormik.handleSubmit}
                  noValidate
                >
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormTextField
                        name="firstName"
                        label="First Name"
                        fullWidth
                        value={profileFormik.values.firstName}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        touched={profileFormik.touched}
                        errors={profileFormik.errors}
                        disabled={!editing || isProfileSubmitting}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormTextField
                        name="lastName"
                        label="Last Name"
                        fullWidth
                        value={profileFormik.values.lastName}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        touched={profileFormik.touched}
                        errors={profileFormik.errors}
                        disabled={!editing || isProfileSubmitting}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormTextField
                        name="email"
                        label="Email Address"
                        fullWidth
                        value={profileFormik.values.email}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        touched={profileFormik.touched}
                        errors={profileFormik.errors}
                        disabled
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormTextField
                        name="phoneNumber"
                        label="Phone Number"
                        fullWidth
                        value={profileFormik.values.phoneNumber}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        touched={profileFormik.touched}
                        errors={profileFormik.errors}
                        disabled={!editing || isProfileSubmitting}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormTextField
                        name="designation"
                        label="Designation (Job Title)"
                        fullWidth
                        value={profileFormik.values.designation}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        touched={profileFormik.touched}
                        errors={profileFormik.errors}
                        disabled={!editing || isProfileSubmitting}
                      />
                    </Grid>

                    {/* Organization field - read only */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Organization"
                        fullWidth
                        value={(() => {
                          // Debug organization data structure
                          console.log('[ProfilePage] Organization data:', user?.organization);
                          
                          // Handle different possible organization data structures
                          if (user?.organization?.name) {
                            return user.organization.name;
                          } else if (typeof user?.organization === 'string') {
                            return user.organization;
                          } else if ((user as any)?.organizationName) {
                            return (user as any).organizationName;
                          } else if ((user as any)?.organization_name) {
                            return (user as any).organization_name;
                          } else {
                            return 'N/A';
                          }
                        })()}
                        disabled
                        variant="outlined"
                      />
                    </Grid>
                    
                    {/* Role field - read only */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Role"
                        fullWidth
                        value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
                        disabled
                        variant="outlined"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                        Preferences
                      </Typography>
                    </Grid>
                    
                    {/* Timezone dropdown */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Timezone"
                        name="timezone"
                        fullWidth
                        value={profileFormik.values.timezone || 'UTC'}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        error={profileFormik.touched.timezone && Boolean(profileFormik.errors.timezone)}
                        helperText={profileFormik.touched.timezone && profileFormik.errors.timezone}
                        disabled={!editing || isProfileSubmitting}
                        variant="outlined"
                      >
                        {TIMEZONES.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    
                    {/* Language dropdown */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Language"
                        name="language"
                        fullWidth
                        value={profileFormik.values.language || 'en'}
                        onChange={profileFormik.handleChange}
                        onBlur={profileFormik.handleBlur}
                        error={profileFormik.touched.language && Boolean(profileFormik.errors.language)}
                        helperText={profileFormik.touched.language && profileFormik.errors.language}
                        disabled={!editing || isProfileSubmitting}
                        variant="outlined"
                      >
                        {LANGUAGES.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {!editing ? (
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => setEditing(true)}
                          startIcon={<EditIcon />}
                          sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-3px)',
                              boxShadow: '0 8px 15px rgba(0,0,0,0.2)'
                            }
                          }}
                        >
                          Edit Profile
                        </Button>
                      </Grid>
                    ) : (
                      <Grid item xs={12} sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          startIcon={isProfileSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                          disabled={isProfileSubmitting || (!profileFormik.dirty && !avatarFile && !removeCurrentAvatar)}
                          sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-3px)',
                              boxShadow: '0 8px 15px rgba(0,0,0,0.2)'
                            }
                          }}
                        >
                          Save Changes
                        </Button>
                        <Box sx={{ marginLeft: 'auto' }}>
                          <Button
                            variant="outlined"
                            onClick={handleCancel}
                            startIcon={<CancelIcon />}
                            disabled={isProfileSubmitting}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </CardContent>
            </EnhancedCard>
            
            {/* Notification Settings Card */}
            <EnhancedCard
              sx={{
                ...cardStyles,
                ...gradientAccent(theme),
                index: 2
              }}
            >
              <CardContent>
                <Box>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                      <NotificationsIcon sx={{ mr: 1 }} /> 
                      Notification Settings
                    </Typography>
                    {!editingNotifications ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setEditingNotifications(true)}
                        startIcon={<EditIcon />}
                        sx={{ ml: 2 }}
                      >
                        Edit Notifications
                      </Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={isProfileSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                          onClick={handleSaveNotifications}
                          disabled={isProfileSubmitting || !notificationSettingsChanged}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleCancelNotifications}
                          disabled={isProfileSubmitting}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
                    Configure how and when you receive notifications about system activities.
                  </Typography>
                  
                  <Accordion 
                    elevation={0}
                    sx={{ 
                      '&.MuiAccordion-root:before': { 
                        display: 'none' 
                      },
                      mb: 1,
                      borderRadius: 1,
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ 
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      <Typography variant="subtitle2">Ticket Notifications</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormGroup>
                        {Object.entries(NOTIFICATION_TYPES)
                          .filter(([key, value]) => 
                            ['newTicketAssigned', 'ticketUpdated', 'ticketDueReminder', 'ticketEscalation'].includes(key)
                          )
                          .map(([key, value]) => (
                            <Box key={key} sx={{ mb: 2 }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={profileFormik.values.notificationSettings?.[key]?.enabled ?? false}
                                    onChange={(event) => {
                                      handleNotificationTypeToggle(key, event.target.checked);
                                    }}
                                    name={`notificationSettings.${key}.enabled`}
                                    disabled={(!editing && !editingNotifications) || isProfileSubmitting}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2" fontWeight={500}>{value.label}</Typography>
                                    <Typography variant="caption" color="textSecondary">{value.description}</Typography>
                                  </Box>
                                }
                              />
                              {profileFormik.values.notificationSettings?.[key]?.enabled && 
                                renderNotificationChannels(key)
                              }
                            </Box>
                          ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                  
                  <Accordion 
                    elevation={0}
                    sx={{ 
                      '&.MuiAccordion-root:before': { 
                        display: 'none' 
                      },
                      mb: 1,
                      borderRadius: 1,
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ 
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      <Typography variant="subtitle2">Communication & System Notifications</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormGroup>
                        {Object.entries(NOTIFICATION_TYPES)
                          .filter(([key, value]) => 
                            ['mentionInComment', 'newKbArticle', 'systemUpdates'].includes(key)
                          )
                          .map(([key, value]) => (
                            <Box key={key} sx={{ mb: 2 }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={profileFormik.values.notificationSettings?.[key]?.enabled ?? false}
                                    onChange={(event) => {
                                      handleNotificationTypeToggle(key, event.target.checked);
                                    }}
                                    name={`notificationSettings.${key}.enabled`}
                                    disabled={(!editing && !editingNotifications) || isProfileSubmitting}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2" fontWeight={500}>{value.label}</Typography>
                                    <Typography variant="caption" color="textSecondary">{value.description}</Typography>
                                  </Box>
                                }
                              />
                              {profileFormik.values.notificationSettings?.[key]?.enabled && 
                                renderNotificationChannels(key)
                              }
                            </Box>
                          ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                  
                  {/* Help text at the bottom */}
                  <Box sx={{ mt: 2, p: 1, borderRadius: 1, backgroundColor: alpha(theme.palette.info.main, 0.08) }}>
                    <Typography variant="caption" color="textSecondary">
                      <strong>Note:</strong> Push notifications require browser permissions and are only available on supported devices. 
                      Email notifications will be sent to your registered email address.
                    </Typography>
                  </Box>
                  
                  {editing && notificationSettingsChanged && (
                    <Box sx={{ mt: 2, p: 1, borderRadius: 1, backgroundColor: alpha(theme.palette.warning.main, 0.08), display: 'flex', alignItems: 'center' }}>
                      <NotificationsActiveIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
                      <Typography variant="caption" color="textSecondary">
                        <strong>Notification settings have been changed.</strong> Click "Save Changes" to apply your preferences.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </EnhancedCard>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={changePasswordOpen} onClose={handleCloseChangePassword} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <Box component="form" onSubmit={passwordFormik.handleSubmit} noValidate>
          <DialogContent>
             {passwordSubmitError && (
               <SystemAlert 
                 message={passwordSubmitError}
                 type="error"
                 sx={{ mb: 2 }}
               />
             )}
            <TextField
              margin="dense"
              required
              fullWidth
              name="currentPassword"
              label="Current Password"
              type="password"
              id="currentPassword"
              autoComplete="current-password"
              value={passwordFormik.values.currentPassword}
              onChange={passwordFormik.handleChange}
              onBlur={passwordFormik.handleBlur}
              error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
              helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
              disabled={isPasswordSubmitting}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              value={passwordFormik.values.newPassword}
              onChange={passwordFormik.handleChange}
              onBlur={passwordFormik.handleBlur}
              error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
              helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
              disabled={isPasswordSubmitting}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={passwordFormik.values.confirmPassword}
              onChange={passwordFormik.handleChange}
              onBlur={passwordFormik.handleBlur}
              error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
              helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
              disabled={isPasswordSubmitting}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseChangePassword} disabled={isPasswordSubmitting}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isPasswordSubmitting}
              startIcon={isPasswordSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }}
            >
              Change Password
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeNotification} 
          severity={notification.type} 
          variant="filled"
          elevation={6}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage; 