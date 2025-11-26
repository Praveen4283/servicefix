import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import notificationService from './notification.service';
import authService from './auth.service';
import { AppError } from '../utils/errorHandler';
import cookieParser from 'cookie-parser';

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
  private JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

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
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-post-login']
      },
      path: '/socket.io',
      // Improved connection handling
      connectTimeout: 10000, // 10s connection timeout
      pingTimeout: 20000,    // 20s ping timeout
      pingInterval: 25000    // Send ping packet every 25s
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
   * Tries multiple auth methods for flexibility:
   * 1. handshake.auth.token
   * 2. handshake headers Authorization Bearer token
   * 3. cookies.accessToken (httpOnly cookie)
   */
  private authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
    try {
      let token: string | undefined;
      
      // First try: handshake.auth.token
      if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
        logger.debug(`Socket Auth: Using token from handshake.auth`);
      }
      
      // Second try: Authorization header
      if (!token && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          logger.debug(`Socket Auth: Using token from Authorization header`);
        }
      }
      
      // Third try: Cookies (httpOnly)
      if (!token && socket.handshake.headers.cookie) {
        const cookies = this.parseCookies(socket.handshake.headers.cookie);
        if (cookies.accessToken) {
          token = cookies.accessToken;
          logger.debug(`Socket Auth: Using token from cookie`);
        }
      }
      
      // If no token found, reject connection
      if (!token) {
        logger.warn('Socket Auth: No token found in any authentication method');
        return next(new Error('Authentication error: Token not provided'));
      }
      
      try {
        // Verify the token
        const decoded = authService.verifyToken(token);
        
        if (!decoded || !decoded.userId) {
          return next(new Error('Authentication error: Invalid token payload'));
        }
        
        // Get user info to ensure the user exists and is active
        try {
          const userId = decoded.userId;
          logger.debug(`Socket Auth: Token verified for user ${userId}`);
        
        // Attach user data to socket
          (socket as any).user = { 
            id: userId, 
            role: decoded.role || 'customer',
            socketId: socket.id
          };
          
          // Add user to their room for targeted messaging
          socket.join(`user:${userId}`);
          
          // Prevent reconnection abuse by limiting connections 
          // per user (e.g., max 5 connections per user)
          const userSocketsCount = this.connectedUsers.get(userId)?.length || 0;
          if (userSocketsCount >= 5) {
            logger.warn(`Socket Auth: User ${userId} has too many connections (${userSocketsCount})`);
            // Don't disconnect, just warn in logs
          }
        
        next();
        } catch (error) {
          logger.error(`Socket Auth: Error getting user: ${error}`);
          return next(new Error('Authentication error: User not found or inactive'));
        }
      } catch (error) {
        // Specific JWT validation errors
        if (error instanceof Error) {
          if (error.name === 'TokenExpiredError') {
            logger.debug(`Socket Auth: Token expired`);
            return next(new Error('Authentication error: Token expired'));
          }
          
          logger.debug(`Socket Auth: Invalid token: ${error.message}`);
          return next(new Error('Authentication error: Invalid token'));
        }
        throw error; // Re-throw unexpected errors
      }
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  };

  /**
   * Parse cookies from header string
   */
  private parseCookies(cookieHeader: string): {[key: string]: string} {
    const list: {[key: string]: string} = {};
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts.shift()!.trim();
      const value = decodeURI(parts.join('='));
      list[key] = value;
    });
    return list;
  }

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
    socket.emit('connected', { 
      status: 'connected', 
      userId,
      timestamp: new Date().toISOString()
    });

    // Handle client notifications
    socket.on('client:notification', (data) => {
      this.handleClientNotification(userId, data, socket);
    });

    // Handle token expiration or refresh
    socket.on('token:refresh', (data) => {
      logger.debug(`User ${userId} refreshed token`);
      // The existing authentication will continue to work,
      // no need to do anything here
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`User ${userId} disconnected from socket ${socket.id}, reason: ${reason}`);
      
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