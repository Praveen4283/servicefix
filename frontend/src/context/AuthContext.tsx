import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
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

  // Initialize the auth state
  useEffect(() => {
    const initializeAuth = async () => {
      // If we already have a cached user, update state immediately to avoid flicker
      const cachedUserJson = localStorage.getItem('user');
      if (cachedUserJson) {
        try {
          const cachedUser = JSON.parse(cachedUserJson);
          console.log('[AuthContext] Found cached user data:', cachedUser.id);
          
          // Update state with cached user data immediately
          setState(prevState => ({
            ...prevState,
            isAuthenticated: true,
            user: cachedUser,
            isLoading: false // Set to false to avoid loading spinner
          }));
        } catch (e) {
          console.error('[AuthContext] Error parsing cached user data:', e);
          localStorage.removeItem('user'); // Remove invalid JSON
        }
      }
      
      // Check if we're on a public route
      const isPublicRoute = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/cookies'].some(
        route => location.pathname === route || location.pathname.startsWith(route)
      );

      // Check for fresh login - if we have a recent login timestamp, consider it a fresh login
      const lastLoginTimestamp = localStorage.getItem('lastLoginTimestamp');
      const isFreshLogin = lastLoginTimestamp && 
        (Date.now() - parseInt(lastLoginTimestamp, 10)) < 5000; // Within last 5 seconds
      
      // Check if we're in a redirect cycle by examining location state
      const isRedirecting = location.state?.isRedirecting;
      
      // Log initialization details for debugging
      console.log('[AuthContext] Initializing auth state:', {
        path: location.pathname,
        isPublicRoute,
        isFreshLogin,
        isRedirecting
      });
      
      // If we're on a public route or currently redirecting, skip the validation 
      if (isPublicRoute || isRedirecting) {
        console.log('[AuthContext] On public route or redirecting, skipping auth validation');
        setState(prevState => ({ ...prevState, isLoading: false }));
        return;
      }
      
      // For protected routes, validate with server in background
      // without blocking the UI render
      if (!isRedirecting) {
        try {
          console.log('[AuthContext] Validating auth with server');
          const response = await apiClient.get<any>('/auth/validate');
          console.log('[AuthContext] Validate response:', response);
          
          if (response?.user) {
            console.log('[AuthContext] Server validation successful, updating state with server data');
            
            // Format user data to ensure consistent structure
            const formattedUser = formatUserResponse(response.user);
            
            // Store user data in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(formattedUser));
            
            setState(prevState => ({
              ...prevState,
              isAuthenticated: true,
              user: formattedUser,
              isLoading: false,
              error: null,
            }));
          } else {
            // Authentication failed, clean up and redirect
            console.log('[AuthContext] Server validation failed, cleaning up auth state');
            localStorage.removeItem('user');
            localStorage.removeItem('csrfToken');
            localStorage.removeItem('csrfTokenExpiry');
            localStorage.removeItem('lastLoginTimestamp');
            
            setState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              error: null,
              registrationSuccess: false
            });
          }
        } catch (error) {
          console.error('[AuthContext] Error during auth initialization:', error);
          
          // Don't clear user data immediately on network errors
          // This allows the app to work offline with cached data
          setState(prevState => ({
            ...prevState,
            isLoading: false
          }));
        }
      }
    };
    
    initializeAuth();
  }, [location.pathname, location.state]);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    // Clear any existing errors and show loading state
    setState({ 
      ...state, 
      isLoading: true, 
      error: null,
      registrationSuccess: false 
    });
    
    try {
      // Clear any existing tokens before login
      localStorage.removeItem('csrfToken');
      localStorage.removeItem('csrfTokenExpiry');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Actual API call with correct API path without duplicate /api prefix
      const response = await apiClient.post<any>('/auth/login', { email, password });
      
      // Detailed logging of the response
      console.log('[AuthContext] Login response:', response);
      
      // Extract user data from the response, handling different response structures
      let userData;
      
      if (response?.user) {
        // Direct user property in response
        userData = response.user;
      } else if (response?.data?.user) {
        // Nested user property in data
        userData = response.data.user;
      } else if (response?.data) {
        // Assume the data itself is the user object
        userData = response.data;
      } else {
        // Default case - use the entire response as user data
        userData = response;
      }
      
      if (!userData) {
        throw new Error('Invalid response format: No user data found');
      }
      
      // Store tokens from the response if available
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      // Format user data
      const formattedUser: User = {
        id: userData.id || '',
        email: userData.email || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        role: userData.role || 'customer',
        ...(userData.avatarUrl && { avatarUrl: userData.avatarUrl }),
        ...(userData.organizationId && { organizationId: userData.organizationId }),
        ...(userData.organization && { organization: userData.organization })
      };
      
      // After successful login, always fetch a fresh CSRF token for subsequent API calls
      // Using optimized retry logic
      let csrfFetchSuccessful = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      // Retry mechanism with shorter interval
      while (!csrfFetchSuccessful && attempts < maxAttempts) {
        try {
          console.log(`[AuthContext] CSRF token fetch attempt ${attempts + 1}`);
          
          // Shorter wait on first attempt, longer on subsequent retries
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          // Make a request to fetch the CSRF token
          await apiClient.get('/auth/csrf-token');
          console.log(`[AuthContext] CSRF token refreshed after login (attempt ${attempts + 1})`);
          csrfFetchSuccessful = true;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('[AuthContext] Failed to fetch CSRF token after multiple attempts:', error);
          }
        }
      }
      
      if (!csrfFetchSuccessful) {
        console.warn('[AuthContext] Failed to obtain CSRF token after multiple attempts. Some features may not work correctly.');
      }
      
      // Update auth state
      setState({
        ...state,
        isAuthenticated: true,
        user: formattedUser,
        isLoading: false,
        error: null
      });
      
      // Store user data in localStorage for persistence across refreshes
      localStorage.setItem('user', JSON.stringify(formattedUser));
      
      // Log authentication state for debugging
      console.log('[AuthContext] Authentication state updated:', {
        isAuthenticated: true,
        user: formattedUser ? { ...formattedUser, id: formattedUser.id } : null
      });

      // Add a timestamp to help identify fresh login during redirect
      localStorage.setItem('lastLoginTimestamp', Date.now().toString());

      // Show success notification
      dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, {
        message: `Welcome back, ${formattedUser.firstName}!`,
        type: 'success',
        title: 'Login Successful'
      });
      
      // Add event listener for session timeout
      setupSessionTimeoutHandler();
      
      return true;
    } catch (error: any) {
      // Handle login error
      console.error('[AuthContext] Login error:', error);
      
      // Extract error message
      const errorMessage = error.message || 'Login failed. Please try again.';
      
      // Update state with error
      setState({
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage
      });
      
      // Show error notification
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, {
        message: errorMessage,
        type: 'error',
        title: 'Login Error'
      });
      
      return false;
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

  /**
   * Logout the current user
   */
  const logout = useCallback(async () => {
    try {
      // Clear any notification interval
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }

      // Call logout endpoint
      await apiClient.post('/auth/logout', {});
      
      // Clear authentication state and local storage
      localStorage.removeItem('user');
      localStorage.removeItem('lastLoginTimestamp');
      localStorage.removeItem('csrfToken');
      localStorage.removeItem('csrfTokenExpiry');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Clear auth state
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        registrationSuccess: false
      });
      
      // Navigate to login
      navigate('/login');
      
      // Show notification
      dispatchNotificationEvent(NotificationEventType.GENERAL, {
        message: 'You have been logged out',
        type: 'info',
        title: 'Logged Out'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if the server request fails, we still want to clear client-side state
      localStorage.removeItem('user');
      localStorage.removeItem('lastLoginTimestamp');
      localStorage.removeItem('csrfToken');
      localStorage.removeItem('csrfTokenExpiry');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        registrationSuccess: false
      });
      
      navigate('/login');
    }
  }, [navigate]);

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
    if (!state.user) throw new Error('User not authenticated');
    setState({ ...state, isLoading: true, error: null });
    
    try {
      console.log('[AuthContext] Refreshing user data for user ID:', state.user.id);
      // Actual API call
      const updatedUserFromApi = await apiClient.getUser(state.user.id);
      
      console.log('[AuthContext] Refreshed user data from API:', JSON.stringify(updatedUserFromApi));
      
      // Update the state with the latest user data
      setState({
        ...state,
        user: updatedUserFromApi,
        isLoading: false
      });
      
      // Also update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUserFromApi));
      console.log('[AuthContext] User data refreshed and stored successfully');
      
      // Dispatch event to notify components about the user data refresh
      window.dispatchEvent(new CustomEvent('user:profile-updated'));
    } catch (error) {
      console.error('[AuthContext] Error refreshing user data:', error);
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh user data'
      });
      throw error;
    }
  }, [state]);

  // Listen for forced logout (token expiration)
  useEffect(() => {
    const handleForceLogout = () => {
      console.log('Force logout triggered');
      // Perform logout, but with a specific "session expired" message
      logout();
      // No need to notify here, as the NotificationContext already does this
    };
    
    // Listen for session refresh events from the API client
    const handleSessionRefreshed = () => {
      console.log('[AuthContext] Session was refreshed by API client');
      refreshUserData().catch(err => {
        console.error('[AuthContext] Failed to refresh user data after token refresh:', err);
      });
    };
    
    window.addEventListener('user:force-logout', handleForceLogout);
    window.addEventListener('auth:session-refreshed', handleSessionRefreshed);
    
    return () => {
      window.removeEventListener('user:force-logout', handleForceLogout);
      window.removeEventListener('auth:session-refreshed', handleSessionRefreshed);
    };
  }, [logout, refreshUserData]); // Make sure logout and refreshUserData are in dependency array

  // Provide auth context
  const contextValue: AuthContextType = {
    isAuthenticated: !!state.user,
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
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 