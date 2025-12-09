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
import { createHash } from 'crypto';
import { TIME } from '../constants/app.constants';
import { getErrorMessage } from '../utils/errorUtils';

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
 * Get cookie options with appropriate security settings
 * @param isRefreshToken Whether the cookie is for a refresh token (longer expiry)
 * @returns Cookie options
 */
const getCookieOptions = (isRefreshToken = false) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Extract domain for production environment
  let cookieDomain: string | undefined = undefined;
  let isCrossOrigin = false;

  try {
    if (isProduction && !frontendUrl.includes('localhost')) {
      const url = new URL(frontendUrl);

      // Detect if this is a cross-origin setup
      // If backend is on a different domain than frontend, we need sameSite: 'none'
      const backendHost = process.env.BACKEND_URL ? new URL(process.env.BACKEND_URL).hostname : '';
      isCrossOrigin = !!(backendHost && backendHost !== url.hostname);

      // CRITICAL: For cross-origin cookies, domain MUST be undefined
      // Setting domain to frontend hostname will cause cookies to be rejected by browser
      // Only set domain if same-origin (both on same parent domain, e.g., api.example.com and app.example.com)
      if (!isCrossOrigin && backendHost) {
        // Check if both are subdomains of the same parent domain
        const frontendParts = url.hostname.split('.');
        const backendParts = backendHost.split('.');

        // If both have at least 2 parts and share the same last 2 parts (parent domain)
        if (frontendParts.length >= 2 && backendParts.length >= 2) {
          const frontendParent = frontendParts.slice(-2).join('.');
          const backendParent = backendParts.slice(-2).join('.');

          if (frontendParent === backendParent) {
            // Same parent domain - set cookie domain to share between subdomains
            cookieDomain = '.' + frontendParent;
          }
        }
      }
      // For cross-origin: cookieDomain stays undefined (uses current origin - the backend)
    }
  } catch (error) {
    logger.warn(`Error parsing frontend URL: ${frontendUrl}`, error);
  }

  // Define sameSite value based on environment and cross-origin status
  // For cross-origin production (frontend and backend on different domains), use 'none' with secure flag
  // For same-origin production or development, use 'lax' for better compatibility
  let sameSite: 'strict' | 'lax' | 'none';
  let secure: boolean;

  if (isProduction && isCrossOrigin) {
    // Cross-origin production: must use 'none' with secure
    sameSite = 'none';
    secure = true;
  } else if (isProduction) {
    // Same-origin production: use 'lax' for better compatibility than 'strict'
    sameSite = 'lax';
    secure = true;
  } else {
    // Development: use 'lax' and secure based on protocol
    sameSite = 'lax';
    secure = frontendUrl.startsWith('https');
  }

  // Get max age from environment variables or use defaults
  const maxAge = isRefreshToken ?
    parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d') :
    parseDuration(process.env.JWT_EXPIRES_IN || '1h');

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge
  };
};

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
  } catch (error: unknown) {
    logger.error(`Failed to add defaults for organization ${organizationId}: ${getErrorMessage(error)}`);
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

  // Get IP and user agent for tracking
  const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || '';

  // Save refresh token to database with IP tracking
  await authService.saveRefreshToken(dbUser.id, refreshToken, expiresAt, clientIp, userAgent);

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
    maxAge: TIME.ONE_HOUR_MS
  });

  // Set refresh token as HttpOnly cookie with the same settings
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction || frontendUrl.startsWith('https'),
    sameSite: sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge: TIME.ONE_WEEK_MS
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
 * Generate a fingerprint for the request source
 * @param req Request object
 * @returns MD5 hash of IP and simplified user agent
 */
function generateRequestFingerprint(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
  // Extract browser and OS info without version numbers to be more resilient to updates
  const userAgent = req.headers['user-agent'] || '';

  // Create a simplified fingerprint that's still useful for validation
  // but resilient to minor changes in the user agent string
  let simplifiedUserAgent = '';

  // Extract browser name
  if (userAgent.includes('Chrome')) simplifiedUserAgent += 'Chrome_';
  else if (userAgent.includes('Firefox')) simplifiedUserAgent += 'Firefox_';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) simplifiedUserAgent += 'Safari_';
  else if (userAgent.includes('Edge')) simplifiedUserAgent += 'Edge_';
  else if (userAgent.includes('Trident') || userAgent.includes('MSIE')) simplifiedUserAgent += 'IE_';
  else simplifiedUserAgent += 'Other_';

  // Extract OS
  if (userAgent.includes('Windows')) simplifiedUserAgent += 'Windows';
  else if (userAgent.includes('Mac OS')) simplifiedUserAgent += 'MacOS';
  else if (userAgent.includes('Linux')) simplifiedUserAgent += 'Linux';
  else if (userAgent.includes('Android')) simplifiedUserAgent += 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) simplifiedUserAgent += 'iOS';
  else simplifiedUserAgent += 'Other';

  // Create a hash of the IP and simplified user agent
  const hash = createHash('md5')
    .update(`${ip}|${simplifiedUserAgent}`)
    .digest('hex');

  return hash;
}

