import apiClient from './apiClient';

// Ticket type definition
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  customerEmail?: string;
  category?: string;
  tags?: string[];
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
  title: string;
  description: string;
  priority?: TicketPriority;
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
   */
  public async getTicketById(id: string): Promise<Ticket> {
    return apiClient.get(`/tickets/${id}`);
  }
  
  /**
   * Create a new ticket
   */
  public async createTicket(ticket: CreateTicketRequest): Promise<Ticket> {
    // Handle case with attachments
    if (ticket.attachments && ticket.attachments.length > 0) {
      const formData = new FormData();
      
      // Add ticket data as JSON
      const ticketData = { ...ticket };
      delete ticketData.attachments;
      formData.append('ticket', JSON.stringify(ticketData));
      
      // Add attachments
      ticket.attachments.forEach((file, index) => {
        formData.append(`attachments`, file);
      });
      
      return apiClient.post('/tickets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    
    // No attachments case
    return apiClient.post('/tickets', ticket);
  }
  
  /**
   * Create a ticket from chat conversation
   */
  public async createTicketFromChat(
    title: string, 
    chatMessages: Array<{sender: string, text: string, timestamp: Date}>,
    customerEmail?: string
  ): Promise<Ticket> {
    const description = chatMessages
      .map(msg => `${msg.sender === 'user' ? 'Customer' : 'AI Assistant'} (${new Date(msg.timestamp).toLocaleString()}): ${msg.text}`)
      .join('\n\n');
      
    return this.createTicket({
      title,
      description,
      customerEmail,
      priority: TicketPriority.MEDIUM
    });
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