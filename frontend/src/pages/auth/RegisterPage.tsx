import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  LockOutlined as LockIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import useFormValidation from '../../utils/useFormValidation';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

// Registration page component
const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, error, isLoading, clearError } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const errorNotifiedRef = useRef(false);

  // Form validation schema
  const validationSchema = Yup.object({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    email: Yup.string().email('Enter a valid email').required('Email is required'),
    organizationName: Yup.string().required('Organization name is required'),
    role: Yup.string().required('Please select an account type'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
    agreeToTerms: Yup.boolean().oneOf([true], 'You must accept the terms and conditions'),
  });

  // Handle form submission with Formik
  const { formik } = useFormValidation({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      organizationName: '',
      role: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        errorNotifiedRef.current = false;
        
        // Check the boolean result of the register call
        const success = await register({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          organizationName: values.organizationName,
          role: values.role as 'admin' | 'agent' | 'customer'
        });
        
        if (success) {
          // Navigate immediately on success, passing state
          navigate('/login', { state: { registered: true, email: values.email } });
        } else {
          // Failure is handled by the useEffect watching the error state
          console.log('Registration failed, error handling delegated.');
        }
      } catch (error) {
        // This catch block should ideally not be reached
        console.error('Unexpected error during registration:', error);
        addNotification('An unexpected registration error occurred.', 'error');
      }
    },
    // Don't show notifications here since we handle them in the effect
    showSuccessNotification: false,
    showErrorNotification: false
  });

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle error notifications
  useEffect(() => {
    if (error && !errorNotifiedRef.current) {
      addNotification(error, 'error');
      errorNotifiedRef.current = true;
      // Clear error after showing notification to prevent infinite loops
      clearError();
    }
    
    // Reset the flag when error is cleared
    if (!error) {
      errorNotifiedRef.current = false;
    }
  }, [error, addNotification, clearError]);

  return (
    <Box sx={{ py: 2, maxWidth: '600px', mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Create Your Account
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Get started with ServiceFix
      </Typography>

      <Box 
        component="form" 
        onSubmit={(e) => {
          e.preventDefault();
          formik.handleSubmit(e);
        }} 
        sx={{ width: '100%' }} 
        noValidate
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="firstName"
              name="firstName"
              label="First Name"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
              value={formik.values.firstName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.firstName && Boolean(formik.errors.firstName)}
              helperText={formik.touched.firstName && formik.errors.firstName}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="lastName"
              name="lastName"
              label="Last Name"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
              value={formik.values.lastName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.lastName && Boolean(formik.errors.lastName)}
              helperText={formik.touched.lastName && formik.errors.lastName}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="organizationName"
              name="organizationName"
              label="Organization Name"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon color="action" />
                  </InputAdornment>
                ),
              }}
              value={formik.values.organizationName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.organizationName && Boolean(formik.errors.organizationName)}
              helperText={formik.touched.organizationName && formik.errors.organizationName}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth error={formik.touched.role && Boolean(formik.errors.role)}>
              <InputLabel id="role-label">Account Type</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formik.values.role}
                label="Account Type"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                startAdornment={
                  <InputAdornment position="start">
                    <WorkIcon color="action" />
                  </InputAdornment>
                }
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="agent">Support Agent</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
              {formik.touched.role && formik.errors.role && (
                <FormHelperText>{formik.errors.role}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
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
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              variant="outlined"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
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
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  id="agreeToTerms"
                  name="agreeToTerms"
                  color="primary"
                  checked={formik.values.agreeToTerms}
                  onChange={formik.handleChange}
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{' '}
                  <Link component={RouterLink} to="/terms" color="primary">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link component={RouterLink} to="/privacy" color="primary">
                    Privacy Policy
                  </Link>
                </Typography>
              }
            />
            {formik.touched.agreeToTerms && formik.errors.agreeToTerms && (
              <Typography variant="caption" color="error">
                {formik.errors.agreeToTerms}
              </Typography>
            )}
          </Grid>
        </Grid>
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
          onClick={() => {
            if (!formik.isSubmitting) {
              formik.handleSubmit();
            }
          }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
        </Button>
        <Grid container justifyContent="flex-end">
          <Grid item>
            <Link component={RouterLink} to="/login" variant="body2">
              Already have an account? Sign in
            </Link>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default RegisterPage; 