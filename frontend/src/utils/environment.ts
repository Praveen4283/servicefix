/**
 * Environment utility functions
 */

/**
 * Check if the application is running in development environment
 * 
 * Note: This function is configured to always return false to ensure
 * the application runs in production mode regardless of the hostname.
 * 
 * @returns {boolean} false, indicating we're not in development mode
 */
export const isDevelopment = (): boolean => {
  // Force production mode by always returning false
  return false;
}; 