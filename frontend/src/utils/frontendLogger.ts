/**
 * Frontend Logging Utility
 * 
 * Production-safe logging that automatically strips logs in production builds.
 * Replaces console.log statements throughout the application.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   
 *   logger.debug('Debug message', data);
 *   logger.info('Info message', data);
 *   logger.warn('Warning message', data);
 *   logger.error('Error message', error);
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log levels
 */
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    return `${timestamp} ${level} ${prefix} ${message}`;
}

/**
 * Production-safe logger
 */
export const logger = {
    /**
     * Debug level logging (stripped in production)
     */
    debug: (message: string, ...args: any[]): void => {
        if (isDevelopment) {
            console.log(`[DEBUG]`, message, ...args);
        }
    },

    /**
     * Info level logging
     */
    info: (message: string, ...args: any[]): void => {
        if (isDevelopment) {
            console.info(`[INFO]`, message, ...args);
        }
    },

    /**
     * Warning level logging
     */
    warn: (message: string, ...args: any[]): void => {
        if (isDevelopment) {
            console.warn(`[WARN]`, message, ...args);
        } else {
            // In production, only log warnings to error tracking service
            // This would be where you'd send to Sentry, LogRocket, etc.
        }
    },

    /**
     * Error level logging (always enabled)
     */
    error: (message: string, error?: Error | unknown, ...args: any[]): void => {
        console.error(`[ERROR]`, message, error, ...args);

        // In production, send to error tracking service
        if (!isDevelopment && typeof window !== 'undefined') {
            // Example: Sentry.captureException(error);
            // Example: LogRocket.captureException(error);
        }
    },

    /**
     * Contextual logger - creates a logger with a specific context
     */
    withContext: (context: string) => ({
        debug: (message: string, ...args: any[]) => logger.debug(`[${context}] ${message}`, ...args),
        info: (message: string, ...args: any[]) => logger.info(`[${context}] ${message}`, ...args),
        warn: (message: string, ...args: any[]) => logger.warn(`[${context}] ${message}`, ...args),
        error: (message: string, error?: Error | unknown, ...args: any[]) =>
            logger.error(`[${context}] ${message}`, error, ...args),
    }),

    /**
     * Helper for tracking API calls
     */
    api: {
        request: (method: string, url: string, data?: any) => {
            if (isDevelopment) {
                console.log(`[API REQUEST] ${method} ${url}`, data);
            }
        },
        response: (method: string, url: string, status: number, data?: any) => {
            if (isDevelopment) {
                console.log(`[API RESPONSE] ${method} ${url} - ${status}`, data);
            }
        },
        error: (method: string, url: string, error: any) => {
            logger.error(`[API ERROR] ${method} ${url}`, error);
        },
    },

    /**
     * Helper for tracking socket events
     */
    socket: {
        connect: (connectionId?: string) => {
            logger.debug(`[Socket] Connected ${connectionId || ''}`);
        },
        disconnect: (reason: string) => {
            logger.debug(`[Socket] Disconnected: ${reason}`);
        },
        event: (eventName: string, data?: any) => {
            logger.debug(`[Socket Event] ${eventName}`, data);
        },
        error: (error: Error | unknown) => {
            logger.error('[Socket Error]', error);
        },
    },
};

/**
 * Performance logging helper
 */
export const perf = {
    start: (label: string): number => {
        if (isDevelopment) {
            console.time(label);
        }
        return performance.now();
    },
    end: (label: string, startTime?: number): void => {
        if (isDevelopment) {
            if (startTime) {
                const duration = performance.now() - startTime;
                console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
            } else {
                console.timeEnd(label);
            }
        }
    },
};

export default logger;
