import { Request, Response } from 'express';
import chatbotService from '../services/chatbot.service';
import { SenderType } from '../models/ChatMessage';

class ChatbotController {
  /**
   * @route   POST /api/chat/conversations
   * @desc    Start a new chat conversation
   * @access  Private (Requires authentication to link userId and organizationId)
   */
  async createConversationHandler(req: Request, res: Response): Promise<Response> {
    try {
      // --- Get User ID and Organization ID ---
      // Assuming authentication middleware adds user info to req.user
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId; 

      // We require an authenticated user to link the conversation correctly
      if (!userId || !organizationId) {
        return res.status(401).json({ message: 'Authentication required to start a chat conversation.' });
      }
      
      // --- Optional: Visitor ID (if needed for hybrid scenarios) ---
      // const visitorId = req.body.visitorId; // If you need to support anonymous users alongside authenticated ones

      // --- Optional: Metadata --- 
      const metadata = req.body.metadata; // Any initial metadata to store

      const conversation = await chatbotService.createConversation({
        userId,
        organizationId,
        // visitorId, // Uncomment if using
        metadata,
      });

      // Map entity to the DTO expected by the frontend
      const conversationResponse = {
        id: conversation.id,
        userId: conversation.userId,
        visitorId: conversation.visitorId,
        organizationId: conversation.organizationId, // Keep if needed frontend-side
        status: conversation.status,
        metadata: conversation.metadata,
        createdAt: conversation.createdAt, // Use camelCase
        updatedAt: conversation.updatedAt, // Use camelCase
        endedAt: conversation.endedAt
      };

      // Wrap in standard success response structure
      return res.status(201).json({ status: 'success', data: conversationResponse });
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      // Distinguish between known errors (like missing params) and unexpected errors
      if (error.message.includes('required') || error.message.includes('must be provided')) {
         return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to start conversation due to server error.' });
    }
  }

  /**
   * @route   POST /api/chat/conversations/:id/messages
   * @desc    Add a message to a conversation
   * @access  Private (Requires authentication)
   */
  async addMessageHandler(req: Request, res: Response): Promise<Response> {
    try {
      const conversationId = req.params.id;
      const { senderType, content, metadata } = req.body as { 
          senderType: SenderType,
          content: string,
          metadata?: any 
      };
      const userId = req.user?.id; // User sending the message

      // --- Validation ---
      if (!conversationId) {
        return res.status(400).json({ message: 'Conversation ID is required.' });
      }
      if (!senderType || !['user', 'bot'].includes(senderType)) {
        // Only allow user or bot messages via this endpoint for now.
        // Agent messages might have different logic/endpoints.
        return res.status(400).json({ message: 'Invalid sender type specified.' });
      }
       if (!content || typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ message: 'Message content cannot be empty.' });
      }
      if (!userId) {
          return res.status(401).json({ message: 'Authentication required to send a message.' });
      }
      
      // Determine senderId - currently only set if it's the authenticated user
      const senderId = (senderType === 'user') ? userId : undefined;
      // If bots or agents need specific IDs, logic needs adjustment here.

      const message = await chatbotService.addMessageToConversation({
        conversationId,
        senderType,
        content,
        senderId, // Link user message to the user
        metadata,
      });

      // Wrap in standard success response structure
      return res.status(201).json({ status: 'success', data: message });
    } catch (error: any) {
      console.error(`Error adding message to conversation ${req.params.id}:`, error);
      // Handle specific errors like conversation not found
      if (error.message.includes('not found')) {
          return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('Invalid') || error.message.includes('required')) {
         return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to add message due to server error.' });
    }
  }
}

export default new ChatbotController();
