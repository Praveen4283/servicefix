import 'reflect-metadata';
import { DataSource, ObjectLiteral, EntityTarget } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

// Import Entities Explicitly
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import { Comment } from '../models/Comment';
import { Organization } from '../models/Organization';
import { Attachment } from '../models/Attachment';
import { KnowledgeBaseArticle } from '../models/KnowledgeBase';
import { TicketStatus } from '../models/TicketStatus';
import { TicketPriority } from '../models/TicketPriority';
import { TicketType } from '../models/TicketType';
import { Department } from '../models/Department';
import { ChatbotConversation } from '../models/ChatbotConversation';
import { ChatMessage } from '../models/ChatMessage';
import { NotificationPreference } from '../models/NotificationPreference';
import { DepartmentMember } from '../models/DepartmentMember';
// Add any other entities you have here

// Load environment variables
dotenv.config();

// Debug: Log the entities path
const entitiesPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../models/**/*.js') 
  : path.join(__dirname, '../models/**/*.ts');
console.log(`[database.ts] Loading TypeORM entities from: ${entitiesPath}`);
console.log(`[database.ts] Current NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[database.ts] Current __dirname: ${__dirname}`);

// Create and export the TypeORM AppDataSource
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: !process.env.DATABASE_URL ? (process.env.DB_HOST || 'localhost') : undefined,
  port: !process.env.DATABASE_URL ? parseInt(process.env.DB_PORT || '5432') : undefined,
  username: !process.env.DATABASE_URL ? (process.env.DB_USERNAME || 'postgres') : undefined,
  password: !process.env.DATABASE_URL ? (process.env.DB_PASSWORD || 'postgres') : undefined,
  database: !process.env.DATABASE_URL ? (process.env.DB_DATABASE || 'servicedesk') : undefined,
  synchronize: false, // Always disabled in production
  logging: process.env.DB_LOGGING === 'true',
  entities: [ // List entities explicitly
    User,
    Ticket,
    Comment,
    Organization,
    Attachment,
    KnowledgeBaseArticle,
    TicketStatus,
    TicketPriority,
    TicketType,
    Department,
    DepartmentMember,
    ChatbotConversation,
    ChatMessage,
    NotificationPreference,
    // Add other imported entity classes here
  ],
  // Adjust migrations path for production build
  migrations: [path.join(__dirname, '../migrations/**/*.js'), path.join(__dirname, '../migrations/**/*.ts')],
  // Adjust subscribers path for production build
  subscribers: [path.join(__dirname, '../subscribers/**/*.js'), path.join(__dirname, '../subscribers/**/*.ts')],
  ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

// Legacy pool connection for raw SQL queries (if needed)
import { Pool } from 'pg';

export const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'servicedesk',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

// Helper function for raw SQL queries
export const query = (text: string, params: any[] = []): Promise<any> => {
  return pool.query(text, params);
};

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  const maxRetries = 5;
  let retries = 0;
  let connected = false;

  while (retries < maxRetries && !connected) {
    try {
      console.log(`Attempting database connection (attempt ${retries + 1}/${maxRetries})...`);
      
      // First run a simple query to check database connection
      const result = await query('SELECT NOW() as current_time');
      console.log(`Connected to database using pool: ${result.rows[0].current_time}`);
      
      // Then initialize TypeORM connection
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log('TypeORM database connection established successfully');
      }
      
      connected = true;
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
};

// Get a TypeORM repository
export const getRepository = <T extends ObjectLiteral>(entity: EntityTarget<T>) => {
  return AppDataSource.getRepository<T>(entity);
}; 