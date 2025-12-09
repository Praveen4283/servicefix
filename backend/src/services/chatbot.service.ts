import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database'; // Adjust path if needed
import { ChatbotConversation } from '../models/ChatbotConversation';
import { ChatMessage, SenderType } from '../models/ChatMessage';
import { User } from '../models/User'; // Import User if needed for organizationId
import { Organization } from '../models/Organization'; // Adjust path
import { FindOperator } from 'typeorm';
import { logger } from '../utils/logger'; // Add logger for proper error tracking

interface CreateConversationParams {
  userId?: string;
  visitorId?: string;
  organizationId: string; // Assuming organization context is available
  metadata?: Record<string, unknown>;
}

interface AddMessageParams {
  conversationId: string;
  senderType: SenderType;
  content: string;
  senderId?: string; // Optional: If sender is a User (agent)
  metadata?: Record<string, unknown>;
}

class ChatbotService {
  // Maximum content length to prevent abuse
  private readonly MAX_MESSAGE_LENGTH = 5000;

  constructor() {
    // Constructor is now empty or used for other initializations
    logger.info('ChatbotService initialized');
  }

  /**
   * Validates chatbot message content
   * @param content - Message content to validate
   */
  private validateMessageContent(content: string): { isValid: boolean; error?: string } {
    if (!content || content.trim() === '') {
      return { isValid: false, error: 'Message content cannot be empty' };
    }

    if (content.length > this.MAX_MESSAGE_LENGTH) {
      return {
        isValid: false,
        error: `Message content exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`
      };
    }

    return { isValid: true };
  }

  // Helper method to get repository, ensuring data source is ready
  private getConversationRepository(): Repository<ChatbotConversation> {
    if (!AppDataSource.isInitialized) {
      // This check is now closer to the point of use
      logger.error('AppDataSource has not been initialized');
      throw new Error("AppDataSource has not been initialized.");
    }
    return AppDataSource.getRepository(ChatbotConversation);
  }

  // Helper method to get repository, ensuring data source is ready
  private getMessageRepository(): Repository<ChatMessage> {
    if (!AppDataSource.isInitialized) {
      logger.error('AppDataSource has not been initialized');
      throw new Error("AppDataSource has not been initialized.");
    }
    return AppDataSource.getRepository(ChatMessage);
  }

