/**
 * Main entry point for the ServiceFix application
 */
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

// Import core modules
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import http from 'http';
import cookieParser from 'cookie-parser';

// Import utilities
import { logger, morganStream } from './utils/logger';
import { AppError, errorHandler } from './utils/errorHandler';
import { diagnoseDatabaseConnection } from './utils/dbDiagnostics';
import { csrfSkipper, csrfErrorHandler } from './middleware/csrf.middleware';

// Import config and init
import { initializeApp, initializeSocketService } from './config/init';

// Import service utilities
import socketService from './services/socket.service';
import { initializeServices } from './services';

// Import Supabase utilities
import { initBucket } from './utils/supabase';

// Import scheduler
import { startScheduledJobs, stopScheduledJobs } from './utils/scheduler';

// Import log utilities
import { flushAllLogs, stopLogBuffering } from './utils/logStorage';

// Import services
import slaService from './services/sla.service';

// Import routes
import routes from './routes';
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
import { registerVersionedRoutes } from './utils/routeVersioning';

// Check required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'PORT'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Environment variable ${envVar} is required but not set`);
    process.exit(1);
  }
}

// JWT Configuration
// No longer using fallback values - the app will exit if secrets aren't provided
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { status: 'error', message: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false // Count all requests against the limit
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.MORGAN_FORMAT || 'combined', { stream: morganStream }));
app.use(compression());

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Apply CSRF protection
app.use('/api/', csrfSkipper);
app.use(csrfErrorHandler);

// Routes - using the versioning utility
const apiRouter = express.Router();
registerVersionedRoutes(apiRouter, 'auth', authRoutes);
registerVersionedRoutes(apiRouter, 'users', userRoutes);
registerVersionedRoutes(apiRouter, 'tickets', ticketRoutes);
registerVersionedRoutes(apiRouter, 'knowledge', knowledgeBaseRoutes);
registerVersionedRoutes(apiRouter, 'reports', reportRoutes);
registerVersionedRoutes(apiRouter, 'ai', aiRoutes);
registerVersionedRoutes(apiRouter, 'chat', chatbotRoutes);
registerVersionedRoutes(apiRouter, 'notifications', notificationRoutes);
registerVersionedRoutes(apiRouter, 'logs', logRoutes);
registerVersionedRoutes(apiRouter, 'settings', settingsRoutes);
registerVersionedRoutes(apiRouter, 'sla', slaRoutes);
registerVersionedRoutes(apiRouter, 'ticket-priorities', ticketPriorityRoutes);
registerVersionedRoutes(apiRouter, 'business-hours', businessHoursRoutes);

// Apply the API router to both /api and /api/v1 paths
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || require('../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    node: process.version
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
const startServer = async () => {
  try {
    // Print startup banner
    console.log(`
===================================================
  ServiceFix - AI-Powered Help Desk Solution
  Version: ${process.env.npm_package_version || require('../package.json').version}
  Node.js: ${process.version}
  Environment: ${process.env.NODE_ENV || 'development'}
===================================================
    `);
    
    // Initialize application with our architecture improvements
    const initSuccess = await initializeApp();
    
    if (!initSuccess) {
      logger.error('Failed to initialize application. Exiting...');
      process.exit(1);
    }
    
    // Initialize Supabase storage bucket
    await initBucket();
    
    // Run database diagnostics to help troubleshoot connection issues
    await diagnoseDatabaseConnection();
    
    // Initialize Socket.IO service
    initializeSocketService(server);
    
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

startServer();