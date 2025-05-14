import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'reflect-metadata';
import http from 'http';
import socketService from './services/socket.service';

// Import utilities
import { logger, morganStream } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { diagnoseDatabaseConnection } from './utils/dbDiagnostics';

// Check for critical environment variables
if (!process.env.JWT_SECRET) {
  logger.warn('JWT_SECRET environment variable is not set. Using fallback secrets, which may cause authentication issues if inconsistent.');
}

// Configure Database
import { initializeDatabase } from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import ticketRoutes from './routes/ticket.routes';
import knowledgeBaseRoutes from './routes/knowledgeBase.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';
import chatbotRoutes from './routes/chatbot.routes';
import notificationRoutes from './routes/notification.routes';
import logRoutes from './routes/log.routes';
import settingsRoutes from './routes/settings.routes';
import slaRoutes from './routes/sla.routes';
import ticketPriorityRoutes from './routes/ticketPriority.routes';
import businessHoursRoutes from './routes/businessHours.routes';

// Import the Supabase initialization function
import { initBucket } from './utils/supabase';

// Import the scheduler
import { startScheduledJobs, stopScheduledJobs } from './utils/scheduler';

// Import log flushing utilities
import { flushAllLogs, stopLogBuffering } from './utils/logStorage';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60') * 60 * 1000, // 60 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true // Don't count successful requests against the limit
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Enable CORS with specific origin

// Increase body size limits for handling image uploads
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with increased limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies with increased limit

// Use morgan with our winston logger stream
app.use(morgan(process.env.MORGAN_FORMAT || 'combined', { stream: morganStream }));
app.use(compression()); // Compress responses
app.use(limiter); // Apply rate limiting

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/knowledge', knowledgeBaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/ticket-priorities', ticketPriorityRoutes);
app.use('/api/business-hours', businessHoursRoutes);

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Import SLA service for processing
import slaService from './services/sla.service';

// Start server
const startServer = async () => {
  try {
    // Initialize Supabase storage bucket
    await initBucket();
    
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connection initialized successfully');
    
    // Run database diagnostics to help troubleshoot connection issues
    await diagnoseDatabaseConnection();
    
    // Initialize Socket.IO
    socketService.initialize(server);
    
    // Start the server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    
    // Start scheduled jobs
    startScheduledJobs();
    
  } catch (error: any) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

// Handle clean shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  
  // Flush logs before shutting down
  try {
    logger.info('Flushing logs to Supabase...');
    await flushAllLogs();
    stopLogBuffering();
    logger.info('Logs flushed successfully');
  } catch (error: any) {
    logger.error(`Error flushing logs: ${error.message}`);
  }
  
  stopScheduledJobs();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  
  // Flush logs before shutting down
  try {
    logger.info('Flushing logs to Supabase...');
    await flushAllLogs();
    stopLogBuffering();
    logger.info('Logs flushed successfully');
  } catch (error: any) {
    logger.error(`Error flushing logs: ${error.message}`);
  }
  
  stopScheduledJobs();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled Rejection', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Start the server
startServer();

export default app; 