import { Request, Response, NextFunction } from 'express';
import { pool, query } from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import chatbotService from '../services/chatbot.service';
import { SenderType } from '../models/ChatMessage';
import { body, param, validationResult } from 'express-validator';

class ChatbotController {
  /**
   * Input validation middleware for creating a conversation
   */
  validateCreateConversation = [
    body('metadata').optional().isObject().withMessage('Metadata must be a valid object'),
    body('visitorId').optional().isString().withMessage('Visitor ID must be a string')
  ];
  
  /**
   * Input validation middleware for adding a message
   */
  validateAddMessage = [
    param('id').isString().notEmpty().withMessage('Conversation ID is required'),
    body('senderType').isIn(['user', 'bot', 'agent']).withMessage('Invalid sender type'),
    body('content').isString().notEmpty().withMessage('Message content is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be a valid object')
  ];

  /**
   * Input validation middleware for getting messages
   */
  validateGetMessages = [
    param('id').isString().notEmpty().withMessage('Conversation ID is required')
  ];

  /**
   * @route   POST /api/chat/conversations
   * @desc    Start a new chat conversation
   * @access  Private (Requires authentication to link userId and organizationId)
   */
  createConversationHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw AppError.badRequest(`Validation error: ${JSON.stringify(errors.array())}`);
    }
    
    // --- Get User ID and Organization ID ---
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    // We require an authenticated user to link the conversation correctly
    if (!organizationId) {
      logger.warn('Attempt to create conversation without organization ID');
      throw AppError.unauthorized('Authentication required to start a chat conversation.');
    }
    
    // --- Get payload from request ---
    const { visitorId, metadata } = req.body;
    
    try {
    // --- Create conversation ---
    const conversationResponse = await chatbotService.createConversation({
      userId: String(userId),
      visitorId: visitorId,
      organizationId: String(organizationId),
      metadata: metadata
    });
      
      logger.info(`Created conversation: ${conversationResponse.id} for user: ${userId}`);
    
    // Wrap in standard success response structure
    res.status(201).json({ status: 'success', data: conversationResponse });
    } catch (error: any) {
      logger.error(`Error creating conversation: ${error.message}`);
      throw AppError.internal(`Failed to create conversation: ${error.message}`);
    }
  });

  /**
   * @route   POST /api/chat/conversations/:id/messages
   * @desc    Add a message to a conversation
   * @access  Private (Requires authentication)
   */
  addMessageHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw AppError.badRequest(`Validation error: ${JSON.stringify(errors.array())}`);
    }
    
    const conversationId = req.params.id;
    const { content, senderType, metadata } = req.body;
    const userId = req.user.id;
    
    try {
    // --- Add message ---
    const message = await chatbotService.addMessageToConversation({
        conversationId,
      content,
      senderType,
        senderId: String(userId),
        metadata
    });
      
      logger.debug(`Added message to conversation ${conversationId} by user ${userId}`);
    
    // Wrap in standard success response structure
    res.status(201).json({ status: 'success', data: message });
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        throw AppError.notFound(`Conversation with ID ${conversationId} not found`);
      } else if (error.message === 'Invalid conversation ID format') {
        throw AppError.badRequest('Invalid conversation ID format');
      } else {
        logger.error(`Error adding message to conversation ${conversationId}: ${error.message}`);
        throw AppError.internal(`Failed to add message: ${error.message}`);
      }
    }
  });

  /**
   * @route   GET /api/chat/conversations/:id/messages
   * @desc    Get all messages for a conversation
   * @access  Private (Requires authentication)
   */
  getMessagesHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw AppError.badRequest(`Validation error: ${JSON.stringify(errors.array())}`);
    }
    
    const conversationId = req.params.id;
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    try {
    // --- Get messages ---
    const messages = await chatbotService.getConversationMessages(
      conversationId,
      String(organizationId)
    );
      
      logger.debug(`Retrieved ${messages.length} messages for conversation ${conversationId}`);
    
    // Wrap in standard success response structure
    res.status(200).json({ status: 'success', data: messages });
    } catch (error: any) {
      if (error.message === 'Conversation not found or access denied') {
        throw AppError.notFound(`Conversation with ID ${conversationId} not found or access denied`);
      } else if (error.message === 'Invalid conversation ID format' || error.message === 'Invalid organization ID format') {
        throw AppError.badRequest('Invalid ID format provided');
      } else {
        logger.error(`Error getting messages for conversation ${conversationId}: ${error.message}`);
        throw AppError.internal(`Failed to get messages: ${error.message}`);
      }
    }
  });

  /**
   * @route   GET /api/chat/conversations
   * @desc    Get all conversations for the organization
   * @access  Private (Requires authentication)
   */
  getAllConversations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw AppError.forbidden('Organization ID is required');
    }
    
    try {
    const conversations = await query(
      'SELECT * FROM chatbot_conversations WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );
      
      logger.debug(`Retrieved ${conversations.rows.length} conversations for organization ${organizationId}`);
    
    res.json({
      status: 'success',
      data: conversations.rows
    });
    } catch (error: any) {
      logger.error(`Error getting conversations for organization ${organizationId}: ${error.message}`);
      throw AppError.internal(`Failed to retrieve conversations: ${error.message}`);
    }
  });

  /**
   * @route   GET /api/chat/conversations/:id
   * @desc    Get a specific conversation by ID
   * @access  Private (Requires authentication)
   */
  getConversation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id;
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw AppError.forbidden('Organization ID is required');
    }
    
    try {
      // Use the service method to get the conversation with proper validation
      const conversation = await chatbotService.getConversation(conversationId, String(organizationId));
    
    // Get messages for this conversation
      const messages = await chatbotService.getConversationMessages(conversationId, String(organizationId));
    
    // Combine data
      const result = {
        ...conversation,
        messages
      };
      
      logger.debug(`Retrieved conversation ${conversationId} with ${messages.length} messages`);
    
    res.json({
      status: 'success',
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Conversation not found or access denied') {
        throw AppError.notFound(`Conversation with ID ${conversationId} not found or access denied`);
      } else if (error.message.includes('Invalid') && error.message.includes('format')) {
        throw AppError.badRequest('Invalid ID format provided');
      } else {
        logger.error(`Error getting conversation ${conversationId}: ${error.message}`);
        throw AppError.internal(`Failed to retrieve conversation: ${error.message}`);
      }
    }
  });

  /**
   * @route   PATCH /api/chat/conversations/:id/end
   * @desc    End a conversation
   * @access  Private (Requires authentication)
   */
  endConversation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id;
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw AppError.forbidden('Organization ID is required');
    }
    
    try {
      // Use the service method to end the conversation
      const result = await chatbotService.endConversation(conversationId, String(organizationId));
    
      logger.info(`Ended conversation ${conversationId}`);
    
    res.json({
      status: 'success',
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Conversation not found or access denied') {
        throw AppError.notFound(`Conversation with ID ${conversationId} not found or access denied`);
      } else if (error.message.includes('Invalid') && error.message.includes('format')) {
        throw AppError.badRequest('Invalid ID format provided');
      } else {
        logger.error(`Error ending conversation ${conversationId}: ${error.message}`);
        throw AppError.internal(`Failed to end conversation: ${error.message}`);
      }
    }
  });
}

export default new ChatbotController();
