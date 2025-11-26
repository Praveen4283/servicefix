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
  defaultTimeZone: string;
}

// Interface for ticket settings
interface TicketSettings {
  defaultPriority: string;
  closedTicketReopen: number;
  autoCloseResolved: number;
  enableCustomerSatisfaction: boolean;
  requireCategory: boolean;
}

// Interface for SLA settings
interface SLASettings {
  organizationId: number;
  policies: Array<{
    id: number;
    name: string;
    description: string;
    organizationId: number;
    ticketPriorityId: number;
    firstResponseHours: number;
    nextResponseHours: number;
    resolutionHours: number;
    businessHoursOnly: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
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

// Interface for advanced settings
interface AdvancedSettings {
  apiEnabled: boolean;
  apiRateLimitPerHour: number;
  apiRateLimitWindowMinutes: number;
  enableApiDocumentation: boolean;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  enforceMfa: boolean;
  cacheDurationMinutes: number;
  maxConcurrentFileUploads: number;
  enableCustomFields: boolean;
  maxCustomFieldsPerTicket: number;
  enableAiSuggestions: boolean;
  enableAutoTagging: boolean;
  enableSentimentAnalysis: boolean;
  aiModelName: string;
}

// Interface for integration settings
interface IntegrationSettings {
  // Slack Integration
  slackEnabled: boolean;
  slackWebhookUrl: string;
  slackChannel: string;
  slackNotifyOnNewTicket: boolean;
  slackNotifyOnTicketUpdates: boolean;
  
  // Microsoft Teams Integration
  teamsEnabled: boolean;
  teamsWebhookUrl: string;
  teamsNotifyOnNewTicket: boolean;
  teamsNotifyOnTicketUpdates: boolean;

  // Jira Integration
  jiraEnabled: boolean;
  jiraUrl: string;
  jiraUsername: string;
  jiraApiToken: string;
  jiraProject: string;
  jiraCreateIssuesForTickets: boolean;
  
  // GitHub Integration
  githubEnabled: boolean;
  githubAccessToken: string;
  githubRepository: string;
  githubCreateIssuesForTickets: boolean;
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
    
    // Get user's email from the user record in the database
    const userResult = await query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const userData = userResult.rows[0];
    
    // Validate required fields
    if (!smtpServer || !smtpPort || !smtpUsername || !emailFromName || !emailReplyTo) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields are missing'
      });
    }
    
    // Validate user has an email
    if (!userData.email) {
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
    const userName = userData.first_name || 'User';
    
    // Send test email to the authenticated user
    await transporter.sendMail({
      from: `"${emailFromName}" <${smtpUsername}>`,
      to: userData.email,
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
    // Get the organization ID from the user
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Organization ID is required'
      });
    }
    
    // First try to get company name from the organizations table
    const orgResult = await query(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );
    
    let companyName = 'ServiceFix';
    if (orgResult.rows.length > 0) {
      companyName = orgResult.rows[0].name;
    }
    
    // Get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['general']
    );

    // If settings exist in database, return them with updated company name
    if (result.rows.length > 0) {
      const settings = result.rows[0].settings_data;
      settings.companyName = companyName; // Override with the actual company name
      
      // Remove allowGuestTickets if it exists (legacy field)
      if ('allowGuestTickets' in settings) {
        delete settings.allowGuestTickets;
      }
      
      return res.status(200).json({
        status: 'success',
        data: settings
      });
    }
    
    // If no settings found in database, return default settings
    const defaultSettings = {
      companyName,
      supportEmail: 'support@servicefix.com',
      maxFileSize: 5,
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
    const generalSettings = req.body;
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Organization ID is required'
      });
    }
    
    // Remove allowGuestTickets if it exists (legacy field)
    if ('allowGuestTickets' in generalSettings) {
      delete generalSettings.allowGuestTickets;
    }
    
    // Update the organization name in the organizations table
    await query(
      'UPDATE organizations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [generalSettings.companyName, organizationId]
    );
    
    // Update the default timezone for all users in the organization
    if (generalSettings.defaultTimeZone) {
      await query(
        'UPDATE users SET timezone = $1 WHERE organization_id = $2 AND (timezone IS NULL OR timezone = \'UTC\')',
        [generalSettings.defaultTimeZone, organizationId]
      );
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
        ['general', generalSettings]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [generalSettings, 'general']
      );
    }
    
    if (result.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        data: generalSettings
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update general settings'
      });
    }
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
      defaultPriority: 'low',
      closedTicketReopen: 2, // days
      autoCloseResolved: 0, // days
      enableCustomerSatisfaction: true,
      requireCategory: false,
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
 * Get SLA settings
 */
