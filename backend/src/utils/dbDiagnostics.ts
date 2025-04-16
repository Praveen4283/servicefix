/**
 * Database diagnostics utilities
 */

import { pool } from '../config/database';
import { logger } from './logger';

/**
 * Test database connection and log diagnostics information
 */
export const diagnoseDatabaseConnection = async (): Promise<void> => {
  try {
    logger.info('Running database connection diagnostics...');
    
    // Test basic connection
    const connectionResult = await pool.query('SELECT current_database(), current_schema');
    logger.info(`Connected to database: ${connectionResult.rows[0].current_database}, schema: ${connectionResult.rows[0].current_schema}`);
    
    // Check users table structure
    const usersTableResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    if (usersTableResult.rows.length === 0) {
      logger.error('Users table not found! Database may not be properly initialized.');
    } else {
      logger.info(`Users table has ${usersTableResult.rows.length} columns:`);
      usersTableResult.rows.forEach((column: { column_name: string, data_type: string }) => {
        logger.info(`- ${column.column_name} (${column.data_type})`);
      });
    }
    
    // Check other critical tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    logger.info(`Found ${tablesResult.rows.length} tables in the database:`);
    tablesResult.rows.forEach((table: { table_name: string }) => {
      logger.info(`- ${table.table_name}`);
    });
    
  } catch (error: any) {
    logger.error(`Database diagnostics failed: ${error.message}`);
  }
};

/**
 * Verify specific table columns exist
 * @param table Table name to check
 * @param columns Array of column names to verify
 * @returns Object with results of column checks
 */
export const verifyTableColumns = async (
  table: string, 
  columns: string[]
): Promise<{ exists: boolean, missingColumns: string[], columnsFound: Record<string, string> }> => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
    
    const foundColumns: Record<string, string> = {};
    result.rows.forEach((row: { column_name: string, data_type: string }) => {
      foundColumns[row.column_name] = row.data_type;
    });
    
    const missingColumns = columns.filter(col => !foundColumns[col]);
    
    return {
      exists: result.rows.length > 0,
      missingColumns,
      columnsFound: foundColumns
    };
  } catch (error: any) {
    logger.error(`Error verifying columns for table ${table}: ${error.message}`);
    return {
      exists: false,
      missingColumns: columns,
      columnsFound: {}
    };
  }
}; 