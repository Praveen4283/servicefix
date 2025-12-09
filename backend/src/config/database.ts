import 'reflect-metadata';
import { DataSource, ObjectLiteral, EntityTarget, QueryRunner } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';
import { getEnvOptional, getEnvNumber, getEnvOptionalBoolean } from '../utils/envValidator';

// Import Entities Explicitly
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import { Comment } from '../models/Comment';
import { Organization } from '../models/Organization';
import { Attachment } from '../models/Attachment';
import { KnowledgeBaseArticle, KnowledgeBaseCategory } from '../models/KnowledgeBase';
import { TicketStatus } from '../models/TicketStatus';
import { TicketPriority } from '../models/TicketPriority';
import { TicketType } from '../models/TicketType';
import { Department } from '../models/Department';
import { ChatbotConversation } from '../models/ChatbotConversation';
import { ChatMessage } from '../models/ChatMessage';
import { NotificationPreference } from '../models/NotificationPreference';
import { DepartmentMember } from '../models/DepartmentMember';
import { Notification } from '../models/Notification';
import { SLAPolicy } from '../models/SLAPolicy';
import { SLAPolicyTicket } from '../models/SLAPolicyTicket';
import { BusinessHours } from '../models/BusinessHours';
import { Holiday } from '../models/Holiday';
// Add any other entities you have here

// Load environment variables
dotenv.config();

// Debug: Log the entities path
const entitiesPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../models/**/*.js')
  : path.join(__dirname, '../models/**/*.ts');
logger.info(`[database.ts] Loading TypeORM entities from: ${entitiesPath}`);
logger.info(`[database.ts] Current NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`[database.ts] Current __dirname: ${__dirname}`);

// Environment variables for pool configuration  
const DB_POOL_MIN = getEnvNumber('DB_POOL_MIN', 5); // Increased from 2
const DB_POOL_MAX = getEnvNumber('DB_POOL_MAX', 20); // Increased from 10
const DB_POOL_IDLE_TIMEOUT = getEnvNumber('DB_POOL_IDLE_TIMEOUT', 30000); // 30 seconds
const DB_POOL_CONNECTION_TIMEOUT = getEnvNumber('DB_POOL_CONNECTION_TIMEOUT', 5000); // 5 seconds


// Support for Supabase connection string
const getDatabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Use DATABASE_URL if provided (Supabase format)
  if (process.env.DATABASE_URL) {
    return {
      url: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : {
        rejectUnauthorized: false
      }
    };
  }

  // Validate required environment variables in production
  if (isProduction) {
    const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required database environment variables in production: ${missingVars.join(', ')}. ` +
        'Please set these variables or use DATABASE_URL for connection string.'
      );
    }
  }

  // Otherwise use individual connection parameters
  // In development, use safe defaults. In production, this won't be reached if vars are missing.
  return {
    host: getEnvOptional('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    username: getEnvOptional('DB_USERNAME', 'postgres'),
    password: getEnvOptional('DB_PASSWORD', 'postgres'),
    database: getEnvOptional('DB_DATABASE', 'servicedesk'),
    ssl: getEnvOptionalBoolean('DB_SSL', false) ? {
      rejectUnauthorized: false
    } : false
  };
};


const dbConfig = getDatabaseConfig();

// Create and export the TypeORM AppDataSource
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...dbConfig,
  synchronize: false, // Always disabled in production
  logging: process.env.DB_LOGGING === 'true',
  poolSize: DB_POOL_MAX, // Set maximum pool size
  connectTimeoutMS: DB_POOL_CONNECTION_TIMEOUT,
  entities: [
    // Add your entities dynamically from the models directory
    path.join(__dirname, '../models/**/*.{ts,js}')
  ],
  // Configure migrations to keep database schema in sync with entities
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: process.env.RUN_MIGRATIONS === 'true', // Run migrations automatically on startup
  subscribers: []
});

// Interface for query result
export interface QueryResult {
  rows: any[];
  rowCount: number;
}

// Client interface for database connections
export interface DatabaseClient {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  release: () => void;
}

