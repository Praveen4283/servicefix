import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  IconButton,
  Avatar,
  Fade,
  alpha,
  Zoom,
  Grow,
  Tooltip as MuiTooltip,
  LinearProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionIcon from '@mui/icons-material/Description';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PieChartIcon from '@mui/icons-material/PieChart';
import { format, subDays } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import { ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon } from '@mui/icons-material';

import { 
  pageContainer,
  pageHeaderSection,
  cardStyleSx,
  tableContainerStyle,
  tableRowHoverStyle,
  buttonAnimation,
  statsCardStyleSx,
  statsIconStyle,
  getStatsIconStyle,
  fadeTransition
} from '../styles/commonStyles';

// Import StatsWidget
import StatsWidget from '../components/dashboard/StatsWidget';

// Enhanced Material-UI components
const EnhancedCard = (props: any) => {
  return (
    <Zoom 
      in={true} 
      style={{ transitionDelay: props.index ? `${props.index * 100}ms` : '0ms' }}
      mountOnEnter
      unmountOnExit={false}
      timeout={500}
    >
      <Card {...props} />
    </Zoom>
  );
};

const EnhancedGrid = (props: any) => {
  return (
    <Grow 
      in={true} 
      style={{ transformOrigin: '0 0 0' }}
      timeout={800}
      mountOnEnter
      unmountOnExit={false}
    >
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
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1,
    overflow: 'hidden'
  }
});

// Mock data for the dashboard
const mockTicketSummary = {
  totalTickets: 1256,
  openTickets: 342,
  resolvedTickets: 824,
  closedTickets: 90,
  averageResolutionTime: '2 days, 4 hours',
  responseTimeTarget: '92%',
  ticketDistribution: {
    byPriority: {
      low: 356,
      medium: 589,
      high: 245,
      urgent: 66
    },
    byStatus: {
      new: 122,
      open: 220,
      pending: 124,
      resolved: 700,
      closed: 90
    },
    byCategory: {
      'Technical Issue': 532,
      'Billing Question': 245,
      'Feature Request': 167,
      'Account Access': 142,
      'Product Information': 98,
      'General Inquiry': 72
    }
  }
};

const mockTicketTrends = Array(30).fill(0).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  
  return {
    date: format(date, 'yyyy-MM-dd'),
    totalTickets: Math.floor(Math.random() * 50) + 20,
    resolvedTickets: Math.floor(Math.random() * 30) + 10,
    newTickets: Math.floor(Math.random() * 30) + 15
  };
});

const mockAgentPerformance = [
  {
    agentId: 'agent-1',
    agentName: 'Jane Smith',
    ticketsAssigned: 145,
    ticketsResolved: 132,
    averageResolutionTime: '1 day, 14 hours',
    firstResponseTime: '45 minutes',
    customerSatisfaction: 4.8,
    responseAccuracy: '96%'
  },
  {
    agentId: 'agent-2',
    agentName: 'Michael Johnson',
    ticketsAssigned: 123,
    ticketsResolved: 110,
    averageResolutionTime: '2 days, 2 hours',
    firstResponseTime: '30 minutes',
    customerSatisfaction: 4.5,
    responseAccuracy: '92%'
  },
  {
    agentId: 'agent-3',
    agentName: 'Sarah Wilson',
    ticketsAssigned: 156,
    ticketsResolved: 145,
    averageResolutionTime: '1 day, 8 hours',
    firstResponseTime: '22 minutes',
    customerSatisfaction: 4.9,
    responseAccuracy: '98%'
  }
];

const mockSatisfactionData = {
  overallSatisfaction: 4.6,
  responsesReceived: 876,
  satisfactionDistribution: {
    5: 534,
    4: 198,
    3: 84,
    2: 35,
    1: 25
  },
  trendData: Array(12).fill(0).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    
    return {
      month: format(date, 'yyyy-MM'),
      satisfaction: (4 + (Math.random() * 0.8 - 0.4)).toFixed(1)
    };
  }),
  topFeedbackThemes: [
    { theme: 'Quick resolution', count: 243, sentiment: 'positive' },
    { theme: 'Helpful agents', count: 198, sentiment: 'positive' },
    { theme: 'Clear communication', count: 176, sentiment: 'positive' },
    { theme: 'Slow response', count: 67, sentiment: 'negative' },
    { theme: 'Technical knowledge', count: 54, sentiment: 'mixed' }
  ]
};

