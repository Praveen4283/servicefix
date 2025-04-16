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
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Upload as UploadIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { FormTextField } from '../components/common/FormField';
import useFormValidation from '../utils/useFormValidation';
import { profileSchema, changePasswordSchema } from '../utils/validationSchemas';
import { format } from 'date-fns';

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
const NOTIFICATION_TYPES = {
  newTicketAssigned: 'When a new ticket is assigned to me',
  ticketUpdated: 'When a ticket I follow is updated',
  mentionInComment: 'When someone mentions me in a comment',
  newKbArticle: 'When a new Knowledge Base article is published',
  systemUpdates: 'System updates and announcements'
};

// Interface for Change Password Form Values
interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    type: 'success',
  });

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
      jobTitle: '',
      timezone: '',
      language: '',
      notificationSettings: {
        newTicketAssigned: true,
        ticketUpdated: true,
        mentionInComment: true,
        newKbArticle: false,
        systemUpdates: true
      },
    },
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      try {
        await updateProfile({ 
          ...values, 
          ...(avatarFile && { avatarFile: avatarFile }) 
        });
        setEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        setNotification({ open: true, message: 'Profile updated successfully', type: 'success' });
      } catch (error: any) {
        setNotification({ open: true, message: error.message || 'Failed to update profile', type: 'error' });
      }
    },
  });

  // Effect to populate form once user data is loaded
  useEffect(() => {
    if (user) {
      profileFormik.resetForm({
        values: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          jobTitle: user.jobTitle || '',
          timezone: user.timezone || 'UTC',
          language: user.language || 'en',
          notificationSettings: {
            ...profileFormik.initialValues.notificationSettings,
            ...(user.notificationSettings || {}),
          }
        }
      });
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
         setNotification({ open: true, message: 'Password changed successfully', type: 'success' });
       } catch (error: any) {
         setNotification({ open: true, message: error.message || 'Failed to change password', type: 'error' });
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
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    profileFormik.resetForm();
  };

  const handleOpenChangePassword = () => {
    setChangePasswordOpen(true);
    passwordFormik.resetForm();
  };

  const handleCloseChangePassword = () => {
    setChangePasswordOpen(false);
  };

  const handleManageNotifications = () => {
    setNotification({ open: true, message: 'Notification settings management coming soon!', type: 'info' });
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (!user) {
    return <CircularProgress />;
  }

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Manage your personal information and preferences
        </Typography>
      </Box>

      {profileSubmitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {profileSubmitError}
        </Alert>
      )}

      <Paper sx={{ p: 4, mb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(() => {
              const avatarSource = avatarPreview || user?.avatarUrl || undefined;
              return (
                <Avatar
                  src={avatarSource}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  sx={{
                    width: 150,
                    height: 150,
                    mb: 2,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    fontSize: '4rem'
                  }}
                >
                  {!avatarPreview && !user?.avatarUrl && user?.firstName && user?.lastName &&
                    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
                </Avatar>
              );
            })()}
            {editing ? (
              <>
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
                    sx={{ mb: 2 }}
                    disabled={isProfileSubmitting}
                  >
                    {avatarFile ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </label>
                {avatarPreview && (
                   <Typography variant="caption" color="textSecondary">
                     New photo selected. Click Save.
                   </Typography>
                )}
              </>
            ) : (
              <Typography variant="subtitle1" gutterBottom>
                {user?.role && user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Typography>
            )}
            
            {/* Last Login Information */}
            {user?.lastLogin ? (
              <Box mt={2} textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Last Login
                </Typography>
                <Typography variant="body2">
                  {(() => {
                    try {
                      // Try to format the date, but catch any errors
                      return format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm');
                    } catch (error) {
                      console.error('Error formatting last login date:', error);
                      return 'Unknown';
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
          </Grid>

          <Grid item xs={12} md={8}>
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
                    name="jobTitle"
                    label="Job Title"
                    fullWidth
                    value={profileFormik.values.jobTitle}
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
                      disabled={isProfileSubmitting || (!profileFormik.dirty && !avatarFile)}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      startIcon={<CancelIcon />}
                      disabled={isProfileSubmitting}
                    >
                      Cancel
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Security
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleOpenChangePassword}
                startIcon={<LockResetIcon />}
                sx={{ mt: 2 }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification Settings
              </Typography>
              <FormGroup>
                {Object.entries(NOTIFICATION_TYPES).map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={profileFormik.values.notificationSettings?.[key as keyof typeof profileFormik.values.notificationSettings] ?? false}
                        onChange={(event) => {
                          profileFormik.setFieldValue(
                            `notificationSettings.${key}`,
                            event.target.checked
                          );
                        }}
                        name={`notificationSettings.${key}`}
                        disabled={!editing || isProfileSubmitting}
                      />
                    }
                    label={label}
                    sx={{ mb: 1 }}
                  />
                ))}
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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