  /**
   * Creates a new chatbot conversation.
   * Uses a transaction to ensure data consistency.
   */
  async createConversation(
    params: CreateConversationParams
  ): Promise<ChatbotConversation> {
    const { userId, visitorId, organizationId, metadata } = params;
    const conversationRepository = this.getConversationRepository();

    if (!userId && !visitorId) {
      logger.warn('Attempt to create conversation without userId or visitorId');
      throw new Error('Either userId or visitorId must be provided to create a conversation.');
    }
    if (!organizationId) {
      logger.warn('Attempt to create conversation without organizationId');
      throw new Error('OrganizationId is required to create a conversation.');
    }

    // Validate organizationId is a valid number
    const orgId = parseInt(organizationId, 10);
    if (isNaN(orgId)) {
      logger.warn(`Invalid organization ID format: ${organizationId}`);
      throw new Error('Invalid organization ID format');
    }

    // Use a transaction to ensure atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if organization exists
      const organizationRepo = AppDataSource.getRepository(Organization);
      const organization = await organizationRepo.findOneBy({ id: orgId });

      if (!organization) {
        logger.warn(`Organization not found with ID: ${orgId}`);
        throw new Error(`Organization not found with ID: ${orgId}`);
      }

      // Create conversation entity
      const newConversation = conversationRepository.create({
        userId: userId ? parseInt(userId, 10) : undefined,
        visitorId: visitorId,
        organizationId: orgId,
        status: 'active', // Default status
        metadata: metadata || {},
      });

      // Save within transaction
      const result = await queryRunner.manager.save(newConversation);
      await queryRunner.commitTransaction();

      logger.info(`Created new conversation with ID: ${result.id} for organization: ${orgId}`);
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to create conversation:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Adds a message to an existing chatbot conversation.
   * Uses a transaction to ensure data consistency.
   * Includes content validation and sanitization.
   */
  async addMessageToConversation(
    params: AddMessageParams
  ): Promise<ChatMessage> {
    const { conversationId, senderType, content, senderId, metadata } = params;

    // Validate message content
    const contentValidation = this.validateMessageContent(content);
    if (!contentValidation.isValid) {
      logger.warn(`Invalid message content: ${contentValidation.error}`);
      throw new Error(contentValidation.error);
    }

    // Sanitize content
    const sanitizedContent = this.sanitizeContent(content);

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const convIdNumber = parseInt(conversationId, 10);
      if (isNaN(convIdNumber)) {
        logger.warn(`Invalid conversation ID format: ${conversationId}`);
        throw new Error('Invalid conversation ID format');
      }

      // Check if conversation exists using the queryRunner's manager
      const conversation = await queryRunner.manager.findOneBy(ChatbotConversation, { id: convIdNumber });
      if (!conversation) {
        logger.warn(`Conversation not found with ID: ${convIdNumber}`);
        throw new Error('Conversation not found');
      }

      const newMessage = new ChatMessage();
      newMessage.conversationId = convIdNumber;
      newMessage.senderType = senderType;
      newMessage.content = sanitizedContent;
      newMessage.senderId = senderId ? parseInt(senderId, 10) : undefined;
      newMessage.metadata = metadata || {};

      // Save within transaction
      const result = await queryRunner.manager.save(newMessage);
      await queryRunner.commitTransaction();

      logger.info(`Added message with ID: ${result.id} to conversation: ${convIdNumber}`);
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Failed to add message to conversation ${conversationId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Gets all messages for a conversation.
   * Validates that the conversation belongs to the specified organization.
   * Returns messages sorted by createdAt timestamp.
   * Includes proper error handling and logging.
   */
  async getConversationMessages(
    conversationId: string,
    organizationId: string
  ): Promise<ChatMessage[]> {
    logger.debug(`Fetching messages for conversation: ${conversationId}, organization: ${organizationId}`);

    try {
      const conversationRepository = this.getConversationRepository();
      const messageRepository = this.getMessageRepository();

      // Convert IDs to numbers for finding the entities
      const convIdNumber = parseInt(conversationId, 10);
      if (isNaN(convIdNumber)) {
        logger.warn(`Invalid conversation ID format: ${conversationId}`);
        throw new Error('Invalid conversation ID format');
      }

      const orgIdNumber = parseInt(organizationId, 10);
      if (isNaN(orgIdNumber)) {
        logger.warn(`Invalid organization ID format: ${organizationId}`);
        throw new Error('Invalid organization ID format');
      }

      // Ensure the conversation exists and belongs to the specified organization
      const conversation = await conversationRepository.findOneBy({
        id: convIdNumber,
        organizationId: orgIdNumber
      });

      if (!conversation) {
        logger.warn(`Conversation not found or access denied for ID: ${convIdNumber}`);
        throw new Error('Conversation not found or access denied');
      }

      // Fetch messages for the conversation
      const messages = await messageRepository.find({
        where: { conversationId: convIdNumber },
        order: { createdAt: 'ASC' } // Sort by creation timestamp ascending
      });

      logger.debug(`Retrieved ${messages.length} messages for conversation: ${convIdNumber}`);
      return messages;
    } catch (error) {
      logger.error(`Error fetching conversation messages for ID ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Sanitizes message content to prevent injection and other security issues
   * @param content - Raw message content
   */
  private sanitizeContent(content: string): string {
    if (!content) return '';

    // Remove potentially harmful script tags
    let sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .trim();

    // Truncate if exceeds max length
    if (sanitized.length > this.MAX_MESSAGE_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_MESSAGE_LENGTH);
    }

    return sanitized;
  }

  /**
   * Retrieves a specific conversation by ID with authorization check
   * @param conversationId - The ID of the conversation
   * @param organizationId - The organization ID for authorization
   */
  async getConversation(
    conversationId: string,
    organizationId: string
  ): Promise<ChatbotConversation> {
    try {
      const conversationRepository = this.getConversationRepository();

      // Convert IDs to numbers
      const convIdNumber = parseInt(conversationId, 10);
      if (isNaN(convIdNumber)) {
        throw new Error('Invalid conversation ID format');
      }

      const orgIdNumber = parseInt(organizationId, 10);
      if (isNaN(orgIdNumber)) {
        throw new Error('Invalid organization ID format');
      }

      // Find conversation with organization check for security
      const conversation = await conversationRepository.findOneBy({
        id: convIdNumber,
        organizationId: orgIdNumber
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      return conversation;
    } catch (error) {
      logger.error(`Error fetching conversation with ID ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Marks a conversation as ended
   * @param conversationId - The ID of the conversation to end
   * @param organizationId - The organization ID for authorization
   */
  async endConversation(
    conversationId: string,
    organizationId: string
  ): Promise<ChatbotConversation> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Convert IDs to numbers
      const convIdNumber = parseInt(conversationId, 10);
      if (isNaN(convIdNumber)) {
        throw new Error('Invalid conversation ID format');
      }

      const orgIdNumber = parseInt(organizationId, 10);
      if (isNaN(orgIdNumber)) {
        throw new Error('Invalid organization ID format');
      }

      // Find conversation with organization check for security
      const conversation = await queryRunner.manager.findOneBy(ChatbotConversation, {
        id: convIdNumber,
        organizationId: orgIdNumber
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Update conversation status
      conversation.status = 'ended';
      conversation.endedAt = new Date();

      // Save within transaction
      const result = await queryRunner.manager.save(conversation);
      await queryRunner.commitTransaction();

      logger.info(`Ended conversation with ID: ${convIdNumber}`);
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Failed to end conversation ${conversationId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// Export a singleton instance
export default new ChatbotService();
