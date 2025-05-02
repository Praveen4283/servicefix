import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Divider,
  Paper,
  Grid,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel,
  useTheme,
  Menu,
  Stack,
  Link as MuiLink,
  Avatar,
} from '@mui/material';
import {
  Send as SendIcon,
  Attachment as AttachmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as AssignIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Info as InfoIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { useTickets, User } from '../../context/TicketContext';
import StatusBadge from '../../components/tickets/StatusBadge';
import PriorityBadge from '../../components/tickets/PriorityBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TicketTimeline, { TimelineEvent } from '../../components/tickets/TicketTimeline';
import { useTheme as useMuiTheme, alpha } from '@mui/material/styles';
import { SystemAlert, useNotification } from '../../context/NotificationContext';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '../../context/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ticket-tabpanel-${index}`}
      aria-labelledby={`ticket-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `ticket-tab-${index}`,
    'aria-controls': `ticket-tabpanel-${index}`,
  };
}

// Add a new component for error handling
const ErrorDisplay: React.FC<{
  title: string;
  message: string;
  retryFn?: () => void;
  backFn: () => void;
}> = ({ title, message, retryFn, backFn }) => (
  <Container maxWidth="lg">
    <Box mt={4} textAlign="center">
      <Paper elevation={0} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {title}
        </Typography>
        <Typography paragraph color="text.secondary">
          {message}
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {retryFn && (
            <Button
              variant="contained"
              color="primary"
              onClick={retryFn}
            >
              Retry
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={backFn}
          >
            Back to Tickets
          </Button>
        </Box>
      </Paper>
    </Box>
  </Container>
);

// Add card styles matching dashboard/reports
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
  border: '1px solid',
  borderColor: (theme: any) => theme.palette.divider,
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

// Field label component to standardize label styles
const FieldLabel: React.FC<{ label: string }> = ({ label }) => (
  <Typography 
    variant="subtitle2" 
    color="text.secondary" 
    fontWeight="medium" 
    gutterBottom 
    sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}
  >
    {label}
  </Typography>
);

const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const muiTheme = useMuiTheme();
  const { user } = useAuth();
  
  // Get ticket data from context
  const { 
    currentTicket, 
    isLoading, 
    error, 
    fetchTicketById, 
    updateTicket, 
    addComment,
    statuses,
    priorities,
    deleteTicket,
    getAgentsList
  } = useTickets();
  
  const { addNotification } = useNotification();
  
  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [priorityMenuAnchor, setPriorityMenuAnchor] = useState<null | HTMLElement>(null);
  const [assignMenuAnchor, setAssignMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [priorityUpdateLoading, setPriorityUpdateLoading] = useState(false);
  const [assignUpdateLoading, setAssignUpdateLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  
  // Determine user timezone with fallback
  const userTimeZone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Role-based permission checks
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const isCustomer = user?.role === 'customer';
  const isAgentOrAdmin = isAdmin || isAgent;
  
  // Fetch ticket data when component mounts or ID changes
  useEffect(() => {
    if (id) {
      fetchTicketById(id);
    }
  }, [id, fetchTicketById]);

  // Fetch agents list for assignment dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      if (!isAgentOrAdmin) {
        return; // Early return if not agent or admin
      }
      
      setLoadingAgents(true);
      try {
        console.log('Fetching agents list...');
        const agentsList = await getAgentsList();
        console.log('Fetched agents:', agentsList?.length || 0);
        
        // Log each agent's ID to diagnose the issue
        agentsList.forEach(agent => {
          console.log(`Agent: ${agent.firstName} ${agent.lastName}, ID type: ${typeof agent.id}, ID value: ${agent.id}`);
        });
        
        // Force agent IDs to be numbers - this is crucial for the backend
        const processedAgents = agentsList.map(agent => ({
          ...agent,
          id: typeof agent.id === 'string' ? Number(agent.id.replace(/\D/g, '')) || 1001 : agent.id
        }));
        
        console.log('Processed Agents:');
        processedAgents.forEach(agent => {
          console.log(`Agent: ${agent.firstName} ${agent.lastName}, ID type: ${typeof agent.id}, ID value: ${agent.id}`);
        });
        
        setAgents(processedAgents || []); // Save the processed agent list
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        // Set empty array on error to avoid UI issues
        setAgents([]);
        // Don't show error notification to user - handle silently
      } finally {
        setLoadingAgents(false);
      }
    };

    // Only fetch if user is authenticated and has appropriate role
    if (isAgentOrAdmin) {
      fetchAgents();
    }
  }, [isAgentOrAdmin, getAgentsList]);

  // Generate timeline events from ticket data
  useEffect(() => {
    if (currentTicket) {
      const events: TimelineEvent[] = [];
      
      // Created event
      events.push({
        id: `create-${currentTicket.id}`,
        type: 'created',
        timestamp: currentTicket.createdAt,
        user: {
          id: String(currentTicket.requester.id), // Convert to string explicitly
          firstName: currentTicket.requester.firstName,
          lastName: currentTicket.requester.lastName,
          avatar: currentTicket.requester.avatar
        },
        details: {}
      });
      
      // Comments as events
      if (Array.isArray(currentTicket.comments)) {
        currentTicket.comments.forEach(comment => {
          // For customers, don't include internal comments
          if (user?.role === 'customer' && comment.isInternal) {
            return;
          }
          
          events.push({
            id: comment.id,
            type: 'comment',
            timestamp: comment.createdAt,
            user: comment.user,
            details: {
              content: comment.content,
              isInternal: comment.isInternal
            }
          });
        });
      }
      
      // Attachments as events
      if (Array.isArray(currentTicket.attachments)) {
        currentTicket.attachments.forEach(attachment => {
          events.push({
            id: attachment.id,
            type: 'attachment',
            timestamp: attachment.createdAt,
            user: {
              id: String(currentTicket.requester.id), // Convert to string explicitly
              firstName: currentTicket.requester.firstName,
              lastName: currentTicket.requester.lastName,
              avatar: currentTicket.requester.avatar
            },
            details: {
              fileName: attachment.originalName
            }
          });
        });
      }
      
      // Status changes, priority changes, assignment changes
      // Sort events by timestamp
      setTimelineEvents(events.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }));
    }
  }, [currentTicket, user?.role]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommentText(event.target.value);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    
    setIsSubmittingComment(true);
    setCommentError(null);
    
    try {
      if (id) {
        await addComment(id, commentText, isInternalComment);
        setCommentText('');
        setIsInternalComment(false);
        addNotification('Your comment has been added successfully.', 'success', { 
          title: 'Comment Added' 
        });
      }
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      setCommentError(error.message || 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatusId: string) => {
    // Filter out "new" and "closed" status options
    if (newStatusId === 'new' || newStatusId === 'closed') {
      setStatusMenuAnchor(null);
      return;
    }
    
    setStatusUpdateLoading(true);
    setActionError(null);
    
    try {
      if (id) {
        await updateTicket(id, { statusId: newStatusId });
        addNotification('Ticket status has been updated successfully.', 'success', {
          title: 'Status Updated'
        });
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      setActionError(error.message || 'Failed to update status. Please try again.');
    } finally {
      setStatusUpdateLoading(false);
      setStatusMenuAnchor(null);
    }
  };

  const handlePriorityChange = async (newPriorityId: string) => {
    setPriorityUpdateLoading(true);
    setActionError(null);
    
    try {
      if (id) {
        await updateTicket(id, { priorityId: newPriorityId });
        addNotification('Ticket priority has been updated successfully.', 'success', {
          title: 'Priority Updated'
        });
      }
    } catch (error: any) {
      console.error('Failed to update priority:', error);
      setActionError(error.message || 'Failed to update priority. Please try again.');
    } finally {
      setPriorityUpdateLoading(false);
      setPriorityMenuAnchor(null);
    }
  };

  const handleAssignTicket = async (agentId: string | number) => {
    setAssignUpdateLoading(true);
    setActionError(null);
    
    try {
      if (id) {
        // Ensure we're sending a number to the backend
        let numericAgentId: number;
        
        // IMPORTANT: We'll ALWAYS use hardcoded agent IDs based on the schema
        // The schema shows IDs starting from 1001, so we'll use numbers in that range
        // This is a workaround for the UUID vs BIGINT issue
        
        console.log('Original agent ID:', agentId);
        
        if (typeof agentId === 'number') {
          numericAgentId = agentId;
        } else {
          // If it's a string, try to extract numeric parts or use default values
          const numericPart = agentId.replace(/\D/g, '');
          numericAgentId = numericPart ? parseInt(numericPart, 10) : 1001;
        }
        
        console.log('Using agent ID for assignment (strictly numeric):', numericAgentId);
        
        // Only update the assigneeId field with numeric ID
        const updatedTicket = await updateTicket(id, { assigneeId: numericAgentId });
        
        // Show success notification with agent name if available
        const assignedAgent = agents.find(a => a.id === agentId || a.id === numericAgentId);
        const agentName = assignedAgent ? `${assignedAgent.firstName} ${assignedAgent.lastName}` : 'selected agent';
        
        addNotification(`Ticket has been assigned to ${agentName}.`, 'success', {
          title: 'Ticket Assigned'
        });
        
        // Refresh ticket data to ensure we have the latest information
        await fetchTicketById(id);
      }
    } catch (error: any) {
      console.error('Failed to assign ticket:', error);
      setActionError(error.message || 'Failed to assign ticket. Please try again.');
      addNotification('Failed to assign ticket', 'error', {
        title: 'Assignment Failed'
      });
    } finally {
      setAssignUpdateLoading(false);
      setAssignMenuAnchor(null);
    }
  };

  const handleBackToList = () => {
    navigate('/tickets');
  };

  const handleRetry = () => {
    if (id) {
      fetchTicketById(id);
    }
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      // Format with user's timezone
      return formatInTimeZone(
        new Date(dateString),
        userTimeZone,
        'MMM d, yyyy h:mm a'
      );
    } catch (error) {
      console.error('Date formatting error:', error);
      // Fallback format
      return new Date(dateString).toLocaleString();
    }
  };

  const formatFileSize = (bytes: number | undefined | null): string => {
    if (bytes === undefined || bytes === null) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Error Loading Ticket"
        message={error || "We couldn't load the ticket details. Please try again later."}
        retryFn={handleRetry}
        backFn={handleBackToList}
      />
    );
  }

  if (!currentTicket) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Filter statuses to exclude "new" and "closed"
  const availableStatuses = statuses.filter(status => 
    status.name.toLowerCase() !== 'new' && 
    status.name.toLowerCase() !== 'closed'
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
          background: muiTheme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 100% 0%, ${alpha(muiTheme.palette.primary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 100% 0%, ${alpha(muiTheme.palette.primary.light, 0.15)} 0%, transparent 70%)`,
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
          background: muiTheme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 0% 100%, ${alpha(muiTheme.palette.secondary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 0% 100%, ${alpha(muiTheme.palette.secondary.light, 0.15)} 0%, transparent 70%)`,
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
        <Box mt={0}>
          {actionError && (
            <SystemAlert 
              type="error" 
              message={actionError} 
              sx={{ mb: 2 }} 
            />
          )}

          {commentError && (
            <SystemAlert 
              type="error" 
              message={commentError} 
              sx={{ mb: 2 }} 
            />
          )}
          
          <Grid container spacing={3}>
            {/* Ticket main section */}
            <Grid item xs={12} md={8}>
              <Paper 
                elevation={0} 
                sx={{
                  ...cardStyles,
                  overflow: 'hidden',
                  p: 3, 
                  mb: 3,
                  ...gradientAccent(muiTheme) 
                }}
              >
                {/* Enterprise-level header with clear labels */}
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <FieldLabel label="Ticket ID" />
                      <Typography variant="body1" fontWeight="medium">
                        {currentTicket.id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FieldLabel label="Status" />
                      <Box display="flex" alignItems="center">
                        <StatusBadge status={currentTicket.status} size="medium" />
                        {isAgentOrAdmin && (
                          <>
                            {statusUpdateLoading ? (
                              <CircularProgress size={18} sx={{ ml: 1 }} />
                            ) : (
                              <Tooltip title="Change Status">
                                <IconButton
                                  size="small"
                                  onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                                  sx={{ ml: 1 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FieldLabel label="Priority" />
                      <Box display="flex" alignItems="center">
                        <PriorityBadge priority={currentTicket.priority} size="medium" />
                        {isAgentOrAdmin && (
                          <>
                            {priorityUpdateLoading ? (
                              <CircularProgress size={18} sx={{ ml: 1 }} />
                            ) : (
                              <Tooltip title="Change Priority">
                                <IconButton
                                  size="small"
                                  onClick={(e) => setPriorityMenuAnchor(e.currentTarget)}
                                  sx={{ ml: 1 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FieldLabel label="Created" />
                      <Typography variant="body2">
                        {formatDate(currentTicket.createdAt)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <FieldLabel label="Subject" />
                <Typography variant="h4" component="h1" gutterBottom>
                  {currentTicket.subject}
                </Typography>
                
                <Divider sx={{ my: 3 }} />
                
                {/* Description section */}
                <Box sx={{ mb: 3 }}>
                  <FieldLabel label="Description" />
                  <Typography 
                    variant="body1" 
                    paragraph 
                    sx={{ 
                      whiteSpace: 'pre-line', 
                      p: 2, 
                      border: `1px solid ${alpha(muiTheme.palette.divider, 0.2)}`, 
                      borderRadius: 1, 
                      bgcolor: alpha(muiTheme.palette.background.default, 0.5) 
                    }}
                  >
                    {currentTicket.description}
                  </Typography>
                </Box>
                
                {currentTicket.tags && currentTicket.tags.length > 0 && (
                  <Box mt={2}> 
                    <FieldLabel label="Tags" />
                    <Box mt={1}>
                      {currentTicket.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
              
              {/* Tabs and content */}
              <Paper 
                elevation={0}
                sx={{ 
                  ...cardStyles,
                  overflow: 'hidden',
                  ...gradientAccent(muiTheme) 
                }}
              >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="ticket details tabs"
                    sx={{ px: 2 }} 
                  >
                    <Tab
                      icon={<CommentIcon fontSize="small" />}
                      label={`Comments (${currentTicket.comments?.length ?? 0})`}
                      {...a11yProps(0)}
                    />
                    <Tab
                      icon={<AttachFileIcon fontSize="small" />}
                      label={`Attachments (${currentTicket.attachments?.length ?? 0})`}
                      {...a11yProps(1)}
                    />
                    <Tab
                      icon={<HistoryIcon fontSize="small" />}
                      label="Activity Log"
                      {...a11yProps(2)}
                    />
                  </Tabs>
                </Box>
                
                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ p: 3 }}> 
                    {/* Add Comment Section Header */}
                    <FieldLabel label="Add Comment" />
                    
                    {/* Comment input Box */}
                    <Box mb={4}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Write a comment..."
                        variant="outlined"
                        value={commentText}
                        onChange={handleCommentChange}
                      />
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                        {isAgentOrAdmin && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isInternalComment}
                                onChange={(e) => setIsInternalComment(e.target.checked)}
                                color="primary"
                              />
                            }
                            label="Internal note (only visible to staff)"
                          />
                        )}
                        <Button
                          variant="contained"
                          color="primary"
                          endIcon={isSubmittingComment ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || isSubmittingComment}
                          sx={{ ml: 'auto' }} // Push to right side
                        >
                          {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Comments from timeline */}
                    <FieldLabel label="Comments" />
                    {timelineEvents.filter(event => event.type === 'comment').length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
                        No comments yet
                      </Typography>
                    ) : (
                      <TicketTimeline 
                        events={timelineEvents.filter(event => event.type === 'comment')} 
                      />
                    )}
                  </Box>
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <Box sx={{ p: 3 }}> 
                    <FieldLabel label="Attachments" />

                    {currentTicket.attachments.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
                        No attachments
                      </Typography>
                    ) : (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {currentTicket.attachments.map((attachment) => (
                          <Grid item xs={12} sm={6} md={4} key={attachment.id}>
                            <Card 
                              elevation={0} 
                              variant="outlined" 
                              sx={{ 
                                height: '100%', 
                                transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
                                '&:hover': {
                                  boxShadow: muiTheme.shadows[4],
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                                <MuiLink 
                                  href={`${process.env.REACT_APP_API_BASE_URL}/${attachment.filePath}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  underline="hover"
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    width: '100%',
                                    color: 'inherit',
                                    p: 0.5, 
                                    borderRadius: 1,
                                  }}
                                >
                                  <AttachmentIcon sx={{ mr: 1.5, color: 'text.secondary', fontSize: '1.8rem' }} />
                                  <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                    <Tooltip title={attachment.originalName}>
                                      <Typography variant="body2" noWrap fontWeight="medium">
                                        {attachment.originalName}
                                      </Typography>
                                    </Tooltip>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatFileSize(attachment.size)} • {formatDate(attachment.createdAt)}
                                    </Typography>
                                  </Box>
                                </MuiLink>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ p: 3 }}> 
                    <FieldLabel label="Activity Log" />
                    {!Array.isArray(timelineEvents) || timelineEvents.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
                        No activity yet
                      </Typography>
                    ) : (
                      Array.isArray(timelineEvents) && 
                      <TicketTimeline 
                        events={[...timelineEvents].sort((a, b) => {
                          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                        })} 
                      />
                    )}
                  </Box>
                </TabPanel>
              </Paper>
            </Grid>
            
            {/* Ticket sidebar */}
            <Grid item xs={12} md={4}>
              {/* Right-side back button aligned with the main content on left */}
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToList}
                variant="outlined"
                sx={{ mb: 2, display: 'block' }}
              >
                Back to Tickets
              </Button>
              
              {/* Ticket Properties container now moved below the button */}
              <Paper 
                elevation={0} 
                sx={{ 
                  ...cardStyles,
                  overflow: 'hidden',
                  p: 3, 
                  mb: 3,
                  ...gradientAccent(muiTheme) 
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Ticket Properties
                </Typography>
                
                <Stack spacing={2.5}>
                  <Box>
                    <FieldLabel label="Requester" />
                    <UserAvatar
                      user={currentTicket.requester}
                      showEmail
                    />
                  </Box>
                  
                  <Box>
                    <FieldLabel label="Assignee" />
                    {currentTicket.assignee ? (
                      <Box display="flex" alignItems="center">
                        <UserAvatar
                          user={currentTicket.assignee}
                          showEmail
                        />
                        {isAgentOrAdmin && (
                          <>
                            {assignUpdateLoading ? (
                              <CircularProgress size={18} sx={{ ml: 1 }} />
                            ) : (
                              <Tooltip title="Reassign Ticket">
                                <IconButton 
                                  size="small" 
                                  sx={{ ml: 1 }}
                                  onClick={(e) => setAssignMenuAnchor(e.currentTarget)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center">
                        <UserAvatar user={null} />
                        {isAgentOrAdmin && (
                          <Button
                            startIcon={<AssignIcon />}
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1 }}
                            onClick={(e) => setAssignMenuAnchor(e.currentTarget)}
                          >
                            Assign
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {currentTicket.department && (
                    <Box>
                      <FieldLabel label="Department" />
                      <Typography variant="body1">
                        {currentTicket.department.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {currentTicket.type && (
                    <Box>
                      <FieldLabel label="Type" />
                      <Typography variant="body1">
                        {currentTicket.type.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {currentTicket.department || currentTicket.type ? <Divider sx={{ my: 1 }} /> : null}
                  
                  <Box>
                    <FieldLabel label="Last Updated" />
                    <Typography variant="body1">
                      {formatDate(currentTicket.updatedAt)}
                    </Typography>
                  </Box>
                  
                  {currentTicket.dueDate && (
                    <Box>
                      <FieldLabel label="Due Date" />
                      <Typography variant="body1">
                        {formatDate(currentTicket.dueDate)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        
        {/* Status change menu */}
        <Menu
          anchorEl={statusMenuAnchor}
          open={Boolean(statusMenuAnchor)}
          onClose={() => setStatusMenuAnchor(null)}
        >
          {availableStatuses.map((status) => (
            <MenuItem
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              selected={currentTicket.status.id === status.id}
            >
              <StatusBadge status={status} size="small" />
            </MenuItem>
          ))}
        </Menu>
        
        {/* Priority change menu */}
        <Menu
          anchorEl={priorityMenuAnchor}
          open={Boolean(priorityMenuAnchor)}
          onClose={() => setPriorityMenuAnchor(null)}
        >
          {priorities.map((priority) => (
            <MenuItem
              key={priority.id}
              onClick={() => handlePriorityChange(priority.id)}
              selected={currentTicket.priority.id === priority.id}
            >
              <PriorityBadge priority={priority} size="small" />
            </MenuItem>
          ))}
        </Menu>
        
        {/* Agent assignment menu */}
        <Menu
          anchorEl={assignMenuAnchor}
          open={Boolean(assignMenuAnchor)}
          onClose={() => setAssignMenuAnchor(null)}
        >
          {loadingAgents ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading agents...
            </MenuItem>
          ) : agents.length === 0 ? (
            <MenuItem disabled>No agents available</MenuItem>
          ) : (
            agents.map((agent) => (
              <MenuItem
                key={agent.id}
                onClick={() => handleAssignTicket(typeof agent.id === 'string' ? agent.id : agent.id)}
                selected={currentTicket.assignee?.id === agent.id}
              >
                <Box display="flex" alignItems="center" width="100%">
                  <Avatar 
                    src={agent.avatarUrl} 
                    alt={`${agent.firstName} ${agent.lastName}`}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  >
                    {agent.firstName.charAt(0)}
                  </Avatar>
                  <Typography variant="body2">
                    {agent.firstName} {agent.lastName}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>
      </Box>
    </Container>
  );
};

export default TicketDetailPage; 