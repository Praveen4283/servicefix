import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { AppError } from '../utils/errorHandler';

/**
 * Middleware to validate request using express-validator
 * Throws an error if validation fails
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for response
    const errorMessages = errors.array().map((error: ValidationError) => {
      if ('msg' in error) {
        // TypeScript safety check - only access param if it exists
        const paramInfo = 'param' in error && error.param ? ` (${error.param})` : '';
        return `${error.msg}${paramInfo}`;
      }
      return JSON.stringify(error);
    });
    
    // Throw custom error with all validation error messages
    throw new AppError(
      `Validation failed: ${errorMessages.join(', ')}`,
      400
    );
  }
  
  next();
}; 