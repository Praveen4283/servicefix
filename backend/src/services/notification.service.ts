import nodemailer from 'nodemailer';

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
   * Store an in-app notification (to be implemented with a database model)
   * @param userId Recipient user ID
   * @param content Notification content
   * @returns Promise resolving to success status
   */
  async createInAppNotification(userId: string, content: NotificationContent): Promise<boolean> {
    try {
      // This would typically save to a notifications table in the database
      // For now, we'll just log it
      console.log(`In-app notification for user ${userId}:`, content);
      return true;
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      return false;
    }
  }
}

export default new NotificationService(); 