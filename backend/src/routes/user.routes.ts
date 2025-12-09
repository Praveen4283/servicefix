import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { getRepository } from '../config/database';
import { Like, ILike, IsNull, Not } from 'typeorm';
import { User } from '../models/User';
import { NotificationPreference } from '../models/NotificationPreference';
import { DepartmentMember } from '../models/DepartmentMember';
import { Department } from '../models/Department';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { getCustomRepository } from 'typeorm';
import notificationService from '../services/notification.service';
import { getPasswordResetEmailTemplate } from '../utils/email';
import userService from '../services/user.service';
import { idToNumber, idToString } from '../utils/idUtils';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination)
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize([UserRole.ADMIN]), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchTerm = req.query.search as string || '';
    const role = req.query.role as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortDirection = req.query.sortDirection as 'ASC' | 'DESC' || 'DESC';

    // Use the user service to get paginated users with caching
    const result = await userService.getUsers({
      page,
      limit,
      searchTerm,
      role,
      sortBy,
      sortDirection
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, authorize([UserRole.ADMIN]), async (req, res, next) => {
  try {
    // Use the user service to get stats with caching
    const stats = await userService.getUserStats();

    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or Self)
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== UserRole.ADMIN && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const userId = req.params.id;

    // Use the user service to get user by ID with caching
    const userData = await userService.getUserById(userId);

    return res.json(userData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin)
 */
router.post('/', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
    // Get admin user details from the authenticated request
    const adminUser = req.user;
    if (!adminUser || !adminUser.organizationId) {
      return res.status(400).json({ message: 'Admin user organization information is missing.' });
    }

    // Destructure using snake_case
    const { first_name, last_name, email, password, role, designation, phone_number, department_id } = req.body;

    // Validate using snake_case variables
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email, and password are required' });
    }
    if (role && !['admin', 'agent', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    // Use real database to create user
    const userRepository = getRepository(User);
    const deptMemberRepository = getRepository(DepartmentMember);
    const departmentRepository = getRepository(Department);

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = new User();
    // Assign using snake_case variables
    user.firstName = first_name;
    user.lastName = last_name;
    user.email = email;
    user.role = role as UserRole || UserRole.CUSTOMER;
    if (designation) user.designation = designation;
    if (phone_number) user.phoneNumber = phone_number; // Map phone_number to user.phoneNumber
    user.password = await bcrypt.hash(password, 10); // Hash password
    user.isActive = true;
    // Assign organization ID from the admin making the request
    user.organizationId = idToNumber(adminUser.organizationId) || 0;

    const newUser = await userRepository.save(user);

    // Handle department assignment if department_id is provided
    if (department_id) {
      try {
        const departmentId = parseInt(department_id, 10);
        const departmentExists = await departmentRepository.findOne({ where: { id: departmentId } });

        if (departmentExists) {
          const newAssignment = deptMemberRepository.create({
            userId: newUser.id,
            departmentId: departmentId
          });
          await deptMemberRepository.save(newAssignment);
          logger.info(`User ${newUser.id} assigned to department ${departmentId}`);
        } else {
          logger.warn(`Department with ID ${departmentId} not found when creating user ${newUser.id}`);
        }
      } catch (deptError) {
        logger.error('Error assigning department during user creation:', { error: deptError, userId: newUser.id, departmentId: department_id });
        // Continue with user creation even if department assignment fails
      }
    }

    // Exclude password from response (already done)
    const { password: _, ...userResponse } = newUser;
    // Consider mapping response to snake_case if needed, but frontend might handle it
    return res.status(201).json(userResponse);

  } catch (error) {
    logger.error('Error creating user:', { error });
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or Self)
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user is authorized to update this profile
    if (req.user.role !== UserRole.ADMIN && req.user.id !== userId) {
      throw new AppError('You are not authorized to update this user', 403);
    }

    const {
      first_name, last_name, email, role, designation,
      phone_number, is_active, avatar_url, timezone, language,
      department_id
    } = req.body;

    if (req.user.role !== UserRole.ADMIN && (role !== undefined || is_active !== undefined || department_id !== undefined)) {
      return res.status(403).json({ message: 'Unauthorized to update role, status, or department' });
    }

    try {
      const userRepository = getRepository(User);
      const deptMemberRepository = getRepository(DepartmentMember);
      const departmentRepository = getRepository(Department);

      const user = await userRepository.findOne({
        where: { id: userId } as any,
        relations: ['organization']
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // --- Department Assignment Logic --- 
      let updatedDepartment = null;
      if (department_id !== undefined) {
        const newDepartmentId = department_id ? parseInt(department_id, 10) : null;
        const currentAssignment = await deptMemberRepository.findOne({ where: { userId: user.id } });
        const currentDepartmentId = currentAssignment ? currentAssignment.departmentId : null;

        if (newDepartmentId !== currentDepartmentId) {
          if (currentAssignment) {
            await deptMemberRepository.remove(currentAssignment);
          }
          if (newDepartmentId !== null) {
            const departmentExists = await departmentRepository.findOne({ where: { id: newDepartmentId } });
            if (!departmentExists) {
              return res.status(400).json({ message: `Department with ID ${newDepartmentId} not found.` });
            }
            const newAssignment = deptMemberRepository.create({ userId: user.id, departmentId: newDepartmentId });
            await deptMemberRepository.save(newAssignment);
            updatedDepartment = departmentExists;
          }
        }
      }
      // --- End Department Assignment Logic ---

      // Update other user properties
      if (first_name !== undefined) user.firstName = first_name;
      if (last_name !== undefined) user.lastName = last_name;
      if (phone_number !== undefined) user.phoneNumber = phone_number;
      if (designation !== undefined) user.designation = designation;
      if (avatar_url !== undefined) user.avatarUrl = avatar_url;
      if (timezone !== undefined) user.timezone = timezone;
      if (language !== undefined) user.language = language;

      // Admin-only updates
      if (req.user.role === UserRole.ADMIN) {
        if (role !== undefined) user.role = role as UserRole;
        if (is_active !== undefined) user.isActive = is_active;
      }

      const updatedUser = await userRepository.save(user);

      if (updatedDepartment === null && department_id === undefined) {
        const finalAssignment = await deptMemberRepository.findOne({
          where: { userId: user.id },
          relations: ['department']
        });
        updatedDepartment = finalAssignment?.department || null;
      }

      const formattedUser = {
        id: updatedUser.id,
        first_name: updatedUser.firstName,
        last_name: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar_url: updatedUser.avatarUrl,
        is_active: updatedUser.isActive,
        last_login_at: updatedUser.lastLoginAt,
        designation: updatedUser.designation,
        organization: updatedUser.organization ? {
          id: updatedUser.organization.id,
          name: updatedUser.organization.name
        } : null,
        department: updatedDepartment ? {
          id: updatedDepartment.id,
          name: updatedDepartment.name
        } : null
      };

      // After successful update, invalidate user cache
      userService.invalidateUserCache(userId);

      return res.json(formattedUser);
    } catch (dbError: unknown) {
      logger.error('Database error when updating user:', { error: dbError, userId });
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return res.status(500).json({ message: 'Database error', error: errorMessage });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
    const userRepository = getRepository(User);
    const userId = req.params.id;
    const loggedInUserId = req.user.id; // Get the ID of the admin making the request

    // Check if admin is trying to delete themselves
    if (userId === loggedInUserId.toString()) { // Compare as strings potentially
      return res.status(400).json({ message: 'Administrators cannot deactivate their own account.' });
    }

    const user = await userRepository.findOne({ where: { id: userId } as any });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the target user is an admin
    if (user.role === UserRole.ADMIN) {
      return res.status(400).json({ message: 'Admin accounts cannot be deactivated.' });
    }

    // Proceed with deactivation only if checks pass
    user.isActive = false;
    await userRepository.save(user);

    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating user:', { error, userId: req.params.id });
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Admin triggers password reset for a user
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
    const userId = req.params.id;
    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } as any });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Hash token before saving to database
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Use direct query to update the user with the correct column names
    await userRepository.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [hashedToken, resetTokenExpiry, user.id]
    );

    // Get frontend URL from environment variables with fallback
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create reset URL
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Use the imported email template
    const html = getPasswordResetEmailTemplate(user.firstName, resetToken, resetUrl);

    // Try the new dedicated notification service method
    const emailSent = await notificationService.sendEmail({
      to: user.email,
      subject: 'Password Reset Requested',
      html
    });

    // Log the outcome and information about the email settings being used
    if (emailSent) {
      const settingsSummary = await notificationService.getEmailSettingsSummary();
      logger.info(`Password reset email sent successfully for user: ${userId} (email: ${user.email}) using ${settingsSummary}`);
    } else {
      logger.warn(`Failed to send password reset email for user: ${userId} (email: ${user.email}). Check email settings.`);
    }

    return res.status(200).json({
      message: `Password reset initiated for user: ${userId} (email: ${user.email})`,
      emailSent // Include whether email was sent in the response
    });

  } catch (error) {
    logger.error('Error triggering password reset:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
});

/**
 * @route   GET /api/users/:id/organization
 * @desc    Get user's organization details
 * @access  Private (Admin or Self)
 */
router.get('/:id/organization', authenticate, async (req, res) => {
  try {
    if (req.user.role !== UserRole.ADMIN && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const userRepository = getRepository(User);
    const userId = req.params.id;
    const user = await userRepository.findOne({
      where: { id: userId } as any,
      relations: ['organization']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.organization) {
      return res.status(404).json({ message: 'User has no organization assigned' });
    }

    return res.json({
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        domain: user.organization.domain
      }
    });
  } catch (error) {
    logger.error('Error fetching organization:', { error, userId: req.params.id });
    return res.status(500).json({
      message: 'Failed to fetch organization data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   DELETE /api/users/:id/avatar
 * @desc    Delete a user's avatar
 * @access  Private (Admin)
 */
router.delete('/:id/avatar', authenticate, async (req, res, next) => {
  try {
    // Authorization: Only Admins can delete avatars for now
    if (req.user.role !== UserRole.ADMIN) {
      return next(new AppError('Unauthorized: Only admins can delete avatars', 403));
    }

    const userId = req.params.id;
    const userRepository = getRepository(User);

    // Find the user
    const user = await userRepository.findOne({ where: { id: userId } as any });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if the user has an avatar URL
    if (!user.avatarUrl) {
      return res.status(200).json({ message: 'User does not have an avatar to delete' });
    }

    const currentAvatarPath = user.avatarUrl;

    // **Important:** Determine the full path to the avatar file.
    // This assumes avatarUrl stores a path relative to the project root, like '/uploads/avatars/...'
    // Adjust this logic based on your actual file storage setup.
    const avatarFilePath = path.join(__dirname, '..', '..', currentAvatarPath);
    logger.info(`Attempting to delete avatar file at: ${avatarFilePath}`);


    // Attempt to delete the file from storage
    try {
      await fs.unlink(avatarFilePath);
      logger.info(`Successfully deleted avatar file: ${avatarFilePath}`);
    } catch (fileError: any) {
      // Log the error but continue to update the DB record
      // Might happen if the DB entry exists but the file is already gone
      if (fileError.code === 'ENOENT') {
        logger.warn(`Avatar file not found at path: ${avatarFilePath}, but proceeding to clear DB record.`);
      } else {
        logger.error(`Error deleting avatar file ${avatarFilePath}:`, fileError);
        // Depending on policy, you might want to stop here or still clear the DB record
        // return next(new AppError('Failed to delete avatar file', 500));
      }
    }

    // Update the database record
    user.avatarUrl = null; // Set to null
    await userRepository.save(user);

    logger.info(`Successfully cleared avatar URL for user ${userId}`);
    res.status(200).json({ message: 'Avatar deleted successfully' });

  } catch (error) {
    logger.error(`Error deleting avatar for user ${req.params.id}:`, error);
    next(new AppError('Server error while deleting avatar', 500));
  }
});

/**
 * @route   GET /api/users/roles/agent
 * @desc    Get all users with role 'agent' or 'admin' for ticket assignment
 * @access  Private (Agents and Admins)
 */
router.get('/roles/agent', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const userRepository = getRepository(User);
    const deptMemberRepository = getRepository(DepartmentMember);
    const departmentRepository = getRepository(Department);

    // Query for users with role 'agent' or 'admin'
    const agents = await userRepository.find({
      where: [
        { role: UserRole.AGENT },
        { role: UserRole.ADMIN }
      ],
      order: { firstName: 'ASC', lastName: 'ASC' }
    });

    // For each agent, fetch their department relationship
    const agentsWithDepartments = await Promise.all(agents.map(async (agent) => {
      // Find department membership
      const departmentMember = await deptMemberRepository.findOne({
        where: { userId: agent.id },
        relations: ['department']
      });

      // Extract department info
      const department = departmentMember?.department ? {
        id: departmentMember.department.id,
        name: departmentMember.department.name
      } : null;

      return {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        role: agent.role,
        avatarUrl: agent.avatarUrl,
        designation: agent.designation,
        department // Include department info
      };
    }));

    return res.json({ agents: agentsWithDepartments });
  } catch (error) {
    logger.error('Error fetching agents list:', { error });
    return res.status(500).json({ message: 'Failed to fetch user data' });
  }
});

export default router;