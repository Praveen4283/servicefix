import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';

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
  createdAt?: string;
  updatedAt?: string;
  notificationSettings?: Record<string, { email: boolean; push: boolean; in_app: boolean }>;
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

// Auth context interface
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userData: ProfileUpdateData) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  resetRegistrationSuccess: () => void;
}

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
  AUTH_ERROR = 'auth:error'
}

export interface NotificationEventDetail {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
}

// Helper to dispatch notification events
const dispatchNotificationEvent = (type: NotificationEventType, detail: NotificationEventDetail) => {
  window.dispatchEvent(new CustomEvent<NotificationEventDetail>(type, { detail }));
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  // Initialize the auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setState({
            ...initialState,
            isLoading: false
          });
          return;
        }
        
        const userData = localStorage.getItem('user');
        if (!userData) {
          // Token exists but no user data - clear localStorage and reset state
          localStorage.removeItem('authToken');
          setState({
            ...initialState,
            isLoading: false
          });
          return;
        }
        
        // Parse user data
        try {
          const user = JSON.parse(userData);
          setState({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
            registrationSuccess: false
          });
        } catch (error) {
          // Malformed user data - clear localStorage and reset state
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setState({
            ...initialState,
            isLoading: false,
            error: 'Failed to parse user data'
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState({
          ...initialState,
          isLoading: false,
          error: 'Failed to initialize authentication'
        });
      }
    };
    
    initializeAuth();
  }, []);

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
      // Always use the real API call, never mock data
      const useLocalMockData = false;
      
      // Actual API call
      const response = await apiClient.post<any>('/auth/login', { email, password });
      
      const { token, user: userDataFromApi, refreshToken } = response;
      
      // Use the correctly destructured user object
      const finalUserData = { ...userDataFromApi };
      
      // Add last login time if not provided by backend
      if (!finalUserData.lastLogin) {
        finalUserData.lastLogin = new Date().toISOString();
      }
      
      // Save token to localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);

      localStorage.setItem('user', JSON.stringify(finalUserData)); // Save the final user data
      
      // Update auth state
      setState({
        isAuthenticated: true,
        user: finalUserData, // Set the final user data into state
        isLoading: false,
        error: null,
        registrationSuccess: false
      });

      // Dispatch a custom event to notify components to refresh data (like notifications)
      window.dispatchEvent(new CustomEvent('user:login-success'));

      // Restore Frontend-only notification dispatch for immediate toast feedback
      dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, {
        message: `Welcome back, ${finalUserData.firstName}!`, 
        type: 'success',
        duration: 5000,
        title: 'Login Successful'
      });

      // Keep Backend approach for persistence
      try {
        await notificationService.createBackendNotification(
          'Login Successful',
          `Welcome back, ${finalUserData.firstName}! You logged in at ${new Date().toLocaleString()}`,
          'success',
          '/dashboard'
        );
      } catch (error) {
        console.error('Failed to create backend welcome notification:', error);
      }
      
      return true; // Indicate success
    } catch (error: any) {
      // Get the error message
      const errorMessage = error.response?.data?.message || 'An error occurred during login';
      
      // Set the error in the state
      setState({
        ...state,
        isLoading: false,
        error: errorMessage,
        registrationSuccess: false
      });
      return false; // Indicate failure
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
      // Always use the real API call, never mock data
      const useLocalMockData = false;
      
      // Make the API call to register the user
      const response = await apiClient.post('/auth/register', userData);
      
      // If registration is successful, set success state
      setState({
        ...state,
        isLoading: false,
        error: null,
        registrationSuccess: true
      });
      
      // Dispatch success notification event
      dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, { message: 'Registration successful! Please log in.', type: 'success', duration: 5000 });
      
      return true; // Indicate success
    } catch (error: any) {
      // Get the error message 
      const errorMessage = error.response?.data?.message || 'An error occurred during registration';
      
      // Set the error in the state
      setState({
        ...state,
        isLoading: false,
        error: errorMessage,
        registrationSuccess: false
      });
      
      // Dispatch error notification event
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, { message: errorMessage, type: 'error', duration: 5000 });
      
      return false; // Indicate failure
    }
  };

  // Logout function
  const logout = () => {
    try {
      // Placeholder: Call backend logout endpoint
      // await apiClient.post('/auth/logout'); 
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      registrationSuccess: false
    });
    // Optional: Redirect after logout (handled by ProtectedRoute logic)
    // navigate('/login');
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<void> => {
    setState({ ...state, isLoading: true, error: null });
    try {
      // Placeholder: Call backend forgot password endpoint
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
    if (!state.user) return;
    
    // Ensure we have a valid user ID
    if (!state.user.id) {
      const errorMessage = "Cannot update profile: User ID is missing";
      console.error(errorMessage);
      setState({
        ...state,
        error: errorMessage,
      });
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, { message: errorMessage, type: 'error', duration: 5000 });
      throw new Error(errorMessage);
    }
    
    setState({ ...state, isLoading: true, error: null });
    
    try {
      // Use specialized updateUserProfile method that handles data transformation
      const updatedUser = await apiClient.updateUserProfile(state.user.id, userData);
      
      console.log('Profile updated successfully, new user data:', updatedUser);
      
      // Update local storage with the new user data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state with the NEW user data, not spreading the old state.user
      setState({
        ...state,
        user: updatedUser,
        isLoading: false,
      });

      // --- Generate Dynamic Notification Message START ---
      const keyToReadableName: Record<string, string> = {
        firstName: 'First name',
        lastName: 'Last name',
        phoneNumber: 'Phone number',
        designation: 'Designation',
        timezone: 'Timezone',
        language: 'Language',
        // Add other mappable fields here if necessary
      };

      const hasAvatarChange = !!userData.avatarFile;
      // Identify changed fields EXCLUDING avatarFile
      const changedFieldKeys = Object.keys(userData).filter(key => key !== 'avatarFile' && keyToReadableName[key]);
      const readableNames = changedFieldKeys.map(key => keyToReadableName[key]);

      let dynamicMessage = 'Profile updated successfully'; // Default

      if (hasAvatarChange && readableNames.length === 0) {
        dynamicMessage = 'Avatar updated successfully.';
      } else if (!hasAvatarChange && readableNames.length === 1) {
        dynamicMessage = `${readableNames[0]} updated successfully.`;
      } else if (hasAvatarChange && readableNames.length === 1) {
        dynamicMessage = `Avatar and ${readableNames[0]} updated successfully.`;
      } else if (hasAvatarChange && readableNames.length > 1) {
        dynamicMessage = 'Avatar and profile information updated successfully.';
      } else if (!hasAvatarChange && readableNames.length > 1) {
        dynamicMessage = 'Profile information updated successfully.';
      }
      // --- Generate Dynamic Notification Message END ---

      // Restore frontend success notification for immediate toast feedback
      dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, {
        message: dynamicMessage, // Use dynamic message
        type: 'success',
        duration: 5000
      });

      // Also save a persistent notification to the backend
      try {
        await notificationService.createBackendNotification(
          'Profile Updated',
          dynamicMessage, // Use dynamic message
          'success',
          '/profile' // Optional link to the profile page
        );
      } catch (error) {
        console.error('Failed to create backend profile update notification:', error);
        // Non-critical, don't fail the whole update if this fails
      }
      
    } catch (error: any) {
      // Get error message
      const errorMessage = error.message || 'Failed to update profile. Please try again.';
      console.error('Profile update error:', error);
      
      // Handle update profile error
      setState({
        ...state,
        isLoading: false,
        error: errorMessage, // This might be overridden by the form hook
      });
      
      // Dispatch error notification event
      dispatchNotificationEvent(NotificationEventType.AUTH_ERROR, { message: errorMessage, type: 'error', duration: 5000 });
      
      // Throw error for form handling
      throw new Error(errorMessage);
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
     if (!state.user) throw new Error('User not authenticated');
     setState({ ...state, isLoading: true, error: null });
     try {
       // Send 'oldPassword' instead of 'currentPassword' to match backend
       await apiClient.post('/auth/change-password', { oldPassword: currentPassword, newPassword }); 
       
       // Send success notification
       dispatchNotificationEvent(NotificationEventType.AUTH_SUCCESS, { 
         message: 'Password changed successfully', 
         type: 'success', 
         duration: 5000 
       });
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

  // Listener for forced logout (token expiration)
  useEffect(() => {
    const handleForceLogout = () => {
      console.log('Force logout triggered');
      // Perform logout, but with a specific "session expired" message
      logout();
      // No need to notify here, as the NotificationContext already does this
    };
    
    window.addEventListener('user:force-logout', handleForceLogout);
    
    return () => {
      window.removeEventListener('user:force-logout', handleForceLogout);
    };
  }, [logout]); // Make sure logout is in dependency array

  // Provide auth context
  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    changePassword,
    clearError,
    resetRegistrationSuccess
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