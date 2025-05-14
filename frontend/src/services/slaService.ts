import apiClient from './apiClient';

export interface SLAPolicy {
  id: number;
  name: string;
  description?: string;
  organizationId: number;
  ticketPriorityId: number;
  firstResponseHours: number;
  nextResponseHours?: number;
  resolutionHours: number;
  businessHoursOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SLAPolicyTicket {
  id: number;
  ticketId: number;
  slaPolicyId: number;
  firstResponseDueAt: string;
  nextResponseDueAt?: string;
  resolutionDueAt: string;
  firstResponseMet?: boolean;
  nextResponseMet?: boolean;
  resolutionMet?: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: string; // JSON string containing pause periods and other metadata
  slaPolicy?: SLAPolicy;
}

export interface SLAStatus {
  isFirstResponseBreached: boolean;
  isResolutionBreached: boolean;
  firstResponseRemainingMinutes: number;
  resolutionRemainingMinutes: number;
  firstResponsePercentage: number;
  resolutionPercentage: number;
  slaInfo: SLAPolicyTicket | null;
  isPaused?: boolean; // Flag to indicate if the SLA is currently paused
  isEstimated?: boolean; // Flag to indicate if this is an estimated status (not from actual SLA data)
}

export interface SLAMetrics {
  totalTickets: number;
  responseSlaMet: number;
  responseSlaMissed: number;
  resolutionSlaMet: number;
  resolutionSlaMissed: number;
  responseCompliancePercentage: number;
  resolutionCompliancePercentage: number;
}

const slaService = {
  async getSLAPolicies(organizationId: number): Promise<SLAPolicy[]> {
    try {
      const response = await apiClient.get(`/sla/organization/${organizationId}`);
      
      // Log response for debugging
      console.log(`SLA policies response for org ${organizationId}:`, response);
      
      // Handle different possible response structures
      if (Array.isArray(response)) {
        // Direct array response
        return response;
      } else if (Array.isArray(response.data)) {
        // When data is already an array (common case from the logs)
        return response.data;
      } else if (response && typeof response === 'object' && response.data && Array.isArray(response.data.policies)) {
        // Nested policies array
        return response.data.policies;
      } else if (response && typeof response === 'object') {
        // Try to extract any array property that might contain policies
        const possibleArrays = Object.values(response).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          return possibleArrays[0] as SLAPolicy[];
        }
      }
      
      // If we reached here, return empty array
      console.warn(`No SLA policies found for organization ID: ${organizationId}`);
      return [];
    } catch (error) {
      console.error('Error fetching SLA policies:', error);
      return [];
    }
  },

  async getSLAPolicy(id: number): Promise<SLAPolicy> {
    const response = await apiClient.get(`/sla/${id}`);
    return response.data;
  },

  async createSLAPolicy(policy: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const response = await apiClient.post('/sla', policy);
    return response.data;
  },

  async updateSLAPolicy(id: number, policy: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const response = await apiClient.put(`/sla/${id}`, policy);
    return response.data;
  },

  async deleteSLAPolicy(id: number): Promise<void> {
    await apiClient.delete(`/sla/${id}`);
  },

  async assignSLAToTicket(ticketId: number, slaPolicyId: number): Promise<SLAPolicyTicket> {
    const response = await apiClient.post('/sla/assign', { ticketId, slaPolicyId });
    return response.data;
  },

