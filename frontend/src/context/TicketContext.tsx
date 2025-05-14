import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../services/apiClient';
// import { useNotification } from './NotificationContext';
// import { isDevelopment } from '../utils/environment';

// Import interfaces from TicketListPage (in a real app, these would be in a shared types file)
interface TicketStatus {
  id: string;
  name: string;
  color: string;
}

interface TicketPriority {
  id: string;
  name: string;
  color: string;
}

interface Department {
  id: string;
  name: string;
}

interface TicketType {
  id: string;
  name: string;
}

interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

// Backend API response might include snake_case versions of the fields
interface TicketBackendResponse {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  department?: Department;
  type?: TicketType;
  requester: User;
  assignee?: User;
  // Include both camelCase and snake_case versions to handle either format
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  lastActivity?: string;
  last_activity?: string;
  dueDate?: string;
  due_date?: string;
  resolvedAt?: string;
  resolved_at?: string;
  closedAt?: string;
  closed_at?: string;
  tags?: string[];
  description?: string;
  // Include optional properties for detail view
  comments?: Comment[];
  attachments?: Attachment[];
}

// Interface for Comment response from backend
interface CommentBackendResponse extends Comment {
  created_at?: string;
  updated_at?: string;
}

// Interface for Attachment response from backend
interface AttachmentBackendResponse extends Attachment {
  created_at?: string;
}

// Frontend standardized interface using camelCase
interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  department?: Department;
  type?: TicketType;
  requester: User;
  assignee?: User;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  dueDate?: string;
  tags?: string[];
  description?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  size: number;
  createdAt: string;
}

interface TicketDetail extends Ticket {
  description: string;
  comments: Comment[];
  attachments: Attachment[];
}

// Add Pagination interface
export interface PaginationState {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// API Pagination Response might include 'total' instead of 'totalCount'
interface PaginationResponse extends PaginationState {
  total?: number; // API might return 'total' instead of 'totalCount'
}

// Update Filters interface
interface TicketFilters {
  priorityName?: string;
  isOpen?: boolean;
  assigneeId?: string | number; // Add assigneeId to filter tickets by assignee
  // Add other potential filters here
}

interface TicketContextType {
  tickets: Ticket[];
  filteredTickets: Ticket[];
  currentTicket: TicketDetail | null;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  departments: Department[];
  ticketTypes: TicketType[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState;
  fetchTickets: (page?: number, limit?: number, filters?: TicketFilters) => Promise<{ tickets: Ticket[]; pagination: PaginationResponse } | undefined>;
  fetchTicketById: (id: string) => Promise<void>;
  createTicket: (ticketData: any) => Promise<Ticket | undefined>;
  updateTicket: (id: string, ticketData: any) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addComment: (ticketId: string, comment: string, isInternal: boolean) => Promise<void>;
  filterTickets: (filters: any) => void;
  searchTickets: (query: string) => void;
  clearFilters: () => void;
  getAgentsList: () => Promise<User[]>;
  addAttachment: (ticketId: string, formData: FormData) => Promise<void>;
  getTicketHistory: (ticketId: string) => Promise<any[]>;
  refreshCounter: number;
  setRefreshCounter: React.Dispatch<React.SetStateAction<number>>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({ // Initialize pagination state
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  // Add refreshCounter state
  const [refreshCounter, setRefreshCounter] = useState(0);

  // State for dropdown data
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!isAuthenticated) return;
      // Use Promise.all to fetch concurrently
      try {
        setIsLoading(true); // Consider separate loading states if needed
        const [departmentsRes, prioritiesRes, typesRes, statusesRes] = await Promise.all([
          apiClient.get<{ departments: Department[] }>('/tickets/departments'), // Add /tickets prefix
          apiClient.get<{ priorities: TicketPriority[] }>('/tickets/priorities'),   // Add /tickets prefix
          apiClient.get<{ ticketTypes: TicketType[] }>('/tickets/types'),       // Add /tickets prefix
          apiClient.get<{ statuses: TicketStatus[] }>('/tickets/statuses')      // Add /tickets prefix
        ]);

        // Log raw responses
        // console.log("API Response - Departments:", departmentsRes);
        // console.log("API Response - Priorities:", prioritiesRes);
        // console.log("API Response - Types:", typesRes);
        // console.log("API Response - Statuses:", statusesRes);

        // Assuming apiClient returns the actual data directly or nested under a 'data' key
        // Adjust access based on your apiClient's structure
        const departmentsData = departmentsRes.departments || (departmentsRes as any).data?.departments || [];
        const prioritiesData = prioritiesRes.priorities || (prioritiesRes as any).data?.priorities || [];
        const ticketTypesData = typesRes.ticketTypes || (typesRes as any).data?.ticketTypes || [];
        const statusesData = statusesRes.statuses || (statusesRes as any).data?.statuses || [];

        setDepartments(departmentsData);
        setPriorities(prioritiesData);
        setTicketTypes(ticketTypesData);
        setStatuses(statusesData);

        // Log state after setting
        // console.log("Context State - Departments set to:", departmentsData);
        // console.log("Context State - Priorities set to:", prioritiesData);
        // console.log("Context State - Types set to:", ticketTypesData);
        // console.log("Context State - Statuses set to:", statusesData);

        setError(null); // Clear previous errors
      } catch (err: any) {
        console.error("Error fetching dropdown data:", err);
        setError("Failed to load essential form data. Please try refreshing.");
        // Keep existing mock data if in dev and fallback is enabled?
        // Or set states to empty arrays:
        setDepartments([]);
        setPriorities([]);
        setTicketTypes([]);
        setStatuses([]);
      } finally {
        // Decide if general isLoading should be set false here or after tickets also load
      }
    };

    fetchDropdownData();
  }, [isAuthenticated]); // Re-fetch if auth state changes

