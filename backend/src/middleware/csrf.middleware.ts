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
    
    // Debug logging to help diagnose issues
    logger.debug(`CSRF check - Cookie Token: ${cookieToken ? 'exists' : 'missing'}, Header Token: ${headerToken ? 'exists' : 'missing'}`);
    
    // If no cookie token, generate a new one and don't validate on this request
    if (!cookieToken) {
      const newCsrfToken = crypto.randomBytes(32).toString('hex');
      
      // Set the CSRF cookie with appropriate settings
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
      
      res.cookie(CSRF_COOKIE_NAME, newCsrfToken, {
        httpOnly: true,
        secure: isProduction || frontendUrl.startsWith('https'),
        sameSite: isProduction ? 'none' : 'lax', // Use 'none' for cross-site requests in production
        path: '/',
        domain: cookieDomain,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      logger.info(`Generated new CSRF token for request to ${req.path}`);
      
      // For this first request, don't validate token
        return next();
      }
    
    // If header token is missing but cookie token exists, this is likely an error in the frontend
    if (!headerToken && cookieToken) {
      logger.warn(`CSRF token missing in header for ${req.path}`);
      // Respond with 403 and a helpful message
      return next(AppError.forbidden('CSRF token missing in request header', 'CSRF_ERROR'));
    }
    
    // Validate the token if both exist
    if (cookieToken && headerToken) {
      // Use a timing-safe comparison to prevent timing attacks
      const tokensMatch = crypto.timingSafeEqual(
        Buffer.from(cookieToken, 'utf8'), 
        Buffer.from(headerToken, 'utf8')
      );
      
      if (tokensMatch) {
        return next();
      } else {
        logger.warn(`CSRF token validation failed: Cookie token and header token don't match`);
        
        // If tokens don't match, generate a new one to help client recover
        const newCsrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE_NAME, newCsrfToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/'
        });
        
        // Return helpful error with the code to indicate client should refresh token
        throw AppError.forbidden('CSRF token validation failed - token mismatch', 'CSRF_ERROR');
      }
    }
    
    // If we reach here, something unusual happened
    logger.warn(`CSRF token validation failed: Unexpected token state`);
    throw AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR');
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error(`CSRF validation error: ${error}`);
      next(AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR'));
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
  // Skip CSRF check for authentication routes and preflight requests
  if (req.method === 'OPTIONS' ||
      req.path.includes('/auth/') || 
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