  async autoAssignSLAPolicy(ticketId: number | string): Promise<SLAPolicyTicket | null> {
    try {
      // Ensure we're passing a clean numeric ID to the API
      let cleanTicketId: string;
      
      if (typeof ticketId === 'number') {
        cleanTicketId = String(ticketId);
      } else {
        // If it's a string, extract only the numeric part
        const matches = String(ticketId).match(/(\d+)/);
        if (!matches || !matches[1]) {
          throw new Error('Invalid ticket ID format');
        }
        cleanTicketId = matches[1];
      }
      
      // Call the auto-assign endpoint
      const response = await apiClient.post(`/sla/auto-assign/${cleanTicketId}`);
      console.log('Auto-assigned SLA policy response:', response);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to auto-assign SLA policy for ticket ${ticketId}:`, error);
      return null;
    }
  },

  async getTicketSLAStatus(ticketId: number | string): Promise<SLAStatus> {
    try {
      // Ensure we're passing a clean numeric ID to the API
      let cleanTicketId: string;
      
      if (typeof ticketId === 'number') {
        cleanTicketId = String(ticketId);
      } else {
        // Extract numeric part from string IDs like "TIK-1001"
        const matches = ticketId.match(/\d+/);
        cleanTicketId = matches ? matches[0] : ticketId;
      }
      
      const response = await apiClient.get(`/sla/ticket/${cleanTicketId}`);
      console.log(`SLA status for ticket ${cleanTicketId}:`, response);
      
      // The response should now have standard format with status and data properties
      if (response && 
          typeof response === 'object' && 
          response.status === 'success' && 
          response.data) {
        
        return response.data;
      } else if (response && 
          typeof response === 'object' && 
          'firstResponseRemainingMinutes' in response) {
        
        // Handle old format for backward compatibility
        return {
          isFirstResponseBreached: response.isFirstResponseBreached,
          isResolutionBreached: response.isResolutionBreached,
          firstResponseRemainingMinutes: response.firstResponseRemainingMinutes,
          resolutionRemainingMinutes: response.resolutionRemainingMinutes,
          firstResponsePercentage: response.firstResponsePercentage,
          resolutionPercentage: response.resolutionPercentage,
          slaInfo: response.slaInfo || null,
          isPaused: response.isPaused || false,
          isEstimated: false
        };
      }
      
      throw new Error('Invalid SLA status response format');
    } catch (err) {
      console.error(`SLA status fetch failed for ticket ${ticketId}:`, err);
      throw new Error('Failed to load SLA status');
    }
  },

  async getSLAMetrics(
    organizationId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<SLAMetrics> {
    const response = await apiClient.get('/sla/metrics', {
      params: {
        organizationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    return response.data;
  },

  // Utility methods for displaying SLA information
  formatRemainingTime(minutes: number): string {
    if (minutes <= 0) {
      return 'Breached';
    }

    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  },

  getSLAStatusColor(percentage: number): string {
    if (percentage >= 100) {
      return 'error'; // Red - SLA breached
    } else if (percentage >= 90) {
      return 'warning'; // Amber - approaching breach
    } else if (percentage >= 75) {
      return 'info'; // Blue - getting close
    } else {
      return 'success'; // Green - healthy
    }
  },

  /**
   * Pause SLA for a ticket (when status changes to pending)
   * @param ticketId The ticket ID
   * @returns Promise resolving to success status
   */
  async pauseSLA(ticketId: number | string): Promise<boolean> {
    try {
      // Ensure we're passing a clean numeric ID to the API
      let cleanTicketId: string;
      
      if (typeof ticketId === 'number') {
        cleanTicketId = String(ticketId);
      } else {
        // Extract numeric part from string IDs like "TIK-1001"
        const matches = ticketId.match(/\d+/);
        cleanTicketId = matches ? matches[0] : ticketId;
      }
      
      const response = await apiClient.post(`/sla/pause/${cleanTicketId}`);
      console.log(`SLA paused for ticket ${cleanTicketId}:`, response);
      return response && response.success === true;
    } catch (err) {
      console.error(`Failed to pause SLA for ticket ${ticketId}:`, err);
      return false;
    }
  },

  /**
   * Resume SLA for a ticket (when status changes from pending to active)
   * @param ticketId The ticket ID
   * @returns Promise resolving to success status
   */
  async resumeSLA(ticketId: number | string): Promise<boolean> {
    try {
      // Ensure we're passing a clean numeric ID to the API
      let cleanTicketId: string;
      
      if (typeof ticketId === 'number') {
        cleanTicketId = String(ticketId);
      } else {
        // Extract numeric part from string IDs like "TIK-1001"
        const matches = ticketId.match(/\d+/);
        cleanTicketId = matches ? matches[0] : ticketId;
      }
      
      const response = await apiClient.post(`/sla/resume/${cleanTicketId}`);
      console.log(`SLA resumed for ticket ${cleanTicketId}:`, response);
      return response && response.success === true;
    } catch (err) {
      console.error(`Failed to resume SLA for ticket ${ticketId}:`, err);
      return false;
    }
  }
};

export default slaService;