export const getSLASettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // First try to get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['sla']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const settings = result.rows[0].settings_data;
      
      return res.status(200).json({
        status: 'success',
        data: settings
      });
    }
    
    // If no settings found in database, try to get from SLA policies table
    try {
      // Fetch all SLA policies for the organization
      const organizationId = req.user?.organizationId || 1001; // Use default org if not provided
      
      const policiesResult = await query(
        `SELECT * FROM sla_policies 
         WHERE organization_id = $1
         ORDER BY ticket_priority_id`,
        [organizationId]
      );
      
      if (policiesResult.rows.length > 0) {
        // Map database column names to camelCase for frontend
        const policies = policiesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          organizationId: row.organization_id,
          ticketPriorityId: row.ticket_priority_id,
          firstResponseHours: row.first_response_hours,
          nextResponseHours: row.next_response_hours,
          resolutionHours: row.resolution_hours,
          businessHoursOnly: row.business_hours_only,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
        
        // Store in settings table for future use
        await query(
          'INSERT INTO settings (category, settings_data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET settings_data = $2, updated_at = CURRENT_TIMESTAMP',
          ['sla', { organizationId, policies }]
        );
        
        return res.status(200).json({
          status: 'success',
          data: { organizationId, policies }
        });
      }
    } catch (error) {
      logger.error('Error fetching SLA policies:', error);
    }
    
    // If no settings found anywhere, return empty policies array
    return res.status(200).json({
      status: 'success',
      data: { 
        organizationId: req.user?.organizationId || 1001,
        policies: []
      }
    });
  } catch (error) {
    logger.error('Error fetching SLA settings:', error);
    next(error);
  }
};

/**
 * Update SLA settings
 */
export const updateSLASettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings: SLASettings = req.body;
    
    // Validate required fields
    if (!settings.organizationId || !Array.isArray(settings.policies)) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields are missing'
      });
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

/**
 * Get advanced settings
 */
export const getAdvancedSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // First try to get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['advanced']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const settings = result.rows[0].settings_data;
      
      return res.status(200).json({
        status: 'success',
        data: settings
      });
    }
    
    // If no settings found in database, return default settings
    const defaultSettings: AdvancedSettings = {
      apiEnabled: true,
      apiRateLimitPerHour: 1000,
      apiRateLimitWindowMinutes: 15,
      enableApiDocumentation: true,
      maxLoginAttempts: 5,
      passwordExpiryDays: 90,
      sessionTimeoutMinutes: 60,
      enforceMfa: false,
      cacheDurationMinutes: 15,
      maxConcurrentFileUploads: 5,
      enableCustomFields: true,
      maxCustomFieldsPerTicket: 10,
      enableAiSuggestions: true,
      enableAutoTagging: true,
      enableSentimentAnalysis: true,
      aiModelName: 'gpt-3.5-turbo'
    };
    
    return res.status(200).json({
      status: 'success',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error fetching advanced settings:', error);
    next(error);
  }
};

/**
 * Update advanced settings
 */
export const updateAdvancedSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const advancedSettings: AdvancedSettings = req.body;
    
    // Validate required fields
    if (advancedSettings.apiRateLimitPerHour <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'API rate limit must be greater than 0'
      });
    }
    
    if (advancedSettings.apiRateLimitWindowMinutes <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Rate limit window must be greater than 0'
      });
    }
    
    // Check if settings already exist
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['advanced']
    );
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        'INSERT INTO settings (category, settings_data) VALUES ($1, $2) RETURNING *',
        ['advanced', advancedSettings]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [advancedSettings, 'advanced']
      );
    }
    
    // Update environment variables for immediate use
    process.env.API_ENABLED = advancedSettings.apiEnabled ? 'true' : 'false';
    process.env.DYNAMIC_RATE_LIMIT = advancedSettings.apiRateLimitPerHour.toString();
    process.env.RATE_LIMIT_WINDOW_MINUTES = advancedSettings.apiRateLimitWindowMinutes.toString();
    
    // Reload rate limiter if available
    try {
      // Dynamic import to avoid circular dependency
      const { updateRateLimiter } = require('../index');
      if (typeof updateRateLimiter === 'function') {
        await updateRateLimiter();
        logger.info('Rate limiter reloaded after settings update');
      }
    } catch (error) {
      logger.warn('Could not reload rate limiter settings:', error);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Advanced settings updated successfully',
      data: result.rows[0].settings_data
    });
  } catch (error) {
    logger.error('Error updating advanced settings:', error);
    next(error);
  }
};

/**
 * Get integration settings
 */
