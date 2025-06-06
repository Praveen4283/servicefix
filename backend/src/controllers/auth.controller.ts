import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { pool, query } from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { isValidEmail } from '../utils/validation';
import authService from '../services/auth.service';
import { camelToSnake, snakeToCamel } from '../utils/modelConverters';
import { v4 as uuidv4 } from 'uuid';

// Secret key for JWT - Ensure environment variables are set
if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is not set. Application will exit for security reasons.');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  logger.error('JWT_REFRESH_SECRET environment variable is not set. Application will exit for security reasons.');
  process.exit(1);
}

// Type definitions for consistent data structure
interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName?: string;
  organizationDomain?: string;
}

// Database format for registration data (snake_case)
interface DbUserRegistrationData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  organization_name?: string;
  organization_domain?: string;
}

interface UserResponseData {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string | number | null;
  avatarUrl?: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Log that we're using the environment variables
logger.info('[Auth Signing] Using JWT secrets from environment variables.');

// Extend the Express Request type to include csrfToken method
interface RequestWithCsrf extends Request {
  csrfToken(): string;
}

/**
 * Generate JWT token
 */
const generateToken = (userId: string, role: string): string => {
  const options = { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions;
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    options
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId: string): string => {
  const options = { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions;
  return jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    options
  );
};

/**
 * Add default ticket statuses and priorities for a new organization
 */
const addDefaultsForOrganization = async (organizationId: string) => {
  try {
    // Default statuses
    const statuses = [
      { name: 'New', color: '#2196f3', is_default: true, is_resolved: false },
      { name: 'Open', color: '#00bcd4', is_default: false, is_resolved: false },
      { name: 'In Progress', color: '#ff9800', is_default: false, is_resolved: false },
      { name: 'Pending', color: '#9c27b0', is_default: false, is_resolved: false },
      { name: 'Resolved', color: '#4caf50', is_default: false, is_resolved: true },
      { name: 'Closed', color: '#9e9e9e', is_default: false, is_resolved: true }
    ];

    for (const status of statuses) {
      await pool.query(
        `INSERT INTO ticket_statuses (name, color, is_default, is_resolved, organization_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name, organization_id) DO NOTHING`,
        [status.name, status.color, status.is_default, status.is_resolved, organizationId]
      );
    }

    // Default priorities
    const priorities = [
      { name: 'Low', color: '#4caf50', sla_hours: 48 },
      { name: 'Medium', color: '#2196f3', sla_hours: 24 },
      { name: 'High', color: '#ff9800', sla_hours: 8 },
      { name: 'Urgent', color: '#f44336', sla_hours: 4 }
    ];

    for (const priority of priorities) {
      await pool.query(
        `INSERT INTO ticket_priorities (name, color, sla_hours, organization_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name, organization_id) DO NOTHING`,
        [priority.name, priority.color, priority.sla_hours, organizationId]
      );
    }

    logger.info(`Added default statuses and priorities for organization ${organizationId}`);
  } catch (error: any) {
    logger.error(`Failed to add defaults for organization ${organizationId}: ${error.message}`);
    // Don't throw - this shouldn't stop the registration process
  }
};

/**
 * Register user
 */
export const register = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get the registration data from the request body
  const registrationData: UserRegistrationData = req.body;
  
  // Convert camelCase input to snake_case for database
  const dbData = camelToSnake<DbUserRegistrationData>(registrationData);
  
  // Validate fields
  if (!dbData.email || !dbData.password || !dbData.first_name || !dbData.last_name) {
    throw AppError.badRequest('Please provide all required fields', 'MISSING_FIELDS');
  }

  if (!isValidEmail(dbData.email)) {
    throw AppError.badRequest('Please provide a valid email address', 'INVALID_EMAIL');
  }

  // Check if email already exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [dbData.email]);
  if (existingUser.rows.length > 0) {
    throw AppError.conflict('User with this email already exists', 'EMAIL_EXISTS');
  }

  // Create organization if name provided
  let organizationId: number | null = null;
  if (dbData.organization_name) {
    const orgResult = await query(
      'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING id',
      [dbData.organization_name, dbData.organization_domain || '']
    );
    organizationId = orgResult.rows[0].id;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(dbData.password, salt);

  // Create user
  const userResult = await query(
    `INSERT INTO users (
      first_name, 
      last_name, 
      email, 
      password, 
      role, 
      organization_id
    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, organization_id`,
    [
      dbData.first_name,
      dbData.last_name,
      dbData.email,
      hashedPassword,
      organizationId ? 'admin' : 'customer', // Make the creator an admin if org is created
      organizationId
    ]
  );
    
  const dbUser = userResult.rows[0];

  // Generate tokens
  const token = authService.generateToken(dbUser.id, dbUser.role);
  const refreshToken = authService.generateRefreshToken(dbUser.id);

  // Calculate refresh token expiry date
  const refreshExpiresIn = parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  const expiresAt = new Date(Date.now() + refreshExpiresIn);
    
  // Save refresh token to database
  await authService.saveRefreshToken(dbUser.id, refreshToken, expiresAt);

  // Convert snake_case database result to camelCase for the response
  const user = snakeToCamel<UserResponseData>(dbUser);

  // Set access token as HttpOnly cookie with proper settings
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // Determine cookie domain based on environment
  let cookieDomain;
  if (isProduction && !frontendUrl.includes('localhost')) {
    try {
      // Extract domain from frontend URL, but handle malformed URLs gracefully
      const url = new URL(frontendUrl);
      const domainParts = url.hostname.split('.');
      if (domainParts.length >= 2) {
        cookieDomain = '.' + domainParts.slice(-2).join('.');
      }
    } catch (error) {
      logger.warn(`Error parsing frontend URL: ${frontendUrl}`, error);
    }
  }
  
  // Use SameSite=None for cross-site requests in production
  const sameSite = isProduction ? 'none' : 'lax';
  
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: isProduction || frontendUrl.startsWith('https'),
    sameSite: sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
  });
  
