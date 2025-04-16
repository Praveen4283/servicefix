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
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiClient from '../services/apiClient';
import ticketService, { TicketStatus, TicketPriority } from '../services/ticketService';
import { SystemAlert, useSystemNotification } from '../context/NotificationContext';

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
}

// Filter interface
interface Filters {
  status: string[];
  priority: string[];
  tags: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
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

  // State for search query and results
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  
  // Pagination state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // UI state
  const [activeTab, setActiveTab] = useState(
    initialType === 'all' ? 0 : 
    initialType === 'ticket' ? 1 : 
    initialType === 'article' ? 2 : 
    initialType === 'user' ? 3 : 0
  );
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
  });
  
  // Available filter options
  const statusOptions = Object.values(TicketStatus);
  const priorityOptions = Object.values(TicketPriority);
  const tagOptions = ['password', 'security', 'guide', 'printer', 'remote work', 'setup', 'software', 'installation', 'office', 'network'];

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
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Perform search when query or filters change
  useEffect(() => {
    if (query.trim() || filtersApplied) {
      performSearch();
    } else {
      setResults([]);
      setTotalResults(0);
    }
    
    // Update URL with search parameters
    updateUrl();
  }, [query, activeTab, page, sortBy, filtersApplied]);

  // Update URL to reflect current search state
  const updateUrl = () => {
    const params = new URLSearchParams();
    
    if (query) {
      params.set('q', query);
    }
    
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    const types = ['all', 'ticket', 'article', 'user'];
    if (activeTab > 0) {
      params.set('type', types[activeTab]);
    }
    
    // Only update if URL would actually change
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      navigate(newUrl, { replace: true });
    }
  };

  // Perform search API call
  const performSearch = async () => {
    if (!query.trim() && !filtersApplied) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Build search parameters
      const types = ['all', 'ticket', 'article', 'user'];
      const searchParams = {
        query: query.trim(),
        type: types[activeTab],
        page,
        pageSize,
        sortBy,
        ...(filtersApplied ? {
          status: filters.status.length > 0 ? filters.status : undefined,
          priority: filters.priority.length > 0 ? filters.priority : undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          dateFrom: filters.dateFrom ? filters.dateFrom.toISOString() : undefined,
          dateTo: filters.dateTo ? filters.dateTo.toISOString() : undefined,
        } : {})
      };
      
      const response = await apiClient.get('/search', searchParams);
      setResults(response.results);
      setTotalResults(response.total);
      setTotalPages(Math.ceil(response.total / pageSize));
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to perform search. Please try again.');
      showError('Failed to perform search. Please try again.', { 
        title: 'Search Error', 
        duration: 5000 
      });
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    performSearch();
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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

      {/* Status filter */}
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

      {/* Priority filter */}
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
            placeholder="Search for tickets, articles, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
              onClick={() => setQuery('')}
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
          <Tab label="All" />
          <Tab label="Tickets" />
          <Tab label="Articles" />
          <Tab label="Users" />
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
                                {result.tags?.map((tag) => (
                                  <Chip
                                    key={tag}
                                    size="small"
                                    label={tag}
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