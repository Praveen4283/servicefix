import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import apiClient from '../services/apiClient';
import { useNavigate, useLocation } from 'react-router-dom';
import notificationService from '../services/notificationService';
import { notificationManager } from '../services/notificationManager';

// Define user interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'customer';
  avatarUrl?: string;
  phoneNumber?: string;
  designation?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  };
  timezone?: string;
  language?: string;
  lastLogin?: string;
  lastLoginAt?: string;
  last_login_at?: string;
  createdAt?: string;
  updatedAt?: string;
  notificationSettings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
}

// Interface for profile update data that can include a file
export interface ProfileUpdateData extends Partial<User> {
  avatarFile?: File;
}

// Register form data interface
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  role: 'admin' | 'agent' | 'customer';
}

// Auth state interface
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  registrationSuccess: boolean;
}

// Format user response to ensure consistent structure across different API responses
const formatUserResponse = (userData: any): User => {
  return {
    id: userData.id?.toString() || '',
    email: userData.email || '',
    firstName: userData.firstName || userData.first_name || '',
    lastName: userData.lastName || userData.last_name || '',
    role: userData.role || 'customer',
    avatarUrl: userData.avatarUrl || userData.avatar_url || undefined,
    phoneNumber: userData.phoneNumber || userData.phone || undefined,
    designation: userData.designation || undefined,
    organizationId: userData.organizationId?.toString() || userData.organization_id?.toString() || undefined,
    organization: userData.organization || undefined,
    timezone: userData.timezone || 'UTC',
    language: userData.language || 'en',
    lastLoginAt: userData.lastLoginAt || userData.last_login_at || undefined,
    createdAt: userData.createdAt || userData.created_at || undefined,
    updatedAt: userData.updatedAt || userData.updated_at || undefined,
    notificationSettings: userData.notificationSettings || undefined
  };
};

// Auth context interface
export type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userData: ProfileUpdateData) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  clearError: () => void;
  resetRegistrationSuccess: () => void;
  deleteAccount?: () => Promise<void>;
  state: AuthState;
};

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial authentication state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
  registrationSuccess: false
};

// Props interface for the provider
interface AuthProviderProps {
  children: ReactNode;
}

// Define a type for notification events
export enum NotificationEventType {
  AUTH_SUCCESS = 'auth:success',
  AUTH_ERROR = 'auth:error',
  GENERAL = 'general'
}

export interface NotificationEventDetail {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  isPersistent?: boolean;
}

