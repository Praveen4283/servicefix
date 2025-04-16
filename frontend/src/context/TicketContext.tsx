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
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

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

// Update Filters interface
interface TicketFilters {
  priorityName?: string;
  isOpen?: boolean;
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
  fetchTickets: (page?: number, limit?: number, filters?: TicketFilters) => Promise<{ tickets: Ticket[]; pagination: PaginationState } | undefined>;
  fetchTicketById: (id: string) => Promise<void>;
  createTicket: (ticketData: any) => Promise<Ticket | undefined>;
  updateTicket: (id: string, ticketData: any) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addComment: (ticketId: string, comment: string, isInternal: boolean) => Promise<void>;
  filterTickets: (filters: any) => void;
  searchTickets: (query: string) => void;
  clearFilters: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
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
  const fetchTickets = useCallback(async (page: number = 1, limit: number = 10, filters: TicketFilters = {}): Promise<{ tickets: Ticket[]; pagination: PaginationState } | undefined> => {
    if (!isAuthenticated) return undefined;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // Add filters to query parameters
      if (filters.isOpen !== undefined) {
        params.append('isOpen', filters.isOpen.toString());
      }
      // Add other filters here if needed
      // if (filters.priorityName) { ... }
      
      const queryString = params.toString();
      console.log(`[fetchTickets] Fetching: /tickets?${queryString}`);
      
      const response = await apiClient.get<{ tickets: Ticket[]; pagination: PaginationState }>(`/tickets?${queryString}`);
      const fetchedTickets = response.tickets || [];
      const fetchedPagination = response.pagination || { page, limit, totalCount: 0, totalPages: 1 };
      
      setTickets(fetchedTickets);
      setFilteredTickets(fetchedTickets);
      setPagination(fetchedPagination);
      
      return { tickets: fetchedTickets, pagination: fetchedPagination };
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets. Please try again.');
      console.error('Error fetching tickets:', err);
      return undefined;
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
      const response = await apiClient.get<{ ticket: TicketDetail }>(`/tickets/${id}`); // Expect { ticket: ... }
      
      // Extract the ticket object directly from the response
      const fetchedTicket = response.ticket; // Access response.ticket directly
      
      if (fetchedTicket) {
        // Ensure comments and attachments are arrays, even if missing from response
        setCurrentTicket({
          ...fetchedTicket,
          comments: fetchedTicket.comments || [], 
          attachments: fetchedTicket.attachments || [] 
        });
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
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
      
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === id
            ? { ...ticket, ...ticketData, updatedAt: new Date().toISOString() }
            : ticket
        )
      );
      
      setFilteredTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === id
            ? { ...ticket, ...ticketData, updatedAt: new Date().toISOString() }
            : ticket
        )
      );
      
      if (currentTicket && currentTicket.id === id) {
        setCurrentTicket({ ...currentTicket, ...ticketData, updatedAt: new Date().toISOString() });
      }
    } catch (err) {
      setError('Failed to update ticket. Please try again.');
      console.error('Error updating ticket:', err);
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
    if (!isAuthenticated || !currentTicket) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network request
      
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        content: comment,
        createdAt: new Date().toISOString(),
        isInternal,
        user: {
          id: '1', // Current user
          firstName: 'Current',
          lastName: 'User',
          avatar: undefined,
        },
      };
      
      setCurrentTicket({
        ...currentTicket,
        comments: [...currentTicket.comments, newComment],
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError('Failed to add comment. Please try again.');
      console.error('Error adding comment:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentTicket]);

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

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated, fetchTickets]);

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