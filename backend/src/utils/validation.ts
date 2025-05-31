/**
 * Utility functions for input validation
 */

import { z } from 'zod';

/**
 * Common Zod validation patterns for reuse across the application
 */
export const ValidationPatterns = {
  // Common ID pattern - positive integer
  id: () => z.number().int().positive('ID must be a positive integer'),
  
  // Common string ID param from URL params (gets converted to number)
  idParam: () => z.string()
    .regex(/^\d+$/, 'Invalid ID format')
    .transform(Number),
  
  // Email validation
  email: () => z.string().email('Enter a valid email'),
  
  // Password validation with regex for complexity
  password: () => z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/,
      'Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'
    ),
  
  // Date validation
  isoDate: () => z.string().datetime('Invalid date format'),
  
  // Common pagination params
  pagination: () => z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer')
      .transform(Number)
      .refine(val => val >= 1, 'Page must be a positive integer')
      .optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
      .optional(),
  }),
  
  // Tags array validation
  tagsArray: () => z.preprocess(
    (val) => typeof val === 'string' ? JSON.parse(val) : val,
    z.array(z.string().trim().min(1, 'Tag names cannot be empty')).optional().nullable()
  ),
};

/**
 * Helper to create request validation schema with proper types
 */
export const createRequestSchema = <T extends z.ZodRawShape>({
  body,
  query,
  params,
}: {
  body?: z.ZodObject<T>;
  query?: z.ZodObject<T>;
  params?: z.ZodObject<T>;
} = {}) => {
  const schema: Record<string, z.ZodTypeAny> = {};
  
  if (body) schema.body = body;
  if (query) schema.query = query;
  if (params) schema.params = params;
  
  return z.object(schema);
};

export default ValidationPatterns;

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