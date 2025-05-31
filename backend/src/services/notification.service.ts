import nodemailer from 'nodemailer';
import { AppDataSource } from '../config/database';
import { Notification } from '../models/Notification';
import socketService from './socket.service';
import { query } from '../config/database';
import { logger } from '../utils/logger';

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

interface EmailSettings {
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  emailFromName: string;
  emailReplyTo: string;
  enableEmailNotifications: boolean;
}

class NotificationService {
  private emailTransporter: any;
  private emailSettings: EmailSettings | null = null;
  private isInitialized: boolean = false;
  
  constructor() {
    // Use default settings from environment variables initially
    // We'll load settings from the database when it's available
    this.emailSettings = {
      smtpServer: process.env.SMTP_HOST || 'smtp.example.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUsername: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD || '',
      emailFromName: process.env.EMAIL_FROM_NAME || 'ServiceFix Support',
      emailReplyTo: process.env.EMAIL_REPLY_TO || 'support@servicefix.com',
      enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false'
    };
    
    // Initialize email transporter with environment variables
    this.createTransporter();
  }

  /**
   * Create the email transporter with current settings
   */
  private createTransporter(): void {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: this.emailSettings?.smtpServer,
        port: this.emailSettings?.smtpPort,
        secure: (this.emailSettings?.smtpPort || 0) === 465,
        auth: {
          user: this.emailSettings?.smtpUsername,
          pass: this.emailSettings?.smtpPassword,
        },
      });

      logger.info(`Email transporter initialized with server: ${this.emailSettings?.smtpServer}`);
    } catch (error) {
      logger.error('Error initializing email transporter:', error);
    }
  }

  /**
   * Initialize or refresh the email transporter with the latest settings from database
   */
  async initializeEmailTransporter() {
    if (this.isInitialized) {
      // Already initialized, just refresh
      try {
        await this.loadSettingsFromDatabase();
      } catch (error) {
        logger.warn('Error refreshing email settings, using existing settings');
      }
      return;
    }
    
    try {
      // Try to fetch email settings from database
      await this.loadSettingsFromDatabase();
      this.isInitialized = true;
    } catch (dbError: any) {
      // If database query fails, we already have environment variables as fallback
      logger.warn(`Failed to fetch email settings from database: ${dbError.message}. Using environment variables.`);
    }
  }
  
  /**
   * Load email settings from database
   */
  private async loadSettingsFromDatabase(): Promise<void> {
    const result = await query('SELECT settings_data FROM settings WHERE category = $1', ['email']);
    if (result.rows.length > 0) {
      this.emailSettings = result.rows[0].settings_data;
      logger.info('Email settings loaded from database');
      // Recreate transporter with new settings
      this.createTransporter();
    }
  }
  
  /**
   * Send an email notification
   * @param options Email options including recipient, subject, and content
   * @returns Promise resolving to success status
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Refresh email transporter to ensure we have the latest settings
      await this.initializeEmailTransporter();

      // Check if email notifications are enabled
      if (this.emailSettings && !this.emailSettings.enableEmailNotifications) {
        logger.warn('Email notifications are disabled in settings. Email not sent.');
        return false;
      }
      
      const mailOptions = {
        from: this.emailSettings?.emailFromName 
          ? `"${this.emailSettings.emailFromName}" <${this.emailSettings.smtpUsername}>`
          : process.env.EMAIL_FROM || 'noreply@servicedesk.com',
        ...options
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
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
          title: 'Notification Updated',
          message: 'Notification marked as read',
          type: 'notification_update',
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
          title: 'Notifications Updated',
          message: 'All notifications marked as read',
          type: 'notification_update',
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

  /**
   * Get a summary of the current email settings for logging
   * Returns a string like "SMTP: smtp.mailgun.org:587"
   */
  async getEmailSettingsSummary(): Promise<string> {
    // Refresh settings if they might have changed
    await this.initializeEmailTransporter();
    
    const server = this.emailSettings?.smtpServer || process.env.SMTP_HOST || 'unknown';
    const port = this.emailSettings?.smtpPort || process.env.SMTP_PORT || 'unknown';
    
    return `SMTP: ${server}:${port}`;
  }
}

export default new NotificationService(); 