import { notificationManager } from '../services/notificationManager';

/**
 * Shows a success notification
 * @param message The message to display
 * @param options Additional options
 */
export const showSuccess = (
  message: string, 
  options?: { 
    title?: string; 
    duration?: number; 
    isPersistent?: boolean 
  }
) => {
  notificationManager.showSuccess(message, {
    ...options,
    isPersistent: options?.isPersistent || false
  });
};

/**
 * Shows an error notification
 * @param message The message to display
 * @param options Additional options
 */
export const showError = (
  message: string, 
  options?: { 
    title?: string; 
    duration?: number; 
    isPersistent?: boolean 
  }
) => {
  notificationManager.showError(message, {
    ...options,
    // Error notifications should stay longer by default
    duration: options?.duration || 8000,
    isPersistent: options?.isPersistent || false
  });
};

/**
 * Shows a warning notification
 * @param message The message to display
 * @param options Additional options
 */
export const showWarning = (
  message: string, 
  options?: { 
    title?: string; 
    duration?: number; 
    isPersistent?: boolean 
  }
) => {
  notificationManager.showWarning(message, {
    ...options,
    isPersistent: options?.isPersistent || false
  });
};

/**
 * Shows an info notification
 * @param message The message to display
 * @param options Additional options
 */
export const showInfo = (
  message: string, 
  options?: { 
    title?: string; 
    duration?: number; 
    isPersistent?: boolean 
  }
) => {
  notificationManager.showInfo(message, {
    ...options,
    isPersistent: options?.isPersistent || false
  });
};

/**
 * Shows a direct notification with full control
 * @param options All notification options
 */
export const showNotification = (
  options: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    duration?: number;
    isPersistent?: boolean;
    category?: 'app' | 'system';
  }
) => {
  notificationManager.showDirectNotification(options);
};

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showNotification
}; 