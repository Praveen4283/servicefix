import express from 'express';
import chatbotController from '../controllers/chatbot.controller';
import { authenticate } from '../middleware/auth.middleware'; // Adjust path if needed

const router = express.Router();

/**
 * @route   POST /api/chat/conversations
 * @desc    Start a new chat conversation
 * @access  Private
 */
router.post(
  '/conversations',
  authenticate, // Ensure user is logged in
  chatbotController.createConversationHandler
);

/**
 * @route   POST /api/chat/conversations/:id/messages
 * @desc    Add a message to a conversation
 * @access  Private
 */
router.post(
  '/conversations/:id/messages',
  authenticate, // Ensure user is logged in
  chatbotController.addMessageHandler
);

// Add other routes if needed (e.g., GET /conversations/:id/messages)

export default router;
