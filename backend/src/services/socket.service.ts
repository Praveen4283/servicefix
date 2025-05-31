import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import notificationService from './notification.service';
import authService from './auth.service';
import { AppError } from '../utils/errorHandler';

interface UserSocket {
  userId: number;
  socketId: string;
}

interface NotificationPayload {
  id?: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead?: boolean;
  createdAt?: Date;
  [key: string]: any;
}

class SocketService {
  private io: Server | null = null;
  private connectedUsers: Map<number, string[]> = new Map(); // userId -> socketIds[]

  /**
   * Initialize Socket.IO server
   * @param httpServer HTTP server instance
   * @returns Socket.IO server instance
   */
  initialize(httpServer: HttpServer): Server | null {
    if (this.io) {
      logger.warn('Socket.IO server already initialized');
      return this.io;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io'
    });

    // Setup authentication middleware
    this.io.use(this.authenticateSocket);

    // Setup connection handler
    this.io.on('connection', this.handleConnection.bind(this));
    
    logger.info('Socket.IO server initialized');
    return this.io;
  }

  /**
   * Authenticate socket connection using JWT token
   */
  private authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token;
      
      // --- Start Diagnostic Logging ---
      if (!token) {
        logger.warn('Socket Auth: No token provided in handshake.auth.token');
        return next(new Error('Authentication error: Token not provided'));
      } else {
        logger.debug(`Socket Auth: Received token`);
      }
      // --- End Diagnostic Logging ---
      
      try {
        // Use auth service to verify token
        const decoded = authService.verifyToken(token);
        
        if (!decoded || !decoded.userId) {
          return next(new Error('Authentication error: Invalid token payload'));
        }
        
        // Attach user data to socket
        (socket as any).user = { id: decoded.userId };
        
        next();
      } catch (error) {
        // Handle specific token errors
        if (error instanceof AppError) {
          return next(new Error(`Authentication error: ${error.message}`));
        }
        throw error; // Re-throw unexpected errors
      }
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  };

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const userId = (socket as any).user?.id;
    
    if (!userId) {
      logger.warn('Connection attempt without valid user ID');
      socket.disconnect();
      return;
    }

    logger.info(`User ${userId} connected with socket ${socket.id}`);

    // Store the connection
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    
    this.connectedUsers.get(userId)?.push(socket.id);

    // Join user to their private room
    socket.join(`user:${userId}`);

    // Notify client that connection is successful
    socket.emit('connected', { status: 'connected', userId });

    // Handle client notifications
    socket.on('client:notification', (data) => {
      this.handleClientNotification(userId, data, socket);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected from socket ${socket.id}`);
      
      // Remove socket from connected users
      const userSockets = this.connectedUsers.get(userId) || [];
      const updatedSockets = userSockets.filter(id => id !== socket.id);
      
      if (updatedSockets.length > 0) {
        this.connectedUsers.set(userId, updatedSockets);
      } else {
        this.connectedUsers.delete(userId);
      }
    });
  }

  /**
   * Handle client notification
   */
  private handleClientNotification(userId: number, data: any, socket: Socket): void {
    logger.info(`Received notification from user ${userId}:`, data);
    
    // Process notification based on type
    // Implementation depends on application requirements
  }

  /**
   * Send notification to a specific user
   * @param userId User ID
   * @param notification Notification payload
   * @returns True if notification was sent
   */
  sendNotification(userId: number, notification: NotificationPayload): boolean {
    return this.sendToUser(userId, 'server:notification', notification);
  }

  /**
   * Check if user is online/connected
   * @param userId User ID
   * @returns True if user is online
   */
  isUserOnline(userId: number): boolean {
    return this.isUserConnected(userId);
  }

  /**
   * Send notification to a specific user
   * @param userId User ID
   * @param eventType Event type
   * @param payload Notification payload
   */
  sendToUser(userId: number, eventType: string, payload: any): boolean {
    if (!this.io) {
      logger.error('Socket.IO server not initialized');
      return false;
    }

    logger.info(`Sending ${eventType} to user ${userId}`);
    
    // Send to user's room
    this.io.to(`user:${userId}`).emit(eventType, payload);
    
    // Check if user has active connections
    return this.isUserConnected(userId);
  }

  /**
   * Send notification to a group of users
   * @param userIds User IDs
   * @param eventType Event type
   * @param payload Notification payload
   * @returns Map of user IDs to delivery status
   */
  sendToUsers(userIds: number[], eventType: string, payload: any): Map<number, boolean> {
    const results = new Map<number, boolean>();
    
    userIds.forEach(userId => {
      results.set(userId, this.sendToUser(userId, eventType, payload));
    });
    
    return results;
  }

  /**
   * Check if a user is connected
   * @param userId User ID
   * @returns True if user is connected
   */
  isUserConnected(userId: number): boolean {
    const sockets = this.connectedUsers.get(userId);
    return !!sockets && sockets.length > 0;
  }

  /**
   * Get all connected users
   * @returns Array of connected user IDs
   */
  getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Get socket instance
   * @returns Socket.IO server instance
   */
  getIO(): Server | null {
    return this.io;
  }
}

// Export singleton instance
export default new SocketService(); 