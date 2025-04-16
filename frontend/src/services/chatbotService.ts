import apiClient from './apiClient';

// --- Interfaces (adjust based on your actual backend implementation) ---

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

export interface ChatMessage {
  id: string;        // UUID from the backend
  conversationId: string;
  senderType: 'user' | 'bot' | 'agent';
  content: string;
  createdAt: string;
  metadata?: any;     // Optional: For extra info
}

export interface SaveMessageRequest {
  senderType: 'user' | 'bot';
  content: string;
  metadata?: any;
}

// --- Chatbot Service Class ---

class ChatbotService {
  /**
   * Starts a new conversation.
   * Assumes backend returns the newly created conversation object.
   * Adjust the endpoint as needed.
   */
  public async startConversation(): Promise<Conversation> {
    // Optionally pass userId if available and needed by backend
    return apiClient.post<Conversation>('/chat/conversations'); 
  }

  /**
   * Saves a message to an existing conversation.
   * Assumes backend returns the newly saved message object.
   * Adjust the endpoint as needed.
   */
  public async saveMessage(
    conversationId: string,
    messageData: SaveMessageRequest
  ): Promise<ChatMessage> {
    if (!conversationId) {
      throw new Error('Cannot save message without a conversation ID.');
    }
    return apiClient.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages`,
      messageData
    );
  }

  // Add other methods if needed (e.g., getConversationHistory)
}

export default new ChatbotService();
