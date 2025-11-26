import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { json, urlencoded } from 'body-parser';
import path from 'path';
import http from 'http';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import slaScheduler from './utils/slaScheduler';

// Load environment variables
dotenv.config();

// Import routes
import routes from './routes';

// Import utilities and middleware
import { logger } from './utils/logger';
import { AppError, errorHandler } from './utils/errorHandler';
import { csrfProtection } from './middleware/csrf.middleware';
import { initializeApp, initializeSocketService } from './config/init';
import { startSLAChecker } from './utils/slaCheckerInit';

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || '*'],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})); // Security headers

// Configure CORS with proper credentials support
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      // Add other trusted origins as needed
    ];
    
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-post-login'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(json({ limit: '10mb' })); // Parse JSON bodies
app.use(urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { status: 'error', message: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Apply CSRF protection to all non-GET, non-HEAD routes
app.use(csrfProtection);

// API routes
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

// Error handling middleware
app.use(errorHandler);

// Initialize the application
async function initializeApp() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Initialize cache service
    await cacheService.initialize();
    console.log('✅ Cache service initialized');

    // Start SLA scheduler (replaces database triggers)
    slaScheduler.start();
    console.log('✅ SLA Scheduler started');

    // Initialize other services
    await notificationService.initialize();
    console.log('✅ Notification service initialized');

    // Start the server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  // Stop SLA scheduler
  slaScheduler.stop();
  console.log('✅ SLA Scheduler stopped');
  
  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  
  // Stop SLA scheduler
  slaScheduler.stop();
  console.log('✅ SLA Scheduler stopped');
  
  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
  
  process.exit(0);
});

// Start the application
initializeApp();

// Export for testing
export { app, server }; 