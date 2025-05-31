import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { pool, query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Ensure environment variables are set
if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is not set. Application will exit for security reasons.');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  logger.error('JWT_REFRESH_SECRET environment variable is not set. Application will exit for security reasons.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Log that we're using the environment variables
logger.info('[Auth Service] Using JWT secrets from environment variables.');

/**
 * Authentication Service
 * Centralized service for handling JWT tokens and user authentication
 */
class AuthService {
  /**
   * Generate JWT access token
   * @param userId User ID
   * @param role User role
   * @returns JWT token
   */
  generateToken(userId: string | number, role: string): string {
    const options = { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions;
    return jwt.sign(
      { userId, role },
      JWT_SECRET,
      options
    );
  }

  /**
   * Generate refresh token
   * @param userId User ID
   * @returns Refresh token
   */
  generateRefreshToken(userId: string | number): string {
    const options = { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions;
    return jwt.sign(
      { userId },
      JWT_REFRESH_SECRET,
      options
    );
  }

  /**
   * Save refresh token to database
   * @param userId User ID
   * @param refreshToken Refresh token
   * @param expiresAt Expiration date
   */
  async saveRefreshToken(userId: string | number, refreshToken: string, expiresAt: Date): Promise<void> {
    await query(
      'INSERT INTO user_tokens (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [userId, refreshToken, expiresAt]
    );
  }

  /**
   * Verify JWT token
   * @param token JWT token
   * @returns Decoded token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
      }
      throw AppError.unauthorized('Authentication failed', 'AUTH_FAILED');
    }
  }

  /**
   * Verify refresh token
   * @param token Refresh token
   * @returns Decoded token
   */
  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }
      throw AppError.unauthorized('Refresh token verification failed', 'REFRESH_AUTH_FAILED');
    }
  }

  /**
   * Refresh access token
   * @param refreshToken Refresh token
   * @returns New access token and user data
   */
  async refreshAccessToken(refreshToken: string): Promise<{ token: string, user: any }> {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);
    const userId = decoded.userId;

    // Check if refresh token exists in database
    const tokenResult = await query(
      'SELECT * FROM user_tokens WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()',
      [userId, refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      throw AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Get user data
    const userResult = await query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, 
        u.avatar_url, u.organization_id, u.designation
      FROM users u WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw AppError.notFound('User not found');
    }

    const user = userResult.rows[0];
    
    // Generate new access token
    const newToken = this.generateToken(user.id, user.role);

    return {
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        organizationId: user.organization_id,
        designation: user.designation
      }
    };
  }

  /**
   * Revoke refresh token
   * @param userId User ID
   * @param refreshToken Refresh token
   */
  async revokeRefreshToken(userId: string | number, refreshToken: string): Promise<void> {
    await query(
      'DELETE FROM user_tokens WHERE user_id = $1 AND refresh_token = $2',
      [userId, refreshToken]
    );
  }

  /**
   * Revoke all refresh tokens for a user
   * @param userId User ID
   */
  async revokeAllRefreshTokens(userId: string | number): Promise<void> {
    await query(
      'DELETE FROM user_tokens WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * Generate password reset token
   * @param userId User ID
   * @returns Reset token
   */
  async generatePasswordResetToken(userId: string | number): Promise<string> {
    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage (so it's not plaintext in the database)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    // Save token to database
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [hashedToken, expiresAt, userId]
    );
    
    // Return the original unhashed token (which will be sent to the user)
    return resetToken;
  }

  /**
   * Verify password reset token
   * @param token Reset token
   * @returns User ID if token is valid
   */
  async verifyPasswordResetToken(token: string): Promise<number> {
    // Hash the provided token for comparison
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Look for a user with this token that hasn't expired
    const result = await query(
      'SELECT id, reset_token FROM users WHERE reset_token_expires_at > NOW()',
      []
    );
    
    // No token found or all tokens expired
    if (result.rows.length === 0) {
      throw AppError.unauthorized('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }
    
    // Use constant-time comparison to prevent timing attacks
    let userId: number | null = null;
    
    for (const user of result.rows) {
      // Use crypto.timingSafeEqual to prevent timing attacks
      const storedTokenBuffer = Buffer.from(user.reset_token, 'hex');
      const providedTokenBuffer = Buffer.from(hashedToken, 'hex');
      
      try {
        if (crypto.timingSafeEqual(storedTokenBuffer, providedTokenBuffer)) {
          userId = user.id;
          break;
        }
      } catch (error) {
        // Different length buffers will throw an error, just continue to next
        continue;
      }
    }
    
    if (!userId) {
      throw AppError.unauthorized('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }
    
    return userId;
  }

  /**
   * Clear password reset token
   * @param userId User ID
   */
  async clearPasswordResetToken(userId: string | number): Promise<void> {
    await query(
      'UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Constant time comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns True if strings are equal
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    
    // Use Node.js built-in function for constant-time comparison
    // This helps prevent timing attacks when comparing security tokens
    try {
      return crypto.timingSafeEqual(
        Buffer.from(a, 'utf8'), 
        Buffer.from(b, 'utf8')
      );
    } catch (error) {
      // If buffers have different lengths, timingSafeEqual throws an error
      // In this case, we return false
      return false;
    }
  }

  /**
   * Verify password reset token
   * @param token Password reset token
   * @param hashedToken Hashed token from database
   * @returns True if token is valid
   */
  async verifyResetToken(token: string, hashedToken: string): Promise<boolean> {
    try {
      // Hash the token from the request using the same algorithm
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Use constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(hash, hashedToken);
    } catch (error) {
      logger.error('Error verifying reset token:', error);
      return false;
    }
  }

  /**
   * Validate refresh token against database
   * @param userId User ID
   * @param token Refresh token
   * @returns True if token is valid
   */
  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
      // Get token from database
      const result = await query(
        `SELECT token, expires_at FROM refresh_tokens 
        WHERE user_id = $1 AND revoked = false`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      // Find a matching token (using constant-time comparison)
      for (const row of result.rows) {
        // Check if token is expired
        const expiresAt = new Date(row.expires_at);
        if (expiresAt < new Date()) {
          continue;
        }
        
        // Compare tokens using constant-time comparison
        if (this.constantTimeCompare(token, row.token)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error validating refresh token:', error);
      return false;
    }
  }
}

export default new AuthService(); 