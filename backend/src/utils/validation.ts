/**
 * Utility functions for input validation
 */

/**
 * Validates if a string is a valid email format
 * @param email Email address to validate
 * @returns Boolean indicating if the email format is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * @param password Password to validate
 * @returns Object with valid flag and reason if invalid
 */
export const validatePassword = (password: string): { valid: boolean, reason?: string } => {
  if (!password) {
    return { valid: false, reason: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  
  // Additional strength checks could be added here
  // Example: require uppercase, lowercase, numbers, special chars
  
  return { valid: true };
};

/**
 * Validates if a user input is safe (no HTML or script injection)
 * @param input User input string
 * @returns Sanitized input string
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';
  
  // Replace dangerous HTML characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}; 