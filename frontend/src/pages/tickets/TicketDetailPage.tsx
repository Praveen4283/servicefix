import React, { useState, useEffect } from 'react';
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
import { useTickets } from '../../context/TicketContext';
import StatusBadge from '../../components/tickets/StatusBadge';
import PriorityBadge from '../../components/tickets/PriorityBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TicketTimeline, { TimelineEvent } from '../../components/tickets/TicketTimeline';
import { useTheme as useMuiTheme, alpha } from '@mui/material/styles';
import { SystemAlert, useNotification } from '../../context/NotificationContext';

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

const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const muiTheme = useMuiTheme();
  
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
  } = useTickets();
  
  const { addNotification } = useNotification();
  
  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [priorityMenuAnchor, setPriorityMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [priorityUpdateLoading, setPriorityUpdateLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  
  // Fetch ticket data when component mounts or ID changes
  useEffect(() => {
    if (id) {
      fetchTicketById(id);
    }
  }, [id, fetchTicketById]);

  // Generate timeline events from ticket data
  useEffect(() => {
    console.log('[Effect] Current ticket data for timeline:', currentTicket);
    if (currentTicket) {
      const events: TimelineEvent[] = [];
      
      // Created event
      events.push({
        id: `create-${currentTicket.id}`,
        type: 'created',
        timestamp: currentTicket.createdAt,
        user: currentTicket.requester,
        details: {}
      });
      
      // Comments as events
      if (Array.isArray(currentTicket.comments)) {
        currentTicket.comments.forEach(comment => {
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
            user: currentTicket.requester, // Assuming requester added the attachment
            details: {
              fileName: attachment.originalName,
              fileSize: attachment.size
            }
          });
        });
      }
      
      // Sort events by timestamp (newest first for comments tab, oldest first for history tab)
      const sortedEvents = [...events].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      setTimelineEvents(sortedEvents);
    }
  }, [currentTicket]);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommentText(event.target.value);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;
    
    setIsSubmittingComment(true);
    setCommentError(null);
    setActionError(null); // Clear general action errors

    try {
      await addComment(id, commentText, isInternalComment);
      setCommentText('');
      setIsInternalComment(false);
      addNotification('Comment added successfully', 'success');
      // Optionally refetch ticket details here if comments aren't updated automatically
      // fetchTicketById(id); 
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      setCommentError(error.message || 'Failed to add comment. Please try again.');
      addNotification('Failed to add comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  const handleStatusChange = async (newStatusId: string) => {
    if (!id || !currentTicket) return;
    
    setStatusUpdateLoading(true);
    setActionError(null); // Clear previous errors
    try {
      const newStatus = statuses.find(s => s.id === newStatusId);
      if (newStatus) {
        await updateTicket(id, { status: newStatus });
        addNotification('Status updated successfully', 'success');
      } else {
         throw new Error('Selected status not found');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      setActionError(error.message || 'Failed to update status.');
      addNotification('Failed to update status', 'error');
    } finally {
      setStatusUpdateLoading(false);
      setStatusMenuAnchor(null);
    }
  };
  
  const handlePriorityChange = async (newPriorityId: string) => {
    if (!id || !currentTicket) return;
    
    setPriorityUpdateLoading(true);
    setActionError(null);
    try {
      const newPriority = priorities.find(p => p.id === newPriorityId);
      if (newPriority) {
        await updateTicket(id, { priority: newPriority });
        addNotification('Priority updated successfully', 'success');
      } else {
        throw new Error('Selected priority not found');
      }
    } catch (error: any) {
      console.error('Error updating priority:', error);
      setActionError(error.message || 'Failed to update priority.');
      addNotification('Failed to update priority', 'error');
    } finally {
      setPriorityUpdateLoading(false);
      setPriorityMenuAnchor(null);
    }
  };
  
  const handleBackToList = () => {
    navigate('/tickets');
  };

  // Add a retry function for error recovery
  const handleRetry = () => {
    if (id) {
      fetchTicketById(id);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleConfirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteTicket(id);
      addNotification('Ticket deleted successfully!', 'success');
      navigate('/tickets');
    } catch (err: any) {
      console.error('Error deleting ticket:', err);
      setActionError(err.message || 'Failed to delete ticket. Please try again.');
      addNotification('Failed to delete ticket', 'error');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleEdit = () => {
    if (id) {
      navigate(`/tickets/${id}/edit`);
    }
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

  console.log('[Render] Timeline events state before return:', timelineEvents);

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

          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToList}
            sx={{ mb: 2 }}
            variant="outlined"
          >
            Back to Tickets
          </Button>
          
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
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                      {currentTicket.subject}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="body2" color="textSecondary">
                        {currentTicket.id}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">•</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Created {formatDate(currentTicket.createdAt)}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <StatusBadge status={currentTicket.status} size="small" />
                      <PriorityBadge priority={currentTicket.priority} size="small" />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit Ticket">
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={handleEdit}
                      >
                        Edit
                      </Button>
                    </Tooltip>
                    <Tooltip title="Delete Ticket">
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setConfirmDelete(true)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                {/* Add Header for Description */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
                   Description
                </Typography>
                
                {/* Improved Description Display */}
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
                
                {currentTicket.tags && currentTicket.tags.length > 0 && (
                  <Box mt={3}> {/* Add margin top for spacing */}
                    <Box display="flex" alignItems="center" mb={1}>
                      <TagIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="subtitle2" color="text.secondary" fontWeight="medium"> {/* Use subtitle2 and medium weight */}
                        Tags
                      </Typography>
                    </Box>
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
                    sx={{ px: 2 }} // Keep padding for tabs row
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
                      label={`History (${timelineEvents?.length ?? 0})`}
                      {...a11yProps(2)}
                    />
                  </Tabs>
                </Box>
                
                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ p: 3 }}> {/* Pad comment area */} 
                    {/* Add Comment Section Header */}
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Add Comment
                    </Typography>
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
                        <Button
                          variant="contained"
                          color="primary"
                          endIcon={isSubmittingComment ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || isSubmittingComment}
                        >
                          {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Comments from timeline */}
                    {timelineEvents.filter(event => event.type === 'comment').length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center">
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
                  <Box sx={{ p: 3 }}> {/* Pad attachments area */} 
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                      Ticket Attachments
                    </Typography>

                    {currentTicket.attachments.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ pb: 3 }}>
                        No attachments
                      </Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {currentTicket.attachments.map((attachment) => (
                          <Grid item xs={12} sm={6} md={4} key={attachment.id}>
                            <Card 
                              elevation={0} 
                              variant="outlined" 
                              sx={{ 
                                height: '100%', 
                                transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out', // Add transition
                                '&:hover': { // Add hover effect to card
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
                  <Box sx={{ p: 3 }}> {/* Pad history area */} 
                    {/* Add History Section Header */}
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                      Ticket History
                    </Typography>
                    {!Array.isArray(timelineEvents) || timelineEvents.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center">
                        No activity yet
                      </Typography>
                    ) : (
                      Array.isArray(timelineEvents) && 
                      <TicketTimeline 
                        events={[...timelineEvents].sort((a, b) => {
                          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                        })} 
                      />
                    )}
                  </Box>
                </TabPanel>
              </Paper>
            </Grid>
            
            {/* Ticket sidebar */}
            <Grid item xs={12} md={4}>
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
                    <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Box sx={{ mr: 1 }}>
                        <StatusBadge status={currentTicket.status} size="medium" />
                      </Box>
                      {statusUpdateLoading ? (
                        <CircularProgress size={18} />
                      ) : (
                        <Tooltip title="Change Status">
                          <IconButton
                            size="small"
                            onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                      Priority
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Box sx={{ mr: 1 }}>
                        <PriorityBadge priority={currentTicket.priority} size="medium" />
                      </Box>
                      {priorityUpdateLoading ? (
                        <CircularProgress size={18} />
                      ) : (
                        <Tooltip title="Change Priority">
                          <IconButton
                            size="small"
                            onClick={(e) => setPriorityMenuAnchor(e.currentTarget)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                      Requester
                    </Typography>
                    <UserAvatar
                      user={currentTicket.requester}
                      showEmail
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                      Assignee
                    </Typography>
                    {currentTicket.assignee ? (
                      <Box display="flex" alignItems="center">
                        <UserAvatar
                          user={currentTicket.assignee}
                          showEmail
                        />
                        <Tooltip title="Change Assignee">
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center">
                        <UserAvatar user={null} />
                        <Button
                          startIcon={<AssignIcon />}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        >
                          Assign
                        </Button>
                      </Box>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {currentTicket.department && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                        Department
                      </Typography>
                      <Typography variant="body1">
                        {currentTicket.department.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {currentTicket.type && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                        Type
                      </Typography>
                      <Typography variant="body1">
                        {currentTicket.type.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {currentTicket.department || currentTicket.type ? <Divider sx={{ my: 1 }} /> : null}
                  
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(currentTicket.createdAt)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                      Updated
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(currentTicket.updatedAt)}
                    </Typography>
                  </Box>
                  
                  {currentTicket.dueDate && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" gutterBottom>
                        Due Date
                      </Typography>
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
          {statuses.map((status) => (
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
        
        {/* Confirm Delete Dialog */}
        <Dialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
        >
          <DialogTitle>Delete Ticket {currentTicket.id}?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete this ticket? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              color="error" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <CircularProgress size={20} color="inherit"/> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TicketDetailPage; 