import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { query, pool } from '../config/database';
import dotenv from 'dotenv';

// Interface for email settings
interface EmailSettings {
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  emailFromName: string;
  emailReplyTo: string;
  enableEmailNotifications: boolean;
}

// Interface for general settings
interface GeneralSettings {
  companyName: string;
  supportEmail: string;
  maxFileSize: number;
  allowGuestTickets: boolean;
  defaultTimeZone: string;
}

// Interface for ticket settings
interface TicketSettings {
  defaultPriority: string;
  closedTicketReopen: number;
  autoCloseResolved: number;
  enableCustomerSatisfaction: boolean;
  requireCategory: boolean;
  enableSLA: boolean;
}

// Interface for SLA settings
interface SLASettings {
  organizationId: number;
  policies: any[];
}

// User interface for authenticated requests (used locally for type casting)
interface AuthenticatedUser {
  id: string;
  role: string;
  organizationId: string | null;
  email?: string;
  firstName?: string;
  first_name?: string;
}

/**
 * Get email settings
 */
export const getEmailSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // First try to get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['email']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const settings = result.rows[0].settings_data;
      
      // Mask password in response
      if (settings.smtpPassword) {
        settings.smtpPassword = '••••••••••••';
      }
      
      return res.status(200).json({
        status: 'success',
        data: settings
      });
    }
    
    // If no settings found in database, return default/environment settings
    const defaultSettings = {
      smtpServer: process.env.SMTP_HOST || 'smtp.mailgun.org',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUsername: process.env.SMTP_USER || 'postmaster@sandboxeca4aa11a2a34b0d969c416f32d7686d.mailgun.org',
      smtpPassword: '••••••••••••', // Masked for security
      emailFromName: process.env.EMAIL_FROM_NAME || 'ServiceFix Support',
      emailReplyTo: process.env.EMAIL_REPLY_TO || 'support@servicefix.com',
      enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false'
    };
    
    return res.status(200).json({
      status: 'success',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error fetching email settings:', error);
    next(error);
  }
};

/**
 * Update email settings
 */
export const updateEmailSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      smtpServer, 
      smtpPort, 
      smtpUsername, 
      smtpPassword, 
      emailFromName, 
      emailReplyTo, 
      enableEmailNotifications 
    } = req.body;
    
    // Validate required fields
    if (!smtpServer || !smtpPort || !smtpUsername || !emailFromName || !emailReplyTo) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields are missing'
      });
    }
    
    // Create settings object, maintaining existing password if not provided
    let updatedSettings: EmailSettings = {
      smtpServer,
      smtpPort: parseInt(smtpPort),
      smtpUsername,
      emailFromName,
      emailReplyTo,
      enableEmailNotifications: enableEmailNotifications === true,
      smtpPassword: '' // Initialize with empty string to avoid undefined
    };
    
    // Only update password if explicitly provided (not masked)
    if (smtpPassword && !smtpPassword.includes('••••')) {
      updatedSettings.smtpPassword = smtpPassword;
    }
    
    // Check if settings already exist
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['email']
    );
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        'INSERT INTO settings (category, settings_data) VALUES ($1, $2) RETURNING *',
        ['email', updatedSettings]
      );
    } else {
      // If we're not updating the password, we need to preserve the existing one
      if (!smtpPassword || smtpPassword.includes('••••')) {
        const existingSettings = checkResult.rows[0].settings_data;
        updatedSettings.smtpPassword = existingSettings.smtpPassword;
      }
      
      // If settings exist, update existing row
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [updatedSettings, 'email']
      );
    }
    
    // Update environment variables for immediate use
    process.env.SMTP_HOST = updatedSettings.smtpServer;
    process.env.SMTP_PORT = updatedSettings.smtpPort.toString();
    process.env.SMTP_USER = updatedSettings.smtpUsername;
    process.env.EMAIL_FROM_NAME = updatedSettings.emailFromName;
    process.env.EMAIL_REPLY_TO = updatedSettings.emailReplyTo;
    process.env.ENABLE_EMAIL_NOTIFICATIONS = updatedSettings.enableEmailNotifications ? 'true' : 'false';
    
    // If password was updated, also update environment variable
    if (updatedSettings.smtpPassword) {
      process.env.SMTP_PASSWORD = updatedSettings.smtpPassword;
    }
    
    // Get data from result and mask password for response
    const responseData = result.rows[0].settings_data;
    if (responseData.smtpPassword) {
      responseData.smtpPassword = '••••••••••••';
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Email settings updated successfully',
      data: responseData
    });
  } catch (error) {
    logger.error('Error updating email settings:', error);
    next(error);
  }
};

/**
 * Test email settings
 */
