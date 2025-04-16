import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Link,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import useFormValidation from '../../utils/useFormValidation';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Not using resetPassword yet since we're simulating the reset
  // const { resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { addNotification } = useNotification();
  const invalidTokenNotified = useRef(false);

  // Extract token from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  
  // Handle invalid token notification - only show once
  useEffect(() => {
    // Only show the notification if no token, not already successful, and not already notified
    if (!token && !isSuccess && !invalidTokenNotified.current) {
      addNotification('The password reset link is invalid or has expired.', 'error');
      invalidTokenNotified.current = true; // Mark as notified
    }
  }, [token, isSuccess, addNotification]);

  // Use our custom validation hook
  const { formik } = useFormValidation({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
    }),
    onSubmit: async (values) => {
      if (!token) {
        addNotification('Reset token is missing', 'error');
        return;
      }
      
      // In a real app, you would call an API endpoint with the token and new password
      // For now, we'll just simulate a successful password reset
      // await resetPassword(token, values.password);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      
      setIsSuccess(true);
      // Success notification will be shown via the hook
    },
    successMessage: 'Your password has been successfully reset!',
    showSuccessNotification: true,
    showErrorNotification: true
  });

  // Redirect to login after successful password reset
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        navigate('/login', { state: { passwordReset: true } });
      }, 3000);
    }
  }, [isSuccess, navigate]);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // If no token is provided, show an error
  if (!token && !isSuccess) {
    return (
      <Container component="main" maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              Invalid Reset Link
            </Typography>
            <Typography variant="body2" paragraph>
              Please request a new password reset link.
            </Typography>
            <Button
              component={RouterLink}
              to="/forgot-password"
              variant="contained"
              color="primary"
            >
              Request New Link
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            Reset Password
          </Typography>

          {isSuccess ? (
            <Box textAlign="center">
              <Typography variant="body2" paragraph>
                You will be redirected to the login page shortly.
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Click here if you are not redirected automatically
              </Link>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" align="center" mb={3}>
                Enter your new password below
              </Typography>

              <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1, width: '100%' }}>
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  margin="normal"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  variant="outlined"
                  margin="normal"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                  helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowConfirmPassword}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={formik.isSubmitting}
                >
                  {formik.isSubmitting ? <CircularProgress size={24} /> : 'Reset Password'}
                </Button>
                <Box textAlign="center">
                  <Link component={RouterLink} to="/login" variant="body2">
                    Back to login
                  </Link>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPasswordPage; 