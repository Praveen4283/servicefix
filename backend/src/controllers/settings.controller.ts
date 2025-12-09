import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { query, pool } from '../config/database';
import dotenv from 'dotenv';
import crypto from 'crypto';

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
  // NEW: Dynamic AI configuration
  aiProvider?: 'gemini' | 'openai' | 'custom';
  aiApiKey?: string; // Stored encrypted
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

// Encryption helpers for securing API keys
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-32-char-key-change-prod'; // Must be 32 bytes
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data like API keys
 */
function encryptApiKey(apiKey: string): string {
  try {
    // Ensure encryption key is 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Error encrypting API key:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt sensitive data like API keys
 */
function decryptApiKey(encrypted: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting API key:', error);
    throw new Error('Decryption failed');
  }
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
      const row = result.rows[0];

      const settings: EmailSettings = {
        smtpServer: row.smtp_server,
        smtpPort: row.smtp_port,
        smtpUsername: row.smtp_username,
        smtpPassword: row.smtp_password,
        emailFromName: row.email_from_name,
        emailReplyTo: row.email_reply_to,
        enableEmailNotifications: row.enable_email_notifications
      };

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
      smtpPassword: '', // Initialize with empty string
      emailFromName,
      emailReplyTo,
      enableEmailNotifications: enableEmailNotifications === true
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
        `INSERT INTO settings (
          category, settings_data, 
          smtp_server, smtp_port, smtp_username, smtp_password, 
          email_from_name, email_reply_to, enable_email_notifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          'email', {}, // Empty JSON for settings_data
          updatedSettings.smtpServer,
          updatedSettings.smtpPort,
          updatedSettings.smtpUsername,
          updatedSettings.smtpPassword,
          updatedSettings.emailFromName,
          updatedSettings.emailReplyTo,
          updatedSettings.enableEmailNotifications
        ]
      );
    } else {
      // If we're not updating the password, we need to preserve the existing one
      if (!smtpPassword || smtpPassword.includes('••••')) {
        updatedSettings.smtpPassword = checkResult.rows[0].smtp_password;
      }

      // If settings exist, update existing row
      result = await query(
        `UPDATE settings SET 
          smtp_server = $1, 
          smtp_port = $2, 
          smtp_username = $3, 
          smtp_password = $4, 
          email_from_name = $5, 
          email_reply_to = $6, 
          enable_email_notifications = $7,
          updated_at = CURRENT_TIMESTAMP 
        WHERE category = $8 RETURNING *`,
        [
          updatedSettings.smtpServer,
          updatedSettings.smtpPort,
          updatedSettings.smtpUsername,
          updatedSettings.smtpPassword,
          updatedSettings.emailFromName,
          updatedSettings.emailReplyTo,
          updatedSettings.enableEmailNotifications,
          'email'
        ]
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

    // Prepare response data
    const responseData = {
      ...updatedSettings
    };

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
        'SELECT smtp_password FROM settings WHERE category = $1',
        ['email']
      );

      if (result.rows.length > 0) {
        passwordToUse = result.rows[0].smtp_password;
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
  } catch (error: unknown) {
    logger.error('Error testing email settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      status: 'error',
      success: false,
      message: `Failed to send test email: ${message}`
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
      'SELECT company_name, support_email, max_file_size, default_time_zone FROM settings WHERE category = $1 LIMIT 1',
      ['general']
    );

    // If settings exist in database, return them with updated company name
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const settings: GeneralSettings = {
        companyName: companyName, // Use the one from organizations table
        supportEmail: row.support_email,
        maxFileSize: row.max_file_size,
        defaultTimeZone: row.default_time_zone
      };

      return res.status(200).json({
        status: 'success',
        data: settings
      });
    }

    // If no settings found in database, return default settings
    const defaultSettings = {
      companyName,
      supportEmail: 'support@servicefix.com',
      maxFileSize: 10, // MB - matches frontend config
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
        `INSERT INTO settings (
          category,
          company_name, support_email, max_file_size, default_time_zone
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          'general',
          generalSettings.companyName,
          generalSettings.supportEmail,
          generalSettings.maxFileSize,
          generalSettings.defaultTimeZone
        ]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        `UPDATE settings SET 
          company_name = $1, 
          support_email = $2, 
          max_file_size = $3, 
          default_time_zone = $4,
          updated_at = CURRENT_TIMESTAMP 
        WHERE category = $5 RETURNING *`,
        [
          generalSettings.companyName,
          generalSettings.supportEmail,
          generalSettings.maxFileSize,
          generalSettings.defaultTimeZone,
          'general'
        ]
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
      'SELECT default_priority, closed_ticket_reopen, auto_close_resolved, enable_customer_satisfaction, require_category FROM settings WHERE category = $1 LIMIT 1',
      ['ticket']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const settings: TicketSettings = {
        defaultPriority: row.default_priority,
        closedTicketReopen: row.closed_ticket_reopen,
        autoCloseResolved: row.auto_close_resolved,
        enableCustomerSatisfaction: row.enable_customer_satisfaction,
        requireCategory: row.require_category
      };

      return res.status(200).json({
        status: 'success',
        data: settings
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
        `INSERT INTO settings (
          category,
          default_priority, closed_ticket_reopen, auto_close_resolved, 
          enable_customer_satisfaction, require_category
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          'ticket',
          settings.defaultPriority,
          settings.closedTicketReopen,
          settings.autoCloseResolved,
          settings.enableCustomerSatisfaction,
          settings.requireCategory
        ]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        `UPDATE settings SET 
          default_priority = $1, 
          closed_ticket_reopen = $2, 
          auto_close_resolved = $3, 
          enable_customer_satisfaction = $4, 
          require_category = $5,
          updated_at = CURRENT_TIMESTAMP 
        WHERE category = $6 RETURNING *`,
        [
          settings.defaultPriority,
          settings.closedTicketReopen,
          settings.autoCloseResolved,
          settings.enableCustomerSatisfaction,
          settings.requireCategory,
          'ticket'
        ]
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Ticket settings updated successfully',
      data: settings
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
    // Get organization ID from authenticated user
    const organizationId = req.user?.organizationId || 1001;

    // Fetch SLA policies directly from sla_policies table
    const policiesResult = await query(
      `SELECT * FROM sla_policies 
       WHERE organization_id = $1
       ORDER BY ticket_priority_id`,
      [organizationId]
    );

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

    return res.status(200).json({
      status: 'success',
      data: { organizationId, policies }
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

    // Update SLA policies in the sla_policies table
    // This is a simplified approach - in production you might want to:
    // 1. Delete existing policies for this organization
    // 2. Insert new policies
    // Or use UPSERT logic for each policy

    // For now, we'll just return success since SLA policies are managed 
    // through dedicated SLA policy endpoints (POST /api/sla, PUT /api/sla/:id, etc.)
    // The settings endpoint is mainly for retrieving the current policies

    res.status(200).json({
      status: 'success',
      message: 'SLA settings updated successfully. Please use dedicated SLA policy endpoints for detailed management.',
      data: {
        organizationId: settings.organizationId,
        policies: settings.policies
      }
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
      'SELECT api_enabled, api_rate_limit_per_hour, api_rate_limit_window_minutes, enable_api_documentation, max_login_attempts, password_expiry_days, session_timeout_minutes, enforce_mfa, cache_duration_minutes, max_concurrent_file_uploads, enable_custom_fields, max_custom_fields_per_ticket, enable_ai_suggestions, enable_auto_tagging, enable_sentiment_analysis, ai_model_name, ai_provider, ai_api_key FROM settings WHERE category = $1 LIMIT 1',
      ['advanced']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const settings: AdvancedSettings = {
        // API settings
        apiEnabled: row.api_enabled,
        apiRateLimitPerHour: row.api_rate_limit_per_hour,
        apiRateLimitWindowMinutes: row.api_rate_limit_window_minutes,
        enableApiDocumentation: row.enable_api_documentation,

        // Security settings
        maxLoginAttempts: row.max_login_attempts,
        passwordExpiryDays: row.password_expiry_days,
        sessionTimeoutMinutes: row.session_timeout_minutes,
        enforceMfa: row.enforce_mfa,

        // Performance settings
        cacheDurationMinutes: row.cache_duration_minutes,
        maxConcurrentFileUploads: row.max_concurrent_file_uploads,

        // Custom fields
        enableCustomFields: row.enable_custom_fields,
        maxCustomFieldsPerTicket: row.max_custom_fields_per_ticket,

        // AI features
        enableAiSuggestions: row.enable_ai_suggestions,
        enableAutoTagging: row.enable_auto_tagging,
        enableSentimentAnalysis: row.enable_sentiment_analysis,
        aiModelName: row.ai_model_name,
        aiProvider: row.ai_provider,
        aiApiKey: row.ai_api_key
      };

      // Mask AI API key for security
      if (settings.aiApiKey) {
        settings.aiApiKey = '••••••••••••';
      }

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
      aiModelName: 'gemini-2.5-pro-exp-03-25', // Correct Gemini model
      aiProvider: 'gemini' // Default provider
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

    // Validate AI provider if provided
    if (advancedSettings.aiProvider && !['gemini', 'openai', 'custom'].includes(advancedSettings.aiProvider)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid AI provider. Must be gemini, openai, or custom'
      });
    }

    // Check if settings already exist to preserve existing API key if not updated
    const checkResult = await query(
      'SELECT * FROM settings WHERE category = $1',
      ['advanced']
    );

    // Encrypt AI API key if provided and not masked
    if (advancedSettings.aiApiKey && !advancedSettings.aiApiKey.includes('••••')) {
      advancedSettings.aiApiKey = encryptApiKey(advancedSettings.aiApiKey);
    } else if (advancedSettings.aiApiKey && advancedSettings.aiApiKey.includes('••••')) {
      // If masked, preserve existing encrypted key
      if (checkResult.rows.length > 0) {
        advancedSettings.aiApiKey = checkResult.rows[0].ai_api_key;
      }
    }

    let result;

    if (checkResult.rows.length === 0) {
      // If settings don't exist, insert new row
      result = await query(
        `INSERT INTO settings (
          category,
          api_enabled, api_rate_limit_per_hour, api_rate_limit_window_minutes, enable_api_documentation,
          max_login_attempts, password_expiry_days, session_timeout_minutes, enforce_mfa,
          cache_duration_minutes, max_concurrent_file_uploads,
          enable_custom_fields, max_custom_fields_per_ticket,
          enable_ai_suggestions, enable_auto_tagging, enable_sentiment_analysis, ai_model_name,
          ai_provider, ai_api_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
        [
          'advanced',
          advancedSettings.apiEnabled, advancedSettings.apiRateLimitPerHour, advancedSettings.apiRateLimitWindowMinutes, advancedSettings.enableApiDocumentation,
          advancedSettings.maxLoginAttempts, advancedSettings.passwordExpiryDays, advancedSettings.sessionTimeoutMinutes, advancedSettings.enforceMfa,
          advancedSettings.cacheDurationMinutes, advancedSettings.maxConcurrentFileUploads,
          advancedSettings.enableCustomFields, advancedSettings.maxCustomFieldsPerTicket,
          advancedSettings.enableAiSuggestions, advancedSettings.enableAutoTagging, advancedSettings.enableSentimentAnalysis, advancedSettings.aiModelName,
          advancedSettings.aiProvider, advancedSettings.aiApiKey
        ]
      );
    } else {
      // If settings exist, update existing row
      result = await query(
        `UPDATE settings SET 
          api_enabled = $1, api_rate_limit_per_hour = $2, api_rate_limit_window_minutes = $3, enable_api_documentation = $4,
          max_login_attempts = $5, password_expiry_days = $6, session_timeout_minutes = $7, enforce_mfa = $8,
          cache_duration_minutes = $9, max_concurrent_file_uploads = $10,
          enable_custom_fields = $11, max_custom_fields_per_ticket = $12,
          enable_ai_suggestions = $13, enable_auto_tagging = $14, enable_sentiment_analysis = $15, ai_model_name = $16,
          ai_provider = $17, ai_api_key = $18,
          updated_at = CURRENT_TIMESTAMP 
        WHERE category = $19 RETURNING *`,
        [
          advancedSettings.apiEnabled, advancedSettings.apiRateLimitPerHour, advancedSettings.apiRateLimitWindowMinutes, advancedSettings.enableApiDocumentation,
          advancedSettings.maxLoginAttempts, advancedSettings.passwordExpiryDays, advancedSettings.sessionTimeoutMinutes, advancedSettings.enforceMfa,
          advancedSettings.cacheDurationMinutes, advancedSettings.maxConcurrentFileUploads,
          advancedSettings.enableCustomFields, advancedSettings.maxCustomFieldsPerTicket,
          advancedSettings.enableAiSuggestions, advancedSettings.enableAutoTagging, advancedSettings.enableSentimentAnalysis, advancedSettings.aiModelName,
          advancedSettings.aiProvider, advancedSettings.aiApiKey,
          'advanced'
        ]
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

    // Reload AI service settings
    try {
      const aiService = (await import('../services/ai.service')).default;
      await aiService.loadSettings();
      logger.info('AI service settings reloaded after update');
    } catch (error) {
      logger.warn('Could not reload AI service settings:', error);
    }

    // Mask API key in response
    const responseData = { ...advancedSettings };
    if (responseData.aiApiKey) {
      responseData.aiApiKey = '••••••••••••';
    }

    res.status(200).json({
      status: 'success',
      message: 'Advanced settings updated successfully',
      data: responseData
    });
  } catch (error) {
    logger.error('Error updating advanced settings:', error);
    next(error);
  }
};

/**
 * Test AI configuration
 */
export const testAIConfiguration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { apiKey, modelName, provider } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'API key is required for testing'
      });
    }

    // Dynamic import to avoid circular dependency
    const aiServiceModule = await import('../services/ai.service');
    const AIServiceClass = aiServiceModule.default.constructor;

    // Create a temporary instance or use a static method if possible
    // Since AIService is a singleton instance, we might need a way to test with specific credentials
    // For now, we'll try to use the analyzeSentiment method with the provided credentials
    // But AIService doesn't expose a way to set credentials temporarily on the singleton

    // Better approach: Create a temporary test function in AIService or here
    // Let's use axios directly here to test the connection to avoid messing with the singleton state

    let success = false;
    let message = '';

    if (provider === 'gemini') {
      const axios = require('axios');
      const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      const model = modelName || 'gemini-2.5-pro-exp-03-25';

      try {
        await axios.post(
          `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
          {
            contents: [{ role: 'user', parts: [{ text: 'Test connection' }] }],
            generationConfig: { maxOutputTokens: 10 }
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        success = true;
        message = 'Gemini connection successful';
      } catch (error: unknown) {
        success = false;
        const errorObj = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
        message = errorObj.response?.data?.error?.message || errorObj.message || 'Connection failed';
      }
    } else {
      // Placeholder for other providers
      return res.status(400).json({
        status: 'error',
        message: 'Only Gemini provider is currently supported for testing'
      });
    }

    if (success) {
      return res.status(200).json({
        status: 'success',
        message
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message
      });
    }
  } catch (error) {
    logger.error('Error testing AI configuration:', error);
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
      'SELECT slack_enabled, slack_webhook_url, slack_channel, slack_notify_on_new_ticket, slack_notify_on_ticket_updates, teams_enabled, teams_webhook_url, teams_notify_on_new_ticket, teams_notify_on_ticket_updates, jira_enabled, jira_url, jira_username, jira_api_token, jira_project, jira_create_issues_for_tickets, github_enabled, github_access_token, github_repository, github_create_issues_for_tickets FROM settings WHERE category = $1 LIMIT 1',
      ['integration']
    );

    // If settings exist in database, return them
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const settings: IntegrationSettings = {
        // Slack Integration
        slackEnabled: row.slack_enabled,
        slackWebhookUrl: row.slack_webhook_url,
        slackChannel: row.slack_channel,
        slackNotifyOnNewTicket: row.slack_notify_on_new_ticket,
        slackNotifyOnTicketUpdates: row.slack_notify_on_ticket_updates,

        // Microsoft Teams Integration
        teamsEnabled: row.teams_enabled,
        teamsWebhookUrl: row.teams_webhook_url,
        teamsNotifyOnNewTicket: row.teams_notify_on_new_ticket,
        teamsNotifyOnTicketUpdates: row.teams_notify_on_ticket_updates,

        // Jira Integration
        jiraEnabled: row.jira_enabled,
        jiraUrl: row.jira_url,
        jiraUsername: row.jira_username,
        jiraApiToken: row.jira_api_token,
        jiraProject: row.jira_project,
        jiraCreateIssuesForTickets: row.jira_create_issues_for_tickets,

        // GitHub Integration
        githubEnabled: row.github_enabled,
        githubAccessToken: row.github_access_token,
        githubRepository: row.github_repository,
        githubCreateIssuesForTickets: row.github_create_issues_for_tickets
      };

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
    const mergeCredentials = (newSettings: IntegrationSettings, existingSettings: Partial<IntegrationSettings> | null) => {
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
        `INSERT INTO settings (
          category,
          slack_enabled, slack_webhook_url, slack_channel, slack_notify_on_new_ticket, slack_notify_on_ticket_updates,
          teams_enabled, teams_webhook_url, teams_notify_on_new_ticket, teams_notify_on_ticket_updates,
          jira_enabled, jira_url, jira_username, jira_api_token, jira_project, jira_create_issues_for_tickets,
          github_enabled, github_access_token, github_repository, github_create_issues_for_tickets
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
        [
          'integration',
          integrationSettings.slackEnabled, integrationSettings.slackWebhookUrl, integrationSettings.slackChannel, integrationSettings.slackNotifyOnNewTicket, integrationSettings.slackNotifyOnTicketUpdates,
          integrationSettings.teamsEnabled, integrationSettings.teamsWebhookUrl, integrationSettings.teamsNotifyOnNewTicket, integrationSettings.teamsNotifyOnTicketUpdates,
          integrationSettings.jiraEnabled, integrationSettings.jiraUrl, integrationSettings.jiraUsername, integrationSettings.jiraApiToken, integrationSettings.jiraProject, integrationSettings.jiraCreateIssuesForTickets,
          integrationSettings.githubEnabled, integrationSettings.githubAccessToken, integrationSettings.githubRepository, integrationSettings.githubCreateIssuesForTickets
        ]
      );
    } else {
      // If settings exist, merge sensitive data and update existing row
      const existingRow = checkResult.rows[0];
      // We need to construct an object that looks like the old settings for the merge function
      const existingSettings = {
        slackWebhookUrl: existingRow.slack_webhook_url,
        jiraApiToken: existingRow.jira_api_token,
        githubAccessToken: existingRow.github_access_token
      };

      const mergedSettings = mergeCredentials(integrationSettings, existingSettings);

      result = await query(
        `UPDATE settings SET 
          slack_enabled = $1, slack_webhook_url = $2, slack_channel = $3, slack_notify_on_new_ticket = $4, slack_notify_on_ticket_updates = $5,
          teams_enabled = $6, teams_webhook_url = $7, teams_notify_on_new_ticket = $8, teams_notify_on_ticket_updates = $9,
          jira_enabled = $10, jira_url = $11, jira_username = $12, jira_api_token = $13, jira_project = $14, jira_create_issues_for_tickets = $15,
          github_enabled = $16, github_access_token = $17, github_repository = $18, github_create_issues_for_tickets = $19,
          updated_at = CURRENT_TIMESTAMP 
        WHERE category = $20 RETURNING *`,
        [
          mergedSettings.slackEnabled, mergedSettings.slackWebhookUrl, mergedSettings.slackChannel, mergedSettings.slackNotifyOnNewTicket, mergedSettings.slackNotifyOnTicketUpdates,
          mergedSettings.teamsEnabled, mergedSettings.teamsWebhookUrl, mergedSettings.teamsNotifyOnNewTicket, mergedSettings.teamsNotifyOnTicketUpdates,
          mergedSettings.jiraEnabled, mergedSettings.jiraUrl, mergedSettings.jiraUsername, mergedSettings.jiraApiToken, mergedSettings.jiraProject, mergedSettings.jiraCreateIssuesForTickets,
          mergedSettings.githubEnabled, mergedSettings.githubAccessToken, mergedSettings.githubRepository, mergedSettings.githubCreateIssuesForTickets,
          'integration'
        ]
      );
    }

    // Mask sensitive data before sending response
    // We can use the input settings as they are now updated
    const responseData = { ...integrationSettings };
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
              'SELECT slack_webhook_url FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.slackWebhookUrl = dbResult.rows[0].slack_webhook_url || '';
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
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            message = `Failed to connect to Slack: ${errorMessage}`;
          }
        }
        break;

      case 'teams':
        // Test Teams webhook
        if (!settings.teamsWebhookUrl || settings.teamsWebhookUrl.includes('••••')) {
          // Try to get actual webhook from database if masked
          if (settings.teamsWebhookUrl && settings.teamsWebhookUrl.includes('••••')) {
            const dbResult = await query(
              'SELECT teams_webhook_url FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.teamsWebhookUrl = dbResult.rows[0].teams_webhook_url || '';
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
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            message = `Failed to connect to Microsoft Teams: ${errorMessage}`;
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
              'SELECT jira_api_token FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.jiraApiToken = dbResult.rows[0].jira_api_token || '';
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          message = `Failed to connect to Jira: ${errorMessage}`;
        }
        break;

      case 'github':
        // Test GitHub connection
        if (!settings.githubAccessToken || settings.githubAccessToken.includes('••••')) {
          // Try to get actual token from database if masked
          if (settings.githubAccessToken && settings.githubAccessToken.includes('••••')) {
            const dbResult = await query(
              'SELECT github_access_token FROM settings WHERE category = $1',
              ['integration']
            );
            if (dbResult.rows.length > 0) {
              settings.githubAccessToken = dbResult.rows[0].github_access_token || '';
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          message = `Failed to connect to GitHub: ${errorMessage}`;
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