export const testEmailSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      smtpServer, 
      smtpPort, 
      smtpUsername, 
      smtpPassword, 
      emailFromName, 
      emailReplyTo 
    } = req.body;
    
    // Use type assertion instead of relying on extended Request type
    const user = req.user as AuthenticatedUser;
    
    // Validate required fields
    if (!smtpServer || !smtpPort || !smtpUsername || !emailFromName || !emailReplyTo) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields are missing'
      });
    }
    
    // Validate user has an email
    if (!user || !user.email) {
      return res.status(400).json({
        status: 'error',
        message: 'User email not found'
      });
    }
    
    // Determine which password to use
    let passwordToUse = smtpPassword;
    
    // If password is masked or not provided, try to get the stored password
    if (!smtpPassword || smtpPassword.includes('••••')) {
      const result = await query(
        'SELECT * FROM settings WHERE category = $1',
        ['email']
      );
      
      if (result.rows.length > 0) {
        passwordToUse = result.rows[0].settings_data.smtpPassword;
      } else {
        // If no stored password, try environment variable
        passwordToUse = process.env.SMTP_PASSWORD;
      }
    }
    
    if (!passwordToUse) {
      return res.status(400).json({
        status: 'error',
        message: 'SMTP password is required for testing'
      });
    }
    
    // Create test transporter
    const transporter = nodemailer.createTransport({
      host: smtpServer,
      port: parseInt(smtpPort.toString()),
      secure: parseInt(smtpPort.toString()) === 465,
      auth: {
        user: smtpUsername,
        pass: passwordToUse
      }
    });
    
    // Get user's name for the email, with fallbacks
    const userName = user.firstName || user.first_name || 'User';
    
    // Send test email to the authenticated user
    await transporter.sendMail({
      from: `"${emailFromName}" <${smtpUsername}>`,
      to: user.email,
      subject: 'ServiceFix Email Configuration Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>Hello ${userName},</p>
        <p>This is a test email to confirm that your email settings are configured correctly.</p>
        <p>If you're receiving this, it means your SMTP settings are working!</p>
        <p>Configuration tested:</p>
        <ul>
          <li>SMTP Server: ${smtpServer}</li>
          <li>SMTP Port: ${smtpPort}</li>
          <li>SMTP Username: ${smtpUsername}</li>
          <li>From Name: ${emailFromName}</li>
          <li>Reply-To: ${emailReplyTo}</li>
        </ul>
        <p>Best regards,<br>ServiceFix Team</p>
      `
    });
    
    res.status(200).json({
      status: 'success',
      success: true,
      message: 'Test email sent successfully. Please check your inbox.'
    });
  } catch (error: any) {
    logger.error('Error testing email settings:', error);
    res.status(400).json({
      status: 'error',
      success: false,
      message: `Failed to send test email: ${error.message}`
    });
  }
};

/**
 * Get general settings
 */
export const getGeneralSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['general']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        data: result.rows[0].settings_data
      });
    }
    
    // If no settings found in database, return default settings
    const defaultSettings: GeneralSettings = {
      companyName: 'ServiceFix Support',
      supportEmail: 'support@servicefix.com',
      maxFileSize: 10, // MB
      allowGuestTickets: true,
      defaultTimeZone: 'UTC'
    };
    
    return res.status(200).json({
      status: 'success',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error fetching general settings:', error);
    next(error);
  }
};

/**
 * Update general settings
 */
export const updateGeneralSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings: GeneralSettings = req.body;
    
    // Validate required fields
    if (!settings.companyName || !settings.supportEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields are missing'
      });
    }
    
    // Check if settings already exist
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['general']
    );
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        'INSERT INTO settings (category, settings_data) VALUES ($1, $2) RETURNING *',
        ['general', settings]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [settings, 'general']
      );
    }
    
    res.status(200).json({
      status: 'success',
      message: 'General settings updated successfully',
      data: result.rows[0].settings_data
    });
  } catch (error) {
    logger.error('Error updating general settings:', error);
    next(error);
  }
};

/**
 * Get ticket settings
 */
export const getTicketSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['ticket']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        data: result.rows[0].settings_data
      });
    }
    
    // If no settings found in database, return default settings
    const defaultSettings: TicketSettings = {
      defaultPriority: 'medium',
      closedTicketReopen: 7, // days
      autoCloseResolved: 3, // days
      enableCustomerSatisfaction: true,
      requireCategory: false,
      enableSLA: true
    };
    
    return res.status(200).json({
      status: 'success',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error fetching ticket settings:', error);
    next(error);
  }
};

/**
 * Update ticket settings
 */
export const updateTicketSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings: TicketSettings = req.body;
    
    // Check if settings already exist
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['ticket']
    );
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        'INSERT INTO settings (category, settings_data) VALUES ($1, $2) RETURNING *',
        ['ticket', settings]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [settings, 'ticket']
      );
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Ticket settings updated successfully',
      data: result.rows[0].settings_data
    });
  } catch (error) {
    logger.error('Error updating ticket settings:', error);
    next(error);
  }
};

/**
 * Get SLA settings (stored policies)
 */
export const getSLASettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['sla']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        data: result.rows[0].settings_data
      });
    }
    
    // If no settings found in database, return empty settings
    const defaultSettings: SLASettings = {
      organizationId: 1001,
      policies: []
    };
    
    return res.status(200).json({
      status: 'success',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error fetching SLA settings:', error);
    next(error);
  }
};

/**
 * Update SLA settings (stored policies)
 */
export const updateSLASettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings: SLASettings = req.body;
    
    // Validate organization ID
    if (!settings.organizationId) {
      settings.organizationId = 1001; // Default organization ID
    }
    
    // Check if settings already exist
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['sla']
    );
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        'INSERT INTO settings (category, settings_data) VALUES ($1, $2) RETURNING *',
        ['sla', settings]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [settings, 'sla']
      );
    }
    
    res.status(200).json({
      status: 'success',
      message: 'SLA settings updated successfully',
      data: result.rows[0].settings_data
    });
  } catch (error) {
    logger.error('Error updating SLA settings:', error);
    next(error);
  }
}; 