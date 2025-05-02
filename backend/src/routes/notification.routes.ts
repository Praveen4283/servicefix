import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all notification routes
router.use(authenticate);

// Get notifications for the authenticated user
router.get('/', notificationController.getUserNotifications);

// Create a new notification
router.post('/', notificationController.createNotification);

// --- Notification Preferences Endpoints --- //

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences for the authenticated user
 * @access  Private
 */
router.get(
  '/preferences',
  notificationController.getUserPreferences
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update multiple notification preferences for the authenticated user
 * @access  Private
 */
router.put(
  '/preferences',
  notificationController.updateUserPreferences
);

/**
 * @route   PUT /api/notifications/preferences/:eventType
 * @desc    Update a single notification preference for the authenticated user
 * @access  Private
 */
router.put(
  '/preferences/:eventType',
  notificationController.updateSingleUserPreference
);

// --- End Notification Preferences Endpoints --- //

// Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);
// Also support POST for the same endpoint to avoid CORS issues
router.post('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);
// Also support POST for the same endpoint to avoid CORS issues
router.post('/read-all', notificationController.markAllAsRead);

// --- Add Delete Route --- //
/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a specific notification for the authenticated user
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications for the authenticated user
 * @access  Private
 */
router.delete('/', notificationController.deleteAllNotifications);
// --- End Delete Route --- //

// Create a test notification (for development/testing)
router.post('/test', notificationController.createTestNotification);

// Send a test notification to a specific user (admin only)
router.post('/send-test', notificationController.sendTestNotification);

export default router; 