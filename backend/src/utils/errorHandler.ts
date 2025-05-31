import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import crypto from 'crypto';

/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  
  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

/**
 * Verify string equality in constant time to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns True if strings are equal
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  // Use Node.js built-in function for constant-time comparison
  // This helps prevent timing attacks when comparing security tokens
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'), 
    Buffer.from(b, 'utf8')
  );
};

/**
 * Custom application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create not found error
   * @param message Error message
   * @param errorCode Specific error code
   * @returns AppError instance
   */
  static notFound(message: string = 'Resource not found', errorCode: string = ErrorCode.NOT_FOUND): AppError {
    return new AppError(message, 404, errorCode);
  }

  /**
   * Create bad request error
   * @param message Error message
   * @param errorCode Specific error code
   * @returns AppError instance
   */
  static badRequest(message: string = 'Invalid request', errorCode: string = ErrorCode.INVALID_INPUT): AppError {
    return new AppError(message, 400, errorCode);
  }

  /**
   * Create unauthorized error
   * @param message Error message
   * @param errorCode Specific error code
   * @returns AppError instance
   */
  static unauthorized(message: string = 'Unauthorized', errorCode: string = ErrorCode.AUTH_REQUIRED): AppError {
    return new AppError(message, 401, errorCode);
  }

  /**
   * Create forbidden error
   * @param message Error message
   * @param errorCode Specific error code
   * @returns AppError instance
   */
  static forbidden(message: string = 'Forbidden', errorCode: string = ErrorCode.FORBIDDEN): AppError {
    return new AppError(message, 403, errorCode);
  }

  static conflict(message: string = 'Resource already exists', errorCode: string = ErrorCode.RESOURCE_EXISTS): AppError {
    return new AppError(message, 409, errorCode);
  }

  /**
   * Create internal server error
   * @param message Error message
   * @param errorCode Specific error code
   * @returns AppError instance
   */
  static internal(message: string = 'Internal server error', errorCode: string = ErrorCode.INTERNAL_ERROR): AppError {
    return new AppError(message, 500, errorCode);
  }
}

// Get environment
const isProduction = process.env.NODE_ENV === 'production';

// Error handler middleware
export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  let errorCode = 'INTERNAL_ERROR';

  // If it's our custom error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
    errorCode = err.errorCode;
  } 
  // If it's a Zod validation error
  else if (err instanceof ZodError || err.name === 'ZodError') {
    statusCode = 400;
    message = `Validation failed: ${err.message}`;
    isOperational = true;
    errorCode = 'VALIDATION_ERROR';
  }
  // If it's a validation error from express-validator (legacy support)
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
    errorCode = 'VALIDATION_ERROR';
  }
  // Database errors
  else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
    errorCode = 'DATABASE_ERROR';
  }
  // Type ORM errors
  else if (err.name === 'QueryFailedError') {
    statusCode = 400;
    message = 'Database operation failed';
    isOperational = true;
    errorCode = 'DATABASE_ERROR';
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
    errorCode = 'AUTHENTICATION_ERROR';
  }
  // Token expired error
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
    errorCode = 'AUTHENTICATION_ERROR';
  }

  // In production, use generic messages for all non-operational errors
  if (isProduction && !isOperational) {
    message = 'Something went wrong. Please try again later.';
  }

  // Log the error
  if (isOperational) {
    logger.warn(`Operational error: ${message}`, { statusCode, errorCode });
  } else {
    logger.error(`Unhandled error: ${err.message}`, { 
      error: err.stack, 
      statusCode, 
      errorCode,
      path: req.path,
      method: req.method 
    });
  }

  // Send response
  return res.status(statusCode).json({
    status: 'error',
    message,
    code: errorCode,
    ...(process.env.NODE_ENV === 'development' && !isOperational && { stack: err.stack })
  });
};

/**
 * Async handler to catch errors from async route handlers
 * @param fn Function to wrap with error handling
 * @returns Express middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
} 