import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { json, urlencoded } from 'body-parser';
import path from 'path';
import http from 'http';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

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
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
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

// Get port from environment or use default
const PORT = process.env.PORT || 4000;

// Initialize application and start server
const startServer = async () => {
  try {
    // Initialize application
    const initSuccess = await initializeApp();
    
    if (!initSuccess) {
      logger.error('Failed to initialize application. Exiting...');
      process.exit(1);
    }
    
    // Initialize Socket.IO service
    initializeSocketService(server);
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      
      // Start SLA checker
      startSLAChecker().then(success => {
        if (success) {
          logger.info('SLA checker successfully initialized');
        } else {
          logger.error('Failed to initialize SLA checker');
        }
      });
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
export { app, server }; 