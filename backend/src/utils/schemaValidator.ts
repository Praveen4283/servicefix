import { pool, AppDataSource } from '../config/database';
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
  'holidays',
  'schema_version'
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
 * Database schema validator
 * Checks that all required tables and columns exist in the database
 */
export const validateDatabaseSchema = async (): Promise<boolean> => {
  try {
    logger.info('Starting database schema validation...');

    // Ensure AppDataSource is initialized
    if (!AppDataSource.isInitialized) {
      logger.error('Cannot validate schema: Database connection not initialized');
      return false;
    }

    // Check if critical tables exist
    const missingTables = await checkMissingTables(REQUIRED_TABLES);
    if (missingTables.length > 0) {
      logger.warn(`Missing tables detected: ${missingTables.join(', ')}`);

      // If schema_version is the only missing table, create it
      if (missingTables.length === 1 && missingTables[0] === 'schema_version') {
        logger.info('Creating schema_version table...');

        try {
          await AppDataSource.query(`
            CREATE TABLE IF NOT EXISTS "schema_version" (
              "version" VARCHAR(255) PRIMARY KEY,
              "description" TEXT NOT NULL,
              "applied_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "applied_by" VARCHAR(255) DEFAULT CURRENT_USER
            );
            
            -- Insert initial version
            INSERT INTO "schema_version" ("version", "description") 
            VALUES ('init', 'Initial schema version created by validator')
            ON CONFLICT (version) DO NOTHING;
          `);

          logger.info('Schema version table created successfully');
        } catch (error) {
          logger.error('Failed to create schema_version table:', error);
          return false;
        }
      } else {
        logger.warn('Schema appears to be incomplete. Run initialize_database.js to restore schema.');
        await ensureSettingsTable(); // At minimum, ensure settings table exists
        return false;
      }
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

    // Check critical columns in key tables
    const criticalColumns = [
      { table: 'users', columns: ['id', 'email', 'password', 'role', 'organization_id'] },
      { table: 'organizations', columns: ['id', 'name', 'domain'] },
      { table: 'tickets', columns: ['id', 'subject', 'description', 'requester_id', 'status_id', 'organization_id'] },
      { table: 'ticket_statuses', columns: ['id', 'name', 'organization_id', 'is_default', 'is_resolved'] },
      { table: 'user_tokens', columns: ['id', 'user_id', 'refresh_token', 'expires_at'] },
      { table: 'schema_version', columns: ['version', 'applied_at'] }
    ];

    for (const { table, columns } of criticalColumns) {
      for (const column of columns) {
        const columnResult = await AppDataSource.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
          )`,
          [table, column]
        );

        if (!columnResult[0].exists) {
          logger.error(`Required column '${column}' does not exist in table '${table}'`);
          return false;
        }
      }
    }

    // Check if schema_version table has at least one entry
    const versionResult = await AppDataSource.query(
      `SELECT COUNT(*) FROM schema_version`
    );

    if (parseInt(versionResult[0].count, 10) === 0) {
      logger.warn(`Schema version table exists but has no entries`);

      // Insert an initial record if the table is empty
      await AppDataSource.query(`
        INSERT INTO schema_version (version, description)
        VALUES ('init', 'Initial schema version created by validator')
        ON CONFLICT (version) DO NOTHING;
      `);
    }

    logger.info('Database schema validation completed successfully');
    return true;
  } catch (error: any) {
    logger.error('Error validating database schema:', error);
    return false;
  }
};

/**
 * Checks which tables are missing from the required list
 */
async function checkMissingTables(requiredTables: string[]): Promise<string[]> {
  try {
    const result = await AppDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const existingTables = result.map((row: { table_name: string }) => row.table_name);
    return requiredTables.filter(table => !existingTables.includes(table));
  } catch (error) {
    logger.error('Error checking tables:', error);
    return [...requiredTables]; // Return all as missing if query fails
  }
}

/**
 * Checks which functions are missing from the required list
 */
async function checkMissingFunctions(requiredFunctions: string[]): Promise<string[]> {
  const result = await AppDataSource.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
  `);

  const existingFunctions = result.map((row: { routine_name: string }) => row.routine_name);
  return requiredFunctions.filter(func => !existingFunctions.includes(func));
}

/**
 * Checks which triggers are missing from the required list
 */
async function checkMissingTriggers(requiredTriggers: string[]): Promise<string[]> {
  const result = await AppDataSource.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  `);

  const existingTriggers = result.map((row: { trigger_name: string }) => row.trigger_name);
  return requiredTriggers.filter(trigger => !existingTriggers.includes(trigger));
}

/**
 * Checks which indexes are missing from the required list
 */
async function checkMissingIndexes(requiredIndexes: string[]): Promise<string[]> {
  const result = await AppDataSource.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
  `);

  const existingIndexes = result.map((row: { indexname: string }) => row.indexname);
  return requiredIndexes.filter(index => !existingIndexes.includes(index));
}

/**
 * Ensure settings table exists with default email settings
 */
async function ensureSettingsTable(): Promise<void> {
  try {
    // Check if settings table exists
    const tableExists = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
      )
    `);

    if (!tableExists[0].exists) {
      logger.warn('Settings table does not exist. Please run database initialization.');
      return;
    }

    // Check if default email settings exist
    const emailSettings = await AppDataSource.query(`
      SELECT COUNT(*) FROM settings WHERE category = 'email'
    `);

    if (parseInt(emailSettings[0].count, 10) === 0) {
      logger.info('Creating default email settings...');

      // Insert default email settings
      await AppDataSource.query(`
        INSERT INTO settings (category, smtp_server, smtp_port, smtp_username, smtp_password, email_from_name, email_reply_to, enable_email_notifications)
        VALUES ('email', 'smtp.example.com', 587, '', '', 'ServiceFix Support', 'support@servicefix.com', false)
      `);

      logger.info('Default email settings created');
    }
  } catch (error) {
    logger.error('Error ensuring settings table:', error);
  }
}

/**
 * Get the current schema version from the database
 */
export async function getCurrentSchemaVersion(): Promise<string | null> {
  try {
    if (!AppDataSource.isInitialized) {
      return null;
    }

    const result = await AppDataSource.query(`
      SELECT version 
      FROM schema_version 
      ORDER BY applied_at DESC 
      LIMIT 1
    `);

    return result.length > 0 ? result[0].version : null;
  } catch (error) {
    logger.error('Error getting current schema version:', error);
    return null;
  }
}