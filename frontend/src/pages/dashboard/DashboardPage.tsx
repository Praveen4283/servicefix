import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip,
  LinearProgress,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Badge,
  Alert,
  Skeleton,
  Fade,
  alpha,
  Rating,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Grow,
  Zoom,
} from '@mui/material';
import { DataGrid, GridColDef, GridValueGetterParams, GridRenderCellParams } from '@mui/x-data-grid';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import {
  Assignment as AssignmentIcon,
  Check as CheckIcon,
  AccessTime as AccessTimeIcon,
  Notifications as NotificationsIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  PriorityHigh as PriorityHighIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
  InsertChart as InsertChartIcon,
  FormatListBulleted as FormatListBulletedIcon,
  SupervisorAccount as SupervisorAccountIcon,
  PersonOutline as PersonOutlineIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import StatsWidget, { StatData } from '../../components/dashboard/StatsWidget';
import TicketChart from '../../components/dashboard/TicketChart';
import UserAvatar from '../../components/common/UserAvatar';
import StatusBadge from '../../components/tickets/StatusBadge';
import PriorityBadge from '../../components/tickets/PriorityBadge';
import {
  pageContainer,
  pageHeaderSection,
  cardStyleSx,
  statsCardStyleSx,
  cardStyle,
  fadeTransition,
  welcomeCardStyleSx,
  chartContainerStyle,
  buttonAnimation
} from '../../styles/commonStyles';
import { Ticket, PaginationState } from '../../context/TicketContext';
import apiClient from '../../services/apiClient';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// We'll use these colors for our charts
const chartColors = [
  '#2196f3', // blue
  '#ff9800', // orange
  '#9c27b0', // purple
  '#4caf50', // green
  '#f44336', // red
  '#9e9e9e', // grey
];

// Interface for ticket stats
interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  unassigned: number;
  overdueCount: number;
  highPriorityCount: number;
  avgResolutionTime: number; // in hours
  ticketsByDepartment: { name: string; value: number }[];
  ticketsByType: { name: string; value: number }[];
  ticketsTrend: { name: string; value: number }[];
}

// Interface for a ticket activity
interface TicketActivity {
  id: string;
  ticketId: string;
  ticketSubject: string;
  type: 'created' | 'updated' | 'comment' | 'status' | 'assigned' | 'resolved';
  message: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  timestamp: string;
}

// Mock ticket stats
const mockTicketStats: TicketStats = {
  total: 248,
  open: 42,
  inProgress: 37,
  pending: 18,
  resolved: 56,
  closed: 95,
  unassigned: 15,
  overdueCount: 12,
  highPriorityCount: 27,
  avgResolutionTime: 18.5, // in hours
  
  ticketsByDepartment: [
    { name: 'IT Support', value: 115 },
    { name: 'Customer Service', value: 67 },
    { name: 'Sales', value: 32 },
    { name: 'Marketing', value: 24 },
    { name: 'Human Resources', value: 10 },
  ],
  
  ticketsByType: [
    { name: 'Hardware', value: 68 },
    { name: 'Software', value: 92 },
    { name: 'Network', value: 57 },
    { name: 'Security', value: 16 },
    { name: 'Other', value: 15 },
  ],
  
  ticketsTrend: [
    { name: '2023-03-05', value: 8 },
    { name: '2023-03-06', value: 12 },
    { name: '2023-03-07', value: 10 },
    { name: '2023-03-08', value: 15 },
    { name: '2023-03-09', value: 9 },
    { name: '2023-03-10', value: 6 },
    { name: '2023-03-11', value: 4 },
  ],
};

// Mock ticket activities
const generateMockActivities = (count: number): TicketActivity[] => {
  const activities: TicketActivity[] = [];
  const activityTypes: TicketActivity['type'][] = ['created', 'updated', 'comment', 'status', 'assigned', 'resolved'];
  const users = [
    { id: '1', firstName: 'John', lastName: 'Smith', avatar: undefined },
    { id: '2', firstName: 'Sarah', lastName: 'Johnson', avatar: undefined },
    { id: '3', firstName: 'Michael', lastName: 'Davis', avatar: undefined },
    { id: '4', firstName: 'Emily', lastName: 'Wilson', avatar: undefined },
    { id: '5', firstName: 'David', lastName: 'Garcia', avatar: undefined },
  ];
  
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const ticketNumber = 1000 + Math.floor(Math.random() * 100);
    const ticketId = `TIK-${ticketNumber}`;
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    
    let message = '';
    switch (type) {
      case 'created':
        message = 'created a new ticket';
        break;
      case 'updated':
        message = 'updated the ticket details';
        break;
      case 'comment':
        message = 'added a comment';
        break;
      case 'status':
        message = `changed the status to ${['New', 'In Progress', 'Pending', 'Resolved', 'Closed'][Math.floor(Math.random() * 5)]}`;
        break;
      case 'assigned':
        message = `assigned the ticket to ${users[Math.floor(Math.random() * users.length)].firstName}`;
        break;
      case 'resolved':
        message = 'marked the ticket as resolved';
        break;
    }
    
    const timestamp = new Date(now);
    timestamp.setMinutes(now.getMinutes() - i * 30 - Math.floor(Math.random() * 30));
    
    activities.push({
      id: `activity-${i}`,
      ticketId,
      ticketSubject: `Sample Ticket ${ticketNumber} - ${['Hardware', 'Software', 'Network', 'Security'][Math.floor(Math.random() * 4)]} Issue`,
      type,
      message,
      user,
      timestamp: timestamp.toISOString(),
    });
  }
  
  return activities;
};

