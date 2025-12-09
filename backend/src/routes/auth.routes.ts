import express from 'express';
import { z } from 'zod';
import { login, register, forgotPassword, resetPassword, refreshToken, logout, changePassword, validate, getCsrfToken, getActiveSessions } from '../controllers/auth.controller';
import { validateZod } from '../middleware/zod-validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { ValidationPatterns, createRequestSchema } from '../utils/validation';

const router = express.Router();

// Zod schemas for validations
const registerSchema = createRequestSchema({
  body: z.object({
    email: ValidationPatterns.email(),
    password: ValidationPatterns.password(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  }),
});

const loginSchema = createRequestSchema({
  body: z.object({
    email: ValidationPatterns.email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = createRequestSchema({
  body: z.object({
    email: ValidationPatterns.email(),
  }),
});

const resetPasswordSchema = createRequestSchema({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: ValidationPatterns.password(),
  }),
});

const changePasswordSchema = createRequestSchema({
  body: z.object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: ValidationPatterns.password(),
  }),
});

// Register a new user
router.post(
  '/register',
  validateZod(registerSchema),
  register
);

// Login
router.post(
  '/login',
  validateZod(loginSchema),
  login
);

// Refresh token
router.post('/refresh-token', refreshToken);

// Logout
router.post('/logout', logout);

// Forgot password
router.post(
  '/forgot-password',
  validateZod(forgotPasswordSchema),
  forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  validateZod(resetPasswordSchema),
  resetPassword
);

// Change password (requires authentication)
router.post(
  '/change-password',
  authenticate,
  validateZod(changePasswordSchema),
  changePassword
);

// Get CSRF token
router.get('/csrf-token', getCsrfToken);

// Validate authentication status
router.get('/validate', authenticate, validate);

// Get active sessions (requires authentication)
router.get('/sessions', authenticate, getActiveSessions);

export default router; 