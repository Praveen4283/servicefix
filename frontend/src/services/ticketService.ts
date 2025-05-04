import apiClient from './apiClient';

// Ticket type definition
export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: { id: number; name: string; color: string; isResolved?: boolean } | TicketStatus;
  priority: TicketPriority | { id: number; name: string; color: string };
  requester?: { id: string; email: string; firstName: string; lastName: string };
  assignee?: { id: string; email: string; firstName: string; lastName: string };
  department?: { id: string; name: string };
  type?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  dueDate?: string;
  sentimentScore?: number;
  aiSummary?: string;
  source?: string;
  isSpam?: boolean;
  tags?: Array<{ id: number; name: string; color: string }>;
  commentCount?: number;
  attachments?: string[];
}

// Comment type definition
export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

// Ticket status enum
export enum TicketStatus {
  NEW = 'new',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

// Ticket priority enum
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Create ticket request
export interface CreateTicketRequest {
  subject: string;
  description: string;
  requesterId: string;
  priorityId?: number;
  departmentId?: string;
  typeId?: string;
  customerEmail?: string;
  category?: string;
  tags?: string[];
  attachments?: File[];
}

// Class to handle ticket operations
class TicketService {
  /**
   * Get tickets with optional filters
   */
  public async getTickets(
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedTo?: string;
      searchTerm?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ tickets: Ticket[]; total: number; page: number; totalPages: number }> {
    return apiClient.get('/tickets', filters);
  }

  /**
   * Get a single ticket by ID
   * Returns an object containing the ticket details nested under a 'ticket' key.
   */
  public async getTicketById(id: string): Promise<{ ticket: Ticket }> {
    // The API response structure is { status: 'success', data: { ticket: { ... } } }
    // The apiClient.get method extracts the 'data' part.
    return apiClient.get<{ ticket: Ticket }>(`/tickets/${id}`);
  }
  
  /**
   * Create a new ticket
   */
  public async createTicket(ticket: CreateTicketRequest): Promise<Ticket> {
    // Prepare data to send, ensuring priorityId is included if present
    const dataToSend: any = { ...ticket }; 
    // Backend expects priorityId, remove the enum field if it exists
    if ('priority' in dataToSend) {
        delete dataToSend.priority;
    }
    if (dataToSend.priorityId === undefined) {
      // Backend requires priorityId, add a default if missing?
      // Let's assume default medium priority ID is 1002 based on previous fixes
      console.warn('PriorityId missing, defaulting to Medium (1002).');
      dataToSend.priorityId = 1002; 
    }
    
    // Stringify tags array if it exists for JSON field
    if (dataToSend.tags && Array.isArray(dataToSend.tags)) {
      // Backend might expect a JSON string or handle the array directly.
      // If sending as JSON, the backend needs to parse it.
      // Assuming backend handles plain array for now based on controller logic.
      // If sending FormData, tags might need different handling.
    }

    // Handle case with attachments
    if (dataToSend.attachments && dataToSend.attachments.length > 0) {
      const formData = new FormData();
      
      // Add ticket data fields individually to FormData
      Object.keys(dataToSend).forEach(key => {
        if (key !== 'attachments') {
          const value = dataToSend[key];
          if (key === 'tags' && Array.isArray(value)) {
             // Send tags as a JSON string within FormData
            formData.append(key, JSON.stringify(value));
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        }
      });
      
      // Add attachments
      dataToSend.attachments.forEach((file: File, index: number) => {
        formData.append(`attachments`, file, file.name); // Ensure correct field name `attachments`
      });
      
      return apiClient.post('/tickets', formData, {
        headers: {
          // Content-Type is set automatically for FormData
        },
      });
    }
    
    // No attachments case (send as JSON)
    // Make sure to send the processed dataToSend
    return apiClient.post('/tickets', dataToSend);
  }
  
  /**
   * Create a ticket from chat conversation
   * NOTE: This method requires the requesterId and ideally priorityId.
   * The caller needs to provide these, possibly fetching user ID from context.
   */
  public async createTicketFromChat(
    subject: string,
    chatMessages: Array<{sender: string, text: string, timestamp: Date}>,
    requesterId: string,
    priorityId?: number,
    customerEmail?: string
  ): Promise<Ticket> {
    const description = chatMessages
      .map(msg => `${msg.sender === 'user' ? 'Customer' : 'AI Assistant'} (${new Date(msg.timestamp).toLocaleString()}): ${msg.text}`)
      .join('\n\n');
      
    const ticketRequest: CreateTicketRequest = {
      subject,
      description,
      requesterId,
      priorityId: priorityId || 1002,
      customerEmail
    };
    
    return this.createTicket(ticketRequest);
  }
  
  /**
   * Update a ticket
   */
  public async updateTicket(id: string, ticketData: Partial<Ticket>): Promise<Ticket> {
    return apiClient.put(`/tickets/${id}`, ticketData);
  }
  
  /**
   * Update ticket status
   */
  public async updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
    return apiClient.patch(`/tickets/${id}/status`, { status });
  }
  
  /**
   * Get ticket comments
   */
  public async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    return apiClient.get(`/tickets/${ticketId}/comments`);
  }
  
  /**
   * Add comment to ticket
   */
  public async addComment(
    ticketId: string, 
    content: string, 
    isInternal: boolean = false
  ): Promise<TicketComment> {
    return apiClient.post(`/tickets/${ticketId}/comments`, {
      content,
      isInternal
    });
  }
  
  /**
   * Search for tickets by keyword
   */
  public async searchTickets(query: string): Promise<Ticket[]> {
    return apiClient.get('/tickets/search', { query });
  }
}

export default new TicketService(); 