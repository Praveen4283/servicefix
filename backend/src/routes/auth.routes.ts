import express from 'express';
import { body } from 'express-validator';
import { login, register, forgotPassword, resetPassword, refreshToken, logout, changePassword } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate-request.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Register a new user
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    validateRequest,
  ],
  register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
  ],
  login
);

// Refresh token
router.post('/refresh-token', refreshToken);

// Logout
router.post('/logout', logout);

// Forgot password
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    validateRequest,
  ],
  forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),
    validateRequest,
  ],
  resetPassword
);

// Change password (requires authentication)
router.post(
  '/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('New password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),
    validateRequest,
  ],
  changePassword
);

export default router; 