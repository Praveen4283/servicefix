import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// CSRF protection configuration
const CSRF_COOKIE_NAME = '_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Custom CSRF protection middleware that compares the cookie and header token
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for GET, HEAD, OPTIONS methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  try {
    // Get the CSRF token from cookie and header
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;
    
    // If no tokens, generate a new one
    if (!cookieToken) {
      const newCsrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, newCsrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Don't validate on first request when we're setting up the token
      if (!headerToken) {
        return next();
      }
    }
    
    // Validate the token if both exist
    if (cookieToken && headerToken) {
      if (cookieToken === headerToken) {
        return next();
      } else {
        logger.warn(`CSRF token validation failed: Cookie token and header token don't match`);
        throw AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR');
      }
    } else if (cookieToken && !headerToken) {
      logger.warn('CSRF token validation failed: Missing header token');
      throw AppError.forbidden('CSRF token validation failed: Missing header token', 'CSRF_ERROR');
    }
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    } else {
      logger.error(`CSRF validation error: ${error}`);
      throw AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR');
    }
  }
};

/**
 * CSRF error handler middleware
 */
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err.code === 'EBADCSRFTOKEN' || err.errorCode === 'CSRF_ERROR') {
    throw AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR');
  }
  next(err);
};

/**
 * Skip CSRF for specific routes (auth endpoints)
 */
export const csrfSkipper = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF check for authentication routes
  if (req.path.includes('/auth/') || 
      req.path.includes('/login') || 
      req.path.includes('/register') || 
      req.path.includes('/forgot-password') || 
      req.path.includes('/reset-password')) {
    next();
    return;
  }
  
  // Otherwise apply CSRF protection
  csrfProtection(req, res, next);
}; 