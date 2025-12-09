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
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
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
  Edit as EditIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import StatsWidget, { StatData } from '../../components/dashboard/StatsWidget';
import TicketChart from '../../components/dashboard/TicketChart';
import UserAvatar from '../../components/common/UserAvatar';
import StatusBadge from '../../components/tickets/StatusBadge';
import PriorityBadge from '../../components/tickets/PriorityBadge';
import SLABadge from '../../components/tickets/SLABadge';
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
import { Ticket, TicketDetail, TicketStatus, TicketPriority, Department, TicketType, User, PaginationState } from '../../context/TicketContext';
import { formatDate, getRelativeTime } from '../../utils/dateUtils';
import { formatInTimeZone } from 'date-fns-tz';
import { logger } from '../../utils/frontendLogger';

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

// Mock tickets data - Fully Updated and Simplified Structure
const mockTickets: Ticket[] = [
  {
    id: 'TIK-MOCK-01',
    subject: 'Mock Ticket 1: Email Issue',
    description: 'This is a mock description for the email issue ticket.',
    status: { id: 's1', name: 'New', color: '#f44336' },
    priority: { id: 'p1', name: 'High', color: '#ff9800' },
    createdAt: '2023-03-10T08:30:00Z',
    updatedAt: '2023-03-10T08:30:00Z',
    lastActivity: '2023-03-10T08:30:00Z',
    requester: { id: 'mock-user-1', firstName: 'Mock', lastName: 'UserA', email: 'mock.usera@example.com' },
    assignee: undefined,
    department: { id: 'd1', name: 'IT Support' },
    type: { id: 't1', name: 'Access Issue' },
    tags: ['email', 'access'],
    dueDate: undefined,
  },
  {
    id: 'TIK-MOCK-02',
    subject: 'Mock Ticket 2: Printer Problem',
    description: 'Mock description for a printer problem ticket.',
    status: { id: 's2', name: 'In Progress', color: '#2196f3' },
    priority: { id: 'p2', name: 'Medium', color: '#4caf50' },
    createdAt: '2023-03-09T14:15:00Z',
    updatedAt: '2023-03-10T09:45:00Z',
    lastActivity: '2023-03-10T09:45:00Z',
    requester: { id: 'mock-user-2', firstName: 'Mock', lastName: 'UserB', email: 'mock.userb@example.com' },
    assignee: { id: 'mock-agent-1', firstName: 'Agent', lastName: 'Smith', email: 'agent.smith@example.com' },
    department: { id: 'd1', name: 'IT Support' },
    type: { id: 't2', name: 'Hardware Issue' },
    tags: ['printer', 'hardware'],
    dueDate: '2023-03-15T17:00:00Z',
  }
];

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

// Enhanced Material-UI components (Put back outside the main component)
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

const TicketListPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tickets: contextTickets,
    pagination: contextPagination,
    isLoading: contextLoading,
    error: contextError,
    fetchTickets,
    statuses,
    priorities
  } = useTickets();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<TicketStats>(mockTicketStats);
  const [recentActivities, setRecentActivities] = useState<TicketActivity[]>(mockActivities);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Filter state for ticket list
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [initialDashboardFetchAttempted, setInitialDashboardFetchAttempted] = useState(false);

  // Local state for the MAIN LIST VIEW pagination
  const [listPaginationModel, setListPaginationModel] = useState({ page: 0, pageSize: 10 });

  // --- State for Customer Dashboard --- 
  const [dashboardTickets, setDashboardTickets] = useState<Ticket[]>([]);
  const [dashboardPagination, setDashboardPagination] = useState<PaginationState>({ page: 1, limit: 5, totalCount: 0, totalPages: 1 });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  // --- End Dashboard State ---

  // Determine user timezone with fallback
  const userTimeZone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // --- Fetch logic for Customer Dashboard ---
  const fetchDashboardData = useCallback(async (page: number, limit: number) => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const result = await fetchTickets(page, limit, {});
      if (result) {
        logger.debug('Dashboard API response:', result);
        setDashboardTickets(result.tickets);

        // Extract pagination data separately to avoid type errors
        const apiPagination = result.pagination;
        const totalCount = (result.pagination as any).total || 0; // Extract total separately

        setDashboardPagination({
          page: apiPagination.page,
          limit: apiPagination.limit,
          totalCount: totalCount, // Use the extracted value
          totalPages: apiPagination.totalPages || 1
        });
      } else {
        console.error('[Dashboard Fetch] API Call returned undefined (error or not authenticated).');
        setDashboardError('Failed to load dashboard tickets.');
      }
    } catch (err) {
      console.error('[Dashboard Fetch] Exception caught:', err);
      setDashboardError('An error occurred while fetching dashboard tickets.');
    } finally {
      setDashboardLoading(false);
    }
  }, [fetchTickets]);

  // Reset fetch attempt flag if user changes
  useEffect(() => {
    setInitialDashboardFetchAttempted(false);
  }, [user]);

  // Initial fetch for dashboard when component mounts or user/role changes
  useEffect(() => {
    if (user && user.role === 'customer' && !initialDashboardFetchAttempted && !dashboardLoading) {
      setInitialDashboardFetchAttempted(true);
      fetchDashboardData(1, 5);
    }
  }, [user, initialDashboardFetchAttempted, dashboardLoading, fetchDashboardData]);

  // --- Fetch logic for Main List View (Example) ---
  useEffect(() => {
    if (user && user.role) {
      // For agents, only fetch tickets assigned to them
      if (user.role.toLowerCase() === 'agent') {
        fetchTickets(listPaginationModel.page + 1, listPaginationModel.pageSize, { assigneeId: user.id })
          .then(result => {
            if (result) {
              // Log response to debug pagination
              logger.debug('List view API response:', result);
            }
          })
          .catch(err => {
            console.error('Error fetching agent tickets:', err);
          });
      } else {
        // For admin and customers, use standard fetching
        fetchTickets(listPaginationModel.page + 1, listPaginationModel.pageSize)
          .then(result => {
            if (result) {
              // Log response to debug pagination
              logger.debug('List view API response:', result);
            }
          })
          .catch(err => {
            console.error('Error fetching tickets:', err);
          });
      }
    }
  }, [user, listPaginationModel, fetchTickets]);
  // --- End List View Fetch Logic ---

  // Get filtered tickets
  const getFilteredTickets = () => {
    // Use the correct source for tickets based on context
    const ticketsData = contextTickets || mockTickets;

    return ticketsData.filter(ticket => {
      // Remove the redundant agent filter - the context already provides filtered tickets for agents
      // if (user?.role?.toLowerCase() === 'agent' && ticket.assignee?.id !== user.id) {
      //   return false;
      // }

      // Apply local filters (status, priority, search)
      if (filterStatus !== 'all' && ticket.status.id !== filterStatus) {
        return false;
      }

      if (filterPriority !== 'all' && ticket.priority.id !== filterPriority) {
        return false;
      }

      if (searchTerm && !ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !ticket.id.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  // Memoized activity columns
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

  // Define ticket columns with access to navigate and timezone
  const ticketColumns: GridColDef[] = React.useMemo(() => [
    {
      field: 'id',
      headerName: 'Ticket ID',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500} sx={{
          color: theme.palette.primary.main,
          '&:hover': { textDecoration: 'underline' }
        }}>
          {params.row.id}
        </Typography>
      ),
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
            {params.row.subject}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.description?.substring(0, 60)}
            {params.row.description?.length > 60 ? '...' : ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'requester',
      headerName: 'Requester',
      width: 180,
      renderCell: (params) => {
        const requesterName = params.row.requester
          ? `${params.row.requester.firstName || ''} ${params.row.requester.lastName || ''}`.trim()
          : 'Anonymous';

        const initials = params.row.requester
          ? `${params.row.requester.firstName?.charAt(0) || ''}${params.row.requester.lastName?.charAt(0) || ''}`
          : 'U';

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: stringToColor(requesterName || 'User')
              }}
            >
              {initials || 'U'}
            </Avatar>
            <Typography variant="body2">
              {requesterName || 'Anonymous'}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'assignee',
      headerName: 'Assigned To',
      width: 180,
      renderCell: (params) => (
        params.row.assignee ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: stringToColor(`${params.row.assignee.firstName || ''} ${params.row.assignee.lastName || ''}`.trim() || 'Agent')
              }}
            >
              {`${params.row.assignee.firstName?.charAt(0) || ''}${params.row.assignee.lastName?.charAt(0) || ''}` || 'A'}
            </Avatar>
            <Typography variant="body2">
              {`${params.row.assignee.firstName || ''} ${params.row.assignee.lastName || ''}`.trim() || 'Unassigned'}
            </Typography>
          </Box>
        ) : (
          <Chip
            label="Unassigned"
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              fontWeight: 500
            }}
          />
        )
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        // Safely handle status by verifying it has the required properties
        if (params.row.status && typeof params.row.status === 'object' &&
          'name' in params.row.status && 'color' in params.row.status) {
          return <StatusBadge status={params.row.status} size="small" />;
        }
        return <Typography variant="body2">Unknown</Typography>;
      },
      valueGetter: (params) => params.row.status?.name || 'Unknown',
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 130,
      renderCell: (params) => {
        // Safely handle priority by verifying it has the required properties
        if (params.row.priority && typeof params.row.priority === 'object' &&
          'name' in params.row.priority && 'color' in params.row.priority) {
          return <PriorityBadge priority={params.row.priority} size="small" />;
        }
        return <Typography variant="body2">Unknown</Typography>;
      },
      valueGetter: (params) => params.row.priority?.name || 'Unknown',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {formatDate(params.row.createdAt, userTimeZone)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getRelativeTime(params.row.createdAt, userTimeZone)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'sla',
      headerName: 'SLA',
      width: 120,
      renderCell: (params) => {
        // Safely handle the ticket ID for SLABadge
        const ticketId = params.row.id;

        // Pass the ID directly to SLABadge - the component will handle parsing
        if (ticketId) {
          return <SLABadge ticketId={ticketId} />;
        }

        return <Chip label="N/A" size="small" color="default" />;
      },
      disableClickEventBubbling: true
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      renderCell: (params) => (
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="View Ticket">
            <IconButton
              size="small"
              onClick={(e) => {
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
        </Box>
      ),
    },
  ], [navigate, theme, userTimeZone]);

  // Define simplified dashboard ticket columns for the "My Open Tickets" card
  const dashboardTicketColumns: GridColDef[] = React.useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 110,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500} sx={{
          color: theme.palette.primary.main,
          '&:hover': { textDecoration: 'underline' }
        }}>
          {params.row.id}
        </Typography>
      ),
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
            {params.row.subject}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.description?.substring(0, 60)}
            {params.row.description?.length > 60 ? '...' : ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        // Safely handle status by verifying it has the required properties
        if (params.row.status && typeof params.row.status === 'object' &&
          'id' in params.row.status && 'name' in params.row.status && 'color' in params.row.status) {
          return <StatusBadge status={params.row.status} size="small" />;
        }
        return <Typography variant="body2">Unknown</Typography>;
      },
      valueGetter: (params) => {
        return params.row.status?.name || 'Unknown';
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      renderCell: (params) => {
        // Safely handle priority by verifying it has the required properties
        if (params.row.priority && typeof params.row.priority === 'object' &&
          'id' in params.row.priority && 'name' in params.row.priority && 'color' in params.row.priority) {
          return <PriorityBadge priority={params.row.priority} size="small" />;
        }
        return <Typography variant="body2">Unknown</Typography>;
      },
      valueGetter: (params) => {
        return params.row.priority?.name || 'Unknown';
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {formatDate(params.row.createdAt, userTimeZone)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getRelativeTime(params.row.createdAt, userTimeZone)}
          </Typography>
        </Box>
      ),
      valueGetter: (params) => params.row.createdAt || '',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={(e) => {
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
  ], [navigate, theme, userTimeZone]);

  // Helper function to create color from string (for avatars)
  const stringToColor = (string: string) => {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
  };

  // Fetch data on component mount
  useEffect(() => {
    setIsStatsLoading(true);
    setIsActivitiesLoading(true);

    setTimeout(() => {
      setIsStatsLoading(false);
      setStats(mockTicketStats);
    }, 1000);

    setTimeout(() => {
      setIsActivitiesLoading(false);
      setRecentActivities(mockActivities);
    }, 1500);
  }, [timeRange]);

  // Create the stats data for the overview cards
  const getStatCards = () => {
    return [
      {
        title: 'Total Tickets',
        value: stats.total,
        icon: <AssignmentIcon />,
        color: theme.palette.primary.main,
        change: { value: 12, isPositive: true },
        progress: 85,
      },
      {
        title: 'Open Tickets',
        value: stats.open + stats.inProgress,
        icon: <AccessTimeIcon />,
        color: theme.palette.info.main,
        change: { value: 8, isPositive: false },
        progress: Math.round(((stats.open + stats.inProgress) / stats.total) * 100),
      },
      {
        title: 'Resolved Today',
        value: stats.resolved,
        icon: <CheckIcon />,
        color: theme.palette.success.main,
        change: { value: 23, isPositive: true },
        progress: Math.round((stats.resolved / stats.total) * 100),
      },
      {
        title: 'Needs Attention',
        value: stats.highPriorityCount,
        icon: <PriorityHighIcon />,
        color: theme.palette.error.main,
        change: { value: 12, isPositive: false },
        progress: Math.round((stats.highPriorityCount / stats.total) * 100),
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
    setIsStatsLoading(true);
    setIsActivitiesLoading(true);

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

  // Customer dashboard view - Use LOCAL STATE
  const renderCustomerDashboard = () => {
    const handleDashboardPaginationChange = (model: { page: number; pageSize: number }) => {
      fetchDashboardData(model.page + 1, model.pageSize);
    };

    return (
      <EnhancedGrid
        container
        spacing={1}
      >
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
                    My Tickets
                  </Typography>
                  <Typography variant="subtitle1">
                    View and manage all tickets in one place. Monitor status, edit tickets, and track issue resolution.
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

        <Grid item xs={12}>
          <StatsWidget
            stats={getStatCards()}
            loading={isStatsLoading}
            columns={4}
            animated={true}
          />
        </Grid>

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
                  My Tickets
                </Typography>
              }
              subheader={
                <Typography variant="body2" sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  lineHeight: 1.3
                }}>
                  View all your support tickets
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
                    rowCount={dashboardPagination.totalCount}
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
  };

  // Render dashboard based on user role
  const renderRoleDashboard = () => {
    if (!user || !user.role) {
      return renderCustomerDashboard();
    }

    switch (user.role.toLowerCase()) {
      case 'admin':
        return renderAdminDashboard ? renderAdminDashboard() : null;
      case 'agent':
        return renderAgentDashboard ? renderAgentDashboard() : null;
      default:
        return renderCustomerDashboard();
    }
  };

  // Agent dashboard view
  const renderAgentDashboard = () => {
    const filteredTickets = getFilteredTickets();

    return (
      <Grid container spacing={1}>
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
                    My Assigned Tickets
                  </Typography>
                  <Typography variant="subtitle1">
                    View and manage tickets assigned to you. Filter and search to find specific issues.
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

        <Grid item xs={12}>
          <StatsWidget
            stats={[
              {
                title: 'Assigned Tickets',
                value: stats.total - stats.unassigned,
                icon: <AssignmentIcon />,
                color: theme.palette.primary.main,
                change: { value: 8, isPositive: true },
                progress: Math.round(((stats.total - stats.unassigned) / stats.total) * 100),
              },
              {
                title: 'Open',
                value: stats.open,
                icon: <AccessTimeIcon />,
                color: theme.palette.info.main,
                change: { value: 5, isPositive: false },
                progress: Math.round((stats.open / stats.total) * 100),
              },
              {
                title: 'Resolved',
                value: stats.resolved,
                icon: <CheckIcon />,
                color: theme.palette.success.main,
                change: { value: 15, isPositive: true },
                progress: 75,
              },
              {
                title: 'High Priority',
                value: stats.highPriorityCount,
                icon: <PriorityHighIcon />,
                color: theme.palette.error.main,
                change: { value: 12, isPositive: false },
                progress: Math.round((stats.highPriorityCount / stats.total) * 100),
              },
            ]}
            loading={isStatsLoading}
            columns={4}
            animated={true}
          />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 1, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Search Tickets"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    {statuses.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    {priorities.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setSearchTerm('');
                  }}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

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
            <DataGrid
              rows={filteredTickets}
              columns={ticketColumns}
              autoHeight={true}
              rowCount={(contextPagination as any)?.total || contextPagination?.totalCount || filteredTickets.length}
              pageSizeOptions={[5, 10, 25]}
              paginationModel={listPaginationModel}
              paginationMode="server"
              onPaginationModelChange={setListPaginationModel}
              loading={contextLoading}
              disableRowSelectionOnClick
              onRowClick={(params) => navigate(`/tickets/${params.row.id}`)}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.dark, 0.1)
                    : alpha(theme.palette.primary.light, 0.1),
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
            {filteredTickets.length === 0 && !contextLoading && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <SearchOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="h6" color="textSecondary">No tickets found</Typography>
                <Typography variant="body2" color="textSecondary">Try adjusting your search or filters.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Admin dashboard view
  const renderAdminDashboard = () => {
    const cardStyles = {
      height: '100%',
      border: '1px solid',
      borderColor: theme.palette.divider,
      borderRadius: 2
    };

    const filteredTickets = getFilteredTickets();

    return (
      <Grid container spacing={1}>
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
                    Admin Ticket View
                  </Typography>
                  <Typography variant="subtitle1">
                    Oversee all support tickets, manage assignments, and analyze system performance.
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
                title: 'Open Tickets',
                value: stats.open + stats.inProgress,
                icon: <AccessTimeIcon />,
                color: theme.palette.info.main,
                change: { value: 8, isPositive: false },
                progress: Math.round(((stats.open + stats.inProgress) / stats.total) * 100),
              },
              {
                title: 'Resolved Today',
                value: stats.resolved,
                icon: <CheckIcon />,
                color: theme.palette.success.main,
                change: { value: 23, isPositive: true },
                progress: Math.round((stats.resolved / stats.total) * 100),
              },
              {
                title: 'Needs Attention',
                value: stats.highPriorityCount,
                icon: <PriorityHighIcon />,
                color: theme.palette.error.main,
                change: { value: 12, isPositive: false },
                progress: Math.round((stats.highPriorityCount / stats.total) * 100),
              },
            ]}
            loading={isStatsLoading}
            columns={4}
            animated={true}
          />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Search Tickets"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setSearchTerm('');
                  }}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
            }}
          >
            <DataGrid
              rows={filteredTickets}
              columns={ticketColumns}
              autoHeight={true}
              rowCount={(contextPagination as any)?.total || contextPagination?.totalCount || filteredTickets.length}
              pageSizeOptions={[5, 10, 25]}
              paginationModel={listPaginationModel}
              paginationMode="server"
              onPaginationModelChange={setListPaginationModel}
              loading={contextLoading}
              disableRowSelectionOnClick
              onRowClick={(params) => navigate(`/tickets/${params.row.id}`)}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.dark, 0.1)
                    : alpha(theme.palette.primary.light, 0.1),
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
          </Paper>
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

export default TicketListPage; 