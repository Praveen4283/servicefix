import axios from 'axios';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Default log level based on environment
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LogLevel.ERROR  // Only log errors in production
  : LogLevel.DEBUG; // Log everything in development

// Configurable options
interface LoggerOptions {
  level: LogLevel;
  sendToServer: boolean;
  logEndpoint: string;
  consoleOutput: boolean;
  appName: string;
  batchSize: number;
  batchTimeMs: number;
}

// Default options
const defaultOptions: LoggerOptions = {
  level: DEFAULT_LOG_LEVEL,
  sendToServer: true,
  logEndpoint: '/api/logs',
  consoleOutput: true,
  appName: 'frontend',
  batchSize: 10, // Batch 10 logs together
  batchTimeMs: 5000 // Or send every 5 seconds
};

// Log entry interface
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  appName: string;
  meta?: any;
  userAgent: string;
  url: string;
  sessionId?: string;
  userId?: string;
}

// Logger class 
class Logger {
  private options: LoggerOptions;
  private readonly levelPriority = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3
  };
  private logQueue: LogEntry[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    // Generate a random session ID for grouping logs
    this.sessionId = this.generateSessionId();
    
    // Set up batch sending
    if (this.options.sendToServer) {
      this.setupBatchSending();
    }
    
    // Handle beforeunload to send remaining logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.logQueue.length > 0) {
          this.flushLogQueue(true);
        }
      });
    }
  }

  // Generate a unique session ID
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Set up batch sending timer
  private setupBatchSending(): void {
    if (this.batchTimeout === null) {
      this.batchTimeout = setTimeout(() => {
        this.flushLogQueue();
        this.batchTimeout = null;
        this.setupBatchSending();
      }, this.options.batchTimeMs);
    }
  }

  // Should this log level be processed based on current settings?
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] <= this.levelPriority[this.options.level];
  }

  // Add a log to the queue
  private addToQueue(level: LogLevel, message: string, meta?: any): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      appName: this.options.appName,
      meta,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      userId: this.extractUserId() // Extract user ID if available
    };
    
    this.logQueue.push(logEntry);
    
    // If we've reached the batch size, send immediately
    if (this.logQueue.length >= this.options.batchSize) {
      this.flushLogQueue();
    }
  }

  // Extract user ID from local storage or other storage mechanisms
  private extractUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.userId || undefined;
      }
      return undefined;
    } catch (e) {
      return undefined;
    }
  }

  // Send the log queue to the server
  private async flushLogQueue(isSync: boolean = false): Promise<void> {
    if (this.logQueue.length === 0) return;
    
    const logsCopy = [...this.logQueue];
    this.logQueue = [];
    
    try {
      // Use synchronous XHR for beforeunload to ensure logs are sent
      if (isSync && typeof navigator !== 'undefined') {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this.options.logEndpoint, false); // false = synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(logsCopy));
      } else {
        await axios.post(this.options.logEndpoint, logsCopy);
      }
    } catch (error) {
      // Output to console if server logging fails, but don't create an infinite loop
      if (this.options.consoleOutput) {
        console.error('Failed to send logs to server:', error);
      }
    }
  }

  // Write to console
  private writeToConsole(level: LogLevel, message: string, meta?: any): void {
    if (!this.options.consoleOutput) return;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(message, meta || '');
        break;
      case LogLevel.WARN:
        console.warn(message, meta || '');
        break;
      case LogLevel.INFO:
        console.info(message, meta || '');
        break;
      case LogLevel.DEBUG:
        console.debug(message, meta || '');
        break;
      default:
        console.log(message, meta || '');
    }
  }

  // Log methods
  public error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeToConsole(LogLevel.ERROR, message, meta);
      if (this.options.sendToServer) {
        this.addToQueue(LogLevel.ERROR, message, meta);
      }
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeToConsole(LogLevel.WARN, message, meta);
      if (this.options.sendToServer) {
        this.addToQueue(LogLevel.WARN, message, meta);
      }
    }
  }

  public info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeToConsole(LogLevel.INFO, message, meta);
      if (this.options.sendToServer) {
        this.addToQueue(LogLevel.INFO, message, meta);
      }
    }
  }

  public debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeToConsole(LogLevel.DEBUG, message, meta);
      if (this.options.sendToServer) {
        this.addToQueue(LogLevel.DEBUG, message, meta);
      }
    }
  }
}

// Create and export default logger instance
export const logger = new Logger();

// Export factory function to create custom loggers
export const createLogger = (options: Partial<LoggerOptions>) => new Logger(options); 