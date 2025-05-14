import { pool } from '../config/database';
import { logger } from './logger';

/**
 * List of critical tables that should always exist
 * Add/remove tables as needed
 */
const REQUIRED_TABLES = [
  'organizations',
  'users',
  'user_tokens',
  'departments',
  'department_members',
  'tickets',
  'ticket_comments',
  'ticket_attachments',
  'ticket_history',
  'ticket_priorities',
  'ticket_statuses',
  'ticket_types',
  'ticket_tags',
  'tags',
  'sla_policies',
  'sla_policy_tickets',
  'settings',
  'business_hours',
  'holidays'
];

/**
 * List of critical functions that should exist
 */
const REQUIRED_FUNCTIONS = [
  'update_updated_at_column',
  'add_organization_defaults',
  'get_or_create_sla_policy_for_ticket',
  'get_or_create_sla_policy_for_priority',
  'update_ticket_due_date',
  'fix_all_sla_data',
  'fix_missing_sla_policy_tickets',
  'update_sla_policy_ticket',
  'insert_sla_policy_ticket',
  'fix_missing_sla_data',
  'create_sla_policy_ticket_after_commit',
  'upsert_sla_policy',
  'update_ticket_sla_status',
  'check_sla_breaches',
  'get_sla_status_text',
  'reassign_sla_on_priority_change',
  'is_pending_status',
  'is_active_status',
  'handle_sla_pause_on_status_change',
  'update_tickets_sla_status'
];

/**
 * List of critical triggers that should exist
 */
const REQUIRED_TRIGGERS = [
  'trg_add_organization_defaults',
  'update_ticket_sla_status_trigger',
  'reassign_sla_on_priority_change_trigger',
  'handle_sla_pause_on_status_change_trigger'
];

/**
 * List of critical indexes that should exist
 */
const REQUIRED_INDEXES = [
  'idx_tickets_requester_id',
  'idx_tickets_assignee_id',
  'idx_tickets_status_id',
  'idx_tickets_organization_id',
  'idx_users_organization_id',
  'idx_user_tokens_user_id',
  'idx_ticket_comments_ticket_id',
  'idx_sla_policy_tickets_ticket_id',
  'idx_settings_category',
  'idx_notifications_is_read',
  'idx_notifications_user_id',
  'idx_chatbot_conversations_user_id',
  'idx_chatbot_messages_conversation_id',
  'idx_kb_articles_category_id',
  'idx_kb_articles_organization_id',
  'idx_kb_articles_search'
];

/**
 * Ensures all required database objects exist
 * If any critical component is missing, attempts to create it
 */
export async function validateDatabaseSchema(): Promise<boolean> {
  try {
    logger.info('Starting database schema validation...');
    
    // Check if critical tables exist
    const missingTables = await checkMissingTables(REQUIRED_TABLES);
    if (missingTables.length > 0) {
      logger.warn(`Missing tables detected: ${missingTables.join(', ')}`);
      logger.warn('Schema appears to be incomplete. Run initialize_database.js to restore schema.');
      await ensureSettingsTable(); // At minimum, ensure settings table exists
      return false;
    }
    
    // Check if critical functions exist
    const missingFunctions = await checkMissingFunctions(REQUIRED_FUNCTIONS);
    if (missingFunctions.length > 0) {
      logger.warn(`Missing functions detected: ${missingFunctions.join(', ')}`);
      logger.warn('Schema appears to be incomplete. Some functionality may not work properly.');
    }
    
    // Check if critical triggers exist
    const missingTriggers = await checkMissingTriggers(REQUIRED_TRIGGERS);
    if (missingTriggers.length > 0) {
      logger.warn(`Missing triggers detected: ${missingTriggers.join(', ')}`);
      logger.warn('Schema appears to be incomplete. Some automation may not work properly.');
    }
    
    // Check if critical indexes exist
    const missingIndexes = await checkMissingIndexes(REQUIRED_INDEXES);
    if (missingIndexes.length > 0) {
      logger.warn(`Missing indexes detected: ${missingIndexes.join(', ')}`);
      logger.warn('Some performance optimizations may not be available.');
    }
    
    // Ensure settings table and default email settings exist
    await ensureSettingsTable();
    
    logger.info('Database schema validation completed');
    return true;
  } catch (error: any) {
    logger.error('Error validating database schema:', error);
    return false;
  }
}

/**
 * Checks which tables are missing from the required list
 */
async function checkMissingTables(requiredTables: string[]): Promise<string[]> {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const existingTables = result.rows.map(row => row.table_name);
  return requiredTables.filter(table => !existingTables.includes(table));
}

/**
 * Checks which functions are missing from the required list
 */
async function checkMissingFunctions(requiredFunctions: string[]): Promise<string[]> {
  const result = await pool.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
  `);
  
  const existingFunctions = result.rows.map(row => row.routine_name);
  return requiredFunctions.filter(func => !existingFunctions.includes(func));
}

/**
 * Checks which triggers are missing from the required list
 */
async function checkMissingTriggers(requiredTriggers: string[]): Promise<string[]> {
  const result = await pool.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  `);
  
  const existingTriggers = result.rows.map(row => row.trigger_name);
  return requiredTriggers.filter(trigger => !existingTriggers.includes(trigger));
}

/**
 * Checks which indexes are missing from the required list
 */
async function checkMissingIndexes(requiredIndexes: string[]): Promise<string[]> {
  const result = await pool.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
  `);
  
  const existingIndexes = result.rows.map(row => row.indexname);
  return requiredIndexes.filter(index => !existingIndexes.includes(index));
}

/**
 * Ensures the settings table exists and contains default email settings
 * This is kept as a separate function since it's a critical component
 * that we always want to ensure exists, even if other validation fails
 */
async function ensureSettingsTable(): Promise<boolean> {
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