// Transform data for charts
const priorityChartData = Object.entries(mockTicketSummary.ticketDistribution.byPriority).map(
  ([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  })
);

const statusChartData = Object.entries(mockTicketSummary.ticketDistribution.byStatus).map(
  ([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  })
);

const categoryChartData = Object.entries(mockTicketSummary.ticketDistribution.byCategory).map(
  ([key, value]) => ({
    name: key,
    value
  })
);

const satisfactionChartData = Object.entries(mockSatisfactionData.satisfactionDistribution).map(
  ([key, value]) => ({
    name: `${key} Stars`,
    value
  })
);

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Feedback Theme Chip component to separate the scope
const FeedbackThemeChip: React.FC<{ feedbackTheme: any }> = ({ feedbackTheme }) => {
  const theme = useTheme();
  
  // Determine color based on sentiment
  const getChipColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return {
          bgcolor: alpha(theme.palette.success.main, 0.1),
          borderColor: alpha(theme.palette.success.main, 0.3),
          color: theme.palette.success.main
        };
      case 'negative':
        return {
          bgcolor: alpha(theme.palette.error.main, 0.1),
          borderColor: alpha(theme.palette.error.main, 0.3),
          color: theme.palette.error.main
        };
      default:
        return {
          bgcolor: alpha(theme.palette.info.main, 0.1),
          borderColor: alpha(theme.palette.info.main, 0.3),
          color: theme.palette.info.main
        };
    }
  };
  
  const chipColors = getChipColor(feedbackTheme.sentiment);
  
  return (
    <Chip
      label={`${feedbackTheme.theme} (${feedbackTheme.count})`}
      sx={{
        fontSize: '0.85rem',
        py: 2,
        borderRadius: 2,
        border: '1px solid',
        bgcolor: chipColors.bgcolor,
        borderColor: chipColors.borderColor,
        color: chipColors.color
      }}
    />
  );
};

// Create a dedicated stats array similar to ReportsPage
const dashboardStats = [
  {
    title: 'Total Tickets',
    value: mockTicketSummary.totalTickets,
    icon: <DescriptionIcon />,
    color: '#2196f3', // primary blue
    change: { value: 128, isPositive: true },
    progress: 78,
  },
  {
    title: 'Open Tickets',
    value: mockTicketSummary.openTickets,
    icon: <AccessTimeIcon />,
    color: '#ff9800', // warning orange
    change: { value: 15, isPositive: false },
    progress: 45,
  },
  {
    title: 'Resolved Tickets',
    value: mockTicketSummary.resolvedTickets,
    icon: <CheckCircleIcon />,
    color: '#4caf50', // success green
    change: { value: 95, isPositive: true },
    progress: 90,
  },
  {
    title: 'Urgent Tickets',
    value: mockTicketSummary.ticketDistribution.byPriority.urgent,
    icon: <PriorityHighIcon />,
    color: '#f44336', // error red
    change: { value: 3, isPositive: true },
    progress: 65,
  },
];

