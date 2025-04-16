import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database'; // Adjust path if needed
import { ChatbotConversation } from '../models/ChatbotConversation';
import { ChatMessage, SenderType } from '../models/ChatMessage';
import { User } from '../models/User'; // Import User if needed for organizationId
import { Organization } from '../models/Organization'; // Adjust path
import { FindOperator } from 'typeorm';

interface CreateConversationParams {
  userId?: string;
  visitorId?: string;
  organizationId: string; // Assuming organization context is available
  metadata?: any;
}

interface AddMessageParams {
  conversationId: string;
  senderType: SenderType;
  content: string;
  senderId?: string; // Optional: If sender is a User (agent)
  metadata?: any;
}

class ChatbotService {
  constructor() {
    // Constructor is now empty or used for other initializations
    // The check for AppDataSource initialization is removed from here
  }

  // Helper method to get repository, ensuring data source is ready
  private getConversationRepository(): Repository<ChatbotConversation> {
    if (!AppDataSource.isInitialized) {
      // This check is now closer to the point of use
      throw new Error("AppDataSource has not been initialized.");
    }
    return AppDataSource.getRepository(ChatbotConversation);
  }

  // Helper method to get repository, ensuring data source is ready
  private getMessageRepository(): Repository<ChatMessage> {
    if (!AppDataSource.isInitialized) {
      throw new Error("AppDataSource has not been initialized.");
    }
    return AppDataSource.getRepository(ChatMessage);
  }

  /**
   * Creates a new chatbot conversation.
   */
  async createConversation(
    params: CreateConversationParams
  ): Promise<ChatbotConversation> {
    const { userId, visitorId, organizationId, metadata } = params;
    const conversationRepository = this.getConversationRepository(); // Get repo dynamically

    if (!userId && !visitorId) {
      throw new Error('Either userId or visitorId must be provided to create a conversation.');
    }
    if (!organizationId) {
      throw new Error('OrganizationId is required to create a conversation.');
    }

    const newConversation = conversationRepository.create({
      userId: userId ? parseInt(userId, 10) : undefined,
      visitorId: visitorId,
      organizationId: parseInt(organizationId, 10),
      status: 'active', // Default status
      metadata,
    });

    return conversationRepository.save(newConversation);
  }

  /**
   * Adds a message to an existing chatbot conversation.
   */
  async addMessageToConversation(
    params: AddMessageParams
  ): Promise<ChatMessage> {
    const { conversationId, senderType, content, senderId, metadata } = params;
    const conversationRepository = this.getConversationRepository(); // Get repo dynamically
    const messageRepository = this.getMessageRepository(); // Get repo dynamically

    // Convert conversationId to number for finding the entity
    const convIdNumber = parseInt(conversationId, 10);
    if (isNaN(convIdNumber)) {
        throw new Error('Invalid conversation ID format');
    }
    // Optionally, check if conversation exists before adding message
    const conversation = await conversationRepository.findOneBy({ id: convIdNumber });
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const newMessage = messageRepository.create({
      conversationId: convIdNumber,
      senderType,
      content,
      senderId: senderId ? parseInt(senderId, 10) : undefined,
      metadata,
    });

    return messageRepository.save(newMessage);
  }

  // Add other methods as needed (e.g., findConversation, getMessages)
}

// Export a singleton instance
export default new ChatbotService();