export const getIntegrationSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // First try to get settings from the database
    const result = await query(
      'SELECT * FROM settings WHERE category = $1 LIMIT 1',
      ['integration']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const settings = result.rows[0].settings_data;
      
      // Mask sensitive tokens and credentials before sending to client
      if (settings.slackWebhookUrl) {
        settings.slackWebhookUrl = maskCredential(settings.slackWebhookUrl);
      }
      if (settings.jiraApiToken) {
        settings.jiraApiToken = maskCredential(settings.jiraApiToken);
      }
      if (settings.githubAccessToken) {
        settings.githubAccessToken = maskCredential(settings.githubAccessToken);
      }
      
      return res.status(200).json({
        status: 'success',
        data: settings
      });
    }
    
    // If no settings found in database, return default settings
    const defaultSettings: IntegrationSettings = {
      // Slack Integration
      slackEnabled: false,
      slackWebhookUrl: '',
      slackChannel: '',
      slackNotifyOnNewTicket: true,
      slackNotifyOnTicketUpdates: false,
      
      // Microsoft Teams Integration
      teamsEnabled: false,
      teamsWebhookUrl: '',
      teamsNotifyOnNewTicket: true,
      teamsNotifyOnTicketUpdates: false,

      // Jira Integration
      jiraEnabled: false,
      jiraUrl: '',
      jiraUsername: '',
      jiraApiToken: '',
      jiraProject: '',
      jiraCreateIssuesForTickets: true,
      
      // GitHub Integration
      githubEnabled: false,
      githubAccessToken: '',
      githubRepository: '',
      githubCreateIssuesForTickets: true
    };
    
    return res.status(200).json({
      status: 'success',
      data: defaultSettings
    });
  } catch (error) {
    logger.error('Error fetching integration settings:', error);
    next(error);
  }
};

/**
 * Update integration settings
 */
export const updateIntegrationSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const integrationSettings = req.body;
    
    // Check if settings already exist
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['integration']
    );
    
    // Helper function to handle sensitive credentials
    const mergeCredentials = (newSettings: any, existingSettings: any) => {
      // Only update webhook URLs/tokens if they are provided and not masked
      if (newSettings.slackWebhookUrl && !newSettings.slackWebhookUrl.includes('••••')) {
        // New webhook URL provided, use it
      } else if (existingSettings && existingSettings.slackWebhookUrl) {
        // Use existing webhook URL
        newSettings.slackWebhookUrl = existingSettings.slackWebhookUrl;
      }
      
      // Similar handling for Jira token
      if (newSettings.jiraApiToken && !newSettings.jiraApiToken.includes('••••')) {
        // New token provided, use it
      } else if (existingSettings && existingSettings.jiraApiToken) {
        // Use existing token
        newSettings.jiraApiToken = existingSettings.jiraApiToken;
      }
      
      // Similar handling for GitHub token
      if (newSettings.githubAccessToken && !newSettings.githubAccessToken.includes('••••')) {
        // New token provided, use it
      } else if (existingSettings && existingSettings.githubAccessToken) {
        // Use existing token
        newSettings.githubAccessToken = existingSettings.githubAccessToken;
      }
      
      return newSettings;
    };
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        'INSERT INTO settings (category, settings_data) VALUES ($1, $2) RETURNING *',
        ['integration', integrationSettings]
      );
    } else {
      // If settings exist, merge sensitive data and update existing row
      const existingSettings = checkResult.rows[0].settings_data;
      const mergedSettings = mergeCredentials(integrationSettings, existingSettings);
      
      result = await query(
        'UPDATE settings SET settings_data = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2 RETURNING *',
        [mergedSettings, 'integration']
      );
    }
    
    // Mask sensitive data before sending response
    const responseData = { ...result.rows[0].settings_data };
    if (responseData.slackWebhookUrl) {
      responseData.slackWebhookUrl = maskCredential(responseData.slackWebhookUrl);
    }
    if (responseData.jiraApiToken) {
      responseData.jiraApiToken = maskCredential(responseData.jiraApiToken);
    }
    if (responseData.githubAccessToken) {
      responseData.githubAccessToken = maskCredential(responseData.githubAccessToken);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Integration settings updated successfully',
      data: responseData
    });
  } catch (error) {
    logger.error('Error updating integration settings:', error);
    next(error);
  }
};

// Helper function to mask credentials
function maskCredential(credential: string): string {
  if (!credential) return '';
  if (credential.length <= 8) {
    return '••••••••';
  }
  // Show first 4 and last 4 characters only
  return credential.substring(0, 4) + '••••••••' + credential.substring(credential.length - 4);
}

/**
 * Test integration connection
 */