const mockActivities = generateMockActivities(20);

// Simple component to display stats card
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={0} sx={{ height: '100%' }}>
    <CardContent>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Grid>
        <Grid item xs>
          <Typography variant="h5" component="div">
            {value}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

// Component to display distribution chart using simple bars
interface DistributionChartProps {
  data: { name: string; count: number }[];
  title: string;
  total: number;
}

const DistributionChart: React.FC<DistributionChartProps> = ({ data, title, total }) => (
  <Card elevation={0} sx={{ height: '100%' }}>
    <CardHeader title={title} />
    <CardContent>
      {data.map((item, index) => {
        const percentage = Math.round((item.count / total) * 100);
        return (
          <Box key={item.name} sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">{item.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.count} ({percentage}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: `${chartColors[index % chartColors.length]}22`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: chartColors[index % chartColors.length],
                  borderRadius: 5,
                },
                mt: 0.5,
              }}
            />
          </Box>
        );
      })}
    </CardContent>
  </Card>
);

// Utility function to format date using user's timezone
const formatDate = (dateString: string | undefined | null, userTimeZone: string): string => {
  if (!dateString) {
    return 'N/A';
  }
  try {
  const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date value');
    }
    const formattedDate = formatInTimeZone(date, userTimeZone, 'MMM dd, yyyy p'); 
    return formattedDate;
  } catch (error) {
    console.error(`Error formatting date string "${dateString}" in timezone "${userTimeZone}":`, error);
    return 'Invalid Date';
  }
};

// Utility function to get relative time (fallback uses formatDate)
const getRelativeTime = (dateString: string | undefined | null, userTimeZone: string): string => {
  if (!dateString) {
    return '-';
  }
  try {
  const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date value');
    }
    const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMin = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    let returnValue = '-';

    if (diffInMin < 1) {
      returnValue = 'Just now';
    } else if (diffInMin < 60) {
      returnValue = `${diffInMin} min ago`;
  } else if (diffInHours < 24) {
      returnValue = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
      returnValue = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
      returnValue = formatDate(dateString, userTimeZone); 
    }

    return returnValue;
    
  } catch (error) {
    console.error(`Error calculating relative time for "${dateString}":`, error);
    return '-';
  }
};

// Activity icon mapping
const getActivityIcon = (type: TicketActivity['type']) => {
  switch (type) {
    case 'created':
      return <AssignmentIcon />;
    case 'updated':
      return <TimelineIcon />;
    case 'comment':
      return <NotificationsIcon />;
    case 'status':
      return <BarChartIcon />;
    case 'assigned':
      return <PeopleIcon />;
    case 'resolved':
      return <CheckIcon />;
    default:
      return <AccessTimeIcon />;
  }
};

// Helper to format numbers for display
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Remove the global activityColumns definition from here

