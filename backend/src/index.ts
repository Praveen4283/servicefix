import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import 'reflect-metadata';

// Load environment variables
dotenv.config();

// Configure Database
import { initializeDatabase } from './config/database';

// Import utilities
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { diagnoseDatabaseConnection } from './utils/dbDiagnostics';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import ticketRoutes from './routes/ticket.routes';
import knowledgeBaseRoutes from './routes/knowledgeBase.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';
import chatbotRoutes from './routes/chatbot.routes';

// Import the Supabase initialization function
import { initBucket } from './utils/supabase';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

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

app.use(morgan(process.env.MORGAN_FORMAT || 'combined')); // HTTP request logger with production format
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

// Import workflow automation service for SLA processing
import workflowService from './services/workflow.service';

// Setup recurring SLA checks
function setupRecurringTasks() {
  // Process SLA escalations every 5 minutes
  setInterval(async () => {
    try {
      logger.info('Running scheduled SLA check');
      const escalatedCount = await workflowService.processEscalations();
      logger.info(`SLA check completed: ${escalatedCount} tickets escalated`);
    } catch (error) {
      logger.error('Error in SLA check:', error);
    }
  }, 5 * 60 * 1000);
}

// Start server
const startServer = async () => {
  try {
    // Initialize Supabase storage bucket
    await initBucket();
    
    // Initialize database connection
    await initializeDatabase();
    
    // Run database diagnostics to help troubleshoot connection issues
    await diagnoseDatabaseConnection();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    
    // Setup recurring tasks
    setupRecurringTasks();
    
  } catch (error: any) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

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