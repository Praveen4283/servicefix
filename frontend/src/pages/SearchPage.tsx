import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Drawer,
  Pagination,
  Alert,
  Tooltip,
  Badge,
  useTheme,
  alpha,
  ListItemButton,
  Collapse,
  useMediaQuery,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Article as ArticleIcon,
  ConfirmationNumber as TicketIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
  ExpandLess,
  ExpandMore,
  CalendarToday as DateIcon,
  Label as TagIcon,
  AdminPanelSettings as AdminIcon,
  Support as AgentIcon,
  Person as CustomerIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiClient from '../services/apiClient';
import ticketService, { TicketStatus, TicketPriority } from '../services/ticketService';
import { SystemAlert, useSystemNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

// Search result types
interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'ticket' | 'article' | 'user';
  createdAt: string;
  tags?: string[];
  status?: string;
  priority?: string;
  role?: 'admin' | 'agent' | 'customer';
}

// Filter interface
interface Filters {
  status: string[];
  priority: string[];
  tags: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  roles: string[];
}

const SearchPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';
  const initialPage = parseInt(queryParams.get('page') || '1', 10);
  const initialType = queryParams.get('type') || 'all';
  const { showError } = useSystemNotification();
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  // State for search query and results
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  
  // Pagination state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // UI state
  const [activeTab, setActiveTab] = useState(() => {
    if (isCustomer) {
      if (initialType === 'article') return 1; // For customers, Article tab is index 1
      return 0; // For customers, Tickets tab is index 0
    } else {
      return initialType === 'all' ? 0 : 
    initialType === 'ticket' ? 1 : 
    initialType === 'article' ? 2 : 
             initialType === 'user' ? 3 : 0;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    status: [],
    priority: [],
    tags: [],
    dateFrom: null,
    dateTo: null,
    roles: []
  });
  
  // Available filter options
  const statusOptions = Object.values(TicketStatus);
  const priorityOptions = Object.values(TicketPriority);
  const tagOptions = ['password', 'security', 'guide', 'printer', 'remote work', 'setup', 'software', 'installation', 'office', 'network'];
  const roleOptions = ['admin', 'agent', 'customer'];

  // Sorting state
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [sortBy, setSortBy] = useState<string>('recent');
  const sortMenuOpen = Boolean(sortMenuAnchorEl);
  
  // Advanced filter sections
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    priority: true,
    tags: true,
    date: true,
    roles: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Debounce search query effect
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [query]);

  // Perform search when debounced query, filters, page, or sort order change
  useEffect(() => {
    if (debouncedQuery.trim() || filtersApplied) {
      performSearch();
    } else {
      setResults([]);
      setTotalResults(0);
    }
    
    updateUrl();
  }, [debouncedQuery, activeTab, page, sortBy, filtersApplied]);

  // Update URL to reflect current search state
  const updateUrl = () => {
    const params = new URLSearchParams();
    
    if (debouncedQuery) {
      params.set('q', debouncedQuery);
    }
    
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    const types = ['all', 'ticket', 'article', 'user'];
    if (activeTab > 0) {
      params.set('type', types[activeTab]);
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      navigate(newUrl, { replace: true });
    }
  };

  // Get the real search type based on active tab and user role
  const getSearchType = () => {
    if (isCustomer) {
      // For customers: 0 = tickets, 1 = articles
      return activeTab === 0 ? 'ticket' : 'article';
    } else {
      // For admin/agent: 0 = all, 1 = tickets, 2 = articles, 3 = users
      const types = ['all', 'ticket', 'article', 'user'];
      return types[activeTab];
    }
  };

  // Perform search API call
  const performSearch = async () => {
    if (!debouncedQuery.trim() && !filtersApplied) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchType = getSearchType();

      let endpoint = '/search';
      let apiParams: any = {};
      let response: any;
      let transformedResults: SearchResult[] = [];
      let total = 0;
      let newTotalPages = 1;

      // Define expected structure for parallel fetch results
      type FetchResult = {
        data?: any;
        users?: any[];
        tickets?: any[];
        articles?: any[];
        pagination?: { total: number; totalPages: number };
        error?: any; 
        type?: 'user' | 'ticket' | 'article';
      }

      if (searchType === 'all') {
        // --- Parallel Fetching for 'All' Tab ---
        const fetchPromises: Promise<FetchResult>[] = []; 
        const commonParams = { search: debouncedQuery.trim(), page, limit: pageSize, sortBy };

        // User Search Promise - Only for admin/agent
        if (!isCustomer) {
          const userParams: any = { search: commonParams.search, page: commonParams.page, limit: commonParams.limit };
          if (filtersApplied && filters.roles.length > 0) {
            if (filters.roles.length === 1) userParams.role = filters.roles[0];
            else userParams.role = 'all';
          }
          fetchPromises.push(
            apiClient.get('/users', userParams)
              .then(res => ({ ...res, type: 'user' } as FetchResult))
              .catch(e => ({ error: e, type: 'user' } as FetchResult))
          );
        }

        // Ticket Search Promise - For customers, add a filter for their own tickets
        const ticketParams: any = { search: commonParams.search, page: commonParams.page, limit: commonParams.limit, sortBy: commonParams.sortBy };
        if (isCustomer && user?.id) {
          ticketParams.requester = user.id; // Filter to only show customer's own tickets
        }
        if (filtersApplied) {
          if (filters.status.length > 0) ticketParams.status = filters.status.join(',');
          if (filters.priority.length > 0) ticketParams.priority = filters.priority.join(',');
          if (filters.tags.length > 0) ticketParams.tags = filters.tags.join(',');
          if (filters.dateFrom) ticketParams.dateFrom = filters.dateFrom.toISOString();
          if (filters.dateTo) ticketParams.dateTo = filters.dateTo.toISOString();
        }
        fetchPromises.push(
          apiClient.get('/tickets', ticketParams)
            .then(res => ({ ...res, type: 'ticket' } as FetchResult))
            .catch(e => ({ error: e, type: 'ticket' } as FetchResult))
        );

        // Article Search Promise
        const articleParams: any = { search: commonParams.search, page: commonParams.page, limit: commonParams.limit, sortBy: commonParams.sortBy };
        if (filtersApplied) {
          if (filters.tags.length > 0) articleParams.tags = filters.tags.join(',');
          if (filters.dateFrom) articleParams.dateFrom = filters.dateFrom.toISOString();
          if (filters.dateTo) articleParams.dateTo = filters.dateTo.toISOString();
        }
        fetchPromises.push(
          apiClient.get('/kb/articles', articleParams)
            .then(res => ({ ...res, type: 'article' } as FetchResult))
            .catch(e => ({ error: e, type: 'article' } as FetchResult))
        );

        // Promise.all resolves with an array of FetchResult
        const results: FetchResult[] = await Promise.all(fetchPromises);

        let combinedResults: SearchResult[] = [];
        let totalUsers = 0, totalTickets = 0, totalArticles = 0;
        let errors: string[] = [];

        // Process User Results (only for admin/agent)
        if (!isCustomer) {
          const userResponse = results.find(r => r.type === 'user');
          if (userResponse && !userResponse.error) {
            totalUsers = userResponse.pagination?.total || 0;
            combinedResults = combinedResults.concat(
              (userResponse.users || []).map((u: any) => ({
                id: u.id,
                title: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
                description: u.email,
                type: 'user',
                createdAt: u.created_at,
                role: u.role
              }))
            );
          } else if (userResponse) {
             errors.push('Failed to fetch users');
             console.error('User search failed:', userResponse?.error);
          }
        }

        // Process Ticket Results
        const ticketResponse = results.find(r => r.type === 'ticket');
        if (ticketResponse && !ticketResponse.error) {
          const ticketsData = ticketResponse.data?.tickets || ticketResponse.tickets || [];
          const paginationData = ticketResponse.data?.pagination || ticketResponse.pagination;
          totalTickets = paginationData?.total || 0;
          combinedResults = combinedResults.concat(
            ticketsData.map((t: any) => ({
              id: t.id,
              title: t.subject,
              description: t.description,
              type: 'ticket',
              createdAt: t.created_at,
              status: t.status, 
              priority: t.priority,
              tags: t.tags || []
            }))
          );
        } else {
           errors.push('Failed to fetch tickets');
           console.error('Ticket search failed:', ticketResponse?.error); // Use console.error
        }

        // Process Article Results
        const articleResponse = results.find(r => r.type === 'article');
        if (articleResponse && !articleResponse.error) {
          const articlesData = articleResponse.articles || articleResponse.data?.articles || [];
          const paginationData = articleResponse.pagination || articleResponse.data?.pagination;
          totalArticles = paginationData?.total || 0;
          combinedResults = combinedResults.concat(
            articlesData.map((a: any) => ({
              id: a.id,
              title: a.title,
              description: a.excerpt || (a.content || '').substring(0, 150) + '...',
              type: 'article',
              createdAt: a.created_at,
              tags: a.tags || []
            }))
          );
        } else {
           errors.push('Failed to fetch articles');
           console.error('Article search failed:', articleResponse?.error); // Use console.error
        }

        total = totalUsers + totalTickets + totalArticles;

        combinedResults.sort((a, b) => {
             try {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                if (isNaN(dateA) || isNaN(dateB)) return 0;
                return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
             } catch (e) {
                 return 0;
             }
         });

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        transformedResults = combinedResults.slice(startIndex, endIndex);
        newTotalPages = Math.ceil(total / pageSize);
        
        if (errors.length > 0 && errors.length < 3) { // Only show partial error if not all failed
            setError(errors.join('; '));
            showError(errors.join('; '), { title: 'Partial Search Failed' });
        } else if (errors.length === 3) {
             setError('All search requests failed.');
             showError('Failed to fetch any search results.', { title: 'Search Failed' });
        }

      } else {
        // --- Specific Type Fetching (Ticket, User, Article) ---
        if (searchType === 'ticket') {
          endpoint = '/tickets';
          apiParams = { search: debouncedQuery.trim(), page, limit: pageSize, sortBy };
          // For customers, add a filter for their own tickets
          if (isCustomer && user?.id) {
            apiParams.requester = user.id;
          }
          if (filtersApplied) {
            if (filters.status.length > 0) apiParams.status = filters.status.join(',');
            if (filters.priority.length > 0) apiParams.priority = filters.priority.join(',');
            if (filters.tags.length > 0) apiParams.tags = filters.tags.join(',');
            if (filters.dateFrom) apiParams.dateFrom = filters.dateFrom.toISOString();
            if (filters.dateTo) apiParams.dateTo = filters.dateTo.toISOString();
          }
        } else if (searchType === 'user' && !isCustomer) {
          endpoint = '/users';
          apiParams = { search: debouncedQuery.trim(), page, limit: pageSize };
          if (filtersApplied && filters.roles.length > 0) {
            if (filters.roles.length === 1) apiParams.role = filters.roles[0];
            else apiParams.role = 'all';
          }
        } else if (searchType === 'article') {
          endpoint = '/kb/articles'; 
          apiParams = { search: debouncedQuery.trim(), page, limit: pageSize, sortBy };
          if (filtersApplied) {
            if (filters.tags.length > 0) apiParams.tags = filters.tags.join(',');
            if (filters.dateFrom) apiParams.dateFrom = filters.dateFrom.toISOString();
            if (filters.dateTo) apiParams.dateTo = filters.dateTo.toISOString();
          }
        }

        // Skip API call if customer tries to search users
        if (isCustomer && searchType === 'user') {
          setResults([]);
          setTotalResults(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        console.log(`Performing search with endpoint: ${endpoint}, params:`, apiParams);
        response = await apiClient.get(endpoint, apiParams);

        // Transform response based on endpoint
        if (endpoint === '/users') {
          transformedResults = (response.users || []).map((u: any) => ({
            id: u.id,
            title: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            description: u.email,
            type: 'user',
            createdAt: u.created_at,
            role: u.role
          }));
          total = response.pagination?.total || 0;
          newTotalPages = response.pagination?.totalPages || 1;
        } else if (endpoint === '/tickets') {
           const ticketsData = response.data?.tickets || response.tickets || [];
           const paginationData = response.data?.pagination || response.pagination;
           total = paginationData?.total || 0;
           newTotalPages = paginationData?.totalPages || 1;
          transformedResults = ticketsData.map((t: any) => ({
            id: t.id,
            title: t.subject,
            description: t.description,
            type: 'ticket',
            createdAt: t.created_at,
            status: t.status,
            priority: t.priority,
            tags: t.tags || []
          }));
        } else if (endpoint === '/kb/articles') {
          const articlesData = response.articles || response.data?.articles || [];
          const paginationData = response.pagination || response.data?.pagination;
          total = paginationData?.total || 0;
          newTotalPages = paginationData?.totalPages || 1;
          transformedResults = articlesData.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.excerpt || (a.content || '').substring(0, 150) + '...',
            type: 'article',
            createdAt: a.created_at,
            tags: a.tags || []
          }));
        }
      }
      
      setResults(transformedResults);
      setTotalResults(total);
      setTotalPages(newTotalPages);

    } catch (err: any) {
      console.error('Search failed:', err);
      // If an error wasn't already set by the parallel fetch logic (for 'all' tab)
      if (!error) { 
         const errorMessage = err.response?.data?.message || err.message || 'Failed to perform search. Please try again.';
         setError(errorMessage);
         showError(errorMessage, { 
        title: 'Search Error', 
        duration: 5000 
      });
      }
      // Ensure state is reset on any error
      setResults([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Triggering search immediately if needed, or rely on debounce effect
    // setDebouncedQuery(query); // Optionally force immediate search on submit
    // performSearch(); // Or call performSearch directly
    // For now, let the debounce handle it
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // For customers, there are only 2 tabs (tickets and articles)
    if (isCustomer && newValue >= 2) {
      return;
    }
    setActiveTab(newValue);
    setPage(1); // Reset to first page on tab change
  };

  // Handle pagination change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Handle sort menu
  const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSortMenuAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortMenuAnchorEl(null);
  };

  const handleSortSelect = (sortOption: string) => {
    setSortBy(sortOption);
    setSortMenuAnchorEl(null);
  };

  // Filter handlers
  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
  };

  const handleFilterChange = (
    filterType: keyof Filters, 
    value: string | Date | null,
    isArray: boolean = false
  ) => {
    if (isArray && typeof value === 'string') {
      setFilters(prev => {
        const currentValues = prev[filterType] as string[];
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        
        return {
          ...prev,
          [filterType]: newValues
        };
      });
    } else {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
  };

  const applyFilters = () => {
    setFiltersApplied(true);
    setPage(1); // Reset to first page when applying filters
    toggleDrawer(false);
    performSearch();
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      tags: [],
      dateFrom: null,
      dateTo: null,
      roles: []
    });
    setFiltersApplied(false);
    setPage(1);
  };

  const countActiveFilters = () => {
    let count = 0;
    if (filters.status.length) count++;
    if (filters.priority.length) count++;
    if (filters.tags.length) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.roles.length) count++;
    return count;
  };

  // Render status and priority chips
  const renderStatusChip = (result: SearchResult) => {
    if (result.type !== 'ticket' || !result.status) return null;
    
    const statusColors: Record<string, string> = {
      new: 'info',
      open: 'primary',
      in_progress: 'secondary',
      pending: 'warning',
      resolved: 'success',
      closed: 'default',
    };
    
    return (
      <Chip 
        size="small" 
        label={result.status.replace('_', ' ')} 
        color={statusColors[result.status] as any} 
        sx={{ mr: 1, textTransform: 'capitalize' }}
      />
    );
  };

  const renderPriorityChip = (result: SearchResult) => {
    if (result.type !== 'ticket' || !result.priority) return null;
    
    const priorityColors: Record<string, string> = {
      low: 'success',
      medium: 'info',
      high: 'warning',
      urgent: 'error',
    };
    
    return (
      <Chip 
        size="small" 
        label={result.priority} 
        color={priorityColors[result.priority] as any}
        sx={{ mr: 1, textTransform: 'capitalize' }}
      />
    );
  };

  // Render role chip for users
  const renderRoleChip = (result: SearchResult) => {
    if (result.type !== 'user' || !result.role) return null;
    
    const roleColors: Record<string, string> = {
      admin: 'error',
      agent: 'primary',
      customer: 'success',
    };
    
    const getRoleIcon = (role: string) => {
      switch (role) {
        case 'admin': return <AdminIcon fontSize="small" />;
        case 'agent': return <AgentIcon fontSize="small" />;
        case 'customer': return <CustomerIcon fontSize="small" />;
        default: return <PersonIcon fontSize="small" />;
      }
    };
    
    return (
      <Chip 
        size="small" 
        label={result.role} 
        color={roleColors[result.role] as any}
        icon={getRoleIcon(result.role)}
        sx={{ mr: 1, textTransform: 'capitalize' }}
      />
    );
  };

  // Render sort button label based on selected option
  const getSortButtonLabel = () => {
    switch (sortBy) {
      case 'recent': return 'Newest first';
      case 'oldest': return 'Oldest first';
      case 'a-z': return 'A to Z';
      case 'z-a': return 'Z to A';
      default: return 'Sort';
    }
  };

  // Get the result type icon
  const renderIcon = (type: string) => {
    switch (type) {
      case 'ticket':
        return <TicketIcon color="primary" />;
      case 'article':
        return <ArticleIcon color="secondary" />;
      case 'user':
        return <PersonIcon color="action" />;
      default:
        return <SearchIcon />;
    }
  };

  // Render filter drawer
  const filterDrawer = (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => toggleDrawer(false)}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 340 },
          p: 3,
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Filters</Typography>
        <IconButton onClick={() => toggleDrawer(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Status filter - only show for tickets */}
      {(activeTab === 0 || activeTab === 1) && (
        <>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="text"
          startIcon={expandedSections.status ? <ExpandLess /> : <ExpandMore />}
          onClick={() => toggleSection('status')}
          sx={{ mb: 1, px: 0 }}
        >
          Status
        </Button>
        <Collapse in={expandedSections.status}>
          <FormGroup>
            {statusOptions.map((status) => (
              <FormControlLabel
                key={status}
                control={
                  <Checkbox
                    checked={filters.status.includes(status)}
                    onChange={() => handleFilterChange('status', status, true)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {status.replace('_', ' ')}
                  </Typography>
                }
              />
            ))}
          </FormGroup>
        </Collapse>
      </Box>

      <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Priority filter - only show for tickets */}
      {(activeTab === 0 || activeTab === 1) && (
        <>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="text"
          startIcon={expandedSections.priority ? <ExpandLess /> : <ExpandMore />}
          onClick={() => toggleSection('priority')}
          sx={{ mb: 1, px: 0 }}
        >
          Priority
        </Button>
        <Collapse in={expandedSections.priority}>
          <FormGroup>
            {priorityOptions.map((priority) => (
              <FormControlLabel
                key={priority}
                control={
                  <Checkbox
                    checked={filters.priority.includes(priority)}
                    onChange={() => handleFilterChange('priority', priority, true)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {priority}
                  </Typography>
                }
              />
            ))}
          </FormGroup>
        </Collapse>
      </Box>

      <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Role filter - only show for users and non-customers */}
      {!isCustomer && (activeTab === 0 || activeTab === 3) && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="text"
              startIcon={expandedSections.roles ? <ExpandLess /> : <ExpandMore />}
              onClick={() => toggleSection('roles')}
              sx={{ mb: 1, px: 0 }}
            >
              User Role
            </Button>
            <Collapse in={expandedSections.roles}>
              <FormGroup>
                {roleOptions.map((role) => (
                  <FormControlLabel
                    key={role}
                    control={
                      <Checkbox
                        checked={filters.roles.includes(role)}
                        onChange={() => handleFilterChange('roles', role, true)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {role}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            </Collapse>
          </Box>

          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Tags filter */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="text"
          startIcon={expandedSections.tags ? <ExpandLess /> : <ExpandMore />}
          onClick={() => toggleSection('tags')}
          sx={{ mb: 1, px: 0 }}
        >
          Tags
        </Button>
        <Collapse in={expandedSections.tags}>
          <FormGroup>
            {tagOptions.map((tag) => (
              <FormControlLabel
                key={tag}
                control={
                  <Checkbox
                    checked={filters.tags.includes(tag)}
                    onChange={() => handleFilterChange('tags', tag, true)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {tag}
                  </Typography>
                }
              />
            ))}
          </FormGroup>
        </Collapse>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Date filter */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          startIcon={expandedSections.date ? <ExpandLess /> : <ExpandMore />}
          onClick={() => toggleSection('date')}
          sx={{ mb: 1, px: 0 }}
        >
          Date Range
        </Button>
        <Collapse in={expandedSections.date}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                From
              </Typography>
              <DatePicker
                value={filters.dateFrom}
                onChange={(newValue) => handleFilterChange('dateFrom', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    variant: "outlined"
                  }
                }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                To
              </Typography>
              <DatePicker
                value={filters.dateTo}
                onChange={(newValue) => handleFilterChange('dateTo', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    variant: "outlined"
                  }
                }}
              />
            </Box>
          </LocalizationProvider>
        </Collapse>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          onClick={clearFilters}
          startIcon={<ClearIcon />}
        >
          Clear All
        </Button>
        <Button 
          variant="contained" 
          onClick={applyFilters}
          color="primary"
        >
          Apply Filters
        </Button>
      </Box>
    </Drawer>
  );

  // Handle search input change (updates immediate query)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // DO NOT reset page here, reset when debounced query updates
  };

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Search
        </Typography>
        <Paper 
          component="form" 
          onSubmit={handleSearch} 
          sx={{ 
            p: 1, 
            display: 'flex', 
            alignItems: 'center',
            borderRadius: 2,
            boxShadow: theme.shadows[2]
          }}
        >
          <InputAdornment position="start" sx={{ pl: 1 }}>
            <SearchIcon />
          </InputAdornment>
          <TextField
            fullWidth
            placeholder={isCustomer 
              ? "Search for tickets, articles..." 
              : "Search for tickets, articles, users..."}
            value={query}
            onChange={handleInputChange}
            variant="standard"
            InputProps={{
              disableUnderline: true,
            }}
            sx={{ ml: 1 }}
            autoFocus
          />
          {query && (
            <IconButton 
              size="small" 
              onClick={() => { setQuery(''); setDebouncedQuery(''); }}
              sx={{ mr: 1 }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
          <Tooltip title="Advanced Filters">
            <Badge
              badgeContent={filtersApplied ? countActiveFilters() : 0}
              color="primary"
            >
              <IconButton 
                onClick={() => toggleDrawer(true)}
                sx={{ color: filtersApplied ? 'primary.main' : 'inherit' }}
              >
                <FilterIcon />
              </IconButton>
            </Badge>
          </Tooltip>
        </Paper>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 3,
          gap: 2
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
        >
          {isCustomer ? (
            <>
              <Tab label="Tickets" />
              <Tab label="Articles" />
            </>
          ) : (
            <>
          <Tab label="All" />
          <Tab label="Tickets" />
          <Tab label="Articles" />
          <Tab label="Users" />
            </>
          )}
        </Tabs>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {filtersApplied && (
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              sx={{ height: 36 }}
            >
              Clear Filters
            </Button>
          )}
          
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<SortIcon />}
            onClick={handleSortClick}
            sx={{ height: 36 }}
          >
            {getSortButtonLabel()}
          </Button>
          <Menu
            anchorEl={sortMenuAnchorEl}
            open={sortMenuOpen}
            onClose={handleSortClose}
          >
            <MenuItem 
              selected={sortBy === 'recent'}
              onClick={() => handleSortSelect('recent')}
            >
              Newest first
            </MenuItem>
            <MenuItem 
              selected={sortBy === 'oldest'}
              onClick={() => handleSortSelect('oldest')}
            >
              Oldest first
            </MenuItem>
            <MenuItem 
              selected={sortBy === 'a-z'}
              onClick={() => handleSortSelect('a-z')}
            >
              A to Z
            </MenuItem>
            <MenuItem 
              selected={sortBy === 'z-a'}
              onClick={() => handleSortSelect('z-a')}
            >
              Z to A
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Error alert - replaced with SystemAlert */}
      {error && (
        <SystemAlert
          type="error"
          title="Search Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Loading indicator */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : results.length > 0 ? (
        <>
          {/* Results count */}
          <Typography 
            variant="body2" 
            color="textSecondary" 
            sx={{ mb: 2 }}
          >
            {`Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalResults)} of ${totalResults} results`}
          </Typography>
          
          {/* Results list */}
          <Paper 
            variant="outlined" 
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: theme.shadows[2]
              }
            }}
          >
            <List disablePadding>
              {results.map((result, index) => (
                <React.Fragment key={result.id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItemButton
                    component={Link}
                    to={
                      result.type === 'ticket'
                        ? `/tickets/${result.id}`
                        : result.type === 'article'
                        ? `/knowledge/${result.id}`
                        : `/users/${result.id}`
                    }
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'text.primary',
                      p: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      }
                    }}
                  >
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid item>
                        <Box
                          sx={{
                            backgroundColor: 
                              result.type === 'ticket' 
                                ? alpha(theme.palette.primary.main, 0.1)
                                : result.type === 'article'
                                ? alpha(theme.palette.secondary.main, 0.1)
                                : alpha(theme.palette.grey[500], 0.1),
                            borderRadius: '50%',
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {renderIcon(result.type)}
                        </Box>
                      </Grid>
                      <Grid item xs>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight={500}>
                              {result.title}
                            </Typography>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                                sx={{ display: 'block', mt: 0.5, mb: 1 }}
                              >
                                {result.description}
                              </Typography>
                              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {renderStatusChip(result)}
                                {renderPriorityChip(result)}
                                {renderRoleChip(result)}
                                {result.tags?.map((tag: any) => (
                                  <Chip
                                    key={tag.id}
                                    size="small"
                                    label={tag.name}
                                    variant="outlined"
                                    icon={<TagIcon fontSize="small" />}
                                    sx={{ mr: 1 }}
                                  />
                                ))}
                                <Chip
                                  size="small"
                                  icon={<DateIcon fontSize="small" />}
                                  label={new Date(result.createdAt).toLocaleDateString()}
                                  variant="outlined"
                                />
                              </Box>
                            </React.Fragment>
                          }
                        />
                      </Grid>
                    </Grid>
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          </Paper>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                siblingCount={isMobile ? 0 : 1}
              />
            </Box>
          )}
        </>
      ) : query || filtersApplied ? (
        <Box textAlign="center" my={4}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No results found
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {query ? `We couldn't find any matches for "${query}"` : 'No items match your filter criteria'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            {query && (
              <Button variant="outlined" color="primary" onClick={() => setQuery('')}>
                Clear Search
              </Button>
            )}
            {filtersApplied && (
              <Button variant="outlined" color="primary" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </Box>
        </Box>
      ) : (
        <Box textAlign="center" my={4}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Start searching
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Enter a search term to find tickets, knowledge base articles, or users
          </Typography>
        </Box>
      )}
      
      {/* Filter drawer */}
      {filterDrawer}
    </Container>
  );
};

export default SearchPage; 