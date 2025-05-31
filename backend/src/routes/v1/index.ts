import { Router } from 'express';

// Import controllers
import * as authController from '../../controllers/auth.controller';
import chatbotController from '../../controllers/chatbot.controller';

// Import middleware
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { csrfProtection } from '../../middleware/csrf.middleware';

const router = Router();

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh-token', authController.refreshToken);
router.post('/auth/logout', authenticate, authController.logout);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/change-password', authenticate, authController.changePassword);

// CSRF token endpoint
router.get('/csrf-token', csrfProtection, authController.getCsrfToken);

// Chatbot routes
router.get('/chat/conversations', authenticate, chatbotController.getAllConversations);
router.post('/chat/conversations', authenticate, chatbotController.createConversationHandler);
router.get('/chat/conversations/:id', authenticate, chatbotController.getConversation);
router.post('/chat/conversations/:id/messages', authenticate, chatbotController.addMessageHandler);
router.get('/chat/conversations/:id/messages', authenticate, chatbotController.getMessagesHandler);
router.post('/chat/conversations/:id/end', authenticate, chatbotController.endConversation);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router; 