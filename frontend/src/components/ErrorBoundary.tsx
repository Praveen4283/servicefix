import React, { useState, useCallback, ReactNode, ErrorInfo, FC } from 'react';
import { Typography, Button, Box, Container, Paper } from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { isDevelopment } from '../utils/environment';

// Props for ErrorBoundary
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  FallbackComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

// Interface for error boundary hook state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

/**
 * Custom hook for error boundary functionality
 */
const useErrorBoundary = (): ErrorBoundaryState => {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  
  const resetError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);
  
  return {
    hasError: error !== null,
    error,
    errorInfo,
    resetError
  };
};

/**
 * ErrorFallback component - shown when an error occurs
 */
const ErrorFallback: FC<{
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}> = ({ error, errorInfo, resetError }) => {
  const notification = useNotification();
  
  // Notify about the error
  React.useEffect(() => {
    notification.addNotification(
      'An unexpected error occurred. The development team has been notified.',
      'error',
      { duration: 0 }
    );
  }, [notification]);
  
  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 8, 
          textAlign: 'center',
          borderRadius: 2,
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            The application encountered an unexpected error. Our team has been notified.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You can try resetting the application or go back to the homepage.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={resetError}>
              Try Again
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.href = '/'}
            >
              Go to Homepage
            </Button>
          </Box>
        </Box>
        
        {isDevelopment() && (
          <Box sx={{ mt: 4, textAlign: 'left', backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f' }}>
              Error Details (Visible in Development Only):
            </Typography>
            <Typography 
              variant="body2" 
              component="pre" 
              sx={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                backgroundColor: '#f0f0f0',
                p: 2,
                border: '1px solid #ddd',
                borderRadius: 1,
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {error?.toString()}
            </Typography>
            {errorInfo && (
              <Typography 
                variant="body2" 
                component="pre" 
                sx={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  backgroundColor: '#f0f0f0',
                  p: 2,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  maxHeight: '300px',
                  overflow: 'auto',
                  mt: 2
                }}
              >
                {errorInfo.componentStack}
              </Typography>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

/**
 * ErrorBoundary implementation using React Error Boundary API
 */
export const ErrorBoundary: FC<ErrorBoundaryProps> = ({ children, fallback, FallbackComponent }) => {
  const { hasError, error, errorInfo, resetError } = useErrorBoundary();
  
  // If we don't have an error, render children normally
  if (!hasError) {
    return <>{children}</>;
  }
  
  // If we have a FallbackComponent, use it
  if (FallbackComponent && error) {
    return <FallbackComponent error={error} resetErrorBoundary={resetError} />;
  }
  
  // If we have a custom fallback, use it
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Otherwise, render our default error UI
  return (
    <ErrorFallback 
      error={error} 
      errorInfo={errorInfo}
      resetError={resetError} 
    />
  );
};

// Create a higher-order component for class components that need error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WithErrorBoundary: FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  // Set display name for debugging
  WithErrorBoundary.displayName = `WithErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  return WithErrorBoundary;
}; 