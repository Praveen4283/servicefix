import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import authService from '../services/auth.service';

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
    
    // Get user data
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
