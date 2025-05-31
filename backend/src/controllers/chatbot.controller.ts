import { Request, Response, NextFunction } from 'express';
import { pool, query } from '../config/database';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import chatbotService from '../services/chatbot.service';
import { SenderType } from '../models/ChatMessage';

class ChatbotController {
  /**
   * @route   POST /api/chat/conversations
   * @desc    Start a new chat conversation
   * @access  Private (Requires authentication to link userId and organizationId)
   */
  createConversationHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // --- Get User ID and Organization ID ---
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    // We require an authenticated user to link the conversation correctly
    if (!organizationId) {
      throw AppError.unauthorized('Authentication required to start a chat conversation.');
    }
    
    // --- Get payload from request ---
    const { visitorId, metadata } = req.body;
    
    // --- Create conversation ---
    const conversationResponse = await chatbotService.createConversation({
      userId: String(userId),
      visitorId: visitorId,
      organizationId: String(organizationId),
      metadata: metadata
    });
    
    // Wrap in standard success response structure
    res.status(201).json({ status: 'success', data: conversationResponse });
  });

  /**
   * @route   POST /api/chat/conversations/:id/messages
   * @desc    Add a message to a conversation
   * @access  Private (Requires authentication)
   */
  addMessageHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id;
    const { content, senderType } = req.body;
    const userId = req.user.id;
    
    // --- Validation ---
    if (!conversationId) {
      throw AppError.badRequest('Conversation ID is required.');
    }
    
    if (!senderType || !['user', 'bot', 'agent'].includes(senderType)) {
      // Allow all valid sender types
      throw AppError.badRequest('Invalid sender type specified.');
    }
    
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw AppError.badRequest('Message content cannot be empty.');
    }
    
    // --- Add message ---
    const message = await chatbotService.addMessageToConversation({
      conversationId: conversationId,
      content,
      senderType,
      senderId: String(userId)
    });
    
    // Wrap in standard success response structure
    res.status(201).json({ status: 'success', data: message });
  });

  /**
   * @route   GET /api/chat/conversations/:id/messages
   * @desc    Get all messages for a conversation
   * @access  Private (Requires authentication)
   */
  getMessagesHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id;
    const userId = req.user.id;
    const organizationId = req.user.organizationId;
    
    // --- Validation ---
    if (!conversationId) {
      throw AppError.badRequest('Conversation ID is required.');
    }
    
    if (!organizationId) {
      throw AppError.unauthorized('Authentication required to access conversation messages.');
    }
    
    // --- Get messages ---
    const messages = await chatbotService.getConversationMessages(
      conversationId,
      String(organizationId)
    );
    
    // Wrap in standard success response structure
    res.status(200).json({ status: 'success', data: messages });
  });

  /**
   * Get all conversations
   */
  getAllConversations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw AppError.forbidden('Organization ID is required');
    }
    
    const conversations = await query(
      'SELECT * FROM chatbot_conversations WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );
    
    res.json({
      status: 'success',
      data: conversations.rows
    });
  });

  /**
   * Get a specific conversation by ID
   */
  getConversation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id;
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw AppError.forbidden('Organization ID is required');
    }
    
    // Get conversation
    const conversationResult = await query(
      'SELECT * FROM chatbot_conversations WHERE id = $1 AND organization_id = $2',
      [conversationId, organizationId]
    );
    
    if (conversationResult.rows.length === 0) {
      throw AppError.notFound(`Conversation with ID ${conversationId} not found`);
    }
    
    // Get messages for this conversation
    const messagesResult = await query(
      'SELECT * FROM chatbot_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    
    // Combine data
    const conversation = {
      ...conversationResult.rows[0],
      messages: messagesResult.rows
    };
    
    res.json({
      status: 'success',
      data: conversation
    });
  });

  /**
   * End a conversation
   */
  endConversation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conversationId = req.params.id;
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw AppError.forbidden('Organization ID is required');
    }
    
    // Check if conversation exists and belongs to the organization
    const conversationResult = await query(
      'SELECT * FROM chatbot_conversations WHERE id = $1 AND organization_id = $2',
      [conversationId, organizationId]
    );
    
    if (conversationResult.rows.length === 0) {
      throw AppError.notFound(`Conversation with ID ${conversationId} not found`);
    }
    
    // End conversation
    const result = await query(
      'UPDATE chatbot_conversations SET status = $1, ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['ended', conversationId]
    );
    
    res.json({
      status: 'success',
      data: result.rows[0]
    });
  });
}

export default new ChatbotController();