// Helper function for basic query execution with retries
export const query = async (
  text: string,
  params: unknown[] = [],
  retries = 3
): Promise<QueryResult> => {
  let lastError: Error | unknown;

  for (let i = 0; i < retries; i++) {
    try {
      if (!AppDataSource.isInitialized) {
        throw new Error("Database connection not initialized");
      }

      const result = await AppDataSource.query(text, params);
      return { rows: result, rowCount: result.length };
    } catch (error: unknown) {
      lastError = error;

      // If this is a connection error, wait a bit before retrying
      if (error instanceof Error &&
        ('code' in error) &&
        (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        // For other errors, don't retry
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    logger.error(`Database query error: ${lastError.message}`, {
      query: text,
      params: JSON.stringify(params)
    });
    throw lastError;
  } else {
    const error = new Error('Unknown database error');
    logger.error(`Unknown database query error`, {
      query: text,
      params: JSON.stringify(params)
    });
    throw error;
  }
};

// Helper function to get repository
export const getRepository = <T extends ObjectLiteral>(entity: EntityTarget<T>) => {
  return AppDataSource.getRepository<T>(entity);
};

// Export pool with connect method for transaction support
export const pool = {
  query: query,
  connect: async (): Promise<DatabaseClient> => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Create a client object that wraps the AppDataSource for compatibility
    const client: DatabaseClient = {
      query: async (text: string, params: unknown[] = []): Promise<QueryResult> => {
        const result = await AppDataSource.query(text, params);
        return { rows: result, rowCount: result.length };
      },
      release: () => {
        // No-op for TypeORM
      }
    };

    return client;
  },
  end: async (): Promise<void> => {
    if (AppDataSource.isInitialized) {
      try {
        await AppDataSource.destroy();
        logger.info('Database connections closed successfully');
      } catch (error) {
        logger.error('Error closing database connections:', error);
        throw error;
      }
    }
  }
};

// Initialize database connection
export const initializeDatabase = async (): Promise<boolean> => {
  const maxRetries = 5;
  let retries = 0;
  let connected = false;

  while (retries < maxRetries && !connected) {
    try {
      console.log(`Attempting database connection (attempt ${retries + 1}/${maxRetries})...`);

      // First initialize TypeORM connection before running any queries
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log('TypeORM database connection established successfully');
      }

      // Then run a simple query to verify the connection is working
      const result = await AppDataSource.query('SELECT NOW() as current_time');
      console.log(`Connected to database: ${result[0].current_time}`);

      // Validate database schema to ensure all required components exist
      try {
        const { validateDatabaseSchema } = require('../utils/schemaValidator');
        const isValid = await validateDatabaseSchema();

        if (!isValid) {
          const errorMsg = 'Database schema validation failed. Some required components are missing.';
          console.warn(errorMsg);
          console.warn('Consider running initialize_database.js to restore the complete schema.');

          // In production, schema validation failures should be fatal
          if (process.env.NODE_ENV === 'production') {
            console.error('FATAL: Cannot start application with incomplete schema in production.');
            throw new Error(errorMsg + ' Application cannot start in production with invalid schema.');
          } else {
            console.warn('Continuing in development mode despite schema validation failure');
          }
        } else {
          console.log('Database schema validation successful');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If this is a validation error in production, fail fatally
        if (process.env.NODE_ENV === 'production' && errorMessage.includes('schema')) {
          console.error(`FATAL schema validation error in production: ${errorMessage}`);
          throw error;
        }

        console.warn(`Schema validation error: ${errorMessage}`);
        console.warn('Continuing with initialization despite schema validation failure');
        // Don't fail completely if schema validation has an error in development
      }

      connected = true;
      return true;
    } catch (err: any) {
      retries++;
      console.error(`Error connecting to database (attempt ${retries}/${maxRetries}):`, err);

      if (retries >= maxRetries) {
        console.error('Maximum connection retries reached. Could not connect to database.');
        throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${err.message}`);
      }

      // Wait before retrying
      console.log(`Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return false;
}; 