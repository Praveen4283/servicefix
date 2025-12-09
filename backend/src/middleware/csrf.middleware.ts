import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// CSRF protection configuration
const CSRF_COOKIE_NAME = '_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Routes that should skip CSRF protection (using exact matching for security)
const csrfSkippedPaths: Set<string> = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/refresh-token',
  // Legacy API support
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh-token'
]);

// Routes that should allow post-login leniency (exact paths only for security)
const csrfLenientPostLoginPaths: Set<string> = new Set([
  '/api/v1/notifications',
  '/api/notifications',
  '/socket.io/connect'
]);

/**
 * Generate a secure CSRF token
 * @returns Random hex string
 */
function generateCsrfToken(): string {
  // Generate 32-byte token (64 hex characters) for consistency
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF cookie in response with enhanced security
 * @param res Response object
 * @param token CSRF token
 */
function setCsrfCookie(res: Response, token: string): void {
  // Set the CSRF cookie with appropriate settings
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Set cookie domain based on environment
  let cookieDomain;
  let isCrossOrigin = false;

  try {
    if (isProduction && !frontendUrl.includes('localhost')) {
      const url = new URL(frontendUrl);
      // Use full domain in production, not just the last two segments
      // This prevents accidentally sharing cookies across unrelated subdomains
      cookieDomain = url.hostname;

      // Detect if this is a cross-origin setup
      // If backend is on a different domain than frontend, we need sameSite: 'none'
      const backendHost = process.env.BACKEND_URL ? new URL(process.env.BACKEND_URL).hostname : '';
      isCrossOrigin = !!(backendHost && backendHost !== url.hostname);
    }
  } catch (e) {
    logger.warn(`Failed to parse frontend URL for cookie domain: ${e}`);
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
    logger.debug('Using sameSite: none for cross-origin production setup');
  } else if (isProduction) {
    // Same-origin production: use 'lax' for better compatibility than 'strict'
    sameSite = 'lax';
    secure = true;
    logger.debug('Using sameSite: lax for same-origin production setup');
  } else {
    // Development: use 'lax' and secure based on protocol
    sameSite = 'lax';
    secure = frontendUrl.startsWith('https');
    logger.debug('Using sameSite: lax for development setup');
  }

  // Add entropy specific to this session to help mitigate CSRF attacks
  // that might somehow arise from multiple sites sharing the same CSRF token
  const sessionEntropy = crypto.randomBytes(16).toString('hex');
  res.cookie('_csrf_entropy', sessionEntropy, {
    httpOnly: true, // Keep this one httpOnly
    secure,
    sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge: CSRF_TOKEN_EXPIRY
  });

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // CSRF token needs to be accessible by JavaScript
    secure,
    sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge: CSRF_TOKEN_EXPIRY
  });

  // Set a timestamp to track when token was created
  res.cookie('_csrf_created', Date.now().toString(), {
    httpOnly: false, // Allows JavaScript to check if token needs refresh
    secure,
    sameSite,
    path: '/',
    domain: cookieDomain,
    maxAge: CSRF_TOKEN_EXPIRY
  });
}

/**
 * Verify if request is authorized to skip strict CSRF checks
 * @param req Request object
 * @returns Whether request is from a trusted context that can skip validation
 */
function isLenientRequest(req: Request): boolean {
  const isPostLoginMetadata: boolean = req.body?.metadata?.isPostLogin === true;
  const referer: string = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  const isLoginReferer: boolean = referer.includes('/login') || referer.includes('/auth');

  // Use exact path matching for security - no substring matching
  const isLenientPath: boolean = csrfLenientPostLoginPaths.has(req.path);

  // Only allow leniency for specific cases
  return Boolean((isPostLoginMetadata || isLoginReferer) && isLenientPath);
}