  // Fetch all tickets with pagination and filtering
  const fetchTickets = useCallback(async (page = 1, limit = 10, filters: TicketFilters = {}): Promise<{ tickets: Ticket[]; pagination: PaginationResponse } | undefined> => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // Add filters to query parameters
      if (filters.isOpen !== undefined) {
        params.append('isOpen', filters.isOpen.toString());
      }
      
      // Add assigneeId filter if provided - the controller uses 'assignee' rather than 'assigneeId'
      if (filters.assigneeId !== undefined) {
        params.append('assignee', filters.assigneeId.toString());
      }
      
      // Add other filters here if needed
      // if (filters.priorityName) { ... }
      
      const queryString = params.toString();
      
      const response = await apiClient.get<any>(`/tickets?${queryString}`);
      console.log('API response for tickets:', response);
      
      // Handling response structure which may be nested under 'data'
      const responseData = response.data || response;
      const fetchedTickets = responseData.tickets || [];
      const paginationData = responseData.pagination || { page, limit, total: 0, totalPages: 1 };
      
      // Map snake_case date fields to camelCase for consistency
      const normalizedTickets = fetchedTickets.map((ticket: TicketBackendResponse) => {
        // Normalize dates by mapping snake_case to camelCase if needed
        return {
          ...ticket,
          // Ensure correct date fields are available
          createdAt: ticket.createdAt || ticket.created_at || null,
          updatedAt: ticket.updatedAt || ticket.updated_at || null,
          // Handle other date fields too if needed
          lastActivity: ticket.lastActivity || ticket.last_activity || new Date().toISOString() // Fallback for lastActivity
        } as Ticket;
      });
      
      setTickets(normalizedTickets);
      setFilteredTickets(normalizedTickets);
      
      // Normalize pagination structure
      const normalizedPagination: PaginationResponse = {
        page: paginationData.page || page,
        limit: paginationData.limit || limit,
        totalCount: paginationData.total || 0,
        totalPages: paginationData.totalPages || 1,
        total: paginationData.total || 0 // Include original total for backward compatibility
      };
      
      // Set state with only the standard fields
      setPagination({
        page: normalizedPagination.page,
        limit: normalizedPagination.limit,
        totalCount: normalizedPagination.totalCount,
        totalPages: normalizedPagination.totalPages
      });
      
      return { tickets: normalizedTickets, pagination: normalizedPagination };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to fetch tickets');
      setTickets([]);
      setFilteredTickets([]);
      setPagination({ page, limit, totalCount: 0, totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch a single ticket by ID
  const fetchTicketById = useCallback(async (id: string) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use real API call
      const response = await apiClient.get<{ ticket: TicketBackendResponse }>(`/tickets/${id}`); // Expect { ticket: ... }
      
      // Extract the ticket object directly from the response
      const fetchedTicket = response.ticket; // Access response.ticket directly
      
      if (fetchedTicket) {
        // Create normalized ticket with proper camelCase date fields
        const normalizedTicket = {
          ...fetchedTicket,
          // Ensure correct date fields are available
          createdAt: fetchedTicket.createdAt || fetchedTicket.created_at || null,
          updatedAt: fetchedTicket.updatedAt || fetchedTicket.updated_at || null,
          lastActivity: fetchedTicket.lastActivity || fetchedTicket.last_activity || new Date().toISOString(),
          // Ensure comments and attachments are arrays, normalizing any date fields
          comments: (fetchedTicket.comments || []).map((comment: CommentBackendResponse) => ({
            ...comment,
            createdAt: comment.createdAt || comment.created_at || new Date().toISOString()
          })),
          attachments: (fetchedTicket.attachments || []).map((attachment: AttachmentBackendResponse) => ({
            ...attachment,
            createdAt: attachment.createdAt || attachment.created_at || new Date().toISOString()
          }))
        } as TicketDetail;
        
        setCurrentTicket(normalizedTicket);
      } else {
        // Handle case where ticket data might be missing in the response
        console.error('Ticket data missing in API response:', response);
        setError('Received invalid ticket data format.');
        setCurrentTicket(null);
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError('Failed to fetch ticket details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Create a new ticket
   */
  const createTicket = async (ticketData: any): Promise<Ticket | undefined> => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use real API call
      const response = await apiClient.post('/tickets', ticketData);
      
      // Add the new ticket to the state
      const newTicket = response;
      setTickets(prevTickets => [...prevTickets, newTicket]);
      setFilteredTickets(prevTickets => [...prevTickets, newTicket]);
      
      return newTicket;
    } catch (err) {
      setError('Failed to create ticket. Please try again.');
      console.error('Error creating ticket:', err);
      
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  // Update a ticket
  const updateTicket = useCallback(async (id: string, ticketData: any) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a copy of ticketData to avoid modifying the original
      const processedData = { ...ticketData };
      
      // Handle assigneeId conversion to number if it's a UUID string
      if (processedData.assigneeId !== undefined) {
        // If it's a string that doesn't look like a number, try to extract numeric part or set to null
        if (typeof processedData.assigneeId === 'string' && isNaN(Number(processedData.assigneeId))) {
          console.log('Converting non-numeric assigneeId to null:', processedData.assigneeId);
          processedData.assigneeId = null;
        } 
        // If it's a string that looks like a number, convert to number
        else if (typeof processedData.assigneeId === 'string') {
          processedData.assigneeId = Number(processedData.assigneeId);
        }
        
        console.log('Final assigneeId value:', processedData.assigneeId);
      }
      
      // Use the processed data for the API call
      const response = await apiClient.put(`/tickets/${id}`, processedData);
      const updatedTicket = response.ticket || response;
      
      // Update the tickets list with the updated ticket
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === id
            ? { ...ticket, ...updatedTicket, updatedAt: new Date().toISOString() }
            : ticket
        )
      );
      
      // Also update filtered tickets list
      setFilteredTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === id
            ? { ...ticket, ...updatedTicket, updatedAt: new Date().toISOString() }
            : ticket
        )
      );
      
      // If we are viewing the current ticket being updated, update the current ticket state
      if (currentTicket && currentTicket.id === id) {
        setCurrentTicket({ ...currentTicket, ...updatedTicket, updatedAt: new Date().toISOString() });
      }
      
      return updatedTicket;
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      setError(err.message || 'Failed to update ticket. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTicket]);

  // Delete a ticket
  const deleteTicket = useCallback(async (id: string) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network request
      
      setTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== id));
      setFilteredTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== id));
      
      if (currentTicket && currentTicket.id === id) {
        setCurrentTicket(null);
      }
    } catch (err) {
      setError('Failed to delete ticket. Please try again.');
      console.error('Error deleting ticket:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTicket]);

  // Add a comment to a ticket
  const addComment = useCallback(async (ticketId: string, comment: string, isInternal: boolean) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use direct API call to add the comment
      const response = await apiClient.post(`/tickets/${ticketId}/comments`, {
        content: comment,
        isInternal
      });
      
      // If the API call is successful, refresh the ticket data
      if (response) {
        if (currentTicket && currentTicket.id === ticketId) {
          await fetchTicketById(ticketId);
        }
      }
      
      return response;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.message || 'Failed to add comment. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTicket, fetchTicketById]);

  // Filter tickets based on criteria
  const filterTickets = useCallback((filters: any) => {
    let result = [...tickets];
    
    // Filter by status
    if (filters.status) {
      result = result.filter(ticket => ticket.status.id === filters.status);
    }
    
    // Filter by priority
    if (filters.priority) {
      result = result.filter(ticket => ticket.priority.id === filters.priority);
    }
    
    // Filter by department
    if (filters.department) {
      result = result.filter(ticket => ticket.department && ticket.department.id === filters.department);
    }
    
    // Filter by assignee
    if (filters.assignee) {
      if (filters.assignee === 'unassigned') {
        result = result.filter(ticket => !ticket.assignee);
      } else {
        result = result.filter(ticket => ticket.assignee && ticket.assignee.id === filters.assignee);
      }
    }
    
    // Filter by date range
    if (filters.dateFrom && filters.dateTo) {
      const dateFrom = new Date(filters.dateFrom).getTime();
      const dateTo = new Date(filters.dateTo).getTime();
      result = result.filter(ticket => {
        const createdDate = new Date(ticket.createdAt).getTime();
        return createdDate >= dateFrom && createdDate <= dateTo;
      });
    }
    
    setFilteredTickets(result);
  }, [tickets]);

  // Search tickets by query
  const searchTickets = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredTickets(tickets);
      return;
    }
    
    const searchTerms = query.toLowerCase().split(' ');
    
    const result = tickets.filter(ticket => {
      const searchString = `
        ${ticket.id.toLowerCase()}
        ${ticket.subject.toLowerCase()}
        ${ticket.requester.firstName.toLowerCase()} ${ticket.requester.lastName.toLowerCase()}
        ${ticket.assignee ? `${ticket.assignee.firstName.toLowerCase()} ${ticket.assignee.lastName.toLowerCase()}` : ''}
        ${ticket.status.name.toLowerCase()}
        ${ticket.priority.name.toLowerCase()}
        ${ticket.tags ? ticket.tags.join(' ').toLowerCase() : ''}
      `;
      
      return searchTerms.every(term => searchString.includes(term));
    });
    
    setFilteredTickets(result);
  }, [tickets]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilteredTickets(tickets);
  }, [tickets]);

  // Get agents list for assignment
  const getAgentsList = useCallback(async (): Promise<User[]> => {
    if (!isAuthenticated) return [];
    
    try {
      // Fetch agents directly from users table where role is agent or admin
      const response = await apiClient.get<{ agents: User[] }>('/users/roles/agent');
      
      // Log successful response
      console.log('Successfully fetched agents:', response.agents?.length || 0);
      
      // Process agent IDs to ensure they're compatible with backend expectations
      const formattedAgents = response.agents?.map(agent => {
        let processedId = agent.id;
        
        // If ID is a string, check if it can be converted to a number
        if (typeof agent.id === 'string') {
          const numericId = parseInt(agent.id, 10);
          if (!isNaN(numericId)) {
            // It's a numeric string, convert to number
            processedId = numericId;
            console.log(`Converted agent ID from ${agent.id} to ${numericId}`);
          } else {
            // It's a UUID or non-numeric string, see if we can extract any numeric parts
            const numericParts = agent.id.match(/\d+/);
            if (numericParts && numericParts[0]) {
              const extractedId = parseInt(numericParts[0], 10);
              if (!isNaN(extractedId)) {
                processedId = extractedId;
                console.log(`Extracted numeric ID ${extractedId} from ${agent.id}`);
              }
            }
          }
        }
        
        return {
          ...agent,
          id: processedId
        };
      }) || [];
      
      return formattedAgents;
    } catch (error) {
      console.error('Failed to fetch agents list:', error);
      // Don't set error state to avoid UI disruption, just log it
      return [];
    }
  }, [isAuthenticated]);

  // Add addAttachment implementation after existing functions
  const addAttachment = useCallback(async (ticketId: string, formData: FormData) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use apiClient to upload attachments
      const response = await apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
        headers: {
          // Content-Type is automatically set when using FormData
          'Content-Type': 'multipart/form-data',
        }
      });
      
      // If we are viewing the current ticket being updated, refresh the data
      if (currentTicket && currentTicket.id === ticketId) {
        await fetchTicketById(ticketId);
      }
      
      return response;
    } catch (err: any) {
      console.error('Error uploading attachments:', err);
      setError(err.message || 'Failed to upload attachments. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTicket, fetchTicketById]);

  // Add getTicketHistory implementation
  const getTicketHistory = useCallback(async (ticketId: string) => {
    if (!isAuthenticated) return [];
    
    try {
      // Call the API to get ticket history
      const response = await apiClient.get<{ history: any[] }>(`/tickets/${ticketId}/history`);
      
      // Return the history array from the response
      return response.history || [];
    } catch (err: any) {
      console.error('Error fetching ticket history:', err);
      // Don't set error state here, let the component handle it
      return [];
    }
  }, [isAuthenticated]);

  const value = {
    tickets,
    filteredTickets,
    currentTicket,
    statuses,
    priorities,
    departments,
    ticketTypes,
    isLoading,
    error,
    pagination,
    fetchTickets,
    fetchTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addComment,
    filterTickets,
    searchTickets,
    clearFilters,
    getAgentsList,
    addAttachment,
    getTicketHistory,
    refreshCounter,
    setRefreshCounter
  };

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
};

export const useTickets = (): TicketContextType => {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

export type { TicketStatus, TicketPriority, Department, TicketType, User, Ticket, Comment, Attachment, TicketDetail }; 