export const testIntegrationConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type } = req.params; // slack, teams, jira, github
    const settings = req.body;
    
    // Validate input
    if (!type || !settings) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters'
      });
    }
    
    let result = false;
    let message = '';
    
    // Test each integration type
    switch (type.toLowerCase()) {
      case 'slack':
        // Test Slack webhook
        if (!settings.slackWebhookUrl || settings.slackWebhookUrl.includes('••••')) {
          // Try to get actual webhook from database if masked
          if (settings.slackWebhookUrl && settings.slackWebhookUrl.includes('••••')) {
            const dbResult = await query(
              'SELECT settings_data FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.slackWebhookUrl = dbResult.rows[0].settings_data.slackWebhookUrl || '';
            }
          }
        }
        
        if (!settings.slackWebhookUrl) {
          message = 'No Slack webhook URL provided';
        } else {
          try {
            // Test by sending a simple message to Slack
            const axios = require('axios');
            await axios.post(settings.slackWebhookUrl, {
              text: 'Test message from ServiceFix - Connection successful!'
            });
            result = true;
            message = 'Successfully connected to Slack';
          } catch (error: any) {
            message = `Failed to connect to Slack: ${error.message}`;
          }
        }
        break;
        
      case 'teams':
        // Test Teams webhook
        if (!settings.teamsWebhookUrl || settings.teamsWebhookUrl.includes('••••')) {
          // Try to get actual webhook from database if masked
          if (settings.teamsWebhookUrl && settings.teamsWebhookUrl.includes('••••')) {
            const dbResult = await query(
              'SELECT settings_data FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.teamsWebhookUrl = dbResult.rows[0].settings_data.teamsWebhookUrl || '';
            }
          }
        }
        
        if (!settings.teamsWebhookUrl) {
          message = 'No Microsoft Teams webhook URL provided';
        } else {
          try {
            // Test by sending a simple message to Teams
            const axios = require('axios');
            await axios.post(settings.teamsWebhookUrl, {
              "@type": "MessageCard",
              "@context": "http://schema.org/extensions",
              "themeColor": "0076D7",
              "summary": "ServiceFix Test Connection",
              "sections": [{
                "activityTitle": "ServiceFix Test Connection",
                "activitySubtitle": "Connection test successful",
                "text": "This is a test message from ServiceFix to verify the Teams webhook integration."
              }]
            });
            result = true;
            message = 'Successfully connected to Microsoft Teams';
          } catch (error: any) {
            message = `Failed to connect to Microsoft Teams: ${error.message}`;
          }
        }
        break;
        
      case 'jira':
        // Test Jira connection
        if (!settings.jiraUrl || !settings.jiraUsername || 
           (!settings.jiraApiToken || settings.jiraApiToken.includes('••••'))) {
          // Try to get actual token from database if masked
          if (settings.jiraApiToken && settings.jiraApiToken.includes('••••')) {
            const dbResult = await query(
              'SELECT settings_data FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.jiraApiToken = dbResult.rows[0].settings_data.jiraApiToken || '';
            }
          }
          
          if (!settings.jiraUrl || !settings.jiraUsername || !settings.jiraApiToken) {
            message = 'Missing Jira URL, username, or API token';
            break;
          }
        }
        
        try {
          // Test connection using Jira API - just fetch accessible projects
          const axios = require('axios');
          const jiraUrl = settings.jiraUrl.endsWith('/') ? 
            settings.jiraUrl.slice(0, -1) : settings.jiraUrl;
            
          const response = await axios.get(`${jiraUrl}/rest/api/2/project`, {
            auth: {
              username: settings.jiraUsername,
              password: settings.jiraApiToken
            },
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.status === 200) {
            result = true;
            message = `Successfully connected to Jira. Found ${response.data.length} projects.`;
          } else {
            message = `Unexpected response from Jira: ${response.status}`;
          }
        } catch (error: any) {
          message = `Failed to connect to Jira: ${error.message}`;
        }
        break;
        
      case 'github':
        // Test GitHub connection
        if (!settings.githubAccessToken || settings.githubAccessToken.includes('••••')) {
          // Try to get actual token from database if masked
          if (settings.githubAccessToken && settings.githubAccessToken.includes('••••')) {
            const dbResult = await query(
              'SELECT settings_data FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.githubAccessToken = dbResult.rows[0].settings_data.githubAccessToken || '';
            }
          }
          
          if (!settings.githubAccessToken) {
            message = 'No GitHub access token provided';
            break;
          }
        }
        
        try {
          // Test connection using GitHub API
          const axios = require('axios');
          const response = await axios.get('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${settings.githubAccessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (response.status === 200) {
            result = true;
            message = `Successfully connected to GitHub as ${response.data.login}`;
          } else {
            message = `Unexpected response from GitHub: ${response.status}`;
          }
        } catch (error: any) {
          message = `Failed to connect to GitHub: ${error.message}`;
        }
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported integration type: ${type}`
        });
    }
    
    return res.status(200).json({
      status: result ? 'success' : 'error',
      success: result,
      message
    });
  } catch (error) {
    logger.error(`Error testing integration connection (${req.params.type}):`, error);
    next(error);
  }
}; 