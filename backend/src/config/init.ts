/**
 * Application initialization script
 * Initializes all services, database connections, and other components
 */

import { logger } from '../utils/logger';
import { initializeDatabase, pool } from './database';
import { container, initializeServices } from '../services';
import socketService from '../services/socket.service';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { startSLAChecker, stopSLAChecker } from '../utils/slaCheckerInit';

/**
 * Initialize the application
 * @returns Promise<boolean> true if successful, false otherwise
 */
export const initializeApp = async (): Promise<boolean> => {
  try {
    // Test database connection
    const client = await pool.connect();
    logger.info('Database connection successful');
    client.release();
    
    // Initialize other services here
    logger.info('Application initialized successfully');
    
    // Register process exit handlers for graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      gracefulShutdown();
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
      gracefulShutdown();
    });
    
    return true;
  } catch (error) {
    logger.error('Error initializing application:', error);
    return false;
  }
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');
  
  try {
    // Set a timeout for shutdown (force exit after 10 seconds)
    const forceExitTimeout = setTimeout(() => {
      logger.error('Forcing exit after timeout');
      process.exit(1);
    }, 10000);
    
    // Stop SLA checker
    logger.info('Stopping SLA checker...');
    await stopSLAChecker();
    
    // Close socket connections
    logger.info('Closing socket connections...');
    if (globalSocketServer) {
      await new Promise<void>((resolve) => {
        globalSocketServer?.close(() => {
          logger.info('Socket server closed');
          resolve();
        });
      });
    }
    
    // Close database pool
    logger.info('Closing database connections...');
    await pool.end();
    logger.info('Database connections closed');
    
    // Clear the force exit timeout
    clearTimeout(forceExitTimeout);
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Singleton socket.io server instance
let globalSocketServer: SocketServer | null = null;

/**
 * Initialize Socket.IO service
 * @param server HTTP server
 */
export const initializeSocketService = (server: http.Server): void => {
  if (!globalSocketServer) {
    globalSocketServer = socketService.initialize(server);
    logger.info('Socket.IO service initialized');
  }
};

/**
 * Get the global Socket.IO server instance
 * @returns Socket.IO server instance
 */
export const getSocketServer = (): SocketServer | null => {
  return globalSocketServer;
}; 