import nodemailer from 'nodemailer';
import { AppDataSource } from '../config/database';
import { Notification } from '../models/Notification';
import socketService from './socket.service';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface NotificationContent {
  title: string;
  message: string;
  link?: string;
  type?: string;
  metadata?: any;
}

class NotificationService {
  private emailTransporter: any;
  
  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  
  /**
   * Send an email notification
   * @param options Email options including recipient, subject, and content
   * @returns Promise resolving to success status
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@servicedesk.com',
        ...options
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
  
  /**
   * Send ticket creation notification
   * @param userEmail Recipient email
   * @param ticketId ID of created ticket
   * @param ticketSubject Subject of created ticket
   * @returns Promise resolving to success status
   */
  async sendTicketCreationNotification(userEmail: string, ticketId: string, ticketSubject: string): Promise<boolean> {
    const subject = `[Ticket #${ticketId}] Your ticket has been created`;
    const text = `Your ticket "${ticketSubject}" has been successfully created. We'll get back to you as soon as possible.`;
    const html = `
      <h2>Your ticket has been created</h2>
      <p>Your ticket <strong>"${ticketSubject}"</strong> has been successfully created with ID: <strong>${ticketId}</strong>.</p>
      <p>We'll get back to you as soon as possible.</p>
      <p>You can view the status of your ticket by clicking <a href="${process.env.FRONTEND_URL}/tickets/${ticketId}">here</a>.</p>
    `;
    
    return this.sendEmail({ to: userEmail, subject, text, html });
  }
  
  /**
   * Send ticket update notification
   * @param userEmail Recipient email
   * @param ticketId ID of updated ticket
   * @param ticketSubject Subject of updated ticket
   * @param updateType Type of update (e.g., 'status', 'comment')
   * @returns Promise resolving to success status
   */
  async sendTicketUpdateNotification(
    userEmail: string, 
    ticketId: string, 
    ticketSubject: string, 
    updateType: string
  ): Promise<boolean> {
    const subject = `[Ticket #${ticketId}] Your ticket has been updated`;
    const text = `Your ticket "${ticketSubject}" has been updated. There's a new ${updateType} on your ticket.`;
    const html = `
      <h2>Your ticket has been updated</h2>
      <p>Your ticket <strong>"${ticketSubject}"</strong> with ID: <strong>${ticketId}</strong> has been updated.</p>
      <p>There's a new ${updateType} on your ticket.</p>
      <p>You can view the updates by clicking <a href="${process.env.FRONTEND_URL}/tickets/${ticketId}">here</a>.</p>
    `;
    
    return this.sendEmail({ to: userEmail, subject, text, html });
  }
  
  /**
   * Store an in-app notification in the database and send real-time update
   * @param userId Recipient user ID
   * @param content Notification content
   * @returns Promise resolving to success status
   */
  async createInAppNotification(userId: string, content: NotificationContent): Promise<boolean> {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      // Create a new notification entity
      const notification = new Notification();
      notification.userId = parseInt(userId, 10);
      notification.title = content.title;
      notification.message = content.message;
      notification.isRead = false;
      notification.type = content.type || 'general';
      
      if (content.link) {
        notification.link = content.link;
      }
      
      if (content.metadata) {
        notification.metadata = content.metadata;
      }
      
      // Save to database
      const savedNotification = await notificationRepository.save(notification);
      
      // Send real-time notification if user is online
      if (socketService.isUserOnline(notification.userId)) {
        socketService.sendNotification(notification.userId, {
          id: savedNotification.id,
          title: savedNotification.title,
          message: savedNotification.message,
          type: savedNotification.type,
          link: savedNotification.link,
          createdAt: savedNotification.createdAt,
          isRead: savedNotification.isRead
        });
      }
      
      // Log for debugging
      console.log(`Created in-app notification for user ${userId}:`, content);
      return true;
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      return false;
    }
  }
  
  /**
   * Get all notifications for a user
   * @param userId User ID to fetch notifications for
   * @param options Options for pagination and filtering
   * @returns Promise resolving to notifications array
   */
  async getUserNotifications(
    userId: string, 
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      const { limit = 20, offset = 0, unreadOnly = false } = options;
      
      // Build query
      const queryBuilder = notificationRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId: parseInt(userId, 10) })
        .orderBy('notification.createdAt', 'DESC')
        .take(limit)
        .skip(offset);
      
      // Add filter for unread only if specified
      if (unreadOnly) {
        queryBuilder.andWhere('notification.isRead = false');
      }
      
      // Execute query
      const [notifications, total] = await queryBuilder.getManyAndCount();
      
      return { notifications, total };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return { notifications: [], total: 0 };
    }
  }
  
  /**
   * Mark a notification as read
   * @param notificationId ID of the notification to mark as read
   * @param userId User ID for verification
   * @returns Promise resolving to success status
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      // Find the notification
      const notification = await notificationRepository.findOneBy({ 
        id: parseInt(notificationId, 10),
        userId: parseInt(userId, 10) 
      });
      
      if (!notification) {
        return false;
      }
      
      // Update notification
      notification.isRead = true;
      await notificationRepository.save(notification);
      
      // Send real-time update if user is online
      if (socketService.isUserOnline(notification.userId)) {
        socketService.sendNotification(notification.userId, {
          action: 'mark_read',
          id: notification.id
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  /**
   * Mark all notifications for a user as read
   * @param userId User ID to mark all notifications as read
   * @returns Promise resolving to success status
   */
  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      // Update all unread notifications for the user
      await notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ isRead: true })
        .where('userId = :userId AND isRead = false', { userId: parseInt(userId, 10) })
        .execute();
      
      // Send real-time update if user is online
      if (socketService.isUserOnline(parseInt(userId, 10))) {
        socketService.sendNotification(parseInt(userId, 10), {
          action: 'mark_all_read'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   * @param notificationId ID of the notification to delete
   * @param userId User ID for verification
   * @returns Promise resolving to success status
   */
  async deleteNotification(notificationId: string, userId: number): Promise<boolean> {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      
      // Delete the notification
      const result = await notificationRepository.delete({
        id: parseInt(notificationId, 10),
        userId: userId
      });
      
      // Check if any row was affected
      return result.affected !== undefined && result.affected !== null && result.affected > 0;
    } catch (error) {
      console.error(`Error deleting notification ${notificationId} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Delete all notifications for a specific user
   * @param userId User ID whose notifications should be deleted
   * @returns Promise resolving to success status
   */
  async deleteAllUserNotifications(userId: string): Promise<boolean> {
    try {
      const notificationRepository = AppDataSource.getRepository(Notification);
      const userIdNum = parseInt(userId, 10);

      if (isNaN(userIdNum)) {
        console.error('Invalid userId for deleteAllUserNotifications:', userId);
        return false;
      }
      
      // Delete all notifications for the user
      const result = await notificationRepository.delete({ userId: userIdNum });
      
      console.log(`Deleted ${result.affected ?? 0} notifications for user ${userId}`);
      return true; // Return true even if 0 were deleted
    } catch (error) {
      console.error(`Error deleting all notifications for user ${userId}:`, error);
      return false;
    }
  }
}

export default new NotificationService(); 