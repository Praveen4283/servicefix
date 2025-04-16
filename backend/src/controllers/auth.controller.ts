import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { pool, query } from '../config/database';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { isValidEmail } from '../utils/validation';

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

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
  } catch (error: any) {
    logger.error(`Failed to add defaults for organization ${organizationId}: ${error.message}`);
    // Don't throw - this shouldn't stop the registration process
  }
};

/**
 * Register a new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user data from request body
    const { email, password, firstName, lastName, role, organizationName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      throw new AppError('User with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate role
    const validRole = role && ['admin', 'agent', 'customer'].includes(role) ? role : 'customer';

    // If organization name provided, create or find organization
    let organizationId = null;
    if (organizationName) {
      try {
        // Generate domain from organization name
        const baseDomain = organizationName.toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric chars
          .replace(/^[^a-z]+/, '') // Remove leading numbers
          .substring(0, 50); // Limit length
        
        if (!baseDomain) {
          throw new AppError('Invalid organization name. Please use some letters.', 400);
        }

        const domain = `${baseDomain}.servicefix.com`;

        // Check if organization exists by name or domain
        const orgResult = await pool.query(
          'SELECT id FROM organizations WHERE name = $1 OR domain = $2',
          [organizationName, domain]
        );

        if (orgResult.rows.length > 0) {
          organizationId = orgResult.rows[0].id;
        } else {
          // Create new organization with domain
          const newOrgResult = await pool.query(
            'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING id',
            [organizationName, domain]
          );
          organizationId = newOrgResult.rows[0].id;
          
          // Add default ticket statuses and priorities for new organization
          await addDefaultsForOrganization(organizationId);
        }
      } catch (error: any) {
        if (error instanceof AppError) throw error;
        logger.error('Organization creation error:', error);
        throw new AppError('Failed to create organization. Please try again.', 500);
      }
    } else {
      throw new AppError('Organization name is required', 400);
    }

    // Create user with snake_case column names (standard in the schema)
    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hashedPassword, firstName, lastName, validRole, organizationId]
    );
    
    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Return user data and token
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          createdAt: user.created_at
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Fetch user data, ensuring avatar_url is selected
    const result = await pool.query(
      `SELECT 
         u.id, u.email, u.password, u.first_name, u.last_name, u.role, 
         u.avatar_url, u.phone, u.timezone, u.language, u.last_login_at, 
         u.is_active, u.organization_id, u.designation,
         o.name as organization_name
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }
    
    const userFromDb = result.rows[0];

    const isMatch = await bcrypt.compare(password, userFromDb.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Fetch notification preferences separately
    const preferencesResult = await pool.query(
      'SELECT event_type, email_enabled, push_enabled, in_app_enabled FROM notification_preferences WHERE user_id = $1',
      [userFromDb.id]
    );
    const notificationSettings: Record<string, boolean> = {};
    preferencesResult.rows.forEach(pref => {
      notificationSettings[pref.event_type] = pref.email_enabled || pref.push_enabled || pref.in_app_enabled;
    });
    
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userFromDb.id]
    );

    const token = generateToken(userFromDb.id, userFromDb.role);
    const refreshToken = generateRefreshToken(userFromDb.id);

    // Construct the user response object carefully, mapping fields
    const userResponse = {
      id: userFromDb.id,
      email: userFromDb.email,
      firstName: userFromDb.first_name,
      lastName: userFromDb.last_name,
      role: userFromDb.role,
      avatarUrl: userFromDb.avatar_url,
      phoneNumber: userFromDb.phone,
      jobTitle: userFromDb.designation,
      timezone: userFromDb.timezone,
      language: userFromDb.language,
      isActive: userFromDb.is_active,
      lastLogin: userFromDb.last_login_at,
      organization: {
        id: userFromDb.organization_id,
        name: userFromDb.organization_name
      },
      notificationSettings: notificationSettings
    };
    
    res.json({
      token,
      refreshToken,
      user: userResponse, // Send the carefully constructed object
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  const { token: oldRefreshToken } = req.body;

  if (!oldRefreshToken) {
    return next(new AppError('Refresh token required', 400));
  }

  try {
    // Check if token exists in DB and is valid
    const tokenResult = await query(
      'SELECT user_id, expires_at FROM user_tokens WHERE refresh_token = $1',
      [oldRefreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const tokenData = tokenResult.rows[0];
    if (new Date() > new Date(tokenData.expires_at)) {
      // Optional: Clean up expired token
      await query('DELETE FROM user_tokens WHERE refresh_token = $1', [oldRefreshToken]);
      return next(new AppError('Refresh token expired', 401));
    }

    // Generate new tokens
    const userId = tokenData.user_id; // This is likely a number from DB

    // Fetch user details for the new token payload
    const userResult = await query(
      'SELECT id, email, role, organization_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User associated with token not found', 404));
    }
    const user = userResult.rows[0];

    // Correctly call separate token generation functions
    const accessToken = generateToken(
        user.id.toString(), // Ensure ID is string for token functions
        user.role
    );
    const newRefreshToken = generateRefreshToken(
        user.id.toString() // Ensure ID is string for token functions
    );
    // Calculate expiry dates (assuming JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN are like '1h', '7d')
    // This logic might need adjustment based on exact format and library used for parsing time strings
    const now = Date.now();
    const accessTokenExpiresInMs = parseDuration(JWT_EXPIRES_IN);
    const refreshTokenExpiresInMs = parseDuration(JWT_REFRESH_EXPIRES_IN);

    const accessTokenExpiresAt = accessTokenExpiresInMs ? new Date(now + accessTokenExpiresInMs) : undefined;
    const refreshTokenExpiresAt = refreshTokenExpiresInMs ? new Date(now + refreshTokenExpiresInMs) : undefined;

    if (!refreshTokenExpiresAt) {
        // Handle error: refresh token expiry couldn't be calculated
        return next(new AppError('Failed to calculate refresh token expiry', 500));
    }

    // Store the new refresh token (replace the old one or add new?)
    // Option 1: Update existing record (if you want one refresh token per user session)
    // await query('UPDATE user_tokens SET refresh_token = $1, expires_at = $2 WHERE user_id = $3 AND refresh_token = $4', 
    //             [newRefreshToken, refreshTokenExpiresAt, userId, oldRefreshToken]);

    // Option 2: Delete old and insert new (allows multiple sessions)
    await query('DELETE FROM user_tokens WHERE refresh_token = $1', [oldRefreshToken]);
    await query(
      'INSERT INTO user_tokens (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [userId, newRefreshToken, refreshTokenExpiresAt]
    );

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt // Send expiry date
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Logout user by invalidating refresh token
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }
    
    // Delete refresh token from database
    await pool.query(
      'DELETE FROM user_tokens WHERE refresh_token = $1',
      [refreshToken]
    );
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send password reset email
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal that the user doesn't exist
      res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
      return;
    }
    
    const user = result.rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Hash token before saving to database
    const hashedToken = await bcrypt.hash(resetToken, 10);
    
    // Save token to database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [hashedToken, resetTokenExpiry, user.id]
    );
    
    // TODO: Send email with reset token
    logger.info(`Reset token for ${email}: ${resetToken}`);
    
    res.status(200).json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using token
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;
    
    // Find user with valid reset token
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token_expires_at > NOW()',
      []
    );
    
    // Check if any users have active reset tokens
    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired token', 400);
    }
    
    // Find the user with the matching token
    let user = null;
    for (const row of result.rows) {
      const isMatch = await bcrypt.compare(token, row.reset_token);
      if (isMatch) {
        user = row;
        break;
      }
    }
    
    if (!user) {
      throw new AppError('Invalid or expired token', 400);
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user password and remove reset token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    // Invalidate all existing refresh tokens for the user
    await pool.query(
      'DELETE FROM user_tokens WHERE user_id = $1',
      [user.id]
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Change Password (New)
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { oldPassword, newPassword } = req.body;
  const userIdStr = req.user?.id; // Get user ID string from authenticated request

  if (!userIdStr) {
    return next(new AppError('Authentication required', 401));
  }

  // Convert user ID to number for DB interaction
  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  try {
    // Get current user password hash from DB
    const userResult = await query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    const storedPasswordHash = userResult.rows[0].password;

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, storedPasswordHash);
    if (!isMatch) {
      return next(new AppError('Incorrect current password', 400));
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password in the database
    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.status(200).json({ message: 'Password changed successfully' });

  } catch (error) {
    next(error);
  }
};

// Helper function to parse duration strings (e.g., '1h', '7d') into milliseconds
// This is a basic example; consider using a library like 'ms' for robustness
function parseDuration(duration: string): number | null {
    const match = duration.match(/^(\d+)([hmds])$/);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
} 