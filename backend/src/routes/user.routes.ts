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

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination)
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search as string || '';
    const roleFilter = req.query.role as string;

    const userRepository = getRepository(User);

    // --- Use QueryBuilder for flexible filtering and joins --- 
    const query = userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')
      .leftJoinAndSelect('user.departmentMember', 'departmentMember')
      .leftJoinAndSelect('departmentMember.department', 'department')
      .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit);
      
    // --- Apply Filters --- 
    if (roleFilter && roleFilter !== 'all') {
      query.andWhere('user.role = :role', { role: roleFilter });
    }
    
    if (searchTerm) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${searchTerm}%` }
      );
    }
    // --- End Apply Filters --- 

    // Get total count and paginated users
    const [users, totalUsers] = await query.getManyAndCount();
    
    console.log("[GET /api/users] Raw users from DB:", JSON.stringify(users, null, 2));
    
    // Map backend camelCase to frontend snake_case, including department
    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      role: user.role,
      avatar_url: user.avatarUrl,
      is_active: user.isActive,
      last_login_at: user.lastLoginAt,
      designation: user.jobTitle,
      created_at: user.createdAt,
      organization: user.organization,
      department: user.departmentMember?.department ? {
         id: user.departmentMember.department.id,
         name: user.departmentMember.department.name,
      } : null
    }));

    console.log("[GET /api/users] Sending formatted users:", JSON.stringify(formattedUsers, null, 2));

    return res.json({
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
    const userRepository = getRepository(User);

    const total = await userRepository.count();
    const active = await userRepository.count({ where: { isActive: true } });
    const admin_count = await userRepository.count({ where: { role: UserRole.ADMIN } });
    const agent_count = await userRepository.count({ where: { role: UserRole.AGENT } });
    const customer_count = await userRepository.count({ where: { role: UserRole.CUSTOMER } });

    return res.json({
      total,
      active,
      admin_count,
      agent_count,
      customer_count
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    // Check if it's a TypeORM metadata error specifically
    if (error instanceof Error && error.constructor.name === 'EntityMetadataNotFoundError') {
      console.error('EntityMetadataNotFoundError: Ensure all entities are correctly registered in the DataSource.');
      return res.status(500).json({ message: 'Server configuration error related to entity metadata.' });
    }
    return res.status(500).json({ message: 'Failed to fetch user stats', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or Self)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== UserRole.ADMIN && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const userId = req.params.id;
    
    try {
      const userRepository = getRepository(User);
      const preferenceRepository = getRepository(NotificationPreference);
      
      const [user, preferences] = await Promise.all([
        userRepository.findOne({ 
          where: { id: userId } as any,
          relations: ['organization'] 
        }),
        preferenceRepository.find({ where: { userId: Number(userId) } })
      ]);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Transform backend preferences to frontend format
      const notificationSettings: Record<string, boolean> = {};
      preferences.forEach(pref => {
        // Consider the setting enabled if any channel is enabled
        notificationSettings[pref.eventType] = pref.emailEnabled || pref.pushEnabled || pref.inAppEnabled;
      });
      
      const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle, 
        phoneNumber: user.phoneNumber,
        organizationId: user.organizationId,
        organization: user.organization ? { id: user.organization.id, name: user.organization.name } : null,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        notificationSettings: notificationSettings, // Add transformed settings
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        timezone: user.timezone,
        language: user.language
      };
      
      return res.json(userData);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      return res.status(500).json({ message: 'Failed to fetch user data', error: error.message });
    }

  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error' });
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
    const { first_name, last_name, email, password, role, job_title, phone_number, department_id } = req.body;
    
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
    if (job_title) user.jobTitle = job_title; // Map job_title to user.jobTitle
    if (phone_number) user.phoneNumber = phone_number; // Map phone_number to user.phoneNumber
    user.password = await bcrypt.hash(password, 10); // Hash password
    user.isActive = true;
    // Assign organization ID from the admin making the request
    user.organizationId = parseInt(adminUser.organizationId, 10); // Parse string ID to number
    
    const newUser = await userRepository.save(user);
    
    // Handle department assignment if department_id is provided
    if (department_id) {
      try {
        const departmentId = parseInt(department_id, 10);
        const departmentExists = await departmentRepository.findOne({where: {id: departmentId}});
        
        if (departmentExists) {
          const newAssignment = deptMemberRepository.create({ 
            userId: newUser.id, 
            departmentId: departmentId 
          });
          await deptMemberRepository.save(newAssignment);
          console.log(`User ${newUser.id} assigned to department ${departmentId}`);
        } else {
          console.warn(`Department with ID ${departmentId} not found when creating user ${newUser.id}`);
        }
      } catch (deptError) {
        console.error('Error assigning department during user creation:', deptError);
        // Continue with user creation even if department assignment fails
      }
    }
    
    // Exclude password from response (already done)
    const { password: _, ...userResponse } = newUser;
    // Consider mapping response to snake_case if needed, but frontend might handle it
    return res.status(201).json(userResponse);

  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or Self)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== UserRole.ADMIN && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { 
      first_name, last_name, email, role, job_title, 
      phone_number, is_active, avatar_url, timezone, language, 
      notification_settings,
      department_id
    } = req.body;
    
    if (req.user.role !== UserRole.ADMIN && (role !== undefined || is_active !== undefined || department_id !== undefined)) {
      return res.status(403).json({ message: 'Unauthorized to update role, status, or department' });
    }
    
    try {
      const userRepository = getRepository(User);
      const deptMemberRepository = getRepository(DepartmentMember);
      const departmentRepository = getRepository(Department);
      
      const userId = req.params.id;
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
             const departmentExists = await departmentRepository.findOne({where: {id: newDepartmentId}});
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
      if (job_title !== undefined) user.jobTitle = job_title;
      if (avatar_url !== undefined) user.avatarUrl = avatar_url;
      if (timezone !== undefined) user.timezone = timezone;
      if (language !== undefined) user.language = language;
      
      // Notification settings update
      if (notification_settings && typeof notification_settings === 'object') {
        const preferenceRepository = getRepository(NotificationPreference);
        const existingPreferences = await preferenceRepository.find({ where: { userId: Number(userId) } });
        const preferencesMap = new Map(existingPreferences.map(p => [p.eventType, p]));
        const preferencesToSave: NotificationPreference[] = [];

        for (const eventType in notification_settings) {
          if (Object.prototype.hasOwnProperty.call(notification_settings, eventType)) {
            const isEnabled = !!notification_settings[eventType];

            const existingPref = preferencesMap.get(eventType);
            if (existingPref) {
              if (existingPref.emailEnabled !== isEnabled || existingPref.pushEnabled !== isEnabled || existingPref.inAppEnabled !== isEnabled) {
                existingPref.emailEnabled = isEnabled;
                existingPref.pushEnabled = isEnabled;
                existingPref.inAppEnabled = isEnabled;
                preferencesToSave.push(existingPref);
              }
            } else {
              const newPref = preferenceRepository.create({
                userId: userId as any,
                eventType: eventType,
                emailEnabled: isEnabled,
                pushEnabled: isEnabled,
                inAppEnabled: isEnabled,
              });
              preferencesToSave.push(newPref);
            }
          } else {
             console.warn(`Issue processing notification_settings key: '${eventType}' for user ${userId}.`);
          }
        }
        
        if (preferencesToSave.length > 0) {
          await preferenceRepository.save(preferencesToSave);
        }
      }
      
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
         designation: updatedUser.jobTitle,
         organization: updatedUser.organization ? {
           id: updatedUser.organization.id,
           name: updatedUser.organization.name
         } : null,
         department: updatedDepartment ? {
           id: updatedDepartment.id,
           name: updatedDepartment.name
         } : null
      };
      return res.json(formattedUser);
    } catch (dbError: any) {
      console.error('Database error when updating user:', dbError);
      return res.status(500).json({ message: 'Database error', error: dbError.message });
    }

  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
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
    } catch (dbError: any) {
      console.error('Database error when deactivating user:', dbError);
      return res.status(500).json({ message: 'Database error', error: dbError.message });
    }

  } catch (error) {
    console.error('Error deactivating user:', error);
    return res.status(500).json({ message: 'Server error' });
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

    // TODO: Implement actual password reset logic
    // This likely involves:
    // 1. Generating a secure reset token (similar to forgotPassword in auth.controller)
    // 2. Saving the token and expiry to the user record
    // 3. Sending an email to the user with the reset link/token
    // Example (needs actual implementation):
    // await triggerPasswordResetEmail(user.email);

    console.log(`Password reset triggered for user: ${userId} (email: ${user.email}) - Placeholder`);

    return res.status(200).json({ message: 'Password reset initiated successfully' });

  } catch (error) {
    console.error('Error triggering password reset:', error);
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
    
    try {
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
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      return res.status(500).json({ message: 'Failed to fetch organization data', error: error.message });
    }

  } catch (error) {
    console.error('Error fetching organization:', error);
    return res.status(500).json({ message: 'Server error' });
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

export default router;