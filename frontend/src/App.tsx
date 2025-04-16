import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
  CssBaseline, 
  Box, 
  CircularProgress, 
  Typography,
  Paper,
  Button,
  Grid
} from '@mui/material';
import { 
  Add as AddIcon 
} from '@mui/icons-material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, NotificationContainer } from './context/NotificationContext';
import { TicketProvider } from './context/TicketContext';
import { ThemeProvider } from './context/ThemeContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { testLocalStorage } from './utils/debugTools';
import { isDevelopment } from './utils/environment';
import CookieConsentBanner from './components/common/CookieConsentBanner';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Public pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import CookiesPage from './pages/CookiesPage';

// Protected pages
import DashboardPage from './pages/dashboard/DashboardPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import CreateTicketPage from './pages/tickets/CreateTicketPage';
import TicketListPage from './pages/tickets/TicketListPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import WorkflowAutomationPage from './pages/WorkflowAutomationPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import NotFoundPage from './pages/NotFoundPage';
import ReportsPage from './pages/ReportsPage';

// Admin pages
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
import ChatbotWidget from './components/ChatbotWidget';

// Constants
const IS_DEVELOPMENT = isDevelopment();

// Test localStorage in development mode
if (IS_DEVELOPMENT) {
  testLocalStorage();
}

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    flexDirection="column" 
    minHeight="100vh"
  >
    <CircularProgress size={50} color="primary" />
    <Typography variant="h6" style={{ marginTop: 16 }}>Loading...</Typography>
  </Box>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Paper 
    elevation={3} 
    sx={{
      m: 2,
      p: 4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      maxWidth: 600,
      mx: 'auto',
      mt: 8
    }}
  >
    <Typography variant="h5" color="error" gutterBottom>Something went wrong</Typography>
    <Typography variant="body1" paragraph>
      {error.message}
    </Typography>
    <Button 
      variant="contained" 
      color="primary" 
      onClick={resetErrorBoundary}
      startIcon={<AddIcon />}
    >
      Try again
    </Button>
  </Paper>
);

// Temporary placeholder component
const PlaceholderComponent = () => (
  <Box sx={{ p: 4, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
    <Typography variant="h4" gutterBottom>Coming Soon</Typography>
    <Typography variant="body1">
      This feature is currently under development and will be available soon in ServiceFix.
    </Typography>
  </Box>
);

// Placeholder components for routes with import issues or missing implementations
const ArticleDetailPage = () => (
  <Box sx={{ p: 4, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
    <Typography variant="h4" gutterBottom>Knowledge Base Article</Typography>
    <Typography variant="body1" paragraph>
      This feature is currently under development. When implemented, this will display 
      the details of knowledge base articles with full content, related articles, 
      and user feedback options.
    </Typography>
    <Button variant="contained" color="primary" onClick={() => window.history.back()}>
      Go Back
    </Button>
  </Box>
);

// Main App component with router
const AppWithRouter = () => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Protect routes that require authentication
  const withProtectedLayout = (Component: React.ComponentType<any>, requiredRole?: string) => {
    // If still loading auth state, show a loading spinner instead of redirecting
    if (isLoading) {
      return <LoadingSpinner />;
    }
    
    if (!isAuthenticated) {
      // Only redirect to login if not authenticated AND not loading
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    
    // Check role requirement if specified
    if (requiredRole && user?.role !== requiredRole) {
      // Redirect to dashboard if role doesn't match
      return <Navigate to="/dashboard" replace />;
    }
    
    return (
      <AppLayout>
        <Component />
      </AppLayout>
    );
  };
  
  // Create a wrapper for authentication pages
  const withAuthLayout = (Component: React.ComponentType<any>) => {
    // Also check loading state here to prevent flashing login page
    if (isLoading) {
      return <LoadingSpinner />;
    }
    
    if (isAuthenticated) {
      // Redirect to dashboard if already authenticated
      return <Navigate to="/dashboard" replace />;
    }
    
    return (
      <AppLayout>
        <Component />
      </AppLayout>
    );
  };
  
  // Create a wrapper for public pages (no auth check)
  const withPublicLayout = (Component: React.ComponentType<any>) => (
    <AppLayout>
      <Component />
    </AppLayout>
  );

  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <CssBaseline />
        <TicketProvider>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingSpinner />}>
              {/* Global components that should appear across all pages */}
              <CookieConsentBanner />
              {isAuthenticated && <ChatbotWidget />}
              
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                
                {/* Auth routes - these should not require authentication */}
                <Route path="/login" element={withAuthLayout(LoginPage)} />
                <Route path="/register" element={withAuthLayout(RegisterPage)} />
                <Route path="/forgot-password" element={withAuthLayout(ForgotPasswordPage)} />
                <Route path="/reset-password" element={withAuthLayout(ResetPasswordPage)} />
                
                {/* Protected routes - these require authentication */}
                <Route path="/dashboard" element={withProtectedLayout(DashboardPage)} />
                <Route path="/tickets">
                  <Route index element={withProtectedLayout(TicketListPage)} />
                  <Route path="create" element={withProtectedLayout(CreateTicketPage)} />
                  <Route path=":id" element={withProtectedLayout(TicketDetailPage)} />
                </Route>
                
                {/* Knowledge base routes */}
                <Route path="/knowledge">
                  <Route index element={withProtectedLayout(KnowledgeBasePage)} />
                  <Route path=":id" element={withProtectedLayout(ArticleDetailPage)} />
                </Route>
                
                {/* Admin routes */}
                <Route path="/analytics" element={withProtectedLayout(AnalyticsDashboardPage, 'admin')} />
                <Route path="/automation" element={withProtectedLayout(WorkflowAutomationPage, 'admin')} />
                <Route path="/reports" element={withProtectedLayout(ReportsPage)} />
                <Route path="/users" element={withProtectedLayout(UsersPage, 'admin')} />
                <Route path="/settings" element={withProtectedLayout(SettingsPage, 'admin')} />
                
                {/* User profile */}
                <Route path="/profile" element={withProtectedLayout(ProfilePage)} />
                
                {/* Search */}
                <Route path="/search" element={withProtectedLayout(SearchPage)} />
                
                {/* Cookies page - public */}
                <Route path="/cookies" element={withPublicLayout(CookiesPage)} />
                
                {/* Not found route */}
                <Route path="*" element={withPublicLayout(NotFoundPage)} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </TicketProvider>
      </CookieConsentProvider>
    </ThemeProvider>
  );
};

// Main App component
const App = () => {
  return (
    <Router>
      <NotificationProvider>
        <AuthProvider>
          <AppWithRouter />
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
};

export default App; 