import { Application } from 'express';
import { logger } from './logger';

/**
 * Interface representing information about a route
 */
export interface RouteInfo {
  path: string;
  method: string;
  description?: string;
  params?: string[];
  category?: string;
  requiresAuth?: boolean;
}

/**
 * Interface for system information
 */
export interface SystemInfo {
  version: string;
  nodeVersion: string;
  environment: string;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  databaseStatus: 'connected' | 'disconnected' | 'unknown';
  startTime: Date;
}

// Default system info
export const systemInfo: SystemInfo = {
  version: process.env.npm_package_version || '1.0.0',
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  uptime: 0,
  memoryUsage: {
    heapUsed: 0,
    heapTotal: 0,
    rss: 0
  },
  databaseStatus: 'unknown',
  startTime: new Date()
};

/**
 * Update system info
 */
export function updateSystemInfo(dbStatus?: 'connected' | 'disconnected'): void {
  const memory = process.memoryUsage();

  systemInfo.uptime = process.uptime();
  systemInfo.memoryUsage = {
    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
    rss: Math.round(memory.rss / 1024 / 1024)
  };

  if (dbStatus) {
    systemInfo.databaseStatus = dbStatus;
  }
}

/**
 * Get current system info
 */
export function getSystemInfo(): SystemInfo {
  updateSystemInfo();
  return systemInfo;
}

/**
 * Map of route paths to their descriptions
 */
const routeDescriptions: Record<string, Partial<RouteInfo>> = {
  '/api/auth/register': {
    description: 'Register a new user',
    requiresAuth: false,
    category: 'Authentication',
    params: ['email', 'password', 'firstName', 'lastName']
  },
  '/api/auth/login': {
    description: 'User login',
    requiresAuth: false,
    category: 'Authentication',
    params: ['email', 'password']
  },
  '/api/auth/refresh-token': {
    description: 'Refresh authentication token',
    requiresAuth: true,
    category: 'Authentication',
    params: ['refreshToken']
  },
  '/api/auth/forgot-password': {
    description: 'Request password reset',
    requiresAuth: false,
    category: 'Authentication',
    params: ['email']
  },
  '/api/auth/reset-password': {
    description: 'Reset password with token',
    requiresAuth: false,
    category: 'Authentication',
    params: ['token', 'password']
  },
  '/api/auth/verify-email': {
    description: 'Verify email address',
    requiresAuth: false,
    category: 'Authentication',
    params: ['token']
  },
  '/api/auth/logout': {
    description: 'Logout user',
    requiresAuth: true,
    category: 'Authentication'
  },
  '/api/users': {
    description: 'Get all users',
    requiresAuth: true,
    category: 'User Management'
  },
  '/api/users/:id': {
    description: 'Get, update or delete a specific user',
    requiresAuth: true,
    category: 'User Management',
    params: ['id']
  },
  '/api/tickets': {
    description: 'Create or get all tickets',
    requiresAuth: true,
    category: 'Ticket Management'
  },
  '/api/tickets/:id': {
    description: 'Get, update or delete a specific ticket',
    requiresAuth: true,
    category: 'Ticket Management',
    params: ['id']
  },
  '/api/tickets/:id/comments': {
    description: 'Add or get comments for a ticket',
    requiresAuth: true,
    category: 'Ticket Management',
    params: ['id']
  },
  '/api/tickets/:id/assign': {
    description: 'Assign ticket to a user',
    requiresAuth: true,
    category: 'Ticket Management',
    params: ['id', 'userId']
  },
  '/api/tickets/:id/status': {
    description: 'Update ticket status',
    requiresAuth: true,
    category: 'Ticket Management',
    params: ['id', 'status']
  },
  '/api/tickets/:id/priority': {
    description: 'Update ticket priority',
    requiresAuth: true,
    category: 'Ticket Management',
    params: ['id', 'priority']
  },
  '/api/tickets/:id/attachments': {
    description: 'Add or get attachments for a ticket',
    requiresAuth: true,
    category: 'Ticket Management',
    params: ['id']
  },
  '/api/knowledge': {
    description: 'Get all knowledge base articles',
    requiresAuth: false,
    category: 'Knowledge Base'
  },
  '/api/knowledge/:id': {
    description: 'Get a specific knowledge base article',
    requiresAuth: false,
    category: 'Knowledge Base',
    params: ['id']
  },
  '/api/knowledge/search': {
    description: 'Search knowledge base',
    requiresAuth: false,
    category: 'Knowledge Base',
    params: ['query']
  },
  '/api/knowledge/categories': {
    description: 'Get all knowledge base categories',
    requiresAuth: false,
    category: 'Knowledge Base'
  },
  '/api/reports/tickets': {
    description: 'Get ticket reports',
    requiresAuth: true,
    category: 'Reports',
    params: ['startDate', 'endDate']
  },
  '/api/reports/agents': {
    description: 'Get agent performance reports',
    requiresAuth: true,
    category: 'Reports',
    params: ['startDate', 'endDate']
  },
  '/api/reports/customer-satisfaction': {
    description: 'Get customer satisfaction reports',
    requiresAuth: true,
    category: 'Reports',
    params: ['startDate', 'endDate']
  },
  '/api/ai/suggest': {
    description: 'Get AI suggestions for tickets',
    requiresAuth: true,
    category: 'AI Services',
    params: ['ticketId']
  },
  '/api/ai/summarize': {
    description: 'Summarize ticket conversations',
    requiresAuth: true,
    category: 'AI Services',
    params: ['ticketId']
  },
  '/api/chat/start': {
    description: 'Start a chatbot conversation',
    requiresAuth: false,
    category: 'Chatbot'
  },
  '/api/chat/message': {
    description: 'Send a message to the chatbot',
    requiresAuth: false,
    category: 'Chatbot',
    params: ['sessionId', 'message']
  },
  '/api/notifications': {
    description: 'Get all notifications',
    requiresAuth: true,
    category: 'Notifications'
  },
  '/api/notifications/:id': {
    description: 'Mark a notification as read',
    requiresAuth: true,
    category: 'Notifications',
    params: ['id']
  },
  '/api/logs': {
    description: 'Get system logs',
    requiresAuth: true,
    category: 'System Administration',
    params: ['startDate', 'endDate', 'level']
  },
  '/api/settings': {
    description: 'Get or update system settings',
    requiresAuth: true,
    category: 'System Administration'
  },
  '/api/sla': {
    description: 'Get all SLA policies',
    requiresAuth: true,
    category: 'SLA Management'
  },
  '/api/sla/:id': {
    description: 'Get or update a specific SLA policy',
    requiresAuth: true,
    category: 'SLA Management',
    params: ['id']
  },
  '/api/ticket-priorities': {
    description: 'Get all ticket priorities',
    requiresAuth: true,
    category: 'Ticket Configuration'
  },
  '/api/ticket-priorities/:id': {
    description: 'Get or update a specific ticket priority',
    requiresAuth: true,
    category: 'Ticket Configuration',
    params: ['id']
  },
  '/api/business-hours': {
    description: 'Get all business hours',
    requiresAuth: true,
    category: 'Business Configuration'
  },
  '/api/business-hours/:id': {
    description: 'Get or update specific business hours',
    requiresAuth: true,
    category: 'Business Configuration',
    params: ['id']
  },
  '/health': {
    description: 'API health check endpoint',
    requiresAuth: false,
    category: 'System'
  },
  '/': {
    description: 'API Dashboard',
    requiresAuth: false,
    category: 'System'
  }
};

