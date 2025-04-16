import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Link,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import useFormValidation from '../../utils/useFormValidation';

const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { addNotification } = useNotification();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Use our custom validation hook for consistent behavior
  const { formik } = useFormValidation({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: async (values) => {
      await resetPassword(values.email);
      setIsSubmitted(true);
    },
    successMessage: 'Password reset instructions have been sent to your email address.',
    showSuccessNotification: true,
    showErrorNotification: true
  });

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
            Forgot Password
          </Typography>

          {isSubmitted ? (
            <Box textAlign="center">
              <Typography variant="body2" paragraph>
                Please check your inbox for instructions on how to reset your password. If you don't see the email,
                please check your spam folder.
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Return to login
              </Link>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" align="center" mb={3}>
                Enter your email address and we'll send you instructions to reset your password
              </Typography>

              <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1, width: '100%' }}>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email Address"
                  variant="outlined"
                  margin="normal"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
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
                    Remember your password? Sign in
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

export default ForgotPasswordPage; 