  // Set refresh token as HttpOnly cookie with the same settings
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction || frontendUrl.startsWith('https'),
    sameSite: sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  // Return user data and tokens
  res.status(201).json({
    token,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    user,
    message: 'Registration successful'
  });
});

/**
 * User login
 */
export const login = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return next(AppError.badRequest('Email and password are required'));
    }

    // Find user by email
    const userResult = await query(
      'SELECT id, email, first_name, last_name, password, role, avatar_url, organization_id, designation FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return next(AppError.unauthorized('Invalid email or password'));
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return next(AppError.unauthorized('Invalid email or password'));
    }

    // Generate JWT token
    const token = authService.generateToken(user.id, user.role);
    
    // Generate refresh token
    const refreshToken = authService.generateRefreshToken(user.id);
    
    // Set expiration date for refresh token
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days
    
    // Store refresh token in database
    await authService.saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);
    
    // Update last login time
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Get organization details if applicable
    let organizationData = null;
    if (user.organization_id) {
      const orgResult = await query(
        'SELECT id, name, domain FROM organizations WHERE id = $1',
        [user.organization_id]
      );
      
      if (orgResult.rows.length > 0) {
        organizationData = orgResult.rows[0];
      }
    }

    // Prepare user data for response
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      organizationId: user.organization_id,
      organization: organizationData,
      designation: user.designation
    };
    
    // Set access token as HttpOnly cookie with proper settings
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Determine cookie domain based on environment
    let cookieDomain;
    if (isProduction && !frontendUrl.includes('localhost')) {
      try {
        // Extract domain from frontend URL, but handle malformed URLs gracefully
        const url = new URL(frontendUrl);
        const domainParts = url.hostname.split('.');
        if (domainParts.length >= 2) {
          cookieDomain = '.' + domainParts.slice(-2).join('.');
        }
      } catch (error) {
        logger.warn(`Error parsing frontend URL: ${frontendUrl}`, error);
      }
    }
    
    // Use SameSite=None for cross-site requests in production
    const sameSite = isProduction ? 'none' : 'lax';
    
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: sameSite,
      path: '/',
      domain: cookieDomain,
      maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
    });
    
    // Set refresh token as HttpOnly cookie with the same settings
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: sameSite,
      path: '/',
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Return user data and tokens
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      user: userData,
      token, // Include token in the response for header-based auth
      refreshToken, // Include refresh token in the response
      success: true
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get refresh token from cookie first, then from request body
    let refreshToken = req.cookies.refreshToken;
    
    // If no cookie token, check the request body
    if (!refreshToken && req.body && req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    }
    
    if (!refreshToken) {
      return next(AppError.unauthorized('Refresh token is required', 'REFRESH_TOKEN_REQUIRED'));
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = authService.verifyRefreshToken(refreshToken);
    } catch (error) {
      return next(AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN'));
    }

    // Check if the refresh token exists in the database
    const tokenCheckResult = await query(
      'SELECT id, user_id, expires_at, is_revoked FROM user_tokens WHERE refresh_token = $1',
      [refreshToken]
    );

    if (tokenCheckResult.rows.length === 0) {
      return next(AppError.unauthorized('Refresh token not found', 'TOKEN_NOT_FOUND'));
    }

    const tokenRecord = tokenCheckResult.rows[0];

    // Check if token is revoked
    if (tokenRecord.is_revoked) {
      return next(AppError.unauthorized('Refresh token has been revoked', 'TOKEN_REVOKED'));
    }

    // Check if token is expired
    const now = new Date();
    if (new Date(tokenRecord.expires_at) < now) {
      return next(AppError.unauthorized('Refresh token has expired', 'TOKEN_EXPIRED'));
    }

    // Get user details
    const userResult = await query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, 
        u.avatar_url, u.phone, u.timezone, u.language, 
        u.organization_id, u.designation,
        o.name as organization_name
      FROM users u 
      LEFT JOIN organizations o ON u.organization_id = o.id 
      WHERE u.id = $1`,
      [tokenRecord.user_id]
    );

    if (userResult.rows.length === 0) {
      return next(AppError.notFound('User not found'));
    }

    const user = userResult.rows[0];

    // Generate a new access token
    const newToken = authService.generateToken(user.id, user.role);
    
    // Generate a new refresh token
    const newRefreshToken = authService.generateRefreshToken(user.id);
    
    // Update the refresh token in the database
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days
    
    // Revoke old refresh token
    await query(
      'UPDATE user_tokens SET is_revoked = TRUE WHERE id = $1',
      [tokenRecord.id]
    );
    
    // Save new refresh token
    await authService.saveRefreshToken(user.id, newRefreshToken, refreshTokenExpiresAt);

    // Format user data for response
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      organizationId: user.organization_id,
      organization: user.organization_id ? {
        id: user.organization_id,
        name: user.organization_name
      } : null,
      designation: user.designation,
      phone: user.phone,
      timezone: user.timezone,
      language: user.language
    };
    
    // Set new access token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Determine cookie domain based on environment
    let cookieDomain;
    if (isProduction && !frontendUrl.includes('localhost')) {
      try {
        // Extract domain from frontend URL, but handle malformed URLs gracefully
        const url = new URL(frontendUrl);
        const domainParts = url.hostname.split('.');
        if (domainParts.length >= 2) {
          cookieDomain = '.' + domainParts.slice(-2).join('.');
        }
      } catch (error) {
        logger.warn(`Error parsing frontend URL: ${frontendUrl}`, error);
      }
    }
    
    // Use SameSite=None for cross-site requests in production
    const sameSite = isProduction ? 'none' : 'lax';
    
    res.cookie('accessToken', newToken, {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: sameSite,
      path: '/',
      domain: cookieDomain,
      maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
    });
    
    // Set new refresh token as HttpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: sameSite,
      path: '/',
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Return success response with tokens for header-based auth
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      user: userData,
      token: newToken,
      refreshToken: newRefreshToken,
      success: true
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Clear cookies with the same settings as when they were set
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Determine cookie domain based on environment
    const cookieDomain = isProduction 
      ? frontendUrl.includes('localhost') ? undefined : '.' + new URL(frontendUrl).hostname.split('.').slice(-2).join('.')
      : undefined;
    
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: cookieDomain
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: cookieDomain
    });
    
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    // If refresh token exists, revoke it
    if (refreshToken) {
      try {
        // Verify token to get userId
        const decoded = authService.verifyRefreshToken(refreshToken);
        
        // Revoke token in database
        if (decoded?.userId) {
          await authService.revokeRefreshToken(decoded.userId, refreshToken);
        }
      } catch (error) {
        // Ignore token verification errors during logout
        logger.warn('Error verifying refresh token during logout:', error);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Forgot password
 */
export const forgotPassword = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    const { email } = req.body;

  if (!email) {
    throw AppError.badRequest('Email is required', 'MISSING_EMAIL');
  }
    
    // Check if user exists
  const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't reveal that the user doesn't exist
    res.json({
      message: 'If a user with that email exists, a password reset link has been sent'
      });
      return;
    }
    
  const userId = result.rows[0].id;
    
    // Generate reset token
  const resetToken = await authService.generatePasswordResetToken(userId);
    
  // In a real application, send an email with the reset token
  // For this example, we'll just return it (in practice, never return this token directly)
  logger.info(`Reset token for user ${userId}: ${resetToken}`);

  res.json({
    message: 'If a user with that email exists, a password reset link has been sent',
    // For development purposes only
    ...(process.env.NODE_ENV !== 'production' && { resetToken })
    });
});

/**
 * Reset password
 */
export const resetPassword = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    const { token, password } = req.body;
    
  if (!token || !password) {
    throw AppError.badRequest('Token and password are required', 'MISSING_PARAMETERS');
    }
    
  // Verify token and get user ID
  const userId = await authService.verifyPasswordResetToken(token);
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
  // Update password and clear reset token
  await query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
    [hashedPassword, userId]
    );
    
  // Revoke all refresh tokens for this user for security
  await authService.revokeAllRefreshTokens(userId);
    
  res.json({
    message: 'Password reset successful'
    });
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!currentPassword || !newPassword || !userId) {
    throw AppError.badRequest('Current password, new password, and user ID are required', 'MISSING_PARAMETERS');
  }

  // Get current password from database
  const result = await query('SELECT password FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

  const hashedPassword = result.rows[0].password;

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isMatch) {
    throw AppError.unauthorized('Current password is incorrect', 'INVALID_PASSWORD');
    }

  // Hash new password
    const salt = await bcrypt.genSalt(10);
  const newHashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password
  await query('UPDATE users SET password = $1 WHERE id = $2', [newHashedPassword, userId]);

  // Revoke all refresh tokens except the current one for security
  // To get the current refresh token, we would need to pass it in the request
  // or store it in the session, which is beyond the scope of this example
  // For now, we'll revoke all tokens
  await authService.revokeAllRefreshTokens(userId);

  res.json({
    message: 'Password changed successfully'
  });
});

/**
 * Validate user authentication
 */
export const validate = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // User is already authenticated by the middleware
  if (!req.user) {
    throw AppError.unauthorized('Not authenticated');
  }

  // Get user details
  const userResult = await query(
    `SELECT 
      u.id, u.email, u.first_name, u.last_name, u.role, 
      u.avatar_url, u.phone, u.timezone, u.language, u.last_login_at, 
      u.is_active, u.organization_id, u.designation,
      o.name as organization_name
    FROM users u 
    LEFT JOIN organizations o ON u.organization_id = o.id 
    WHERE u.id = $1`,
    [req.user.id]
  );
  
  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found');
  }

  const user = userResult.rows[0];

  // Return user data in same format as login response
  res.status(200).json({
    status: 'success',
    message: 'Authentication valid',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      organizationId: user.organization_id,
      organization: user.organization_id ? {
        id: user.organization_id,
        name: user.organization_name
      } : null,
      designation: user.designation,
      phone: user.phone,
      timezone: user.timezone,
      language: user.language,
      lastLoginAt: user.last_login_at
    }
  });
});

/**
 * Generate CSRF token
 */
export const getCsrfToken = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Generate a token manually since req.csrfToken() is causing errors
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Set the token in a cookie with appropriate settings
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Set cookie domain based on environment
    let cookieDomain;
    try {
      if (isProduction && !frontendUrl.includes('localhost')) {
        cookieDomain = new URL(frontendUrl).hostname.split('.').slice(-2).join('.');
      }
    } catch (e) {
      logger.warn(`Failed to parse frontend URL for cookie domain: ${e}`);
    }
    
    res.cookie('_csrf', csrfToken, {
      httpOnly: true,
      secure: isProduction || frontendUrl.startsWith('https'),
      sameSite: isProduction ? 'none' : 'lax', // Use 'none' for cross-site requests in production
      path: '/',
      domain: cookieDomain,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    logger.info(`CSRF token generated for client: ${req.ip}`);
    
    // Send the token to the client
    res.status(200).json({
      status: 'success',
      csrfToken
    });
  } catch (error) {
    logger.error(`Error generating CSRF token: ${error}`);
    next(error);
  }
});

// Function to parse a duration string like '7d' and return milliseconds
const parseDuration = (durationStr: string): number => {
  const unit = durationStr.slice(-1);
  const value = parseInt(durationStr.slice(0, -1), 10);

    switch (unit) {
    case 's': return value * 1000; // seconds
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    default: return value; // assume milliseconds
    }
}; 