/**
 * Schema Utilities
 * Helper functions for database schema management
 */

import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
import { validateDatabaseSchema, getCurrentSchemaVersion } from '../utils/schemaValidator';

// Type definitions
interface SchemaVersion {
  version: string;
  description: string;
  applied_at: Date;
  applied_by: string;
}

interface TableInfo {
  table_name: string;
}

/**
 * Shows information about the current database schema
 */
async function showSchemaInfo(): Promise<void> {
  try {
    // Initialize the data source
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database connection initialized');
    }

    // Get current schema version
    const version = await getCurrentSchemaVersion();
    console.log('Current schema version:', version || 'No version found');

    // Check schema validity
    const isValid = await validateDatabaseSchema();
    console.log('Schema validation:', isValid ? 'VALID' : 'INVALID');

    // Get all migrations from schema_version table
    const migrations = await AppDataSource.query<SchemaVersion[]>(`
      SELECT version, description, applied_at, applied_by
      FROM schema_version
      ORDER BY applied_at
    `);

    if (migrations.length === 0) {
      console.log('No migrations found in schema_version table');
    } else {
      console.log(`\nMigration History (${migrations.length} total):`);
      migrations.forEach((migration: SchemaVersion, index: number) => {
        console.log(`${index + 1}. ${migration.version} - ${migration.description}`);
        console.log(`   Applied: ${migration.applied_at} by ${migration.applied_by}`);
      });
    }

    // List all tables in the database
    const tables = await AppDataSource.query<TableInfo[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`\nDatabase Tables (${tables.length} total):`);
    tables.forEach((table: TableInfo, index: number) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

    // Close the connection
    await AppDataSource.destroy();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error retrieving schema information:', error);
    process.exit(1);
  }
}

/**
 * Register a new migration in the schema_version table
 * @param version Migration version (typically YYYY_MM_DD_description)
 * @param description Human-readable description of the migration
 */
async function registerMigration(version: string, description: string): Promise<void> {
  if (!version || !description) {
    console.error('Error: Both version and description are required');
    console.log('Usage: npm run db:register-migration -- version="2023_01_01_my_migration" description="Added new table"');
    process.exit(1);
  }

  try {
    // Initialize the data source
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database connection initialized');
    }

    // Insert migration record
    await AppDataSource.query(`
      INSERT INTO schema_version (version, description)
      VALUES ($1, $2)
      ON CONFLICT (version) DO UPDATE
      SET description = $2, applied_at = CURRENT_TIMESTAMP
    `, [version, description]);

    console.log(`Successfully registered migration: ${version}`);
    console.log(`Description: ${description}`);

    // Close the connection
    await AppDataSource.destroy();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error registering migration:', error);
    process.exit(1);
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0] || 'info';

switch (command) {
  case 'info':
    showSchemaInfo();
    break;
  case 'register':
    // Parse version and description from args
    const versionArg = args.find(arg => arg.startsWith('version='));
    const descriptionArg = args.find(arg => arg.startsWith('description='));
    
    const version = versionArg ? versionArg.split('=')[1].replace(/"/g, '') : '';
    const description = descriptionArg ? descriptionArg.split('=')[1].replace(/"/g, '') : '';
    
    registerMigration(version, description);
    break;
  default:
    console.log('Unknown command. Available commands:');
    console.log('  info - Show schema information');
    console.log('  register - Register a new migration');
    process.exit(1);
} 