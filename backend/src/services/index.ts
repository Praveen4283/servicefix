/**
 * Service Initialization
 * This file initializes all services and registers them with the DI container
 */

import container from './di';
import authService from './auth.service';
import notificationService from './notification.service';
import chatbotService from './chatbot.service';
import { logger } from '../utils/logger';

// Register core services
container.register('authService', () => authService);
container.register('notificationService', () => notificationService);
container.register('chatbotService', () => chatbotService);

// Export services for convenience
export {
  authService,
  notificationService,
  chatbotService
};

// Initialize the container
export const initializeServices = (): void => {
  // Any additional initialization logic can go here
  logger.info('Services initialized');
};

// Export the container and helper functions
export { container, getService } from './di';

// By default, export the container
export default container; 