/**
 * Custom CSRF protection middleware with hardened security
 * This improves upon the default csurf middleware with additional validation
 * and a more flexible handling of specific edge cases
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF protection for GET, HEAD, OPTIONS requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF protection for specific routes (exact matching only)
  if (csrfSkippedPaths.has(req.path)) {
    return next();
  }

  try {
    // Get CSRF token from cookie and request header
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    // Record detailed context for debugging token issues
    const contextInfo = {
      clientIp: req.ip || req.socket.remoteAddress || 'unknown',
      path: req.path,
      method: req.method,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']?.substring(0, 50) || 'unknown',
      hasCookieToken: Boolean(cookieToken),
      hasHeaderToken: Boolean(headerToken),
      cookieTokenStart: cookieToken ? `${cookieToken.substring(0, 4)}...${cookieToken.slice(-4)}` : 'missing',
      headerTokenStart: headerToken ? `${headerToken.substring(0, 4)}...${headerToken.slice(-4)}` : 'missing'
    };

    logger.debug(`CSRF check for ${req.path} - Cookie Token: ${cookieToken ? 'exists' : 'missing'}, Header Token: ${headerToken ? 'exists' : 'missing'}`);

    // Determine if we should apply special rules for post-login/initial setup requests
    const isLenient = isLenientRequest(req);

    // If token is old, generate a new one and set it in the response
    // This renews the token transparently as the user uses the app
    const csrfCreatedStr = req.cookies._csrf_created;
    if (csrfCreatedStr) {
      const createdTime = parseInt(csrfCreatedStr, 10);
      const now = Date.now();
      const tokenAgeMs = now - createdTime;

      // If token is older than 12 hours, let's refresh it
      if (tokenAgeMs > 12 * 60 * 60 * 1000) {
        const newToken = generateCsrfToken();
        setCsrfCookie(res, newToken);
        logger.debug('CSRF token auto-refreshed due to age');
      }
    }

    // Validate the token if both exist
    if (cookieToken && headerToken) {
      let tokensMatch = false;

      try {
        // Use a timing-safe comparison to prevent timing attacks
        tokensMatch = crypto.timingSafeEqual(
          Buffer.from(cookieToken, 'utf8'),
          Buffer.from(headerToken, 'utf8')
        );
      } catch (err) {
        // Handle case where tokens are different lengths
        logger.warn(`CSRF token length mismatch: ${err}`);
        tokensMatch = false;
      }

      // Special case: be more tolerant for post-login notifications
      if (!tokensMatch && isLenient) {
        logger.warn('CSRF token mismatch for lenient request - allowing request anyway');

        // Generate a new token for the client to realign tokens
        const newToken = generateCsrfToken();
        setCsrfCookie(res, newToken);

        // Allow the request to proceed
        return next();
      }

      if (tokensMatch) {
        // Valid token, allow request
        return next();
      } else {
        // Invalid token, return error
        logger.warn('CSRF token validation failed: Cookie token and header token don\'t match');

        if (process.env.NODE_ENV === 'development') {
          // In development, log more details for debugging
          logger.debug('Token mismatch details:', contextInfo);
        }

        // Generate a new token to help client recover
        const newToken = generateCsrfToken();
        setCsrfCookie(res, newToken);

        throw AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR');
      }
    } else {
      // Missing token(s), generate a new one for the client
      const newToken = generateCsrfToken();
      setCsrfCookie(res, newToken);

      if (isLenient && headerToken) {
        // Allow post-login requests with just a header token
        logger.info('Allowing lenient request with header token only');
        return next();
      }

      logger.warn(`CSRF token validation failed: ${!cookieToken ? 'Cookie token missing' : 'Header token missing'}`);
      throw AppError.forbidden('CSRF token validation failed: Missing token', 'CSRF_ERROR');
    }
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }

    // Handle unexpected errors
    logger.error('Unexpected error in CSRF validation:', err);
    return next(AppError.forbidden('CSRF validation error', 'CSRF_ERROR'));
  }
};

/**
 * CSRF error handler middleware
 */
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err.code === 'EBADCSRFTOKEN' || err.errorCode === 'CSRF_ERROR') {
    // Generate new token to help client recover
    const newCsrfToken = generateCsrfToken();
    setCsrfCookie(res, newCsrfToken);
    throw AppError.forbidden('CSRF token validation failed', 'CSRF_ERROR');
  }
  next(err);
};

/**
 * Skip CSRF for specific routes (auth endpoints)
 */
export const csrfSkipper = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF check for preflight requests
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  // Skip CSRF check for exact path matches in skipped paths
  if (csrfSkippedPaths.has(req.path)) {
    next();
    return;
  }

  // Otherwise apply CSRF protection
  csrfProtection(req, res, next);
}; 