/**
 * Log in a user
 * @param req Request with email and password
 * @param res Response with user data and token
 */
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw AppError.badRequest('Email and password are required');
  }

  // Query user by email
  const userResult = await query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const user = userResult.rows[0];

  // Check if password matches
  const isPasswordValid = await bcrypt.compare(password, user.password || user.encrypted_password || '');
  if (!isPasswordValid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Generate request fingerprint
  const fingerprint = generateRequestFingerprint(req);

  // Generate token
  const token = authService.generateToken(user.id, user.role);

  // Generate refresh token
  const refreshToken = authService.generateRefreshToken(user.id);

  // Store user's IP address for security monitoring
  const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || '';
  await authService.storeUserIpAddress(user.id, clientIp);

  // Save refresh token to database with IP and user agent tracking
  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN?.replace(/\D/g, '') || '7');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  await authService.saveRefreshToken(user.id, refreshToken, expiresAt, clientIp, userAgent, fingerprint);

  // Set cookies with enhanced security 
  const cookieOptions = getCookieOptions();
  const refreshCookieOptions = getCookieOptions(true);

  // Set accessToken cookie
  res.cookie('accessToken', token, cookieOptions);

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  // Create a short-lived CSRF token with improved security
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('_csrf', csrfToken, {
    ...cookieOptions,
    httpOnly: false, // CSRF token needs to be readable by JavaScript
    maxAge: TIME.CSRF_TOKEN_LIFETIME_MS
  });

  // Add token creation time for improved management
  res.cookie('_token_created', Date.now().toString(), {
    httpOnly: false,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    domain: cookieOptions.domain,
    maxAge: cookieOptions.maxAge
  });

  // Update last login timestamp
  await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  // Return user data and token
  res.json({
    status: 'success',
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      organizationId: user.organization_id
    },
    token,
    refreshToken,
    csrfToken
  });
});

/**
 * Refresh an expired JWT token using a refresh token
 * @param req Request with refreshToken
 * @param res Response with new token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Try different methods to get the refresh token
  let refreshToken = req.body.refreshToken || req.cookies?.refreshToken || null;

  if (!refreshToken) {
    throw AppError.badRequest('Refresh token is required');
  }

  // Generate request fingerprint for security validation
  const fingerprint = generateRequestFingerprint(req);

  try {
    // Request new access token
    const result = await authService.refreshAccessToken(refreshToken, fingerprint);

    // Set new access token in HTTP-only cookie with enhanced security
    const cookieOptions = getCookieOptions();
    res.cookie('accessToken', result.token, cookieOptions);

    // If we got a new refresh token due to rotation, update the cookie
    if (result.refreshToken) {
      const refreshCookieOptions = getCookieOptions(true);
      res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    }

    // Also refresh the CSRF token with improved security
    const newCsrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('_csrf', newCsrfToken, {
      ...cookieOptions,
      httpOnly: false, // CSRF token needs to be readable by JavaScript
      maxAge: TIME.CSRF_TOKEN_LIFETIME_MS
    });

    // Update token creation time
    res.cookie('_token_created', Date.now().toString(), {
      httpOnly: false,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      domain: cookieOptions.domain,
      maxAge: cookieOptions.maxAge
    });

    // Return new tokens
    res.json({
      status: 'success',
      token: result.token,
      refreshToken: result.refreshToken, // Will be undefined if no rotation happened
      user: result.user,
      csrfToken: newCsrfToken
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      throw AppError.unauthorized('Invalid refresh token');
    }
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

    // Clear all auth-related cookies
    const baseAccessOptions = getCookieOptions();
    const baseRefreshOptions = getCookieOptions(true);
    const baseCsrfOptions = getCookieOptions();

    // Create new option objects without the maxAge property
    const { maxAge: _1, ...accessOptions } = baseAccessOptions;
    const { maxAge: _2, ...refreshOptions } = baseRefreshOptions;
    const { maxAge: _3, ...csrfOptions } = baseCsrfOptions;

    res.clearCookie('accessToken', accessOptions);
    res.clearCookie('refreshToken', refreshOptions);
    res.clearCookie('_csrf', csrfOptions);

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
    // Generate a new token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Set the token in a cookie with appropriate settings
    res.cookie('_csrf', csrfToken, {
      ...getCookieOptions(),
      httpOnly: false, // CSRF token needs to be accessible by JavaScript
      maxAge: TIME.CSRF_TOKEN_LIFETIME_MS
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

/**
 * Get active sessions for the current user
 * Returns all non-revoked, non-expired refresh tokens with IP/device info
 */
export const getActiveSessions = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  if (!userId) {
    throw AppError.unauthorized('Not authenticated');
  }

  try {
    // Get current refresh token to mark it in the response
    const currentRefreshToken = req.cookies.refreshToken || '';

    // Fetch all active sessions
    const sessions = await query(
      `SELECT 
         id,
         ip_address,
         user_agent,
         created_at,
         last_used_at,
         expires_at,
         (refresh_token = $2) as is_current
       FROM user_tokens
       WHERE user_id = $1 
         AND expires_at > NOW() 
         AND is_revoked = FALSE
       ORDER BY last_used_at DESC NULLS LAST, created_at DESC
       LIMIT 20`,
      [userId, currentRefreshToken]
    );

    // Parse user agent to extract device info
    const parseUserAgent = (ua: string) => {
      if (!ua) return 'Unknown Device';

      let browser = 'Unknown';
      let os = 'Unknown';

      // Detect browser
      if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Edg')) browser = 'Edge';
      else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';

      // Detect OS
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac OS')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      return `${browser} on ${os}`;
    };

    res.json({
      status: 'success',
      count: sessions.rows.length,
      sessions: sessions.rows.map(s => ({
        id: s.id,
        ipAddress: s.ip_address || 'Unknown',
        device: parseUserAgent(s.user_agent),
        userAgent: s.user_agent,
        createdAt: s.created_at,
        lastUsedAt: s.last_used_at || s.created_at,
        expiresAt: s.expires_at,
        isCurrent: s.is_current
      }))
    });
  } catch (error) {
    logger.error('Error fetching active sessions:', error);
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