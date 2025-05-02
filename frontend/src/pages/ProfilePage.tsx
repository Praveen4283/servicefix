import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { FormTextField } from '../components/common/FormField';
import useFormValidation from '../utils/useFormValidation';
import { profileSchema, changePasswordSchema } from '../utils/validationSchemas';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeCurrentAvatar, setRemoveCurrentAvatar] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    type: 'success',
  });
  // New state for notification tab
  const [notificationTab, setNotificationTab] = useState(0);
  
  const theme = useTheme();

  // Profile form validation hook
  const { 
    formik: profileFormik, 
    isSubmitting: isProfileSubmitting, 
    submitError: profileSubmitError 
  } = useFormValidation({
    initialValues: { 
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      designation: '',
      timezone: '',
      language: '',
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
    onSubmit: async (values) => {
      try {
        // Prepare update data
        const updateData: any = { ...values };

        // Handle avatar:
        if (avatarFile) {
          // If a new file is explicitly selected, send it
          updateData.avatarFile = avatarFile;
        } else if (removeCurrentAvatar) {
          // If remove button was clicked AND no new file selected after, signal removal
          // Assuming updateProfile handles avatarFile: null as removal instruction
          updateData.avatarFile = null; 
        }
        // If neither avatarFile nor removeCurrentAvatar is set, the backend should keep the existing avatar.

        await updateProfile(updateData); // Send combined data

        setEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        setRemoveCurrentAvatar(false); // Reset flag
      } catch (error: any) {
        // Reset remove flag on error as well
        setRemoveCurrentAvatar(false);
      }
    },
  });

  // Effect to populate form once user data is loaded
  useEffect(() => {
    if (user) {
      // Convert old notification format to new format if needed
      const convertedNotificationSettings = { ...profileFormik.initialValues.notificationSettings };
      
      if (user.notificationSettings) {
        // Handle both old and new notification format
        Object.entries(user.notificationSettings).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            // Old format - just enabled flag
            if (convertedNotificationSettings[key]) {
              convertedNotificationSettings[key].enabled = value;
            }
          } else if (typeof value === 'object') {
            // New format - with channels
            // Check if value has the correct structure
            const isNewFormat = value !== null && 
              typeof value === 'object' && 
              'enabled' in value && 
              'channels' in value && 
              typeof value.enabled === 'boolean' && 
              typeof value.channels === 'object';
            
            if (isNewFormat) {
              // Already in the correct format
              const typedValue = value as NotificationSetting;
              convertedNotificationSettings[key] = typedValue;
            } else {
              // Old format with direct channel keys - transform to new structure
              const legacyValue = value as LegacyNotificationSetting;
              convertedNotificationSettings[key] = {
                enabled: true, // Default to enabled
                channels: {
                  email: legacyValue.email || false,
                  inApp: legacyValue.in_app || false, // Note: API might use in_app instead of inApp
                  push: legacyValue.push || false
                }
              };
            }
          }
        });
      }
      
      profileFormik.resetForm({
        values: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          designation: user.designation || '',
          timezone: user.timezone || 'UTC',
          language: user.language || 'en',
          notificationSettings: convertedNotificationSettings
        }
      });
      // Reset avatar removal flag when user data changes
      setRemoveCurrentAvatar(false); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [user]); // Run only when user object changes

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

  const handleCancel = () => {
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    setRemoveCurrentAvatar(false); // Reset removal flag on cancel
    profileFormik.resetForm(); // Resets to initial values (or values from useEffect based on user)
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
              disabled={!editing || isProfileSubmitting || !notificationSetting.enabled}
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
              disabled={!editing || isProfileSubmitting || !notificationSetting.enabled}
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
              disabled={!editing || isProfileSubmitting || !notificationSetting.enabled}
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
          <Alert severity="error" sx={{ my: 3 }}>
            {profileSubmitError}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
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
                <Typography variant="subtitle1" gutterBottom>
                  {user?.designation || 'No Designation set'}
                </Typography>
              )}
              
              {user?.lastLogin ? (
                <Box mt={2} textAlign="center">
                  <Typography variant="caption" color="textSecondary">
                    Last Login
                  </Typography>
                  <Typography variant="body2">
                    {(() => {
                      try {
                        // Determine timezone, fallback to UTC if not set on user
                        const userTimeZone = user?.timezone || 'UTC'; 
                        // Use formatInTimeZone for correct display
                        return formatInTimeZone(new Date(user.lastLogin), userTimeZone, 'MMM dd, yyyy p');
                      } catch (error) {
                        console.error('Error formatting last login date:', error);
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
                        value={user?.organization?.name || 'N/A'}
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
                        value={profileFormik.values.timezone}
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
                        value={profileFormik.values.language}
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
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                      <NotificationsIcon sx={{ mr: 1 }} /> 
                      Notification Settings
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
                      Configure how and when you receive notifications about system activities.
                    </Typography>
                  </Box>
                  
                  <Accordion 
                    defaultExpanded 
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
                                    disabled={!editing || isProfileSubmitting}
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
                                    disabled={!editing || isProfileSubmitting}
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
               <Alert severity="error" sx={{ mb: 2 }}>
                 {passwordSubmitError}
               </Alert>
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