const AnalyticsDashboardPage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [timeRange, setTimeRange] = useState('30days');

  // Function to handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    
    let startDate;
    const endDate = new Date();
    
    switch (range) {
      case '7days':
        startDate = subDays(new Date(), 7);
        break;
      case '30days':
        startDate = subDays(new Date(), 30);
        break;
      case '90days':
        startDate = subDays(new Date(), 90);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = subDays(new Date(), 30);
    }
    
    setDateRange({ startDate, endDate });
  };

  // Function to refresh data
  const refreshData = () => {
    setLoading(true);
    
    // In a real app, this would fetch fresh data from the backend
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Function to export data (mock implementation)
  const exportData = () => {
    alert('Exporting dashboard data to CSV...');
  };

  // Use the same rendering approach as TicketListPage
  const renderDashboardContent = () => (
    <EnhancedGrid container spacing={3}>
      {/* Header */}
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
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              transform: 'translateY(-5px)',
            },
          }}
        >
          <Box sx={{ p: { xs: 3, md: 2 }, position: 'relative', zIndex: 1 }}>
            <Grid container alignItems="center" justifyContent="space-between" spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h5" component="h1" gutterBottom>
                  Analytics Dashboard
                </Typography>
                <Typography variant="subtitle1">
                  Monitor your support operations with comprehensive analytics. Track ticket trends, team performance, and customer satisfaction.
                </Typography>
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={refreshData}
                >
                  Refresh
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportData}
                >
                  Export Data
                </Button>
                
                <Box sx={{ display: 'flex', mt: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                  <ButtonGroup variant="outlined" aria-label="time range button group">
                    <Button 
                      onClick={() => handleTimeRangeChange('7days')}
                      variant={timeRange === '7days' ? 'contained' : 'outlined'}
                    >
                      7 Days
                    </Button>
                    <Button 
                      onClick={() => handleTimeRangeChange('30days')}
                      variant={timeRange === '30days' ? 'contained' : 'outlined'}
                    >
                      30 Days
                    </Button>
                    <Button 
                      onClick={() => handleTimeRangeChange('90days')}
                      variant={timeRange === '90days' ? 'contained' : 'outlined'}
                    >
                      90 Days
                    </Button>
                    <Button 
                      onClick={() => handleTimeRangeChange('year')}
                      variant={timeRange === 'year' ? 'contained' : 'outlined'}
                    >
                      1 Year
                    </Button>
                  </ButtonGroup>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Card>
      </Grid>
      
      {/* Ticket Summary Cards - Now using StatsWidget */}
      <Grid item xs={12}>
        <StatsWidget 
          stats={dashboardStats} 
          loading={loading} 
          columns={4} 
          animated={true} 
        />
      </Grid>
      
      {/* Ticket Trends Chart */}
      <Grid item xs={12}>
        <Fade 
          in={!loading} 
          timeout={fadeTransition}
          mountOnEnter
          unmountOnExit={false}
        >
          <Box component="div">
            <EnhancedCard 
              elevation={0}
              index={5}
              sx={{
                ...cardStyles,
                ...gradientAccent(theme),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden'
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
                    Ticket Trends
                  </Typography>
                }
              />
              <Divider sx={{ mb: 3 }} />
              
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockTicketTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newTickets" stroke="#8884d8" name="New Tickets" />
                    <Line type="monotone" dataKey="resolvedTickets" stroke="#82ca9d" name="Resolved Tickets" />
                    <Line type="monotone" dataKey="totalTickets" stroke="#ff7300" name="Total Tickets" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </EnhancedCard>
          </Box>
        </Fade>
      </Grid>
      
      {/* Ticket Distribution Charts */}
      <Grid item xs={12}>
        <Fade 
          in={!loading} 
          timeout={fadeTransition}
          mountOnEnter
          unmountOnExit={false}
        >
          <Box component="div">
            <Grid container spacing={3} mb={3} mt={1}>
              <EnhancedGrid item xs={12} md={4} index={6}>
                <EnhancedCard 
                  elevation={0}
                  sx={{
                    ...cardStyles,
                    ...gradientAccent(theme),
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
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
                        Tickets by Priority
                      </Typography>
                    }
                  />
                  <Divider sx={{ mb: 3 }} />
                  
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={priorityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {priorityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </EnhancedCard>
              </EnhancedGrid>
              
              <EnhancedGrid item xs={12} md={4} index={7}>
                <EnhancedCard 
                  elevation={0}
                  sx={{
                    ...cardStyles,
                    ...gradientAccent(theme),
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
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
                        Tickets by Status
                      </Typography>
                    }
                  />
                  <Divider sx={{ mb: 3 }} />
                  
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </EnhancedCard>
              </EnhancedGrid>
              
              <EnhancedGrid item xs={12} md={4} index={8}>
                <EnhancedCard 
                  elevation={0}
                  sx={{
                    ...cardStyles,
                    ...gradientAccent(theme),
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
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
                        Tickets by Category
                      </Typography>
                    }
                  />
                  <Divider sx={{ mb: 3 }} />
                  
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={categoryChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8">
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </EnhancedCard>
              </EnhancedGrid>
            </Grid>
          </Box>
        </Fade>
      </Grid>
      
      {/* Agent Performance Table */}
      <Grid item xs={12}>
        <Fade 
          in={!loading} 
          timeout={fadeTransition}
          mountOnEnter
          unmountOnExit={false}
        >
          <Box component="div">
            <EnhancedCard 
              elevation={0}
              index={9}
              sx={{
                ...cardStyles,
                ...gradientAccent(theme),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden'
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
                    Agent Performance
                  </Typography>
                }
              />
              <Divider sx={{ mb: 3 }} />
              
              <CardContent>
                <TableContainer sx={tableContainerStyle}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Agent</TableCell>
                        <TableCell align="right">Assigned</TableCell>
                        <TableCell align="right">Resolved</TableCell>
                        <TableCell align="right">Resolution Time</TableCell>
                        <TableCell align="right">First Response</TableCell>
                        <TableCell align="right">Satisfaction</TableCell>
                        <TableCell align="right">Accuracy</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockAgentPerformance.map((agent) => (
                        <TableRow key={agent.agentId} hover sx={tableRowHoverStyle}>
                          <TableCell component="th" scope="row">
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ marginRight: 1 }}>
                                {agent.agentName.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              {agent.agentName}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{agent.ticketsAssigned}</TableCell>
                          <TableCell align="right">{agent.ticketsResolved}</TableCell>
                          <TableCell align="right">{agent.averageResolutionTime}</TableCell>
                          <TableCell align="right">{agent.firstResponseTime}</TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                              <Rating value={agent.customerSatisfaction} precision={0.1} readOnly />
                              <Typography variant="body2" ml={1}>
                                {agent.customerSatisfaction.toFixed(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{agent.responseAccuracy}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </EnhancedCard>
          </Box>
        </Fade>
      </Grid>
      
      {/* Customer Satisfaction */}
      <Grid item xs={12}>
        <Fade 
          in={!loading} 
          timeout={fadeTransition}
          mountOnEnter
          unmountOnExit={false}
        >
          <Box component="div">
            <Grid container spacing={3} mt={1}>
              <EnhancedGrid item xs={12} md={6} index={10}>
                <EnhancedCard 
                  elevation={0}
                  sx={{
                    ...cardStyles,
                    ...gradientAccent(theme),
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
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
                        Customer Satisfaction
                      </Typography>
                    }
                  />
                  <Divider sx={{ mb: 3 }} />
                  
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="center" mb={3} gap={3}>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          sx={{ ...statsIconStyle, width: 100, height: 100, color: 'success.main' }}
                        >
                          <Typography variant="h3">{mockSatisfactionData.overallSatisfaction.toFixed(1)}</Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          Overall Satisfaction
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Based on {mockSatisfactionData.responsesReceived} responses
                        </Typography>
                        
                        <Rating value={mockSatisfactionData.overallSatisfaction} precision={0.1} readOnly size="large" />
                      </Box>
                    </Box>
                    
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={satisfactionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8">
                          {satisfactionChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </EnhancedCard>
              </EnhancedGrid>
              
              <EnhancedGrid item xs={12} md={6} index={11}>
                <EnhancedCard 
                  elevation={0}
                  sx={{
                    ...cardStyles,
                    ...gradientAccent(theme),
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
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
                        Satisfaction Trends
                      </Typography>
                    }
                  />
                  <Divider sx={{ mb: 3 }} />
                  
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={mockSatisfactionData.trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="satisfaction" stroke="#8884d8" name="Satisfaction Score" />
                      </LineChart>
                    </ResponsiveContainer>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Top Feedback Themes
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {mockSatisfactionData.topFeedbackThemes.map((feedbackTheme) => (
                        <Grid item key={feedbackTheme.theme}>
                          <FeedbackThemeChip feedbackTheme={feedbackTheme} />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </EnhancedCard>
              </EnhancedGrid>
            </Grid>
          </Box>
        </Fade>
      </Grid>
    </EnhancedGrid>
  );

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
        {renderDashboardContent()}
      </Box>
    </Container>
  );
};

// Add missing Rating component for agent satisfaction
const Rating: React.FC<{
  value: number;
  precision?: number;
  readOnly?: boolean;
  size?: 'small' | 'medium' | 'large';
}> = ({ value, readOnly = false, size = 'medium' }) => {
  const stars: React.ReactNode[] = [];
  
  // Convert value to number of filled stars (out of 5)
  for (let i = 1; i <= 5; i++) {
    const filled = i <= value;
    
    stars.push(
      <Box 
        key={i}
        component="span" 
        sx={{ 
          color: filled ? 'warning.main' : 'action.disabled',
          fontSize: size === 'small' ? 16 : size === 'large' ? 24 : 20
        }}
      >
        {filled ? '★' : '☆'}
      </Box>
    );
  }
  
  return <Box>{stars}</Box>;
};

export default AnalyticsDashboardPage; 