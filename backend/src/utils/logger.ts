import winston from 'winston';
import Transport from 'winston-transport';
import path from 'path';
// Using require for daily rotate file to avoid TypeScript issues
const DailyRotateFile = require('winston-daily-rotate-file');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that we want to link the colors
winston.addColors(colors);

// Log formatting
const formatOptions = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}${info.metadata ? '\n' + JSON.stringify(info.metadata) : ''}`,
  ),
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  formatOptions
);

// Create log directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Define file transports with rotation
const fileTransports = [
  // Rotating file for all logs
  new DailyRotateFile({
    filename: path.join(logDir, 'all-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d', // keep logs for 14 days
    level: 'debug',
    format: formatOptions,
  }),

  // Separate file for error logs
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d', // keep error logs longer - 30 days
    level: 'error',
    format: formatOptions,
  }),

  // Separate file for HTTP logs
  new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    level: 'http',
    format: formatOptions,
  }),
];

// Create the logger first (without Supabase transport)
// We do this to avoid circular dependencies
export const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: consoleFormat,
    }),
    ...fileTransports,
  ],
});

// Adapter function for Express morgan middleware
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export a function to log requests with metadata
export const logWithMetadata = (level: string, message: string, metadata?: any) => {
  logger.log({
    level,
    message,
    metadata,
  });
};

// Import the uploadLogToStorage function - but only after logger is created
import { uploadLogToStorage } from './logStorage';

// Custom transport for Supabase storage - only add if needed
class SupabaseTransport extends Transport {
  constructor(opts: any) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Format the log entry as a string
      const logEntry = `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}${info.metadata ? '\n' + JSON.stringify(info.metadata) : ''}`;

      // Determine log type based on level
      let logType = 'general';
      if (info.level === 'error') {
        logType = 'error';
      } else if (info.level === 'http') {
        logType = 'http';
      }

      // NOTE: Using console.error here is intentional to avoid infinite recursion.
      // If we used logger.error here, it would trigger this transport again.
      uploadLogToStorage(logEntry, logType, 'backend')
        .catch(error => console.error('Failed to upload log to Supabase:', error));

    } catch (error) {
      // NOTE: Using console.error here is intentional to avoid infinite recursion.
      console.error('Error in Supabase transport:', error);
    }

    callback();
  }
}

// Add Supabase transport if enabled
const useSupabaseStorage = process.env.USE_SUPABASE_LOGS === 'true';
if (useSupabaseStorage) {
  logger.add(new SupabaseTransport({
    level: 'info', // Only store important logs in Supabase
  }));
} 