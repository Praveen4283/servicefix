import React, { Suspense, useEffect, lazy } from 'react';
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
import { NotificationPreferencesProvider } from './context/NotificationPreferencesContext';
import { TicketProvider } from './context/TicketContext';
import { ThemeProvider } from './context/ThemeContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isDevelopment } from './utils/environment';
import CookieConsentBanner from './components/common/CookieConsentBanner';
import { initializeNotificationSystem, shutdownNotificationSystem } from './services/notificationInitializer';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Public pages - No code splitting needed for these small components
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import CookiesPage from './pages/CookiesPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected pages - Use code splitting for larger components
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const TicketDetailPage = lazy(() => import('./pages/tickets/TicketDetailPage'));
const CreateTicketPage = lazy(() => import('./pages/tickets/CreateTicketPage'));
const TicketListPage = lazy(() => import('./pages/tickets/TicketListPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const WorkflowAutomationPage = lazy(() => import('./pages/WorkflowAutomationPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

// Admin pages - Use code splitting for admin pages
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ChatbotWidget = lazy(() => import('./components/ChatbotWidget'));

// Constants
const IS_DEVELOPMENT = isDevelopment();

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

// Main App component with router
const AppWithRouter = () => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Initialize and cleanup notification system
  useEffect(() => {
    // When auth state changes and user is authenticated
    if (isAuthenticated && user && !isLoading) {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        initializeNotificationSystem(authToken);
      }
    }
    
    // Cleanup function
    return () => {
      shutdownNotificationSystem();
    };
  }, [isAuthenticated, user, isLoading]);
  
  // Protect routes that require authentication
  const withProtectedLayout = (Component: React.ComponentType<any>, requiredRole?: string) => {
    // Return a proper function component that can use hooks
    const WithProtectedLayoutComponent = () => {
      const { isAuthenticated, user, isLoading } = useAuth();
      const location = useLocation();
      
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
    
    return <WithProtectedLayoutComponent />;
  };
  
  // Create a wrapper for authentication pages
  const withAuthLayout = (Component: React.ComponentType<any>) => {
    // Return a proper function component that can use hooks
    const WithAuthLayoutComponent = () => {
      const location = useLocation();
      const { isAuthenticated, isLoading } = useAuth();
      
      // Also check loading state here to prevent flashing login page
      if (isLoading) {
        return <LoadingSpinner />;
      }
      
      // Check localStorage for user data as a backup check for successful login
      const cachedUser = localStorage.getItem('user');
      const isLocallyAuthenticated = !!cachedUser;
      
      // Prevent redirect loops by checking if we're already trying to redirect
      const isRedirecting = location.state?.isRedirecting;
      
      // If we have authentication either from context or localStorage, consider the user authenticated
      if ((isAuthenticated || isLocallyAuthenticated) && !isRedirecting) {
        console.log('[App] User is authenticated, redirecting to dashboard from auth page');
        // Redirect to dashboard if already authenticated, with state to prevent loops
        return <Navigate to="/dashboard" replace state={{ isRedirecting: true }} />;
      }
      
      return (
        <AppLayout>
          <Component />
        </AppLayout>
      );
    };
    
    return <WithAuthLayoutComponent />;
  };
  
  // Create a wrapper for public pages (no auth check)
  const withPublicLayout = (Component: React.ComponentType<any>) => {
    // Return a proper function component
    const WithPublicLayoutComponent = () => (
      <AppLayout>
        <Component />
      </AppLayout>
    );
    
    return <WithPublicLayoutComponent />;
  };

  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <CssBaseline />
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingSpinner />}>
            {/* Wrap Routes and ChatbotWidget with TicketProvider here */}
            <TicketProvider>
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
                
                {/* Other routes */}
                <Route path="/search" element={withProtectedLayout(SearchPage)} />
                <Route path="/cookies" element={withPublicLayout(CookiesPage)} />
                
                {/* Catch-all 404 */}
                <Route path="*" element={withPublicLayout(NotFoundPage)} />
              </Routes>
            </TicketProvider>
          </Suspense>
        </ErrorBoundary>
      </CookieConsentProvider>
    </ThemeProvider>
  );
};

// Main App component
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <NotificationPreferencesProvider>
            <AppWithRouter />
            <NotificationContainer />
          </NotificationPreferencesProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 