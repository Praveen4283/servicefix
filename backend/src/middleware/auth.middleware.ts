import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import authService from '../services/auth.service';
import { createHash } from 'crypto';

// Update the User interface to include all required properties
export interface User {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  organizationId?: string | number | null;
  designation?: string;
}

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

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
 * Authentication middleware
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export const authenticate = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get token from cookie or Authorization header
  let token = req.cookies.accessToken;
  let tokenSource = 'cookie';

  // If no cookie token, check Authorization header
  if (!token && req.headers.authorization) {
    // Extract token from Bearer token format
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      tokenSource = 'header';
    }
  }

  // No token found
  if (!token) {
    logger.debug(`Authentication failed: No token found in ${req.path}`);
    return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  try {
    // Verify token
    const decoded = authService.verifyToken(token);
    logger.debug(`Authentication successful: Token verified from ${tokenSource} for user ID ${decoded.userId}`);

    // Get user data with additional security information
    const userResult = await query(
      `SELECT id, email, first_name, last_name, role, 
      avatar_url, organization_id, designation
      FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      logger.warn(`Authentication failed: User with ID ${decoded.userId} not found in database`);
      return next(AppError.unauthorized('User not found', 'USER_NOT_FOUND'));
    }

    const user = userResult.rows[0];

    // Add user data to request object
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      organizationId: user.organization_id,
      designation: user.designation
    };

    next();
  } catch (error) {
    // Check if the error is a token expiration error
    if (error instanceof AppError && error.errorCode === 'TOKEN_EXPIRED') {
      logger.debug(`Authentication failed: Token expired for ${req.path}`);
      return next(AppError.unauthorized('Session expired, please log in again', 'SESSION_EXPIRED'));
    }

    logger.debug(`Authentication failed: Invalid token for ${req.path} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return next(AppError.unauthorized('Invalid or expired token', 'INVALID_TOKEN'));
  }
});

/**
 * Authorization middleware
 * Checks if user has required role
 * @param roles Allowed roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden('You do not have permission to access this resource');
    }

    next();
  };
};
