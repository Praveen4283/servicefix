import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Typography, 
  Box, 
  InputAdornment, 
  IconButton,
  Divider,
  Link as MuiLink,
  CircularProgress
} from '@mui/material';
import { 
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  LockOutlined as LockIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import useFormValidation from '../../utils/useFormValidation';
import { loginSchema } from '../../utils/validationSchemas';
import { FormTextField } from '../../components/common/FormField';
import { SystemAlert, useSystemNotification } from '../../context/NotificationContext';

// Login page component
const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, isLoading, clearError } = useAuth();
  const { addNotification } = useNotification();
  const { showError, showSuccess } = useSystemNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const processedErrorRef = useRef<string | null>(null);

  // Check if user was redirected from another page
  const queryParams = new URLSearchParams(location.search);
  const redirectTo = queryParams.get('redirectTo') || '/dashboard';
  
  // Check if user was redirected from registration
  const locationState = location.state as { registered?: boolean; email?: string } | null;
  
  // Show registration success if redirected from registration page
  useEffect(() => {
    const hasShownNotification = sessionStorage.getItem('registrationNotificationShown');
    if (locationState?.registered && !hasShownNotification) {
      showSuccess('Registration successful! Please log in with your new account.', {
        title: 'Registration Complete'
      });
      sessionStorage.setItem('registrationNotificationShown', 'true');
      
      // Clean up location state
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [locationState, showSuccess, navigate, location.pathname, location.search]);
  
  // Show error notification if there is an auth error
  useEffect(() => {
    if (error && error !== processedErrorRef.current) {
      showError(error, { title: 'Authentication Error' });
      processedErrorRef.current = error;
      clearError();
    } else if (!error) {
      processedErrorRef.current = null;
    }
  }, [error, showError, clearError]);

  // Initialize with email from redirection or empty string
  const initialEmail = locationState?.email || '';

  // Use our custom validation hook
  const { formik } = useFormValidation({
    initialValues: {
      email: initialEmail,
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      try {
        const loginSuccess = await login(values.email, values.password);
        
        if (loginSuccess) {
          showSuccess('Login successful!', { title: 'Welcome Back' });
          // Clear the registration notification flag
          sessionStorage.removeItem('registrationNotificationShown');
          navigate(redirectTo);
        } else {
          // Login failed, error state is set in context, useEffect will handle notification
          console.log("Login failed, error handled by notification system via useEffect");
        }
      } catch (error) {
        // This catch block should ideally not be reached now unless there's an unexpected error
        console.error("Unexpected error during login process:", error);
        showError('An unexpected error occurred. Please try again.', { title: 'Login Error' });
      }
    },
    // Don't show notifications from the hook since we handle them manually
    showSuccessNotification: false,
    showErrorNotification: false
  });

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Welcome Back
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Sign in to your account to continue
      </Typography>

      {/* Login form */}
      <form onSubmit={formik.handleSubmit}>
        <FormTextField
          name="email"
          label="Email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          touched={formik.touched}
          errors={formik.errors}
          fullWidth
          margin="normal"
          autoComplete="email"
          autoFocus
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormTextField
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          touched={formik.touched}
          errors={formik.errors}
          fullWidth
          margin="normal"
          autoComplete="current-password"
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
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
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          color="primary"
          endIcon={isLoading ? undefined : <ArrowForwardIcon />}
          sx={{
            py: 1.5,
            px: 3,
            borderRadius: '12px',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 10px 20px rgba(63,81,181,0.3)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            mt: 3,
            mb: 2,
            '&:hover': {
              transform: 'scale(1.05) translateY(-3px)',
              boxShadow: '0 15px 30px rgba(63,81,181,0.4)',
            },
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              transition: 'all 0.6s ease',
            },
            '&:hover:before': {
              left: '100%',
            }
          }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
      </form>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account? {' '}
          <MuiLink component={Link} to="/register" underline="hover">
            Sign up here
          </MuiLink>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <MuiLink component={Link} to="/forgot-password" underline="hover">
            Forgot password?
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage; 