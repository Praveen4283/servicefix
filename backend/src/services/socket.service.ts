import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface UserSocket {
  userId: number;
  socketId: string;
}

class SocketService {
  private io: Server | null = null;
  private connectedUsers: Map<number, string[]> = new Map(); // userId -> socketIds[]

  /**
   * Initialize Socket.IO server
   * @param httpServer HTTP server instance
   */
  initialize(httpServer: HttpServer): void {
    if (this.io) {
      logger.warn('Socket.IO server already initialized');
      return;
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
        logger.info(`Socket Auth: Received token of type ${typeof token}`);
        // Avoid logging the token itself in production environments
        // if (process.env.NODE_ENV !== 'production') {
        //   logger.debug(`Socket Auth: Token received: ${token.substring(0, 10)}...`); 
        // }
      }
      // --- End Diagnostic Logging ---
      
      // --- Start Secret Logging ---
      const secretToUse = process.env.JWT_SECRET || 'fallback_secret';
      if (!process.env.JWT_SECRET) {
        logger.warn('[Socket Auth] JWT_SECRET not set, using fallback secret for verification.');
      } else {
        logger.info('[Socket Auth] Using JWT_SECRET from environment variables for verification.');
      }
      // --- End Secret Logging ---

      const decoded = jwt.verify(token, secretToUse) as { userId: number };
      
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Attach user data to socket
      (socket as any).user = { id: decoded.userId };
      
      next();
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
   * Send a notification to a specific user
   * @param userId ID of the user to send notification to
   * @param notification Notification data to send
   */
  sendNotification(userId: number, notification: any): void {
    if (!this.io) {
      logger.warn('Cannot send notification: Socket.IO not initialized');
      return;
    }

    // Emit to user's room
    this.io.to(`user:${userId}`).emit('notification', notification);
    logger.info(`Sent notification to user ${userId}`);
  }

  /**
   * Send a notification to multiple users
   * @param userIds Array of user IDs to send notification to
   * @param notification Notification data to send
   */
  broadcastNotification(userIds: number[], notification: any): void {
    if (!this.io) {
      logger.warn('Cannot broadcast notification: Socket.IO not initialized');
      return;
    }

    userIds.forEach(userId => {
      this.io?.to(`user:${userId}`).emit('notification', notification);
    });

    logger.info(`Broadcasted notification to ${userIds.length} users`);
  }

  /**
   * Check if a user is online (has active socket connections)
   * @param userId User ID to check
   * @returns Boolean indicating if user is online
   */
  isUserOnline(userId: number): boolean {
    const sockets = this.connectedUsers.get(userId) || [];
    return sockets.length > 0;
  }

  /**
   * Get list of online users
   * @returns Array of user IDs that are currently online
   */
  getOnlineUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }
}

export default new SocketService(); 