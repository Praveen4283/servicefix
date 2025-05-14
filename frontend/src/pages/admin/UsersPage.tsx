import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Avatar,
  Tooltip,
  TablePagination,
  Snackbar,
  Alert,
  useTheme,
  Fade,
  Card,
  Grow,
  Zoom,
  Divider,
  useMediaQuery,
  alpha,
  LinearProgress,
  CardContent,
  FormControlLabel,
  Switch,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  People as PeopleIcon,
  GroupAdd as GroupAddIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import { 
  pageContainer,
  pageHeaderSection,
  tableContainerStyle,
  tableRowHoverStyle,
  buttonAnimation,
  filterSectionStyleSx,
  fadeTransition,
} from '../../styles/commonStyles';
import StatsWidget from '../../components/dashboard/StatsWidget';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';
import { useNotification } from '../../context/NotificationContext';

// Import existing styles and create enhanced components similar to TicketListPage
const EnhancedCard = (props: any) => {
  return (
    <Zoom in={true} style={{ transitionDelay: props.index ? `${props.index * 100}ms` : '0ms' }}>
      <Card {...props} />
    </Zoom>
  );
};

const EnhancedGrid = (props: any) => {
  return (
    <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDuration: '800ms' }}>
      <Grid {...props} />
    </Grow>
  );
};

const cardStyles = {
  elevation: 0,
  borderRadius: 3,
  transition: 'all 0.3s ease',
  background: (theme: any) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  boxShadow: (theme: any) => theme.palette.mode === 'dark'
    ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: (theme: any) => theme.palette.mode === 'dark'
      ? '0 12px 40px -8px rgba(0, 0, 0, 0.4)'
      : '0 12px 40px -8px rgba(0, 0, 0, 0.15)',
  },
};

const gradientAccent = (theme: any) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1
  }
});

// Updated User interface to match database schema and API response
interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
  department?: { id: string; name: string };
  designation?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

// Interface for API response with pagination
interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    current_page: number;
    per_page: number;
    total_pages: number;
  }
}

// Interface for user stats
interface UserStats {
  total: number;
  active: number;
  admin_count: number;
  agent_count: number;
  customer_count: number;
}

// Interface for the user form data (adjust fields as needed)
interface UserFormData {
  id?: string; // Optional: only for edit mode
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
  password?: string; // Optional: only for add mode
  departmentId?: string; // Add department ID
  designation?: string;
  is_active?: boolean; // Optional: if admin can set this
  organizationName?: string; // Added for display in 'add' mode
  avatar_url?: string; // Add avatar_url for potential display/deletion logic
}

const UsersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const { addNotification } = useNotification();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    active: 0,
    admin_count: 0,
    agent_count: 0,
    customer_count: 0
  });

  // --- State for Add/Edit Modal --- 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentUser, setCurrentUser] = useState<UserFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission state
  // --- End State for Add/Edit Modal --- 

  // --- State for Avatar Delete Confirmation ---
  const [isAvatarDeleteDialogOpen, setIsAvatarDeleteDialogOpen] = useState(false);
  const [userToDeleteAvatar, setUserToDeleteAvatar] = useState<UserFormData | null>(null);
  // --- End State for Avatar Delete Confirmation ---

  const { isAuthenticated, user: loggedInUser } = useAuth();
  const { departments } = useTickets();

  // Fetch users data from the API
  const fetchUsers = async () => {
    if (!isAuthenticated) {
      addNotification('Please log in to view users', 'error');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Make API request with pagination parameters AND cache buster
      const params = {
        page: page + 1, // API uses 1-based indexing, MUI uses 0-based
        limit: rowsPerPage,
        search: debouncedSearchQuery,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        _cb: Date.now() // Cache-busting parameter
      };
      
      const response = await apiClient.get<UsersResponse>('/users', params);
      
      if (response && response.users) {
        console.log("[fetchUsers] Received users raw response:", response); // Log raw response
        console.log("[fetchUsers] Received users data:", response.users); // Log parsed users
        setUsers(response.users);
        setFilteredUsers(response.users);
        
        // Update pagination from the response
        if (response.pagination) {
          setTotalUsers(response.pagination.total);
        }
        
        // Fetch user stats
        await fetchUserStats();
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      
      // Display a user-friendly error message
      const errorMessage = error.message || 'Failed to load users data';
      addNotification(errorMessage, 'error');
      
      // Set empty users list
      setUsers([]);
      setFilteredUsers([]);
      setTotalUsers(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      const stats = await apiClient.get<UserStats>('/users/stats');
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Remove the inaccurate fallback calculation
      // calculateUserStats(); 
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, page, rowsPerPage, roleFilter, debouncedSearchQuery]);

  // Debounce search query effect
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(0); // Reset page when the actual search term changes
    }, 500); // Adjust delay as needed (e.g., 500ms)

    // Cleanup function to clear the timeout if user types again quickly
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]); // This effect runs when the immediate searchQuery changes

  // Handle search input change (updates immediate query)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // DO NOT reset page here anymore, reset when debounced query updates
    // setPage(0); 
  };

  // Apply role filter
  const handleRoleFilterChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setRoleFilter(e.target.value as string);
    setPage(0); // Reset page when role changes
  };

  // Update the page change handler
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Update the rows per page change handler
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDeleteUserId(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteUserId) {
      setIsLoading(true);
      try {
        await apiClient.delete(`/users/${deleteUserId}`);
        // Fetch updated users after deletion
        await fetchUsers();
        
        addNotification('User deleted successfully', 'success');
      } catch (error: any) {
        console.error('Error deleting user:', error);
        addNotification(error.message || 'Failed to delete user', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    
    handleCloseDialog();
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await apiClient.post(`/users/${userId}/reset-password`);
      addNotification('Password reset email sent', 'success');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      addNotification(error.message || 'Failed to send password reset email', 'error');
    }
  };
  
  const handleRefreshData = async () => {
    await fetchUsers();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'agent':
        return 'primary';
      case 'customer':
        return 'success';
      default:
        return 'default';
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <SupervisorAccountIcon />;
      case 'agent':
        return <PersonIcon />;
      case 'customer':
        return <PeopleIcon />;
      default:
        return <PersonIcon />;
    }
  };
  
  // Get user stats for dashboard metrics
  const getUserStats = () => {
    const total = userStats.total || 1; // Avoid division by zero
    const inactiveCount = userStats.total - userStats.active;

    return [
      {
        title: 'Total Users',
        value: userStats.total,
        icon: <PeopleIcon />,
        color: theme.palette.primary.main,
        progress: 100, // Total is always 100% of itself conceptually
      },
      {
        title: 'Active Users',
        value: userStats.active,
        icon: <PersonIcon />,
        color: theme.palette.success.main,
        progress: Math.round((userStats.active / total) * 100) || 0,
      },
      {
        title: 'Admin Users',
        value: userStats.admin_count,
        icon: <SupervisorAccountIcon />,
        color: theme.palette.error.main,
        progress: Math.round((userStats.admin_count / total) * 100) || 0,
      },
      {
        title: 'Support Agents',
        value: userStats.agent_count,
        icon: <GroupAddIcon />, // Changed icon for consistency
        color: theme.palette.info.main,
        progress: Math.round((userStats.agent_count / total) * 100) || 0,
      },
      {
        title: 'Customers', // Added Customers Card
        value: userStats.customer_count,
        icon: <PeopleIcon />, // Using PeopleIcon for customers
        color: theme.palette.secondary.main, // Using secondary color
        progress: Math.round((userStats.customer_count / total) * 100) || 0,
      },
      {
        title: 'Inactive Users', // Added Inactive Users Card
        value: inactiveCount,
        icon: <PersonOffIcon />, // Using PersonOffIcon
        color: theme.palette.grey[500], // Using grey color
        progress: Math.round((inactiveCount / total) * 100) || 0,
        // Note: It's better if the backend API provides inactive_count directly in /users/stats
      },
    ];
  };

  // --- Modal Handlers --- 
  const handleOpenModal = (mode: 'add' | 'edit', user: User | null = null) => {
    setModalMode(mode);
    if (mode === 'edit' && user) {
      console.log("[handleOpenModal] User data passed in:", user); // Log user data passed to modal
      console.log("[handleOpenModal] User avatar_url:", user.avatar_url); // Log avatar URL specifically
      console.log("[handleOpenModal] Logged-in User ID:", loggedInUser?.id);
      console.log("[handleOpenModal] Editing User ID:", user.id);
      console.log("[handleOpenModal] Editing User Role:", user.role);
      console.log("[handleOpenModal] ID Match:", loggedInUser?.id === user.id);
      console.log("[handleOpenModal] Role Match:", user.role === 'admin');
      setCurrentUser({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        departmentId: user.department?.id || '',
        designation: user.designation || '',
        is_active: user.is_active,
        organizationName: loggedInUser?.organization?.name || 'Default Organization', // Add organization name in edit mode too
        avatar_url: user.avatar_url // Include avatar_url when editing
      });
    } else {
      setCurrentUser({
        first_name: '',
        last_name: '',
        email: '',
        role: 'customer', 
        password: '',
        departmentId: '',
        designation: '',
        is_active: true,
        organizationName: loggedInUser?.organization?.name || 'Default Organization',
        avatar_url: '',
      });
    }
    setIsModalOpen(true);
    setIsSubmitting(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { name, value, type } = event.target as HTMLInputElement;
    const checked = (event.target as HTMLInputElement).checked;

    setCurrentUser(prev => prev ? {
      ...prev,
      [name as string]: type === 'checkbox' ? checked : value
    } : null);
  };

  // Add a separate handler for Select components
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setCurrentUser(prev => prev ? {
      ...prev,
      [name as string]: value
    } : null);
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    
    setIsSubmitting(true);
    const { departmentId, ...restOfUserData } = currentUser;
    const userData = {
      ...restOfUserData,
      department_id: departmentId || null, 
    };

    try {
      if (modalMode === 'add') {
        await apiClient.post('/users', userData);
        addNotification('User added successfully', 'success');
      } else {
        await apiClient.put(`/users/${userData.id}`, userData);
        addNotification('User updated successfully', 'success');
      }
      handleCloseModal();
      await fetchUsers();
    } catch (error: any) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} user:`, error);
      addNotification(error.message || `Failed to ${modalMode} user`, 'error');
    }
    setIsSubmitting(false);
  };
  // --- End Modal Handlers --- 

  // --- Avatar Deletion Handlers ---
  const openAvatarDeleteConfirm = (user: UserFormData) => {
    setUserToDeleteAvatar(user);
    setIsAvatarDeleteDialogOpen(true);
  };

  const closeAvatarDeleteConfirm = () => {
    setUserToDeleteAvatar(null);
    setIsAvatarDeleteDialogOpen(false);
  };

  const handleAvatarDeleteConfirm = async () => {
    if (!userToDeleteAvatar || !userToDeleteAvatar.id) return;

    setIsSubmitting(true); // Reuse submitting state to disable buttons
    closeAvatarDeleteConfirm(); // Close confirmation dialog immediately

    try {
      // Assume API endpoint exists: DELETE /users/{userId}/avatar
      await apiClient.delete(`/users/${userToDeleteAvatar.id}/avatar`);
      addNotification('Avatar deleted successfully', 'success');

      // Refresh user data to show updated avatar status
      await fetchUsers();

      // If the currently edited user is the one whose avatar was deleted, update its state
      if (currentUser?.id === userToDeleteAvatar.id) {
        setCurrentUser(prev => prev ? { ...prev, avatar_url: undefined } : null);
      }

    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      addNotification(error.message || 'Failed to delete avatar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- End Avatar Deletion Handlers ---

  return (
    <Container 
      maxWidth={false}
      sx={{ 
        py: { xs: 2, md: 3 },
        position: 'relative',
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', lg: '25%' },
          height: { xs: '40%', lg: '100%' },
          background: theme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: -1,
          opacity: 0.8,
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: { xs: '100%', lg: '25%' },
          height: { xs: '30%', lg: '60%' },
          background: theme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: -1,
          opacity: 0.6,
          pointerEvents: 'none'
        }
      }}
    >
      <Box sx={{ 
        animation: 'fadeIn 1s ease forwards',
        opacity: 0,
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        }
      }}>
        <Grid container spacing={1}>
          {/* Header styled like TicketListPage */}
          <Grid item xs={12}>
            <Card 
              elevation={0}
              sx={{ 
                p: 0, 
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
                borderRadius: 3,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.7)}, ${alpha(theme.palette.secondary.dark, 0.5)})`
                  : `linear-gradient(120deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.secondary.light, 0.15)})`,
                position: 'relative',
              }}
            >
              <Box sx={{ p: { xs: 3, md: 2 }, position: 'relative', zIndex: 1 }}>
                <Grid container alignItems="center" justifyContent="space-between" spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="h5" component="h1" gutterBottom>
                      User Management
                    </Typography>
                    <Typography variant="subtitle1">
                      Manage users, roles, and permissions. View all users and control their access to the system.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshData}
                    >
                      Refresh
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Grid>

          {/* User Stats Cards */}
          <Grid item xs={12}>
            <StatsWidget
              stats={getUserStats()}
              loading={isLoading}
              columns={6}
              animated={true}
            />
          </Grid>

          {/* Filter Section styled like TicketListPage */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    label="Search Users"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={roleFilter}
                      onChange={(e: any) => handleRoleFilterChange(e)}
                      label="Role"
                    >
                      <MenuItem value="all">All Roles</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="agent">Agent</MenuItem>
                      <MenuItem value="customer">Customer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenModal('add')}
                    sx={{ 
                      height: '100%',
                      borderRadius: 2
                    }}
                  >
                    Add User
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FilterListIcon />}
                    onClick={() => {
                      setRoleFilter('all');
                      setSearchQuery('');
                    }}
                    sx={{ 
                      height: '100%',
                      borderRadius: 2,
                      width: '100%'
                    }}
                  >
                    Reset Filters
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Users Table styled like DataGrid in TicketListPage */}
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                ...gradientAccent(theme),
                overflow: 'hidden',
                border: '1px solid',
                borderColor: theme.palette.divider,
              }}
            >
              {isLoading ? (
                <Box sx={{ width: '100%', p: 2 }}>
                  <LinearProgress />
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="textSecondary">Loading users data...</Typography>
                  </Box>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>User</TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>Email</TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>Role</TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>Department</TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>Status</TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>Last Login</TableCell>
                          <TableCell align="right" sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.primary.dark, 0.1) 
                              : alpha(theme.palette.primary.light, 0.1)
                          }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow 
                            key={user.id}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                              }
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar src={user.avatar_url} sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                  {user.first_name ? user.first_name.charAt(0) : ''}
                                  {user.last_name ? user.last_name.charAt(0) : ''}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {user.first_name} {user.last_name}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="textSecondary">
                                    {user.designation || 'No Designation set'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                color={getRoleColor(user.role) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{user.department?.name || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={user.is_active ? 'Active' : 'Inactive'}
                                color={user.is_active ? 'success' : 'default'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {user.last_login_at
                                ? new Date(user.last_login_at).toLocaleDateString()
                                : 'Never'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit User">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenModal('edit', user)}
                                  sx={{ 
                                    color: theme.palette.primary.main,
                                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reset Password">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResetPassword(user.id)}
                                  sx={{ 
                                    color: theme.palette.info.main,
                                    '&:hover': { backgroundColor: alpha(theme.palette.info.main, 0.1) }
                                  }}
                                >
                                  <LockIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={user.role === 'admin' ? "Admin accounts cannot be deactivated" : "Delete User"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteClick(user.id)}
                                    disabled={user.role === 'admin'}
                                    sx={{ 
                                      color: user.role === 'admin' ? theme.palette.action.disabled : theme.palette.error.main,
                                      '&:hover': { 
                                        backgroundColor: user.role === 'admin' ? 'transparent' : alpha(theme.palette.error.main, 0.1)
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="h6" color="textSecondary" gutterBottom>
                                  No users found
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  Try adjusting your search or filters
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={totalUsers}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    sx={{
                      borderTop: `1px solid ${theme.palette.divider}`
                    }}
                  />
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* --- Add/Edit User Modal --- */} 
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {modalMode === 'add' ? 'Add New User' : 'Edit User'}
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleFormSubmit}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              {/* Organization field moved to be next to Designation */}
              
              {/* Existing Fields */} 
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="first_name"
                  label="First Name"
                  value={currentUser?.first_name || ''}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="last_name"
                  label="Last Name"
                  value={currentUser?.last_name || ''}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  name="email"
                  label="Email Address"
                  value={currentUser?.email || ''}
                  onChange={handleFormChange}
                  disabled={isSubmitting || modalMode === 'edit'} // Don't allow email change on edit?
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  required
                  fullWidth
                  name="role"
                  label="Role"
                  value={currentUser?.role || 'customer'}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="agent">Agent</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  name="departmentId"
                  label="Department (Optional)"
                  value={currentUser?.departmentId || ''}
                  onChange={handleFormChange}
                  disabled={isSubmitting || departments.length === 0}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="designation"
                  label="Designation (Job Title)"
                  value={currentUser?.designation || ''}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Organization</InputLabel>
                  <Select
                    name="organizationName"
                    value={currentUser?.organizationName || loggedInUser?.organization?.name || 'Default Organization'}
                    label="Organization"
                    disabled={isSubmitting}
                    onChange={handleSelectChange}
                  >
                    <MenuItem value={loggedInUser?.organization?.name || 'Default Organization'}>
                      {loggedInUser?.organization?.name || 'Default Organization'}
                    </MenuItem>
                  </Select>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    Users will be added to your organization.
                  </Typography>
                </FormControl>
              </Grid>
              {modalMode === 'add' && (
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    type="password"
                    name="password"
                    label="Password"
                    value={currentUser?.password || ''}
                    onChange={handleFormChange}
                    disabled={isSubmitting}
                    helperText="Password is required for new users."
                  />
                </Grid>
              )}
              {modalMode === 'edit' && (
                 <Grid item xs={12} container spacing={2} alignItems="center">
                   <Grid item xs={currentUser?.avatar_url ? 6 : 12}>
                     <FormControlLabel
                       control={
                         <Switch
                           checked={currentUser?.is_active ?? true}
                           onChange={handleFormChange}
                           name="is_active"
                           disabled={isSubmitting || (modalMode === 'edit' && String(currentUser?.id) === String(loggedInUser?.id) && currentUser?.role === 'admin')}
                         />
                       }
                       label="User is Active"
                     />
                   </Grid>
                   {/* Add Delete Avatar Button if avatar exists */}
                   {(() => {
                     return currentUser?.avatar_url && (
                       <Grid item xs={6} sx={{ textAlign: 'right' }}>
                         <Button
                           variant="outlined"
                           color="error"
                           size="small"
                           startIcon={<DeleteIcon />}
                           onClick={() => currentUser && openAvatarDeleteConfirm(currentUser)}
                           disabled={isSubmitting}
                         >
                           Delete Avatar
                         </Button>
                       </Grid>
                     );
                   })()}
                 </Grid>
               )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {modalMode === 'add' ? 'Add User' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {/* --- End Add/Edit User Modal --- */} 

      {/* --- Avatar Delete Confirmation Dialog --- */}
      <Dialog open={isAvatarDeleteDialogOpen} onClose={closeAvatarDeleteConfirm}>
        <DialogTitle>Confirm Avatar Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the avatar for {userToDeleteAvatar?.first_name} {userToDeleteAvatar?.last_name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeAvatarDeleteConfirm} variant="outlined" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAvatarDeleteConfirm} variant="contained" color="error" disabled={isSubmitting}>
            Delete Avatar
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- End Avatar Delete Confirmation Dialog --- */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained"
            sx={{
              color: theme.palette.primary.contrastText,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                transform: 'translateY(-3px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 12px 20px rgba(0,0,0,0.4)' 
                  : '0 12px 20px rgba(0,0,0,0.15)',
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UsersPage;