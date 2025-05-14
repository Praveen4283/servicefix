import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import notificationService from './notification.service';

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
   * Handle notification sent from client
   * @param userId ID of the user who sent the notification
   * @param data Notification data
   * @param socket Socket instance
   */
  private handleClientNotification(userId: number, data: any, socket: Socket): void {
    logger.info(`Received client notification from user ${userId}:`, JSON.stringify(data));
    
    try {
      // Check if this client has already shown this notification
      const { directlySent, isPersistent, ...notification } = data;
      
      // Get notification data in the format our service expects
      const notificationData = {
        title: notification.title || 'Notification',
        message: notification.message,
        type: notification.type || 'info',
        link: notification.link,
        metadata: notification.metadata
      };
      
      // If the client wants this to be persistent, store it in the database
      if (isPersistent !== false) {
        notificationService.createInAppNotification(
          userId.toString(),
          notificationData
        ).then(() => {
          logger.info(`Saved notification for user ${userId} to database`);
        }).catch(err => {
          logger.error(`Failed to save notification for user ${userId}:`, err);
        });
      }
      
      // If the client has already shown this notification, don't send it back
      if (directlySent) {
        logger.info(`Skipping re-sending notification to user ${userId} as it was directly sent`);
        return;
      }
      
      // If needed, broadcast to other clients of this user
      // (this notification originated from one client but should be seen by all)
      const socketIds = this.connectedUsers.get(userId) || [];
      socketIds.forEach(sid => {
        if (sid !== socket.id) { // Don't send back to originator
          this.io?.to(sid).emit('notification', notification);
        }
      });
      
    } catch (error) {
      logger.error('Error handling client notification:', error);
      socket.emit('error', { message: 'Failed to process notification' });
    }
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