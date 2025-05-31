import { User, UserRole } from '../models/User';
import { NotificationPreference } from '../models/NotificationPreference';
import { getRepository } from '../config/database';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import cacheService from './cache.service';

export interface UserPaginationOptions {
  page: number;
  limit: number;
  searchTerm?: string;
  role?: UserRole | string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface UserStats {
  total: number;
  active: number;
  admin_count: number;
  agent_count: number;
  customer_count: number;
}

class UserService {
  
  /**
   * Get paginated list of users with filters
   */
  public async getUsers(options: UserPaginationOptions) {
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      role,
      sortBy = 'createdAt',
      sortDirection = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    const cacheKey = `users:list:${page}:${limit}:${searchTerm}:${role}:${sortBy}:${sortDirection}`;
    
    // Try to get from cache first
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        const userRepository = getRepository(User);
        
        // Build query with QueryBuilder for more control and to avoid N+1 queries
        const query = userRepository.createQueryBuilder('user')
          .leftJoinAndSelect('user.organization', 'organization')
          // Eager load departmentMember and department in one query to avoid N+1
          .leftJoinAndSelect('user.departmentMember', 'departmentMember')
          .leftJoinAndSelect('departmentMember.department', 'department')
          .orderBy(`user.${sortBy}`, sortDirection)
          .skip(offset)
          .take(limit);
          
        // Apply filters
        if (role && role !== 'all') {
          query.andWhere('user.role = :role', { role });
        }
        
        if (searchTerm) {
          query.andWhere(
            '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
            { search: `%${searchTerm}%` }
          );
        }
        
        // Get total count and paginated users in a single query
        const [users, totalUsers] = await query.getManyAndCount();
        
        // Format for consistent API response
        const formattedUsers = users.map(user => ({
          id: user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          role: user.role,
          avatar_url: user.avatarUrl,
          is_active: user.isActive,
          last_login_at: user.lastLoginAt,
          designation: user.designation,
          created_at: user.createdAt,
          organization: user.organization,
          department: user.departmentMember?.department ? {
            id: user.departmentMember.department.id,
            name: user.departmentMember.department.name,
          } : null
        }));
        
        return {
          users: formattedUsers,
          pagination: {
            total: totalUsers,
            page,
            limit,
            totalPages: Math.ceil(totalUsers / limit)
          }
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Error fetching users: ${errorMessage}`);
        throw new AppError('Failed to fetch users', 500);
      }
    }, 60); // Cache for 1 minute
  }
  
  /**
   * Get user stats (counts by role, etc.)
   */
  public async getUserStats(): Promise<UserStats> {
    const cacheKey = 'users:stats';
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        const userRepository = getRepository(User);
        
        // Use a single query with COUNT and GROUP BY for better performance
        const statsQuery = userRepository.createQueryBuilder('user')
          .select('COUNT(user.id)', 'total')
          .addSelect('SUM(CASE WHEN user.isActive = true THEN 1 ELSE 0 END)', 'active')
          .addSelect('SUM(CASE WHEN user.role = :adminRole THEN 1 ELSE 0 END)', 'admin_count')
          .addSelect('SUM(CASE WHEN user.role = :agentRole THEN 1 ELSE 0 END)', 'agent_count')
          .addSelect('SUM(CASE WHEN user.role = :customerRole THEN 1 ELSE 0 END)', 'customer_count')
          .setParameters({
            adminRole: UserRole.ADMIN,
            agentRole: UserRole.AGENT,
            customerRole: UserRole.CUSTOMER
          });
          
        const result = await statsQuery.getRawOne();
        
        // Parse results as numbers
        return {
          total: parseInt(result.total) || 0,
          active: parseInt(result.active) || 0,
          admin_count: parseInt(result.admin_count) || 0,
          agent_count: parseInt(result.agent_count) || 0,
          customer_count: parseInt(result.customer_count) || 0
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Error fetching user stats: ${errorMessage}`);
        throw new AppError('Failed to fetch user statistics', 500);
      }
    }, 300); // Cache for 5 minutes
  }
  
  /**
   * Get user by ID with notification preferences
   */
  public async getUserById(userId: string) {
    const cacheKey = `users:${userId}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      try {
        const userRepository = getRepository(User);
        const preferenceRepository = getRepository(NotificationPreference);
        
        // Fetch user and preferences in parallel
        const [user, preferences] = await Promise.all([
          userRepository.findOne({
            where: { id: userId } as any,
            relations: ['organization'] // Eager load organization
          }),
          preferenceRepository.find({ where: { userId: Number(userId) } })
        ]);
        
        if (!user) {
          throw new AppError('User not found', 404);
        }
        
        // Transform preferences to expected format
        const notificationSettings: Record<string, boolean> = {};
        preferences.forEach(pref => {
          notificationSettings[pref.eventType] = 
            pref.emailEnabled || pref.pushEnabled || pref.inAppEnabled;
        });
        
        // Return user with expected field format
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          designation: user.designation,
          phoneNumber: user.phoneNumber,
          organizationId: user.organizationId,
          organization: user.organization ? { 
            id: user.organization.id, 
            name: user.organization.name 
          } : null,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          notificationSettings,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          timezone: user.timezone,
          language: user.language
        };
      } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Error fetching user by ID: ${errorMessage}`);
        throw new AppError('Failed to fetch user data', 500);
      }
    }, 60); // Cache for 1 minute
  }
  
  /**
   * Invalidate user-related caches when data changes
   */
  public invalidateUserCache(userId?: string) {
    if (userId) {
      // Invalidate specific user cache
      cacheService.delete(`users:${userId}`);
    }
    
    // Invalidate list and stats caches
    cacheService.deleteByPattern('users:list:*');
    cacheService.delete('users:stats');
  }
}

export default new UserService(); 