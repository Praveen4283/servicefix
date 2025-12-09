import { z } from 'zod';

/**
 * Email validation helper function
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validation pattern helpers
 */
export const ValidationPatterns = {
  email: () => z.string().email('Invalid email format'),
  password: () => z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  id: () => z.string().min(1, 'ID is required'),
};

/**
 * Helper to create request schema with body, params, query
 */
export const createRequestSchema = (schema: { body?: z.ZodTypeAny; params?: z.ZodTypeAny; query?: z.ZodTypeAny }) => {
  return z.object(schema);
};


/**
 * Common validation schemas
 */

// ID validation
export const idSchema = z.string().min(1, 'ID is required');
export const optionalIdSchema = z.string().optional();

// Email validation
export const emailSchema = z.string().email('Invalid email format');

// Password validation (minimum 8 characters, at least one letter and one number)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number');

/**
 * Ticket validation schemas
 */

// Create ticket schema
export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  description: z.string().min(1, 'Description is required'),
  requesterId: idSchema,
  priorityId: idSchema,
  assigneeId: optionalIdSchema,
  departmentId: optionalIdSchema,
  typeId: optionalIdSchema,
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

// Update ticket schema
export const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  assigneeId: optionalIdSchema,
  departmentId: optionalIdSchema,
  priorityId: optionalIdSchema,
  statusId: optionalIdSchema,
  typeId: optionalIdSchema,
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

// Add comment schema
export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  isInternal: z.boolean().optional(),
});

/**
 * Authentication validation schemas
 */

// Register schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  organizationId: idSchema,
  role: z.enum(['user', 'agent', 'admin']).optional(),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Settings validation schemas
 */

// Email settings schema
export const emailSettingsSchema = z.object({
  smtpServer: z.string().min(1, 'SMTP server is required'),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUsername: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().optional(), // Optional for updates
  emailFromName: z.string().min(1, 'From name is required'),
  emailReplyTo: emailSchema,
  enableEmailNotifications: z.boolean(),
});

// General settings schema
export const generalSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteUrl: z.string().url().optional(),
  supportEmail: emailSchema.optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
});

// AI settings schema
export const aiSettingsSchema = z.object({
  aiApiKey: z.string().optional(),
  aiModelName: z.string().optional(),
  aiProvider: z.enum(['gemini', 'openai', 'custom']).optional(),
});

/**
 * User validation schemas
 */

// Update user schema
export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: emailSchema.optional(),
  role: z.enum(['user', 'agent', 'admin']).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

/**
 * Knowledge Base validation schemas
 */

// Create article schema
export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  categoryId: idSchema,
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().max(500).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(300).optional(),
});

// Update article schema
export const updateArticleSchema = createArticleSchema.partial();

/**
 * Validation helper function
 */
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: z.ZodError } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

/**
 * Express middleware for validation
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    const result = validateSchema(schema, req.body);
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: result.errors?.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    req.validatedBody = result.data;
    next();
  };
};