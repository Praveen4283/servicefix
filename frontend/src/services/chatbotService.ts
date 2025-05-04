import apiClient from './apiClient';

// --- Interfaces (based on backend implementation) ---

export interface Conversation {
  id: string;        // UUID from the backend
  userId?: string;   // Optional: Link to user if logged in
  visitorId?: string; // Optional: For anonymous users
  organizationId?: string; // Added based on controller response
  status?: string;    // e.g., 'active', 'ended'
  metadata?: any;     // Added based on controller response
  createdAt: string;
  updatedAt: string;
  endedAt?: string;   // Added based on controller response (Date becomes string via JSON)
}

// API response wrapper format
export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface ChatMessage {
  id: string;        // UUID from the backend
  conversationId: string;
  senderType: 'user' | 'bot' | 'agent';
  content: string;
  createdAt: string;
  metadata?: any;     // Optional: For extra info
}

export interface SaveMessageRequest {
  senderType: 'user' | 'bot' | 'agent';
  content: string;
  metadata?: any;
}

// --- Chatbot Service Class ---

class ChatbotService {
  /**
   * Starts a new conversation.
   * Returns the newly created conversation object.
   */
  public async startConversation(metadata?: any): Promise<ApiResponse<Conversation>> {
    try {
      const response = await apiClient.post('/chat/conversations', { metadata });
      // Return the full response with data wrapper
      return response;
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw new Error('Could not start chat session. Please try again later.');
    }
  }

  /**
   * Saves a message to an existing conversation.
   * Returns the newly saved message object.
   */
  public async saveMessage(
    conversationId: string,
    messageData: SaveMessageRequest
  ): Promise<ApiResponse<ChatMessage>> {
    if (!conversationId) {
      throw new Error('Cannot save message without a conversation ID.');
    }
    
    try {
      const response = await apiClient.post(
        `/chat/conversations/${conversationId}/messages`,
        messageData
      );
      // Return the full response with data wrapper
      return response;
    } catch (error) {
      console.error('Failed to save message:', error);
      throw new Error('Could not save message. Please try again later.');
    }
  }

  /**
   * Gets the conversation history.
   * Returns a list of messages for the given conversation.
   */
  public async getConversationHistory(conversationId: string): Promise<ApiResponse<ChatMessage[]>> {
    if (!conversationId) {
      throw new Error('Cannot get history without a conversation ID.');
    }
    
    try {
      const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
      // Return the full response with data wrapper
      return response;
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      throw new Error('Could not load chat history. Please try again later.');
    }
  }
}

export default new ChatbotService();