// Store routes for retrieval
let cachedRoutes: RouteInfo[] = [];

/**
 * Extract routes from the Express application
 * @param app Express application
 */
export function extractRoutes(app: Application): void {
  const routes: RouteInfo[] = [];

  try {
    // Get registered routes from Express
    const expressRoutes = (app as any)._router?.stack || [];

    function processStack(stack: any[], basePath = ''): void {
      for (const layer of stack) {
        if (layer.route) {
          // This is a route directly on the app
          const path = basePath + (layer.route.path || '');
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());

          for (const method of methods) {
            const routeInfo = routeDescriptions[path] || {};
            routes.push({
              path,
              method,
              description: routeInfo.description,
              params: routeInfo.params,
              category: routeInfo.category,
              requiresAuth: routeInfo.requiresAuth
            });
          }
        } else if (layer.name === 'router' && layer.handle.stack) {
          // This is a router middleware
          let routerPath = basePath;

          if (layer.regexp) {
            const match = layer.regexp.toString().match(/^\/\^\\(\/[^\/]*)\\\//);
            if (match) {
              routerPath = routerPath + match[1].replace(/\\\//g, '/');
            }
          }

          processStack(layer.handle.stack, routerPath);
        } else if (layer.handle && layer.handle.stack) {
          // This is a middleware with nested routes
          processStack(layer.handle.stack, basePath);
        }
      }
    }

    processStack(expressRoutes);
  } catch (error) {
    logger.error('Error extracting routes:', error);
  }

  // Manually add routes in case they are not properly extracted
  if (routes.length === 0) {
    // Add manually defined routes
    for (const path of Object.keys(routeDescriptions)) {
      const routeInfo = routeDescriptions[path];
      routes.push({
        path,
        method: path === '/health' ? 'GET' : path.includes(':id') ? 'GET/PUT/DELETE' : 'GET/POST',
        description: routeInfo.description,
        params: routeInfo.params,
        category: routeInfo.category,
        requiresAuth: routeInfo.requiresAuth
      });
    }
  }

  // Save the routes for later retrieval
  cachedRoutes = routes;
}

/**
 * Get route information
 * @returns Array of route information
 */
export function getRouteInfo(): RouteInfo[] {
  if (cachedRoutes.length === 0) {
    // Return manually defined routes if we haven't extracted from the app yet
    const routes: RouteInfo[] = [];
    for (const path of Object.keys(routeDescriptions)) {
      const routeInfo = routeDescriptions[path];
      routes.push({
        path,
        method: path === '/health' ? 'GET' : path.includes(':id') ? 'GET/PUT/DELETE' : 'GET/POST',
        description: routeInfo.description,
        params: routeInfo.params,
        category: routeInfo.category,
        requiresAuth: routeInfo.requiresAuth
      });
    }
    return routes;
  }

  return cachedRoutes;
} 