import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Typography, Button, Box, Container, Paper } from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { isDevelopment } from '../utils/environment';

// Props for ErrorBoundary
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// State for ErrorBoundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Wrapper to use hooks with class component
const withNotification = (WrappedComponent: any) => {
  // eslint-disable-next-line react/display-name
  return (props: any) => {
    const notification = useNotification();
    return <WrappedComponent {...props} notification={notification} />;
  };
};

class ErrorBoundaryBase extends Component<ErrorBoundaryProps & { notification?: any }, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps & { notification?: any }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Show error notification
    if (this.props.notification) {
      this.props.notification.addNotification(
        'An unexpected error occurred. The development team has been notified.',
        'error',
        0
      );
    }
    
    this.setState({
      error,
      errorInfo,
    });
    
    // Here you could log to a service like Sentry or send to your backend
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
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
                <Button variant="outlined" onClick={this.handleReset}>
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
                  {this.state.error?.toString()}
                </Typography>
                {this.state.errorInfo && (
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
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    // Render children if there's no error
    return this.props.children;
  }
}

// Export the error boundary with notification context
export const ErrorBoundary = withNotification(ErrorBoundaryBase); 