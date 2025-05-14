import apiClient from './apiClient';

export interface TicketPriority {
  id: number;
  name: string;
  color: string;
  slaHours?: number;
  organizationId: number;
  createdAt?: string;
  updatedAt?: string;
}

const ticketPriorityService = {
  async getPriorities(): Promise<TicketPriority[]> {
    try {
      const response = await apiClient.get('/ticket-priorities');
      
      // Handle different response structures - some endpoints return { data: { priorities: [] } }
      if (response.priorities) {
        return response.priorities;
      } else if (response.data && Array.isArray(response.data.priorities)) {
        return response.data.priorities;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error('Unexpected priority data structure:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching priorities:', error);
      return [];
    }
  },

  async getPriority(id: number): Promise<TicketPriority> {
    const response = await apiClient.get(`/ticket-priorities/${id}`);
    return response.data;
  },

  async createPriority(priority: Partial<TicketPriority>): Promise<TicketPriority> {
    const response = await apiClient.post('/ticket-priorities', priority);
    return response.data;
  },

  async updatePriority(id: number, priority: Partial<TicketPriority>): Promise<TicketPriority> {
    const response = await apiClient.put(`/ticket-priorities/${id}`, priority);
    return response.data;
  },

  async deletePriority(id: number): Promise<void> {
    await apiClient.delete(`/ticket-priorities/${id}`);
  }
};

export default ticketPriorityService; 