// Helper to dispatch notification events
const dispatchNotificationEvent = (type: NotificationEventType, detail: NotificationEventDetail) => {
  if (!detail) return;

  const { message, type: notificationType, title, duration } = detail;
  
  console.log(`[AuthContext] Showing notification: ${message}`);
  
  switch (notificationType) {
    case 'success':
      notificationManager.showSuccess(message, { title, duration });
      break;
    case 'error':
      notificationManager.showError(message, { title, duration });
      break;
    case 'warning':
      notificationManager.showWarning(message, { title, duration });
      break;
    default:
      notificationManager.showInfo(message, { title, duration });
  }
  
  // For login success notifications, also create a persistent notification
  // that will be stored in the database and shown in the notification panel
  if (type === NotificationEventType.AUTH_SUCCESS && message.includes('Welcome back')) {
    // Format current date and time with the user's timezone
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    
    // Create a more detailed message with timestamp
    const detailedMessage = `${message} You logged in at ${formattedDate}, ${formattedTime}`;
    
    // Store the notification in a variable for clarity
    const notificationData = {
      title: title || 'Login Notification',
      message: detailedMessage,
      type: 'success',
      link: '/dashboard',
      event_type: 'login_success'
    };
    
    // Add a flag to localStorage to track that we've created this notification
    // This prevents duplicates from multiple events or re-renders
    const loginNotificationKey = `login_notification_${Date.now().toString().substring(0, 8)}`;
    
    // Only create if we haven't already created one recently
    if (!localStorage.getItem(loginNotificationKey)) {
      // Set the flag (expires in 10 seconds)
      localStorage.setItem(loginNotificationKey, 'true');
      setTimeout(() => localStorage.removeItem(loginNotificationKey), 10000);
      
      // Use notification service to create a persistent notification
      notificationService.createBackendNotification(
        notificationData.title, 
        notificationData.message,
        'success',
        notificationData.link,
        { event_type: notificationData.event_type }
      ).catch(err => console.error('Failed to create persistent login notification:', err));
    }
  }
  
  // For backward compatibility, still dispatch the event
  // This will be picked up by any legacy code still listening for these events
  const event = new CustomEvent(type, { detail });
  window.dispatchEvent(event);
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);
  const navigate = useNavigate();
  const location = useLocation();
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketInitializedRef = useRef<boolean>(false);
  const validatingSessionRef = useRef<boolean>(false);
  const sessionValidationPromiseRef = useRef<Promise<void> | null>(null);
  
  // Memoize user object to prevent unnecessary re-renders
  const user = useMemo(() => state.user, [state.user]);
  
  // Initialize socket connection after successful auth
  const initializeSocketIfNeeded = useCallback(() => {
    if (socketInitializedRef.current) {
      return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('[AuthContext] Cannot initialize socket: No auth token in localStorage');
      return;
    }
    
    console.log('[AuthContext] Initializing socket connection after successful auth');
    import('../services/socketService').then(({ default: socketService }) => {
      socketService.initializeSocket(authToken)
        .then(() => {
          console.log('[AuthContext] Socket initialized successfully');
          socketInitializedRef.current = true;
        })
        .catch(err => {
          console.error('[AuthContext] Error initializing socket:', err);
          // Reset flag to allow future reconnection attempts
          setTimeout(() => {
            socketInitializedRef.current = false;
          }, 30000); // Wait 30 seconds before allowing another attempt
        });
    });
  }, []);

  // Handle session expired with debouncing to prevent multiple redirects
  const handleSessionExpired = useCallback(() => {
    // Clear authentication state
    setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      registrationSuccess: false
    });
    
    // Clear stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Reset socket connection status
    socketInitializedRef.current = false;
    
    // Disconnect from socket if connected
    import('../services/socketService').then(({ default: socketService }) => {
      socketService.disconnect();
    });
    
    // Redirect to login page if not already there
    if (!location.pathname.includes('/login')) {
      // Add session expired parameter to show appropriate message
      navigate('/login?session=expired');
    }
  }, [navigate, location.pathname]);

  // Validate user session with debouncing to prevent multiple calls
  const validateSession = useCallback(async (): Promise<boolean> => {
    // If already validating, return the existing promise
    if (validatingSessionRef.current && sessionValidationPromiseRef.current) {
      try {
        await sessionValidationPromiseRef.current;
        return true;
      } catch (error) {
        return false;
      }
    }
    
    // Set validating flag and create a new promise
    validatingSessionRef.current = true;
    
    const validationPromise = new Promise<boolean>(async (resolve, reject) => {
      try {
        // Ensure CSRF token is available or fetched
        try {
          await apiClient.fetchCsrfToken();
        } catch (csrfError) {
          console.warn('[AuthContext] Failed to fetch/ensure CSRF token before validation:', csrfError);
          // Continue anyway, the API call will handle CSRF errors
        }
        
        // Validate the session
        const response = await apiClient.get('/auth/validate');
        
        if (response && response.user) {
          // Update user data and authentication state
          const user = formatUserResponse(response.user);
          localStorage.setItem('user', JSON.stringify(user));
          
          setState(prevState => ({
            ...prevState,
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
          }));
          
          // Initialize socket connection
          initializeSocketIfNeeded();
          
          resolve(true);
          return;
        } else {
          console.warn('[AuthContext] /auth/validate did not return a user or unexpected response');
          handleSessionExpired();
          reject(new Error('Invalid session validation response'));
          return;
        }
      } catch (error) {
        console.error('[AuthContext] Error validating session:', error);
        handleSessionExpired();
        reject(error);
        return;
      } finally {
        // Reset validation state after a small delay to prevent immediate retries
        setTimeout(() => {
          validatingSessionRef.current = false;
          sessionValidationPromiseRef.current = null;
        }, 1000);
      }
    });
    
    // Store the promise for potential concurrent calls
    sessionValidationPromiseRef.current = validationPromise.then(() => {}).catch(() => {});
    
    return validationPromise;
  }, [handleSessionExpired, initializeSocketIfNeeded]);

  // Initialize the auth state
  useEffect(() => {
    const initializeAuth = async () => {
      let proceedToValidate = true;
      let loadedFromCacheAndComplete = false;

      const cachedUserJson = localStorage.getItem('user');
      if (cachedUserJson) {
        try {
          const cachedUser = JSON.parse(cachedUserJson) as User;
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[AuthContext] Found cached user data:', cachedUser.id);
          }

          const hasCriticalData = cachedUser.designation && cachedUser.phoneNumber && cachedUser.organization;

          if (hasCriticalData) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[AuthContext] Cached user has critical data, using it.');
            }
            setState(prevState => ({
              ...prevState,
              isAuthenticated: true,
              user: cachedUser,
              isLoading: false
            }));
            proceedToValidate = false;
            loadedFromCacheAndComplete = true;
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[AuthContext] Cached user is missing critical data, will proceed to validate session.');
            }
            setState(prevState => ({
              ...prevState,
              isAuthenticated: true, // Assume authenticated if cache exists, but data is incomplete
              user: cachedUser, // Set partial user
              isLoading: true // Keep isLoading true until validation for this protected route
            }));
          }
        } catch (e) {
          console.error('[AuthContext] Error parsing cached user data:', e);
          localStorage.removeItem('user');
          setState(prevState => ({ ...prevState, isLoading: true }));
        }
      } else {
        setState(prevState => ({ ...prevState, isLoading: true }));
      }
      
      // Determine if the current route is public
      const currentPath = location.pathname;
      const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/cookies'];
      const isCurrentRoutePublic = publicRoutes.some(
        route => currentPath === route || (route !== '/' && currentPath.startsWith(route))
      );

      // Handle public routes: skip validation and ensure isLoading is false.
      if (isCurrentRoutePublic) {
        console.log(`[AuthContext] Current route ${currentPath} is public. Skipping auth validation.`);
        
        if (state.isLoading || !loadedFromCacheAndComplete) {
          setState(prevState => ({ ...prevState, isLoading: false }));
        }
        return;
      }

      // For NON-PUBLIC routes: validate session if needed
      if (proceedToValidate) {
        try {
          console.log(`[AuthContext] Validating auth session for protected route: ${currentPath}`);
          
          // Use the validateSession helper with debouncing
          const isValid = await validateSession();
          
          if (!isValid) {
            // Session validation failed, handleSessionExpired was already called
            console.warn('[AuthContext] Session validation failed for protected route.');
          } else {
            console.log('[AuthContext] Session validated successfully for protected route.');
          }
        } catch (error) {
          console.error('[AuthContext] Error during auth initialization:', error);
          // handleSessionExpired was already called in validateSession
        }
      } else if (loadedFromCacheAndComplete) {
        console.log(`[AuthContext] Using complete cached user for protected route: ${currentPath}`);
        initializeSocketIfNeeded();
      } else {
        console.warn('[AuthContext] Reached unexpected state in initializeAuth for protected route.');
        setState(prevState => ({ ...prevState, isLoading: false }));
      }
    };
    
    initializeAuth();
  }, [location.pathname, location.state?.isRedirecting, handleSessionExpired, initializeSocketIfNeeded, validateSession]);

  // Listen for auth events
  useEffect(() => {
    // Listen for forced logout events (triggered by API client or socketService)
    const handleForceLogout = () => {
      console.log('[AuthContext] Forced logout detected');
      handleSessionExpired();
    };
    
    // Listen for session refresh events (when API client successfully refreshes tokens)
    const handleSessionRefreshed = () => {
      console.log('[AuthContext] Session refreshed event detected');
      // Refresh user data if needed after token refresh
      validateSession().catch(error => {
        console.error('[AuthContext] Error validating session after refresh:', error);
      });
    };
    
    // Register event listeners
    window.addEventListener('user:force-logout', handleForceLogout);
    window.addEventListener('auth:session-refreshed', handleSessionRefreshed);
    
    // Clean up
    return () => {
      window.removeEventListener('user:force-logout', handleForceLogout);
      window.removeEventListener('auth:session-refreshed', handleSessionRefreshed);
    };
  }, [handleSessionExpired, validateSession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      
      // Make login request
      const response = await apiClient.post('/auth/login', { email, password });
      console.log('[AuthContext] Login response:', response);
      
      if (response.status === 'success' && response.user && response.token) {
        // Format user response 
        const user = formatUserResponse(response.user);
        
        // Store the access token and refresh token in localStorage for now
        // This allows socket.io to use the token for authentication
        // But we primarily rely on HttpOnly cookies for API authentication
        console.log('[AuthContext] Storing auth token in localStorage');
        localStorage.setItem('authToken', response.token);
        
        if (response.refreshToken) {
          console.log('[AuthContext] Storing refresh token in localStorage');
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        
        // Store the login timestamp to detect fresh logins
        localStorage.setItem('lastLoginTimestamp', Date.now().toString());
        
        // Set a flag for fresh login that other services can check
        // @ts-ignore - Adding custom property to window
        window.__freshLogin = true;
        
        // Auto-clear the fresh login flag after some time
        setTimeout(() => {
          // @ts-ignore - Clearing custom property from window
          window.__freshLogin = false;
        }, 10000); // Clear after 10 seconds
        
        // Cache user data to avoid flicker during page loads
        localStorage.setItem('user', JSON.stringify(user));
        
        // Before setting auth state, ensure we have a CSRF token ready for subsequent API calls
        console.log('[AuthContext] CSRF token fetch attempt 1');
        try {
          await apiClient.fetchCsrfToken();
          console.log('[AuthContext] CSRF token refreshed after login (attempt 1)');
        } catch (e) {
          console.warn('[AuthContext] Failed to fetch CSRF token on login (attempt 1), retrying...');
          try {
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 500));
            await apiClient.fetchCsrfToken();
            console.log('[AuthContext] CSRF token refreshed after login (attempt 2)');
          } catch (e2) {
            console.error('[AuthContext] Failed to fetch CSRF token on login (attempt 2):', e2);
            // Continue anyway, the apiClient will retry when needed
          }
        }
        
        // Update auth state with user data
        setState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
          registrationSuccess: false
        });
        
        // Show welcome notification
        dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, {
          title: 'Login Successful',
          message: `Welcome back, ${user.firstName}!`,
          type: 'success',
        });
        
        // Initialize socket only after successful authentication
        initializeSocketIfNeeded();
        
        // Set up session timeout check if enabled
        setupSessionTimeoutHandler();
        
        return true;
      } else {
        // Login failed with unexpected response format
        setState(prevState => ({ 
          ...prevState, 
          isLoading: false, 
          error: 'Login failed. Please try again.' 
        }));
        return false;
      }
    } catch (error: any) {
      // Handle API error
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      
      setState(prevState => ({ 
        ...prevState, 
        isLoading: false,
        error: errorMessage
      }));
      
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, {
        title: 'Login Failed',
        message: errorMessage,
        type: 'error'
      });
      
      return false;
    }
  };

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      // First, clear local notifications to prevent stale data on next login
      console.log('[AuthContext] Clearing notification storage on logout');
      
      // Import and use notification service to clear storage
      import('../services/notificationService').then(({ default: notificationService }) => {
        notificationService.clearLocalStorage();
      });
      
      // Disconnect socket
      import('../services/socketService').then(({ default: socketService }) => {
        socketService.disconnect();
      });
      
      // Call logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
    } finally {
      // Clean up resources
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
      
      socketInitializedRef.current = false;
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastLoginTimestamp');
      
      // Update state
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        registrationSuccess: false
      });
      
      // Redirect to login
      navigate('/login');
      
      // Fire logout event
      window.dispatchEvent(new CustomEvent('user:logout'));
    }
  }, [navigate]);

  // Add session timeout handler
  const setupSessionTimeoutHandler = () => {
    // Listen for visibility changes to detect when user returns to the tab
    document.addEventListener('visibilitychange', checkSessionStatus);
    
    // Check session status periodically (every 5 minutes)
    const intervalId = setInterval(checkSessionStatus, 5 * 60 * 1000);
    
    // Store the interval ID to clear it later
    return () => {
      document.removeEventListener('visibilitychange', checkSessionStatus);
      clearInterval(intervalId);
    };
  };
  
  // Check if the session is still valid
  const checkSessionStatus = async () => {
    // Only check if the document is visible and user is authenticated
    if (document.visibilityState === 'visible' && state.isAuthenticated) {
      try {
        // Validate the session
        await apiClient.get('/auth/validate');
      } catch (error) {
        // If validation fails, logout the user
        console.warn('[AuthContext] Session validation failed, logging out');
        logout();
      }
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<boolean> => {
    // Clear any existing errors and show loading state
    setState({ 
      ...state, 
      isLoading: true, 
      error: null,
      registrationSuccess: false
    });
    
    try {
      // Actual API call with correct API path without duplicate /api prefix
      const response = await apiClient.post('/auth/register', userData);
      console.log('[AuthContext] Register response:', response);
      
      // Check for successful registration
      const isSuccess = 
        (response?.status === 'success') || 
        (response?.data?.status === 'success') ||
        (response && !response.error);
      
      if (isSuccess) {
        // If registration is successful, set success state
        setState({
          ...state,
          isLoading: false,
          error: null,
          registrationSuccess: true
        });
        
        // Dispatch success notification event
        dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, { 
          message: 'Registration successful! Please log in.', 
          type: 'success', 
          duration: 5000 
        });
        
        return true; // Indicate success
      } else {
        throw new Error(response?.message || response?.data?.message || 'Registration failed');
      }
    } catch (error: any) {
      // Get the error message 
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred during registration';
      
      // Set the error in the state
      setState({
        ...state,
        isLoading: false,
        error: errorMessage,
        registrationSuccess: false
      });
      
      // Dispatch error notification event
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, { 
        message: errorMessage, 
        type: 'error', 
        duration: 5000 
      });
      
      return false; // Indicate failure
    }
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<void> => {
    setState({ ...state, isLoading: true, error: null });
    try {
      // Actual API call without duplicate /api prefix
      await apiClient.post('/auth/forgot-password', { email }); 
      // Dispatch success notification event
      dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, { message: 'Password reset email sent. Please check your inbox.', type: 'success', duration: 5000 });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset email.';
      setState({ ...state, isLoading: false, error: errorMessage });
      // Dispatch error notification event
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, { message: errorMessage, type: 'error', duration: 5000 });
      throw new Error(errorMessage);
    } finally {
      setState({ ...state, isLoading: false });
    }
  };

  // Update profile function
  const updateProfile = async (userData: ProfileUpdateData): Promise<void> => {
    if (!state.user) throw new Error('User not authenticated');
    setState({ ...state, isLoading: true, error: null });
    
    try {
      // Debug what's being sent to the API
      console.log('[AuthContext updateProfile] Sending update data to API:', JSON.stringify(userData));
      
      // Actual API call
      const updatedUserFromApi = await apiClient.updateUserProfile(state.user.id, userData);
      
      // Debug the response from the API
      console.log('[AuthContext updateProfile] Raw API response:', JSON.stringify(updatedUserFromApi));
      
      // --- MODIFIED: Merge API response with existing state ---
      // Create merged user data, but specifically preserve the timezone if it exists
      const mergedUser = { 
        ...state.user, 
        ...updatedUserFromApi,
        // Keep the existing timezone if it's set and not explicitly changed by the current update
        timezone: userData.timezone || state.user?.timezone || updatedUserFromApi.timezone || 'UTC'
      };
      
      // Store the updated user in state and localStorage
      const oldUser = { ...state.user }; // Capture old user state before updating
      setState({
        ...state,
        user: mergedUser, // Use the merged user object
        isLoading: false
      });
      localStorage.setItem('user', JSON.stringify(mergedUser)); // Save the merged user object
      console.log('Profile updated successfully, merged user data:', mergedUser);
      
      // --- Refactored Change Detection Logic ---
      const actualChangedFieldNames: string[] = [];
      const changedFieldsMetadata: Array<{field: string, oldValue: any, newValue: any}> = [];

      // Define default channel structure for notification settings comparison
      // Used for reference when comparing notification settings formats
      // const defaultChannels = { email: true, inApp: true, push: false };
      const allPossibleNotificationKeys = Object.keys(userData.notificationSettings || {});
      
      // Helper for consistent object comparison - kept for future use
      /* const normalizeAndSortObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        try {
          const normalized = JSON.parse(JSON.stringify(obj)); // Deep clone
          const sortObjectKeys = (object: any): any => {
            if (object === null || typeof object !== 'object') return object;
            if (Array.isArray(object)) return object.map(sortObjectKeys);
            const sorted: any = {};
            Object.keys(object).sort().forEach(key => { sorted[key] = sortObjectKeys(object[key]); });
            return sorted;
          };
          return sortObjectKeys(normalized);
        } catch (e) { 
          console.error("Error normalizing object:", e);
          return obj; // Return original on error
        }
      }; */

      const buildConsistentNotificationStructure = (settingsSource: any): any => {
        const consistentStructure: any = {};
        
        // Debug logging for notification settings format
        console.log('Building consistent structure from source:', JSON.stringify(settingsSource));
        
        // If source is undefined, return empty structure
        if (!settingsSource) return {};
        
        // Identify if we're dealing with flat (old) or nested (new) structure
        // We consider it flat if at least one key has a boolean value
        const isFlat = Object.values(settingsSource).some(value => typeof value === 'boolean');
        console.log('Source structure appears to be:', isFlat ? 'FLAT (old)' : 'NESTED (new)');
        
        allPossibleNotificationKeys.forEach(key => {
          const value = settingsSource ? settingsSource[key] : undefined;
          
          // For flat structure (old format with direct booleans)
          if (typeof value === 'boolean') {
            consistentStructure[key] = value;
          }
          // For nested structure (new format with {enabled, channels})
          else if (typeof value === 'object' && value !== null) {
            if (value.hasOwnProperty('enabled')) {
              // It's already in the new format - take the enabled property only for comparison
              consistentStructure[key] = value.enabled;
            } else if (value.hasOwnProperty('email') || value.hasOwnProperty('push') || value.hasOwnProperty('in_app')) {
              // It's in a different channel-based structure
              consistentStructure[key] = true; // Enabled if any channel exists
            } else {
              consistentStructure[key] = false; // Default to disabled if structure unknown
            }
          } else {
            // For missing keys
            consistentStructure[key] = false; // Default to disabled if missing
          }
        });
        
        console.log('Normalized to consistent structure:', JSON.stringify(consistentStructure));
        return consistentStructure;
      };

      // Iterate through the data submitted by the user
      Object.keys(userData).forEach(key => {
        if (key === 'avatarFile') return; // Skip avatar file

        const typedKey = key as keyof User;
        const newValue = userData[typedKey];
        const oldValue = oldUser?.[typedKey]; // Use the captured old user state
        let hasChanged = false;

        // Special handling for notification settings
        if (key === 'notificationSettings') {
          try {
            // Check if notification settings were actually included in form submission
            const notificationSettingsProvided = userData.hasOwnProperty('notificationSettings') && 
                                                Object.keys(userData.notificationSettings || {}).length > 0;
            
            // Only do comparison if notification settings were explicitly provided
            if (notificationSettingsProvided) {
              console.log('Notification settings were explicitly provided in form data');
              const consistentOld = buildConsistentNotificationStructure(oldValue || {});
              const consistentNew = buildConsistentNotificationStructure(newValue || {});
              
              console.log('Comparing notification settings:');
              console.log('Old (normalized):', JSON.stringify(consistentOld));
              console.log('New (normalized):', JSON.stringify(consistentNew));
              
              if (JSON.stringify(consistentOld) !== JSON.stringify(consistentNew)) {
                console.log('Notification settings changed - displaying notification');
                hasChanged = true;
              } else {
                console.log('Notification settings unchanged - NOT displaying notification');
              }
            } else {
              console.log('Notification settings were not included in form submission - ignoring');
              hasChanged = false;
            }
          } catch (error) {
            console.error('Error comparing notification settings:', error);
            hasChanged = false; // Don't assume changed on error - safer to assume unchanged
          }
        } else {
          // Simple comparison for other fields
          if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
            hasChanged = true;
          }
        }

        // If the field has actually changed, add its name and metadata
        if (hasChanged) {
          const formattedName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          actualChangedFieldNames.push(formattedName);
          changedFieldsMetadata.push({ field: key, oldValue: oldValue, newValue: newValue });
        }
      });
      // --- End Refactored Change Detection Logic ---
      
      // Create notification messages based on actual changes
      let uiMessage = 'Profile information updated successfully.';
      let backendMessage = 'Profile information updated successfully.'; // Default backend message
      let metadataChanges = {};
      
      if (actualChangedFieldNames.length === 1) {
        const change = changedFieldsMetadata[0];
        const fieldName = actualChangedFieldNames[0];
        
        // Special formatting for simple values
        if (typeof change.oldValue !== 'object' && typeof change.newValue !== 'object') {
             uiMessage = `${fieldName} updated.`; // Simplified message
             backendMessage = `${fieldName} updated from "${change.oldValue || '(not set)'}" to "${change.newValue || '(not set)'}"`;
        } else {
             uiMessage = `${fieldName} updated.`;
             backendMessage = `${fieldName} updated.`; // Keep backend message generic for complex types
        }

        metadataChanges = { field: change.field, oldValue: change.oldValue, newValue: change.newValue };

      } else if (actualChangedFieldNames.length > 1) {
        uiMessage = `Multiple profile fields updated: ${actualChangedFieldNames.join(', ')}`;
        backendMessage = uiMessage; // Use the same summary for backend
        metadataChanges = { fields: changedFieldsMetadata };
      }
      
      // Display toast notification 
      dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, {
        message: uiMessage,
        type: 'success',
        title: 'Success', 
        duration: 5000,
        isPersistent: true // Keep persistent flag
      });

      // Only create a backend notification if there were actual changes
      if (actualChangedFieldNames.length > 0) {
        // Use a slight delay to avoid interference with the UI notification
        setTimeout(async () => {
          try {
            // Create a backend notification that persists for profile updates
            const profileUpdateKey = `profile_update_${Date.now()}`;
            
            if (!localStorage.getItem(profileUpdateKey)) {
              // Store a flag to prevent duplicate notifications
              localStorage.setItem(profileUpdateKey, 'true');
              // Auto-expire after 1 minute
              setTimeout(() => localStorage.removeItem(profileUpdateKey), 60000);
              
              await notificationService.createBackendNotification(
                'Profile Updated',
                backendMessage,
                'profile_update',
                '/profile',
                metadataChanges
              );
              window.dispatchEvent(new CustomEvent('user:profile-updated'));
            }
          } catch (error) {
            console.error('Failed to create backend notification for profile update:', error);
          }
        }, 100);
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      setState({
        ...state,
        isLoading: false,
        error: error.message || 'Failed to update profile'
      });
      
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, {
        message: error.message || 'Failed to update profile',
        type: 'error'
      });
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
     if (!state.user) throw new Error('User not authenticated');
     setState({ ...state, isLoading: true, error: null });
     try {
       // Actual API call without duplicate /api prefix
       await apiClient.post('/auth/change-password', { oldPassword: currentPassword, newPassword });
       
       // Send success notification
       dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, { 
         message: 'Password changed successfully', 
         type: 'success', 
         title: 'Password Updated',
         duration: 5000 
       });
       
       // Create a persistent backend notification for the password change
       const passwordChangeKey = `password_change_notification_${Date.now().toString().substring(0, 8)}`;
       
       // Only create if we haven't already created one recently
       if (!localStorage.getItem(passwordChangeKey)) {
         // Set the flag (expires in 10 seconds)
         localStorage.setItem(passwordChangeKey, 'true');
         setTimeout(() => localStorage.removeItem(passwordChangeKey), 10000);
         
         // Record timestamp for the security notification
         const now = new Date();
         const formattedDate = now.toLocaleDateString();
         const formattedTime = now.toLocaleTimeString();
         
         // Store a security notification in the database
         notificationService.createBackendNotification(
           'Password Changed',
           `Your password was changed successfully on ${formattedDate} at ${formattedTime}.`,
           'success',
           '/profile',
           { event_type: 'security_update', action: 'password_change', timestamp: now.toISOString() }
         ).catch(err => console.error('Failed to create password change notification:', err));
       }
     } catch (error: any) {
       const errorMessage = error.message || 'Failed to change password.';
       setState({ ...state, isLoading: false, error: errorMessage });
       
       // Dispatch error notification event
       dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, { message: errorMessage, type: 'error', duration: 5000 });
       throw new Error(errorMessage); // Rethrow for form handling
     } finally {
       setState({ ...state, isLoading: false });
     }
   };

  // Clear error function
  const clearError = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null
    }));
  }, []);
  
  // Reset registration success flag
  const resetRegistrationSuccess = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      registrationSuccess: false
    }));
  }, []);

  // Refresh user data function
  const refreshUserData = useCallback(async (): Promise<void> => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true }));
      
      const response = await apiClient.get('/auth/validate');
      
      if (response && response.user) {
        const user = formatUserResponse(response.user);
        
        // Update cache
        localStorage.setItem('user', JSON.stringify(user));
        
        setState(prevState => ({
          ...prevState,
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null
        }));
      } else {
        setState(prevState => ({ ...prevState, isLoading: false }));
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing user data:', error);
      setState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []);

  // Value for the context provider, memoized to prevent unnecessary rerenders
  const authContextValue = React.useMemo(() => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    changePassword,
    refreshUserData,
    clearError,
    resetRegistrationSuccess,
    state
  }), [
    state.isAuthenticated, 
    state.user, 
    state.isLoading, 
    state.error, 
    login, 
    register, 
    logout, 
    resetPassword, 
    updateProfile, 
    changePassword, 
    refreshUserData, 
    clearError, 
    resetRegistrationSuccess
  ]);

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 