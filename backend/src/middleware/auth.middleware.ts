import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AppError } from '../utils/errorHandler';
import * as Multer from 'multer'; // Import multer types

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: string;
        organizationId: string | null; // Allow null for organizationId
      };
      files?: { [fieldname: string]: Multer.File[] } | Multer.File[] | undefined;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Ensure userId from token is treated as a string for consistency
    const userIdFromToken = String(decoded.userId);
    if (!userIdFromToken) {
        throw new AppError('Invalid token payload: userId missing', 401);
    }

    // Get user from database
    const userResult = await query(
      // Use numeric conversion in query if DB expects number, or keep as string if DB expects string/varchar
      // Assuming BIGINT, we need to convert userIdFromToken back to number for the query
      'SELECT id, role, organization_id FROM users WHERE id = $1',
      [parseInt(userIdFromToken, 10)] // Convert to number for DB query
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Check if user is active
    const activeResult = await query(
      'SELECT is_active FROM users WHERE id = $1',
      [user.id] // user.id is already a number from the DB
    );

    if (activeResult.rows.length === 0 || !activeResult.rows[0].is_active) {
      throw new AppError('User account is inactive', 403);
    }

    // Add user data to request (keep req.user.id as string)
    req.user = {
      id: userIdFromToken, // Use the string version consistent with other parts
      role: user.role,
      // Ensure null is passed if organization_id is null in DB, otherwise convert to string
      organizationId: user.organization_id === null ? null : String(user.organization_id),
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Restricts access to specific roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};
