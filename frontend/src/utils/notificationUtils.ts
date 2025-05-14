import { notificationManager } from '../services/notificationManager';

/**
 * Show a success notification.
 * @param message The message to display
 * @param options Optional configuration options
 */
export const showSuccess = (message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) => {
  notificationManager.showSuccess(message, options);
};

/**
 * Show an error notification.
 * @param message The message to display
 * @param options Optional configuration options
 */
export const showError = (message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) => {
  notificationManager.showError(message, options);
};

/**
 * Show a warning notification.
 * @param message The message to display
 * @param options Optional configuration options
 */
export const showWarning = (message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) => {
  notificationManager.showWarning(message, options);
};

/**
 * Show an info notification.
 * @param message The message to display
 * @param options Optional configuration options
 */
export const showInfo = (message: string, options?: { title?: string; duration?: number; isPersistent?: boolean }) => {
  notificationManager.showInfo(message, options);
};

/**
 * Utility function to replace JavaScript's alert()
 * @param message The message to display
 */
export const showAlert = (message: string) => {
  notificationManager.showInfo(message, { duration: 8000 });
}; 