// Remove framer-motion imports and define enhanced Material-UI components
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

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets, isLoading: ticketsLoading, fetchTickets, refreshCounter, statuses, priorities } = useTickets();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<TicketStats>(mockTicketStats);
  const [recentActivities, setRecentActivities] = useState<TicketActivity[]>(mockActivities);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dashboardTickets, setDashboardTickets] = useState<Ticket[]>([]);
  const [dashboardPagination, setDashboardPagination] = useState<PaginationState>({ page: 1, limit: 5, totalCount: 0, totalPages: 1 });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [customerStats, setCustomerStats] = useState<{
    total: number;
    open: number;
    pending: number;
    resolved: number;
  }>({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0
  });
  
  // Determine user timezone with fallback
  const userTimeZone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  // Memoize the activity columns
  const memoizedActivityColumns = React.useMemo(() => [
    {
      field: 'user',
      headerName: 'User',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UserAvatar 
            user={{
              id: params.row.user?.id || 'unknown',
              firstName: params.row.user?.firstName || '',
              lastName: params.row.user?.lastName || '',
              avatarUrl: params.row.user?.avatarUrl
            }}
            size="small"
          />
          <Typography variant="body2">{params.row.user?.name || 'Unknown User'}</Typography>
        </Box>
      ),
    },
    {
      field: 'message',
      headerName: 'Activity',
      flex: 1,
      minWidth: 300,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getActivityIcon(params.row.type)}
          <Typography variant="body2">{params.row.message}</Typography>
          <Chip 
            label={params.row.ticketId}
            size="small"
            sx={{ 
              height: 20, 
              fontSize: '0.75rem',
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />
        </Box>
      ),
    },
    {
      field: 'ticketSubject',
      headerName: 'Ticket',
      width: 250,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {params.row.ticketSubject}
        </Typography>
      ),
    },
    {
      field: 'timestamp',
      headerName: 'Time',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {getRelativeTime(params.row.timestamp, userTimeZone)}
        </Typography>
      ),
    },
  ], [userTimeZone]);
  
  // Define ticket columns for the dashboard view
  const dashboardTicketColumns: GridColDef[] = React.useMemo(() => [
    {
      field: 'id',
      headerName: 'Ticket ID',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ color: theme.palette.primary.main, '&:hover': { textDecoration: 'underline' } }}>
          {params.row.id}
        </Typography>
      ),
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {params.row.subject}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        // Don't render until statuses are loaded
        if (!statuses || statuses.length === 0) {
          return <Skeleton variant="text" width={80} height={24} animation="wave" />;
        }
        
        // Ensure the status object has all required properties
        const status = params.row.status || {};
        if (!status.color && statuses.length > 0) {
          // Try to find matching status from statuses array if color is missing
          const matchedStatus = statuses.find(s => 
            s.id === status.id || s.name === status.name || 
            (typeof status === 'string' && (s.id === status || s.name === status))
          );
          if (matchedStatus) {
            return <StatusBadge status={matchedStatus} size="small" />;
          }
        }
        return <StatusBadge status={status} size="small" />;
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        // Don't render until priorities are loaded
        if (!priorities || priorities.length === 0) {
          return <Skeleton variant="text" width={80} height={24} animation="wave" />;
        }
        
        // Ensure the priority object has all required properties
        const priority = params.row.priority || {};
        if (!priority.color && priorities.length > 0) {
          // Try to find matching priority from priorities array if color is missing
          const matchedPriority = priorities.find(p => 
            p.id === priority.id || p.name === priority.name || 
            (typeof priority === 'string' && (p.id === priority || p.name === priority))
          );
          if (matchedPriority) {
            return <PriorityBadge priority={matchedPriority} size="small" />;
          }
        }
        return <PriorityBadge priority={priority} size="small" />;
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2">
            {formatDate(params.row.createdAt, userTimeZone)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getRelativeTime(params.row.createdAt, userTimeZone)}
          </Typography>
        </Box>
      ),
      valueGetter: (params: GridRenderCellParams) => params.row.createdAt || '',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title="View Ticket">
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              navigate(`/tickets/${params.row.id}`);
            }}
            sx={{ 
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [navigate, theme, statuses, priorities, userTimeZone]);
  
  // Fetch data on component mount
  useEffect(() => {
    // In a real app, you would fetch data from an API
    // For now, we'll simulate loading
    setIsStatsLoading(true);
    setIsActivitiesLoading(true);
    
    // Simulate API calls
    setTimeout(() => {
      setIsStatsLoading(false);
      setStats(mockTicketStats);
    }, 1000);
    
    setTimeout(() => {
      setIsActivitiesLoading(false);
      setRecentActivities(mockActivities);
    }, 1500);
  }, [timeRange]);
  
  // Calculate customer stats from tickets data - replace with memoized version
  // First, add a new useCallback function
  const calculateCustomerStats = useCallback(() => {
    if (tickets && tickets.length > 0) {
      const total = tickets.length;
      
      // Open stats: count tickets with status new, open, in progress, or pending
      const open = tickets.filter((ticket: Ticket) => 
        typeof ticket.status === 'object' && 
        ticket.status !== null && 
        'name' in ticket.status && 
        !(['resolved', 'closed'].includes(ticket.status.name?.toLowerCase() || ''))
      ).length;
      
      // Pending stats: count tickets with status in progress or pending
      const pending = tickets.filter((ticket: Ticket) => 
        typeof ticket.status === 'object' && 
        ticket.status !== null && 
        'name' in ticket.status && 
        ['in progress', 'pending'].includes(ticket.status.name.toLowerCase())
      ).length;
      
      // Resolved stats: count tickets with status resolved or closed
      const resolved = tickets.filter((ticket: Ticket) => 
        typeof ticket.status === 'object' && 
        ticket.status !== null && 
        'name' in ticket.status && 
        ['resolved', 'closed'].includes(ticket.status.name.toLowerCase())
      ).length;
      
      // Debug logging
      // console.log('Total tickets:', total); // Removed
      // console.log('Open count:', open); // Removed
      // console.log('Pending count:', pending); // Removed
      // console.log('Resolved count:', resolved); // Removed
      // console.log('Ticket statuses:', tickets.map(t =>  // Removed this block start
      //   typeof t.status === 'object' && t.status !== null && 'name' in t.status 
      //     ? t.status.name 
      //     : 'unknown'
      // )); // Removed this block end
      
      setCustomerStats({
        total,
        open,
        pending,
        resolved
      });
    }
  }, [tickets]);

  // Then replace the existing useEffect
  useEffect(() => {
    calculateCustomerStats();
  }, [calculateCustomerStats]);

  // Create the stats data for the overview cards
  const getStatCards = () => {
    return [
      {
        title: 'Total Tickets',
        value: stats.total,
        icon: <AssignmentIcon />,
        color: theme.palette.primary.main,
        change: { value: 12, isPositive: true },
      },
      {
        title: 'High Priority',
        value: stats.highPriorityCount,
        icon: <PriorityHighIcon />,
        color: theme.palette.error.main,
        change: { value: 5, isPositive: false },
      },
      {
        title: 'Resolved Today',
        value: stats.resolved,
        icon: <CheckIcon />,
        color: theme.palette.success.main,
        change: { value: 23, isPositive: true },
      },
      {
        title: 'Needs Attention',
        value: stats.highPriorityCount,
        icon: <PriorityHighIcon />,
        color: theme.palette.warning.main,
        change: { value: 5, isPositive: false },
      },
    ];
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    if (selectedSection === section) {
      setSelectedSection(null);
    } else {
      setSelectedSection(section);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (_event: React.SyntheticEvent, newValue: 'day' | 'week' | 'month') => {
    setTimeRange(newValue);
  };

  // Navigate to ticket creation
  const handleCreateTicket = () => {
    navigate('/tickets/create');
  };

  // Refresh data
  const handleRefreshData = async () => {
    // Increment refresh flag to trigger the useEffect without causing infinite loops
    setRefreshFlag(prev => prev + 1);
    
    // Keep the existing code
    setIsStatsLoading(true);
    setIsActivitiesLoading(true);
    
    // Simulate API calls
    setTimeout(() => {
      setIsStatsLoading(false);
    }, 1000);
    
    setTimeout(() => {
      setIsActivitiesLoading(false);
    }, 1500);
  };

  // Navigate to a specific ticket
  const handleViewTicket = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  // Fetch logic for Customer Dashboard
  const fetchDashboardData = useCallback(async (page: number, limit: number) => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      // Add log here to see what fetchTickets returns *for the dashboard*
      // console.log(`[Dashboard Fetch] Calling fetchTickets with page: ${page}, limit: ${limit}, filters: { isOpen: true }`); // Removed
      const result = await fetchTickets(page, limit, { isOpen: true });
      // Add log here to inspect the result
      // console.log(`[Dashboard Fetch] Result from fetchTickets:`, result); // Removed
      
      if (result) {
        // Normalize ticket data to ensure status and priority objects are complete
        const normalizedTickets = result.tickets.map((ticket: any) => {
          // For status: ensure it's a complete object with color
          let statusObject = ticket.status;
          if (typeof statusObject === 'string') {
            statusObject = statuses.find(s => s.name === statusObject || s.id === statusObject) || 
              { id: statusObject, name: statusObject, color: '#808080' };
          } else if (!statusObject?.color && statuses.length > 0) {
            // Try to get color from statuses array
            const matchedStatus = statuses.find(s => s.id === statusObject?.id || s.name === statusObject?.name);
            if (matchedStatus) {
              statusObject = { ...statusObject, color: matchedStatus.color };
            }
          }
          
          // For priority: ensure it's a complete object with color
          let priorityObject = ticket.priority;
          if (typeof priorityObject === 'string') {
            priorityObject = priorities.find(p => p.name === priorityObject || p.id === priorityObject) || 
              { id: priorityObject, name: priorityObject, color: '#808080' };
          } else if (!priorityObject?.color && priorities.length > 0) {
            // Try to get color from priorities array
            const matchedPriority = priorities.find(p => p.id === priorityObject?.id || p.name === priorityObject?.name);
            if (matchedPriority) {
              priorityObject = { ...priorityObject, color: matchedPriority.color };
            }
          }
          
          return {
            ...ticket,
            status: statusObject || { id: 'unknown', name: 'Unknown', color: '#808080' },
            priority: priorityObject || { id: 'unknown', name: 'Unknown', color: '#808080' }
          };
        });
        
        setDashboardTickets(normalizedTickets);
        setDashboardPagination(result.pagination);
      } else {
        // console.log(`[Dashboard Fetch] fetchTickets returned undefined. Setting empty tickets.`); // Removed
        setDashboardTickets([]); // Ensure state is cleared if fetch fails
        setDashboardError('Failed to load dashboard tickets.');
      }
    } catch (err) {
      console.error(`[Dashboard Fetch] Error during fetch:`, err);
      setDashboardError('An error occurred while fetching dashboard tickets.');
      setDashboardTickets([]); // Ensure state is cleared on error
    } finally {
      setDashboardLoading(false);
    }
  }, [fetchTickets, refreshCounter, statuses, priorities]);

  // Add missing pagination handler
  const handleDashboardPaginationChange = (model: { page: number; pageSize: number }) => {
    fetchDashboardData(model.page + 1, model.pageSize);
  };

  // Fetch ALL tickets for stats
  const fetchAllTicketsForStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      // console.log('[Stats Fetch] Fetching all tickets for stats (no isOpen filter)'); // Removed
      
      // Use a direct API call with apiClient instead of fetchTickets to ensure independence
      const response = await apiClient.get('/tickets', { page: 1, limit: 100 });
      
      if (response && response.tickets) {
        // console.log(`[Stats Fetch] Fetched ${response.tickets.length} tickets for stats`); // Removed
        
        // This is where we need to properly normalize the tickets before analysis
        const normalizedTickets = response.tickets.map((ticket: any) => {
          // Find the matching status from the statuses array
          let statusObject;
          if (typeof ticket.status === 'string') {
            statusObject = statuses.find(s => s.name === ticket.status || s.id === ticket.status);
          } else if (typeof ticket.status === 'object' && ticket.status !== null) {
            statusObject = ticket.status; // It's already an object
          }
          
          // Find the matching priority from the priorities array
          let priorityObject;
          if (typeof ticket.priority === 'string') {
            priorityObject = priorities.find(p => p.name === ticket.priority || p.id === ticket.priority);
          } else if (typeof ticket.priority === 'object' && ticket.priority !== null) {
            priorityObject = ticket.priority; // It's already an object
          }
          
          return {
            ...ticket,
            status: statusObject || { 
              id: (typeof ticket.status === 'string' ? ticket.status : (ticket.status as any)?.id) || 'unknown', 
              name: (typeof ticket.status === 'string' ? ticket.status : (ticket.status as any)?.name) || 'Unknown', 
              color: '#808080' 
            },
            priority: priorityObject || { 
              id: (typeof ticket.priority === 'string' ? ticket.priority : (ticket.priority as any)?.id) || 'unknown', 
              name: (typeof ticket.priority === 'string' ? ticket.priority : (ticket.priority as any)?.name) || 'Unknown', 
              color: '#808080' 
            }
          };
        });
        
        // Calculate customer stats from normalized tickets
        const total = normalizedTickets.length;
        
        // Open stats: count tickets with status new, open, in progress, or pending
        const open = normalizedTickets.filter((ticket: Ticket) => 
          typeof ticket.status === 'object' && 
          ticket.status !== null && 
          'name' in ticket.status && 
          !(['resolved', 'closed'].includes(ticket.status.name?.toLowerCase() || ''))
        ).length;
        
        // Pending stats: count tickets with status in progress or pending
        const pending = normalizedTickets.filter((ticket: Ticket) => 
          typeof ticket.status === 'object' && 
          ticket.status !== null && 
          'name' in ticket.status && 
          ['in progress', 'pending'].includes(ticket.status.name.toLowerCase())
        ).length;
        
        // Resolved stats: count tickets with status resolved or closed
        const resolved = normalizedTickets.filter((ticket: Ticket) => 
          typeof ticket.status === 'object' && 
          ticket.status !== null && 
          'name' in ticket.status && 
          ['resolved', 'closed'].includes(ticket.status.name.toLowerCase())
        ).length;
        
        // Debug logging
        // console.log('[Stats Fetch] Calculated stats:', { total, open, pending, resolved }); // Removed
        // console.log('[Stats Fetch] Status values:', normalizedTickets.map(t =>  // Removed this block start
        //   typeof t.status === 'object' && t.status !== null && 'name' in t.status 
        //     ? t.status.name.toLowerCase() 
        //     : 'unknown'
        // )); // Removed this block end
        
        setCustomerStats({
          total,
          open,
          pending,
          resolved
        });
      }
    } catch (err) {
      console.error('[Stats Fetch] Error fetching tickets for stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [statuses, priorities]);

  // Initial fetch for dashboard
  useEffect(() => {
    if (user?.role === 'customer') { 
      // Fetch open tickets for the dashboard table
      fetchDashboardData(1, 5);
      
      // Add a slight delay before fetching stats to ensure we get fresh data
      const timer = setTimeout(() => {
        // Fetch all tickets for stats card
        fetchAllTicketsForStats();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, refreshFlag, refreshCounter]);

  // Add a separate useEffect to update dashboard tickets when statuses or priorities load
  useEffect(() => {
    // Only proceed if we have both dashboard tickets and statuses/priorities
    if (dashboardTickets.length > 0 && statuses.length > 0 && priorities.length > 0) {
      // console.log('[Dashboard] Statuses or priorities changed, updating ticket badge data'); // Removed
      
      // Re-process tickets to ensure they have the latest status/priority info
      const updatedTickets = dashboardTickets.map(ticket => {
        let updatedTicket = {...ticket};
        
        // Update status with data from statuses array
        if (typeof ticket.status === 'object' && ticket.status !== null) {
          const matchedStatus = statuses.find(s => 
            s.id === ticket.status.id || s.name === ticket.status.name
          );
          if (matchedStatus) {
            updatedTicket.status = matchedStatus;
          }
        } else if (typeof ticket.status === 'string') {
          const statusString = ticket.status as string;
          const matchedStatus = statuses.find(s => 
            String(s.id) === statusString || s.name.toLowerCase() === statusString.toLowerCase()
          );
          if (matchedStatus) {
            updatedTicket.status = matchedStatus;
          }
        }
        
        // Update priority with data from priorities array
        if (typeof ticket.priority === 'object' && ticket.priority !== null) {
          const matchedPriority = priorities.find(p => 
            p.id === ticket.priority.id || p.name === ticket.priority.name
          );
          if (matchedPriority) {
            updatedTicket.priority = matchedPriority;
          }
        } else if (typeof ticket.priority === 'string') {
          const priorityString = ticket.priority as string;
          const matchedPriority = priorities.find(p => 
            String(p.id) === priorityString || p.name.toLowerCase() === priorityString.toLowerCase()
          );
          if (matchedPriority) {
            updatedTicket.priority = matchedPriority;
          }
        }
        
        return updatedTicket;
      });
      
      // Only update state if something actually changed
      if (JSON.stringify(updatedTickets) !== JSON.stringify(dashboardTickets)) {
        setDashboardTickets(updatedTickets);
      }
    }
  }, [statuses, priorities, dashboardTickets]);

  // Render dashboard based on user role
  const renderRoleDashboard = () => {
    // Default to user/customer dashboard
    if (!user || !user.role) {
      return renderCustomerDashboard();
    }

    switch (user.role.toLowerCase()) {
      case 'admin':
        return renderAdminDashboard();
      case 'agent':
        return renderAgentDashboard();
      default:
        return renderCustomerDashboard();
    }
  };

  // Customer dashboard view - updated with Material-UI transitions instead of framer-motion
  const renderCustomerDashboard = () => (
    <EnhancedGrid 
      container 
      spacing={1}
    >
      {/* Stats Overview - Keep existing welcome box */}
      <Grid item xs={12}>
        <EnhancedCard 
          index={0}
          elevation={0}
          sx={{
            p: 0,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: theme.palette.divider,
            borderRadius: 3,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              transform: 'translateY(-5px)',
            },
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.7)}, ${alpha(theme.palette.secondary.dark, 0.5)})`
              : `linear-gradient(120deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.secondary.light, 0.15)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url("/images/dashboard-bg.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: theme.palette.mode === 'dark' ? 0.2 : 0.1,
              zIndex: 0,
            }
          }}
        >
          <Box sx={{ p: { xs: 3, md: 2 }, position: 'relative', zIndex: 1 }}>
            <Grid container alignItems="center" justifyContent="space-between" spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h5" component="h1" gutterBottom>
                Welcome, {user?.firstName || 'User'}
                </Typography>
                <Typography variant="subtitle1">
                Track your support requests and get real-time updates on ticket status.
                </Typography>
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTicket}
                >
                  New Ticket
                </Button>
              </Grid>
            </Grid>
          </Box>
        </EnhancedCard>
      </Grid>

      {/* Stats Cards - Updated to use actual ticket data */}
      <Grid item xs={12}>
        <StatsWidget
          stats={[
            {
              title: 'Created Tickets',
              value: customerStats.total,
              icon: <AssignmentIcon />,
              color: theme.palette.primary.main,
              change: { value: 8, isPositive: true },
              progress: 78,
            },
            {
              title: 'Open',
              value: customerStats.open,
              icon: <AccessTimeIcon />,
              color: theme.palette.info.main,
              change: { value: 5, isPositive: false },
              progress: 65,
            },
            {
              title: 'Resolved',
              value: customerStats.resolved,
              icon: <CheckIcon />,
              color: theme.palette.success.main,
              change: { value: 15, isPositive: true },
              progress: 82,
            },
            {
              title: 'Pending Tickets',
              value: customerStats.pending,
              icon: <PriorityHighIcon />,
              color: theme.palette.warning.main,
              change: { value: 3, isPositive: false },
              progress: customerStats.open + customerStats.pending > 0 
                ? (customerStats.pending / (customerStats.open + customerStats.pending)) * 100 
                : 0,
            },
          ]}
          loading={isStatsLoading || ticketsLoading}
          columns={4}
        />
      </Grid>

      {/* Open Tickets - Updated with modern styling */}
      <Grid item xs={12}>
        <Paper 
          elevation={0}
          sx={{
            p: 2, 
            borderRadius: 2,
            ...gradientAccent(theme),
            overflow: 'hidden',
            border: '1px solid',
            borderColor: theme.palette.divider,
            minHeight: '100%'
          }}
        >
          <CardHeader 
            title={
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                fontSize: '1.2rem',
                color: theme.palette.text.primary,
                letterSpacing: '0.5px',
                mb: 0.5
              }}>
                My Open Tickets
              </Typography>
            }
            subheader={
              <Typography variant="body2" sx={{ 
                color: theme.palette.text.secondary,
                fontWeight: 500,
                fontSize: '0.9rem',
                lineHeight: 1.3
              }}>
                Track your active support requests
              </Typography>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  onClick={handleRefreshData} 
                  disabled={isStatsLoading}
                  size="small"
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'rotate(180deg)',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  onClick={() => navigate('/tickets')}
                  size="small"
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                  <ViewListIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{ 
              px: 3, pt: 2, pb: 1, 
              borderBottom: `1px solid ${theme.palette.divider}`,
              borderTopLeftRadius: theme.shape.borderRadius * 2,
              borderTopRightRadius: theme.shape.borderRadius * 2,
              background: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.background.default, 0.6)
                : alpha(theme.palette.background.default, 0.8),
            }}
          />
          <CardContent sx={{ p: 0 }}>
            {dashboardLoading ? (
              <Box sx={{ p: 1.5 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={35}
                    sx={{ 
                      mb: 0.75,
                      borderRadius: 1,
                      animation: 'pulse 1.5s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 0.6 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.6 }
                      }
                    }}
                  />
                ))}
              </Box>
            ) : dashboardError ? (
              <Alert severity="error" sx={{ m: 2 }}>{dashboardError}</Alert>
            ) : (
              <Box sx={{ width: '100%' }}>
                <DataGrid
                  rows={dashboardTickets} 
                  columns={dashboardTicketColumns} 
                  rowCount={dashboardPagination.totalCount || 0}
                  loading={dashboardLoading} 
                  pageSizeOptions={[5, 10]}
                  paginationModel={{ 
                    page: dashboardPagination.page - 1,  
                    pageSize: dashboardPagination.limit 
                  }}
                  paginationMode="server" 
                  onPaginationModelChange={handleDashboardPaginationChange}
                  disableRowSelectionOnClick
                  onRowClick={(params) => navigate(`/tickets/${params.row.id}`)}
                  autoHeight={true}
                  rowHeight={45}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.dark, 0.1) 
                        : alpha(theme.palette.primary.light, 0.1),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      height: '40px !important',
                      minHeight: '40px !important',
                    },
                    '& .MuiDataGrid-cell': {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      py: 1,
                       '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      },
                    },
                  }}
                />
              </Box>
            )}
          </CardContent>
          {dashboardPagination.totalCount > dashboardPagination.limit && (
            <Box sx={{ p: 0.5, textAlign: 'center' }}>
              <Button 
                onClick={() => navigate('/tickets')} 
                endIcon={<ArrowForwardIcon />}
                size="small"
                sx={{ 
                  borderRadius: 8,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateX(4px)',
                  }
                }}
              >
                View All Tickets
              </Button>
            </Box>
          )}
        </Paper>
      </Grid>
    </EnhancedGrid>
  );

  // Agent dashboard view
  const renderAgentDashboard = () => (
    <Grid container spacing={1}>
      {/* Welcome Banner */}
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
                  Agent Dashboard
                </Typography>
                <Typography variant="subtitle1">
                  Manage support tickets, track performance metrics, and respond to customer inquiries efficiently.
                </Typography>
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTicket}
                >
                  New Ticket
                </Button>
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

      {/* Stats Cards - Keep existing stats widget */}
      <Grid item xs={12}>
        <StatsWidget
          stats={[
            {
              title: 'Assigned Tickets',
              value: stats.total - stats.unassigned,
              icon: <AssignmentIcon />,
              color: theme.palette.primary.main,
              change: { value: 8, isPositive: true },
              progress: 78,
            },
            {
              title: 'Open',
              value: stats.open,
              icon: <AccessTimeIcon />,
              color: theme.palette.info.main,
              change: { value: 5, isPositive: false },
              progress: 65,
            },
            {
              title: 'Resolved',
              value: stats.resolved,
              icon: <CheckIcon />,
              color: theme.palette.success.main,
              change: { value: 15, isPositive: true },
              progress: 82,
            },
            {
              title: 'High Priority',
              value: stats.highPriorityCount,
              icon: <PriorityHighIcon />,
              color: theme.palette.error.main,
              change: { value: 12, isPositive: false },
              progress: 22,
            },
          ]}
          loading={isStatsLoading}
          columns={4}
        />
      </Grid>

      {/* Recent Activity - Updated with modern styling */}
      <Grid item xs={12}>
        <Card elevation={0} sx={{
          ...cardStyles,
          minHeight: '100%',
          ...gradientAccent(theme)
        }}>
          <CardHeader 
            title={
              <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              fontSize: '1.2rem',
              color: theme.palette.text.primary,
              letterSpacing: '0.5px',
              mb: 1
            }}>
              Recent Activity
            </Typography>
          } 
          subheader={
            <Typography variant="body2" sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 500,
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              Latest updates and actions on tickets
            </Typography>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  onClick={handleRefreshData} 
                  disabled={isActivitiesLoading}
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'rotate(180deg)',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                <RefreshIcon />
              </IconButton>
            </Box>
          }
          sx={{ 
            px: 3, 
            pt: 3, 
            pb: 2,
            background: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.4)
              : alpha(theme.palette.background.paper, 0.7),
          }}
        />
          <Divider />
          <CardContent sx={{ p: 0 }}>
            {isActivitiesLoading ? (
              <Box sx={{ p: 1.5 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    height={40}
                    sx={{ 
                      mb: 1, 
                      borderRadius: 1,
                      animation: 'pulse 1.5s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 0.6 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.6 }
                      }
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ width: '100%' }}>
                <DataGrid
                  rows={recentActivities}
                  columns={memoizedActivityColumns}
                  paginationModel={{ page: 0, pageSize: 5 }}
                  pageSizeOptions={[5]}
                  disableRowSelectionOnClick
                  onRowClick={(params) => handleViewTicket(params.row.ticketId)}
                  autoHeight
                  rowHeight={45}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      py: 0.5,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        transform: 'translateX(4px)',
                      },
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.8),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      height: '40px !important',
                      minHeight: '40px !important',
                    },
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Admin dashboard view
  const renderAdminDashboard = () => {
    return (
    <Grid container spacing={1}>
      {/* Welcome Banner */}
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
          Admin Dashboard
                      </Typography>
                  <Typography variant="subtitle1">
                  Monitor system performance, manage users, and analyze support operations with comprehensive analytics and tools.
                </Typography>
              </Grid>
                <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTicket}
                >
                  New Ticket
                </Button>
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

      {/* System Overview Stats */}
        <Grid item xs={12}>
        <StatsWidget
          stats={[
            {
              title: 'Total Tickets',
              value: stats.total,
              icon: <AssignmentIcon />,
              color: theme.palette.primary.main,
              change: { value: 12, isPositive: true },
              progress: 78,
            },
            {
              title: 'Average Response Time',
              value: `${stats.avgResolutionTime}h`,
              icon: <AccessTimeIcon />,
              color: theme.palette.info.main,
              change: { value: 8, isPositive: true },
              progress: 65,
            },
            {
              title: 'Resolution Rate',
              value: `${formatNumber((stats.resolved / stats.total) * 100)}%`,
              icon: <CheckIcon />,
              color: theme.palette.success.main,
              change: { value: 5, isPositive: true },
              progress: 82,
            },
            {
              title: 'Overdue Tickets',
              value: stats.overdueCount,
              icon: <PriorityHighIcon />,
              color: theme.palette.error.main,
              change: { value: 15, isPositive: false },
              progress: 22,
            },
          ]}
          loading={isStatsLoading}
          columns={4}
                />
              </Grid>

      {/* Charts Row */}
      <Grid item xs={12} lg={8}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: theme.palette.divider, borderRadius: 2 }}>
          <CardHeader 
              title="Ticket Trends"
              subheader="Track ticket volume and resolution over time"
            action={
              <Tabs
                value={timeRange}
                onChange={handleTimeRangeChange}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab value="day" label="Day" />
                <Tab value="week" label="Week" />
                <Tab value="month" label="Month" />
              </Tabs>
            }
          />
          <Divider />
            <CardContent>
            <TicketChart
              type="area"
              data={stats.ticketsTrend}
              height={350}
              isLoading={isStatsLoading}
              xAxisLabel="Date"
              yAxisLabel="Count"
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Ticket Analysis */}
      <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: theme.palette.divider, borderRadius: 2 }}>
          <CardHeader
              title="Ticket Analysis"
              subheader="Breakdown by category and priority"
          />
          <Divider />
            <CardContent>
              <TicketChart
                type="bar"
                data={stats.ticketsByType}
                height={350}
                isLoading={isStatsLoading}
                xAxisLabel="Category"
                yAxisLabel="Tickets"
              />
            </CardContent>
          </Card>
      </Grid>

      {/* Agent Performance and Department Distribution Row */}
        <Grid item xs={12}>
      <Grid container spacing={1}>
        {/* Agent Performance */}
        <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: theme.palette.divider, borderRadius: 2 }}>
            <CardHeader
                  title="Agent Performance"
                  subheader="Comparison of resolution times by agent"
            />
            <Divider />
                <CardContent>
              {isStatsLoading ? (
                <Box sx={{ p: 3 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      height={80}
                      sx={{ mb: 3, borderRadius: 1 }}
                    />
                  ))}
                </Box>
              ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Agent</TableCell>
                            <TableCell>Tickets</TableCell>
                            <TableCell>Avg. Resolution</TableCell>
                            <TableCell>Satisfaction</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                  {[
                    { name: "Sarah Johnson", tickets: 48, resolution: 3.2, satisfaction: 4.8 },
                    { name: "Michael Davis", tickets: 37, resolution: 4.5, satisfaction: 4.2 },
                    { name: "Emily Wilson", tickets: 52, resolution: 2.8, satisfaction: 4.9 },
                    { name: "David Garcia", tickets: 41, resolution: 3.7, satisfaction: 4.5 },
                  ].map((agent, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UserAvatar 
                              user={{
                                id: index.toString(),
                                firstName: agent.name.split(' ')[0],
                                lastName: agent.name.split(' ')[1]
                              }}
                            size="small" 
                                  />
                                  <Typography variant="body2">{agent.name}</Typography>
                        </Box>
                              </TableCell>
                              <TableCell>{agent.tickets}</TableCell>
                              <TableCell>{agent.resolution}h</TableCell>
                              <TableCell>
                                <Rating value={agent.satisfaction} precision={0.1} size="small" readOnly />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Department Distribution */}
        <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: theme.palette.divider, borderRadius: 2 }}>
            <CardHeader
                  title="Department Distribution"
                  subheader="Distribution of tickets by department"
            />
            <Divider />
                <CardContent>
                  <TicketChart
                    title=""
                    description="Distribution of tickets by department"
                    type="pie"
                    data={stats.ticketsByDepartment}
                    height={350}
                    isLoading={isStatsLoading}
                    colors={[
                      theme.palette.primary.main,
                      theme.palette.info.main,
                      theme.palette.success.main,
                      theme.palette.warning.main,
                      theme.palette.error.main,
                    ]}
                  />
            </CardContent>
          </Card>
            </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
  };

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
        {renderRoleDashboard()}
      </Box>
    </Container>
  );
};

export default DashboardPage;
