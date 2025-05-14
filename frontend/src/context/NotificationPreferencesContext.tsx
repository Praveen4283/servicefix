import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import notificationPreferencesService, { 
  NotificationPreference, 
  NotificationEventType,
  getDefaultPreferences
} from '../services/notificationPreferencesService';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

// Context interface
interface NotificationPreferencesContextValue {
  preferences: NotificationPreference[];
  loading: boolean;
  error: string | null;
  updatePreference: (preference: NotificationPreference) => Promise<void>;
  updatePreferences: (preferences: NotificationPreference[]) => Promise<void>;
  loadPreferences: () => Promise<void>;
  isChannelEnabled: (eventType: NotificationEventType, channel: 'email' | 'push' | 'inApp') => boolean;
}

// Create context
const NotificationPreferencesContext = createContext<NotificationPreferencesContextValue | undefined>(undefined);

// Provider props interface
interface NotificationPreferencesProviderProps {
  children: ReactNode;
}

export const NotificationPreferencesProvider: React.FC<NotificationPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(getDefaultPreferences());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();

  // Load preferences on mount and when authentication state changes
  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userPreferences = await notificationPreferencesService.getUserPreferences();
      setPreferences(userPreferences);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load notification preferences';
      setError(errorMessage);
      console.error('Error loading notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initialize preferences on mount and when authentication state changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Update a single preference
  const updatePreference = useCallback(async (preference: NotificationPreference) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedPreference = await notificationPreferencesService.updatePreference(preference);
      
      // Update state with the new preference
      setPreferences(prev => prev.map(p => 
        p.eventType === updatedPreference.eventType ? updatedPreference : p
      ));
      
      addNotification('Notification preference updated', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update notification preference';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      console.error('Error updating notification preference:', err);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Update multiple preferences
  const updatePreferences = useCallback(async (newPreferences: NotificationPreference[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedPreferences = await notificationPreferencesService.updatePreferences(newPreferences);
      setPreferences(updatedPreferences);
      addNotification('Notification preferences updated', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update notification preferences';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      console.error('Error updating notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Check if a notification channel is enabled for a specific event type
  const isChannelEnabled = useCallback((
    eventType: NotificationEventType, 
    channel: 'email' | 'push' | 'inApp'
  ): boolean => {
    const preference = preferences.find(p => p.eventType === eventType);
    
    if (!preference) return true; // Default to enabled if preference not found
    
    switch (channel) {
      case 'email':
        // Use emailEnabled if defined, otherwise fall back to email property if defined, otherwise default to true
        return preference.emailEnabled !== undefined ? preference.emailEnabled : 
               preference.email !== undefined ? preference.email : true;
      case 'push':
        // Use pushEnabled if defined, otherwise fall back to push property if defined, otherwise default to true
        return preference.pushEnabled !== undefined ? preference.pushEnabled : 
               preference.push !== undefined ? preference.push : true;
      case 'inApp':
        // Use inAppEnabled if defined, otherwise fall back to in_app property if defined, otherwise default to true
        return preference.inAppEnabled !== undefined ? preference.inAppEnabled : 
               preference.in_app !== undefined ? preference.in_app : true;
      default:
        return true;
    }
  }, [preferences]);

  const contextValue: NotificationPreferencesContextValue = {
    preferences,
    loading,
    error,
    updatePreference,
    updatePreferences,
    loadPreferences,
    isChannelEnabled
  };

  return (
    <NotificationPreferencesContext.Provider value={contextValue}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
};

// Custom hook to use notification preferences context
export const useNotificationPreferences = (): NotificationPreferencesContextValue => {
  const context = useContext(NotificationPreferencesContext);
  if (context === undefined) {
    throw new Error('useNotificationPreferences must be used within a NotificationPreferencesProvider');
  }
  return context;
}; 