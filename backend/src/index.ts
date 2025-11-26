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
app.set('trust proxy', 1); // Trust first proxy - needed for Render deployment
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Function to get dynamic rate limit settings from database
const getRateLimitSettings = async (): Promise<{ enabled: boolean, limit: number, windowMinutes: number }> => {
  try {
    // Default values (only used if database is unavailable)
    let enabled = true;
    let limitPerHour = 1000;
    let windowMinutes = 15;
    
    // Try to get settings from database
    const { pool } = require('./config/database');
    const result = await pool.query(
      'SELECT settings_data FROM settings WHERE category = $1 LIMIT 1',
      ['advanced']
    );
    
    if (result.rows.length > 0) {
      const settings = result.rows[0].settings_data;
      if (settings && typeof settings === 'object') {
        enabled = settings.apiEnabled !== undefined ? settings.apiEnabled : true;
        
        // Get rate limit from settings
        if (settings.apiRateLimitPerHour && settings.apiRateLimitPerHour > 0) {
          limitPerHour = settings.apiRateLimitPerHour;
        }
        
        // Get window time from settings if available, otherwise use default
        if (settings.apiRateLimitWindowMinutes && settings.apiRateLimitWindowMinutes > 0) {
          windowMinutes = settings.apiRateLimitWindowMinutes;
        }
      }
    }
    
    // Calculate the limit for the specified window
    const windowHours = windowMinutes / 60;
    const limit = Math.ceil(limitPerHour * windowHours);
    
    // Cache settings in memory variables for faster access
    process.env.API_ENABLED = enabled ? 'true' : 'false';
    process.env.DYNAMIC_RATE_LIMIT = limit.toString();
    process.env.RATE_LIMIT_WINDOW_MINUTES = windowMinutes.toString();
    
    logger.info(`Rate limit settings loaded from database: enabled=${enabled}, limit=${limitPerHour}/hour (${limit}/${windowMinutes}min)`);
    
    return { enabled, limit, windowMinutes };
  } catch (error) {
    logger.error('Error getting rate limit settings from database:', error);
    // Return default values if database is unavailable
    return { 
      enabled: true, 
      limit: 250, // Default to 250 requests per 15 minutes (1000/hour)
      windowMinutes: 15
    };
  }
};

// Initialize rate limiter with temporary default settings
let apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes by default
  max: 250, // Conservative default limit until settings are loaded
  message: { status: 'error', message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Function to update rate limiter with current settings
const updateRateLimiter = async () => {
  try {
    const settings = await getRateLimitSettings();
    
    // Update the rate limiter with the dynamic settings
    apiLimiter = rateLimit({
      windowMs: settings.windowMinutes * 60 * 1000, // Convert minutes to ms
      max: settings.limit,
      message: { status: 'error', message: 'Too many requests, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false
    });
    
    logger.info(`Rate limiter updated: ${settings.limit} requests per ${settings.windowMinutes} minutes`);
    return true;
  } catch (error) {
    logger.error('Failed to update rate limiter:', error);
    return false;
  }
};

// Export updateRateLimiter for use in settings controller
export { updateRateLimiter };

// Middleware to check if API is enabled based on settings
const checkApiEnabled = (req: Request, res: Response, next: NextFunction) => {
  // Skip this check for settings endpoints to allow admins to re-enable API if disabled
  if (req.path.startsWith('/settings/') || req.path === '/health') {
    return next();
  }
  
  const apiEnabled = process.env.API_ENABLED !== 'false';
  if (!apiEnabled) {
    return res.status(503).json({
      status: 'error',
      message: 'API access is currently disabled by administrator'
    });
  }
  next();
};

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
  origin: (origin, callback) => {
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      [process.env.FRONTEND_URL || 'http://localhost:3000'];
    
    // Always allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    } else {
      const msg = `CORS policy: Origin ${origin} not allowed`;
      logger.warn(`CORS Error: ${msg}`);
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-post-login']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.MORGAN_FORMAT || 'combined', { stream: morganStream }));
app.use(compression());

// Apply API enabled check and rate limiting to API routes
app.use('/api/', checkApiEnabled);
app.use('/api/', (req, res, next) => {
  // Use the current rate limiter instance (which may have been updated)
  apiLimiter(req, res, next);
});

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
    
    // Now that database is connected, update rate limiter with settings from database
    await updateRateLimiter();
    
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