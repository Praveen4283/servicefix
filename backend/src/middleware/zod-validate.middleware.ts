import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/errorHandler';

/**
 * Middleware to validate request using Zod schemas
 * Throws an error if validation fails
 */
export const validateZod = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request against the schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (error) {
      // Format Zod errors for response
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          // Extract the field path for better error messages
          const path = err.path.join('.');
          const pathPrefix = path ? `${path}: ` : '';
          return `${pathPrefix}${err.message}`;
        });
        
        // Throw custom error with all validation error messages
        throw new AppError(
          `Validation failed: ${errorMessages.join(', ')}`,
          400
        );
      }
      
      // If it's not a ZodError, pass it to the next error handler
      next(error);
    }
  };
}; 