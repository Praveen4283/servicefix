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
  chatbotController.validateCreateConversation, // Add validation
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
  chatbotController.validateAddMessage, // Add validation
  chatbotController.addMessageHandler
);

/**
 * @route   GET /api/chat/conversations/:id/messages
 * @desc    Get all messages for a conversation
 * @access  Private
 */
router.get(
  '/conversations/:id/messages',
  authenticate, // Ensure user is logged in
  chatbotController.validateGetMessages, // Add validation
  chatbotController.getMessagesHandler
);

/**
 * @route   GET /api/chat/conversations
 * @desc    Get all conversations for the authenticated user's organization
 * @access  Private
 */
router.get(
  '/conversations',
  authenticate,
  chatbotController.getAllConversations
);

/**
 * @route   GET /api/chat/conversations/:id
 * @desc    Get a specific conversation by ID with its messages
 * @access  Private
 */
router.get(
  '/conversations/:id',
  authenticate,
  chatbotController.validateGetMessages, // Reuse the same validation
  chatbotController.getConversation
);

/**
 * @route   PATCH /api/chat/conversations/:id/end
 * @desc    End a conversation
 * @access  Private
 */
router.patch(
  '/conversations/:id/end',
  authenticate,
  chatbotController.validateGetMessages, // Reuse the same validation for conversation ID
  chatbotController.endConversation
);

// Add other routes if needed (e.g., GET /conversations/:id/messages)

export default router;
