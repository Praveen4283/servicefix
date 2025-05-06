import { pool } from '../config/database';
import { logger } from './logger';

/**
 * Ensures the settings table exists and contains default email settings
 */
export async function ensureSettingsTable() {
  try {
    logger.info('Checking if settings table exists...');
    
    // First, check if the settings table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      logger.info('Settings table does not exist, creating it...');
      
      // Create the settings table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          category VARCHAR(50) NOT NULL,
          settings_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create unique constraint on category
        CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_category ON settings (category);
      `);
      
      logger.info('Settings table created successfully');
    } else {
      logger.info('Settings table already exists');
    }
    
    // Check if default email settings exist
    const emailSettings = await pool.query(`
      SELECT EXISTS (
        SELECT FROM settings 
        WHERE category = 'email'
      );
    `);
    
    const emailSettingsExist = emailSettings.rows[0].exists;
    
    if (!emailSettingsExist) {
      logger.info('Adding default email settings...');
      
      // Add default email settings
      await pool.query(`
        INSERT INTO settings (category, settings_data) 
        VALUES (
          'email', 
          '{"smtpServer": "smtp.mailgun.org", "smtpPort": 587, "smtpUsername": "postmaster@sandboxeca4aa11a2a34b0d969c416f32d7686d.mailgun.org", "smtpPassword": "Raju@4283", "emailFromName": "ServiceFix Support", "emailReplyTo": "support@servicefix.com", "enableEmailNotifications": true}'
        )
        ON CONFLICT (category) DO NOTHING;
      `);
      
      logger.info('Default email settings added successfully');
    } else {
      logger.info('Email settings already exist');
    }
    
    return true;
  } catch (error: any) {
    logger.error('Error ensuring settings table:', error);
    return false;
  }
} 