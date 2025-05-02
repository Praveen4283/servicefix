import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import socketService from '../services/socket.service';
import { getRepository } from '../config/database'; // Import getRepository
import { NotificationPreference } from '../models/NotificationPreference'; // Import NotificationPreference model

/**
 * NotificationController handles API endpoints for notification management
 */
class NotificationController {
  /**
   * Get notifications for the authenticated user
   * @route GET /api/notifications
   */
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Parse query parameters
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const unreadOnly = req.query.unread === 'true';

      // Fetch notifications
      const { notifications, total } = await notificationService.getUserNotifications(
        userId,
        { limit, offset, unreadOnly }
      );

      res.status(200).json({
        success: true,
        data: {
          notifications,
          pagination: {
            total,
            limit,
            offset
          }
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  /**
   * Mark a notification as read
   * @route PATCH /api/notifications/:id/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const notificationId = req.params.id;
      const success = await notificationService.markNotificationAsRead(notificationId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Notification not found or not owned by user'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification'
      });
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   * @route PATCH /api/notifications/read-all
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      await notificationService.markAllNotificationsAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notifications'
      });
    }
  }

  /**
   * Create a new notification for the authenticated user
   * @route POST /api/notifications
   */
  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Extract notification data from request body
      const { title, message, type = 'general', link, metadata } = req.body;

      if (!title || !message) {
        res.status(400).json({
          success: false,
          message: 'Title and message are required for notification'
        });
        return;
      }

      // Create notification using the service
      const success = await notificationService.createInAppNotification(
        userId,
        { title, message, type, link, metadata }
      );

      if (!success) {
        res.status(500).json({
          success: false,
          message: 'Failed to create notification'
        });
        return;
      }

      // Ideally, return the created notification object
      // For now, just sending success
      res.status(201).json({
        success: true,
        message: 'Notification created successfully'
      });

    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating notification'
      });
    }
  }

  // --- Start Test Method ---
  /**
   * Create a test notification (for testing purposes)
   * @route POST /api/notifications/test
   */
  async createTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Extract notification data from request body
      const { title, message, type = 'test' } = req.body;

      if (!title || !message) {
        res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
        return;
      }

      // Create test notification
      const success = await notificationService.createInAppNotification(
        userId,
        {
          title,
          message,
          type,
          link: req.body.link,
          metadata: req.body.metadata
        }
      );

      if (!success) {
        res.status(500).json({
          success: false,
          message: 'Failed to create test notification'
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Test notification created successfully'
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test notification'
      });
    }
  }
  // --- End Test Method ---

  /**
   * Send a test notification to a user by email or ID (admin only)
   * @route POST /api/notifications/send-test
   */
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      // This endpoint should be admin-only
      const adminId = req.user?.id.toString();
      if (!adminId || req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      // Extract parameters from the request
      const { userId, email, title, message, type = 'info' } = req.body;

      if (!userId && !email) {
        res.status(400).json({
          success: false,
          message: 'Either userId or email is required'
        });
        return;
      }

      if (!title || !message) {
        res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
        return;
      }

      // If email is provided, we'd need to look up the user
      // For demo purposes, we'll just use the provided userId
      const targetUserId = userId || '1001'; // Use default ID if none provided

      // Create the notification
      const success = await notificationService.createInAppNotification(
        targetUserId,
        {
          title,
          message,
          type,
          link: req.body.link,
          metadata: req.body.metadata
        }
      );

      if (!success) {
        res.status(500).json({
          success: false,
          message: 'Failed to create notification'
        });
        return;
      }

      // Send a direct real-time notification if the user is online
      if (socketService.isUserOnline(parseInt(targetUserId, 10))) {
        socketService.sendNotification(parseInt(targetUserId, 10), {
          title,
          message,
          type,
          timestamp: Date.now(),
          isRead: false
        });
      }

      res.status(200).json({
        success: true,
        message: `Test notification sent to user ${targetUserId}`
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  }

  /**
   * Get notification preferences for the authenticated user
   * @route GET /api/notifications/preferences
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const preferenceRepository = getRepository(NotificationPreference);
      const preferences = await preferenceRepository.find({ where: { userId: Number(userId) } });

      // If no preferences found, generate defaults (optional, frontend has defaults too)
      // if (!preferences || preferences.length === 0) {
      //   const defaultPrefs = await notificationService.generateDefaultPreferences(userId);
      //   res.status(200).json({ success: true, data: defaultPrefs });
      //   return;
      // }
      
      // Map to frontend expected format (camelCase)
      const formattedPreferences = preferences.map(p => ({
        id: p.id,
        userId: p.userId,
        eventType: p.eventType,
        emailEnabled: p.emailEnabled,
        pushEnabled: p.pushEnabled,
        inAppEnabled: p.inAppEnabled
      }));

      res.status(200).json(formattedPreferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notification preferences' });
    }
  }

  /**
   * Update multiple notification preferences for the authenticated user
   * @route PUT /api/notifications/preferences
   */
  async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const userIdNum = Number(userId); // Convert userId to number

      const { preferences } = req.body; // Expect an array { preferences: [ ... ] }
      if (!Array.isArray(preferences)) {
        res.status(400).json({ success: false, message: 'Invalid input format: preferences array is required' });
        return;
      }

      const preferenceRepository = getRepository(NotificationPreference);
      const updatedPreferences: NotificationPreference[] = [];

      for (const prefData of preferences) {
        const { eventType, emailEnabled, pushEnabled, inAppEnabled } = prefData;

        if (!eventType) {
          console.warn('Skipping preference update due to missing eventType');
          continue; // Skip if eventType is missing
        }
        
        let preference = await preferenceRepository.findOne({ where: { userId: userIdNum, eventType } });

        if (!preference) {
          preference = preferenceRepository.create({ userId: userIdNum, eventType });
        }

        preference.emailEnabled = emailEnabled ?? preference.emailEnabled ?? true;
        preference.pushEnabled = pushEnabled ?? preference.pushEnabled ?? true;
        preference.inAppEnabled = inAppEnabled ?? preference.inAppEnabled ?? true;

        updatedPreferences.push(await preferenceRepository.save(preference));
      }
      
      // Map to frontend expected format
      const formattedPreferences = updatedPreferences.map(p => ({
        id: p.id,
        userId: p.userId,
        eventType: p.eventType,
        emailEnabled: p.emailEnabled,
        pushEnabled: p.pushEnabled,
        inAppEnabled: p.inAppEnabled
      }));

      res.status(200).json(formattedPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
    }
  }
  
  /**
   * Update a single notification preference for the authenticated user
   * @route PUT /api/notifications/preferences/:eventType
   */
  async updateSingleUserPreference(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const userIdNum = Number(userId); // Convert userId to number
      const { eventType } = req.params;
      const { emailEnabled, pushEnabled, inAppEnabled } = req.body;

      if (!eventType) {
        res.status(400).json({ success: false, message: 'Event type parameter is required' });
        return;
      }

      const preferenceRepository = getRepository(NotificationPreference);
      let preference = await preferenceRepository.findOne({ where: { userId: userIdNum, eventType } });

      if (!preference) {
        preference = preferenceRepository.create({ userId: userIdNum, eventType });
      }

      if (emailEnabled !== undefined) preference.emailEnabled = emailEnabled;
      if (pushEnabled !== undefined) preference.pushEnabled = pushEnabled;
      if (inAppEnabled !== undefined) preference.inAppEnabled = inAppEnabled;

      const updatedPreference = await preferenceRepository.save(preference);
      
      // Map to frontend expected format
      const formattedPreference = {
        id: updatedPreference.id,
        userId: updatedPreference.userId,
        eventType: updatedPreference.eventType,
        emailEnabled: updatedPreference.emailEnabled,
        pushEnabled: updatedPreference.pushEnabled,
        inAppEnabled: updatedPreference.inAppEnabled
      };

      res.status(200).json(formattedPreference);
    } catch (error) {
      console.error(`Error updating notification preference for ${req.params.eventType}:`, error);
      res.status(500).json({ success: false, message: 'Failed to update notification preference' });
    }
  }

  /**
   * Delete a specific notification for the authenticated user
   * @route DELETE /api/notifications/:id
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const notificationIdParam = req.params.id;
      if (!notificationIdParam) {
        res.status(400).json({ success: false, message: 'Notification ID parameter is required' });
        return;
      }
      
      // --- Start Validation ---
      const notificationId = parseInt(notificationIdParam, 10);
      if (isNaN(notificationId)) {
        res.status(400).json({ success: false, message: 'Invalid Notification ID format. ID must be numeric.' });
        return;
      }
      // --- End Validation ---

      // Pass the parsed numeric ID to the service
      const success = await notificationService.deleteNotification(notificationId.toString(), Number(userId)); // Service expects string ID for now, will fix later if needed

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Notification not found or not owned by user'
        });
        return;
      }

      res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
  }

  // --- Start New Delete All Method ---
  /**
   * Delete all notifications for the authenticated user
   * @route DELETE /api/notifications
   */
  async deleteAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const success = await notificationService.deleteAllUserNotifications(userId);

      if (!success) {
        // This might happen due to a service error, not necessarily no notifications found
        res.status(500).json({ success: false, message: 'Failed to delete notifications due to a server error.' });
        return;
      }

      res.status(200).json({ success: true, message: 'All notifications deleted successfully' });

    } catch (error) {
      console.error('Error deleting all notifications:', error);
      res.status(500).json({ success: false, message: 'Internal server error while deleting notifications' });
    }
  }
  // --- End New Delete All Method ---
}

export default new NotificationController(); 