import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Divider, 
  useTheme, 
  alpha,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Skeleton,
  Fade,
  Grow,
  Zoom
} from '@mui/material';
import { 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon, 
  Timeline as TimelineIcon,
  DataUsage as DataUsageIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  DateRange as DateRangeIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import StatsWidget from '../components/dashboard/StatsWidget';
import TicketChart from '../components/dashboard/TicketChart';

import {
  pageContainer,
  pageHeaderSection,
  cardStyleSx,
  statsCardStyleSx,
  welcomeCardStyleSx,
  chartContainerStyle,
  buttonAnimation,
  fadeTransition
} from '../styles/commonStyles';

// Mock data for reports
const reportStats = [
  {
    title: 'Total Reports',
    value: 48,
    icon: <BarChartIcon />,
    color: '#2196f3', // primary blue
    change: { value: 8, isPositive: true },
    progress: 78,
  },
  {
    title: 'Ticket Analytics',
    value: 12,
    icon: <PieChartIcon />,
    color: '#9c27b0', // secondary purple
    change: { value: 4, isPositive: true },
    progress: 65,
  },
  {
    title: 'Performance',
    value: 15,
    icon: <TimelineIcon />,
    color: '#ff9800', // warning orange
    change: { value: 2, isPositive: false },
    progress: 45,
  },
  {
    title: 'Usage Reports',
    value: 21,
    icon: <DataUsageIcon />,
    color: '#4caf50', // success green
    change: { value: 5, isPositive: true },
    progress: 90,
  }
];

// Mock data for ticket resolution time
const ticketResolutionData = [
  { name: 'Jan', value: 12 },
  { name: 'Feb', value: 10 },
  { name: 'Mar', value: 14 },
  { name: 'Apr', value: 8 },
  { name: 'May', value: 7 },
  { name: 'Jun', value: 5 },
  { name: 'Jul', value: 6 },
  { name: 'Aug', value: 9 },
  { name: 'Sep', value: 11 },
  { name: 'Oct', value: 13 },
  { name: 'Nov', value: 15 },
  { name: 'Dec', value: 10 }
];

// Mock data for ticket distribution by category
const ticketDistributionData = [
  { name: 'Technical', value: 35 },
  { name: 'Billing', value: 25 },
  { name: 'Account', value: 20 },
  { name: 'General', value: 15 },
  { name: 'Feature Request', value: 5 }
];

// Mock data for agent performance
const agentPerformanceData = [
  { name: 'John', value: 92 },
  { name: 'Emily', value: 88 },
  { name: 'Michael', value: 76 },
  { name: 'Sarah', value: 95 },
  { name: 'David', value: 82 }
];

// Mock data for report table
const reportTableData = [
  { 
    id: 'REP-1001', 
    name: 'Monthly Support Overview', 
    type: 'Summary', 
    lastGenerated: '2023-09-15',
    status: 'Available'
  },
  { 
    id: 'REP-1002', 
    name: 'Customer Satisfaction Analysis', 
    type: 'Analytics', 
    lastGenerated: '2023-09-12',
    status: 'Available'
  },
  { 
    id: 'REP-1003', 
    name: 'Agent Performance Review', 
    type: 'Performance', 
    lastGenerated: '2023-09-10',
    status: 'Available'
  },
  { 
    id: 'REP-1004', 
    name: 'Resolution Time Metrics', 
    type: 'Analytics', 
    lastGenerated: '2023-09-08',
    status: 'Available'
  },
  { 
    id: 'REP-1005', 
    name: 'Ticket Volume Forecast', 
    type: 'Prediction', 
    lastGenerated: '2023-09-07',
    status: 'Processing'
  },
  { 
    id: 'REP-1006', 
    name: 'Knowledge Base Usage', 
    type: 'Usage', 
    lastGenerated: '2023-09-05',
    status: 'Available'
  },
  { 
    id: 'REP-1007', 
    name: 'Support Channel Distribution', 
    type: 'Analytics', 
    lastGenerated: '2023-09-03',
    status: 'Available'
  }
];

// Card styles matching dashboard
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

// Gradient accent for cards
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

// Enhanced Material-UI components
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

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState(0);
  const [dateRange, setDateRange] = useState('last30days');
  const [reportType, setReportType] = useState('all');
  
  // Simulate data loading on mount
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Handle refresh
  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setReportTab(newValue);
  };
  
  // Handle date range change
  const handleDateRangeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setDateRange(event.target.value as string);
  };
  
  // Handle report type change
  const handleReportTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setReportType(event.target.value as string);
  };
  
  // Handle report generation
  const handleGenerateReport = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Report generated successfully!');
    }, 1500);
  };
  
  // Handle report download
  const handleDownloadReport = (reportId: string) => {
    alert(`Downloading report ${reportId}`);
  };
  
  // Handle report view
  const handleViewReport = (reportId: string) => {
    setSelectedReport(reportId);
  };
  
  // Render status chip
  const renderStatusChip = (status: string) => {
    let color;
    switch (status) {
      case 'Available':
        color = 'success';
        break;
      case 'Processing':
        color = 'warning';
        break;
      case 'Failed':
        color = 'error';
        break;
      default:
        color = 'default';
    }
    
    return <Chip label={status} color={color as any} size="small" />;
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
        <EnhancedGrid container spacing={3}>
          {/* Header Banner */}
          <Grid item xs={12}>
            <EnhancedCard 
              index={0}
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
                    <Typography variant="h5" component="h1" gutterBottom sx={{
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}>
                      Reports & Analytics
                    </Typography>
                    <Typography variant="subtitle1" sx={{
                      fontWeight: 500,
                      color: theme.palette.mode === 'dark' ? alpha('#fff', 0.8) : 'inherit',
                    }}>
                      Generate insights, track performance metrics, and visualize support data
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleGenerateReport}
                      sx={buttonAnimation}
                    >
                      New Report
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshData}
                      sx={buttonAnimation}
                    >
                      Refresh
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </EnhancedCard>
          </Grid>

          {/* Stats Section */}
          <Grid item xs={12}>
            <StatsWidget
              stats={reportStats}
              loading={isLoading}
              columns={4}
              animated={true}
            />
          </Grid>

          {/* Date Range & Filters */}
          <Grid item xs={12}>
            <EnhancedCard 
              index={2}
              elevation={0} 
              sx={{ 
                ...cardStyles, 
                border: '1px solid', 
                borderColor: theme.palette.divider,
                ...gradientAccent(theme)
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="flex-end">
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Date Range</InputLabel>
                      <Select
                        value={dateRange}
                        onChange={handleDateRangeChange as any}
                        label="Date Range"
                        startAdornment={
                          <InputAdornment position="start">
                            <DateRangeIcon fontSize="small" />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="yesterday">Yesterday</MenuItem>
                        <MenuItem value="last7days">Last 7 Days</MenuItem>
                        <MenuItem value="last30days">Last 30 Days</MenuItem>
                        <MenuItem value="thisMonth">This Month</MenuItem>
                        <MenuItem value="lastMonth">Last Month</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Report Type</InputLabel>
                      <Select
                        value={reportType}
                        onChange={handleReportTypeChange as any}
                        label="Report Type"
                        startAdornment={
                          <InputAdornment position="start">
                            <FilterListIcon fontSize="small" />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="all">All Reports</MenuItem>
                        <MenuItem value="summary">Summary</MenuItem>
                        <MenuItem value="analytics">Analytics</MenuItem>
                        <MenuItem value="performance">Performance</MenuItem>
                        <MenuItem value="usage">Usage</MenuItem>
                        <MenuItem value="prediction">Prediction</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outlined" 
                      startIcon={<FilterListIcon />}
                      sx={buttonAnimation}
                    >
                      More Filters
                    </Button>
                    <Button 
                      variant="contained" 
                      startIcon={<BarChartIcon />}
                      color="primary"
                      onClick={handleGenerateReport}
                      sx={buttonAnimation}
                    >
                      Generate
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </EnhancedCard>
          </Grid>

          {/* Visualizations */}
          <Grid item xs={12}>
            <EnhancedCard 
              index={3}
              elevation={0}
              sx={{ 
                ...cardStyles, 
                border: '1px solid', 
                borderColor: theme.palette.divider,
                ...gradientAccent(theme)
              }}
            >
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={reportTab} 
                  onChange={handleTabChange} 
                  aria-label="report tabs"
                  sx={{ 
                    px: 2, 
                    pt: 2,
                    '& .MuiTab-root': {
                      fontWeight: 600,
                      textTransform: 'none',
                      minWidth: 120,
                    }
                  }}
                >
                  <Tab label="Resolution Time" />
                  <Tab label="Ticket Distribution" />
                  <Tab label="Agent Performance" />
                  <Tab label="Satisfaction Ratings" />
                </Tabs>
              </Box>
              <Divider />
              
              <CardContent sx={{ p: 3 }}>
                {isLoading ? (
                  <Box sx={{ p: 1.5 }}>
                    <Skeleton 
                      variant="rectangular" 
                      height={400} 
                      sx={{ 
                        borderRadius: 1,
                        animation: 'pulse 1.5s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 0.6 },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0.6 }
                        }
                      }} 
                    />
                  </Box>
                ) : (
                  <Box>
                    {reportTab === 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Average Resolution Time (Hours)
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download as PNG">
                              <IconButton size="small">
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print">
                              <IconButton size="small">
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Share">
                              <IconButton size="small">
                                <ShareIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <TicketChart
                          type="bar"
                          height={350}
                          data={ticketResolutionData}
                          isLoading={isLoading}
                          xAxisLabel="Month"
                          yAxisLabel="Hours"
                          colors={['#2196f3']}
                        />
                      </Box>
                    )}

                    {reportTab === 1 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Ticket Distribution by Category
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download as PNG">
                              <IconButton size="small">
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print">
                              <IconButton size="small">
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Share">
                              <IconButton size="small">
                                <ShareIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <TicketChart
                          type="pie"
                          height={350}
                          data={ticketDistributionData}
                          isLoading={isLoading}
                          colors={[
                            theme.palette.primary.main,
                            theme.palette.info.main,
                            theme.palette.success.main,
                            theme.palette.warning.main,
                            theme.palette.error.main,
                          ]}
                        />
                      </Box>
                    )}

                    {reportTab === 2 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Agent Performance Score
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download as PNG">
                              <IconButton size="small">
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print">
                              <IconButton size="small">
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Share">
                              <IconButton size="small">
                                <ShareIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <TicketChart
                          type="bar"
                          height={350}
                          data={agentPerformanceData}
                          isLoading={isLoading}
                          xAxisLabel="Agent"
                          yAxisLabel="Score"
                          colors={['#9c27b0']}
                        />
                      </Box>
                    )}

                    {reportTab === 3 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Customer Satisfaction Ratings
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download as PNG">
                              <IconButton size="small">
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print">
                              <IconButton size="small">
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Share">
                              <IconButton size="small">
                                <ShareIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <TicketChart
                          type="line"
                          height={350}
                          data={ticketResolutionData.map(item => ({ ...item, value: 70 + Math.random() * 25 }))}
                          isLoading={isLoading}
                          xAxisLabel="Month"
                          yAxisLabel="Score"
                          colors={['#4caf50']}
                        />
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </EnhancedCard>
          </Grid>

          {/* Recent Reports List */}
          <Grid item xs={12}>
            <EnhancedCard 
              index={4}
              elevation={0}
              sx={{ 
                ...cardStyles, 
                border: '1px solid', 
                borderColor: theme.palette.divider,
                ...gradientAccent(theme)
              }}
            >
              <CardHeader
                title={
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    fontSize: '1.2rem',
                    color: theme.palette.text.primary,
                    letterSpacing: '0.5px',
                    mb: 1
                  }}>
                    Available Reports
                  </Typography>
                }
                subheader={
                  <Typography variant="body2" sx={{ 
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    lineHeight: 1.5
                  }}>
                    View and download your previously generated reports
                  </Typography>
                }
                action={
                  <TextField
                    placeholder="Search reports..."
                    size="small"
                    sx={{ width: 200 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterListIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
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
                {isLoading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={53}
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
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ 
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.5)
                          : alpha(theme.palette.background.paper, 0.8)
                      }}>
                        <TableRow>
                          <TableCell>Report ID</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Last Generated</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportTableData.map((report) => (
                          <TableRow 
                            key={report.id}
                            sx={{ 
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                              },
                              cursor: 'pointer'
                            }}
                          >
                            <TableCell>{report.id}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{report.name}</TableCell>
                            <TableCell>{report.type}</TableCell>
                            <TableCell>{report.lastGenerated}</TableCell>
                            <TableCell>{renderStatusChip(report.status)}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Report">
                                <IconButton 
                                  size="small" 
                                  sx={{ mr: 1 }}
                                  onClick={() => handleViewReport(report.id)}
                                  disabled={report.status !== 'Available'}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download Report">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleDownloadReport(report.id)}
                                  disabled={report.status !== 'Available'}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="outlined" 
                  endIcon={<ArrowForwardIcon />}
                  sx={buttonAnimation}
                >
                  View All Reports
                </Button>
              </Box>
            </EnhancedCard>
          </Grid>
        </EnhancedGrid>
      </Box>
    </Container>
  );
};

export default ReportsPage; 