import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Fade,
  Backdrop,
  Alert,
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
  CloudUpload as CloudUploadIcon,
  FileUpload as FileUploadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTickets, User } from '../../context/TicketContext';
import StatusBadge from '../../components/tickets/StatusBadge';
import PriorityBadge from '../../components/tickets/PriorityBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TicketTimeline, { TimelineEvent } from '../../components/tickets/TicketTimeline';
import { useTheme as useMuiTheme, alpha } from '@mui/material/styles';
import { SystemAlert, useNotification } from '../../context/NotificationContext';
import { formatDate, getRelativeTime } from '../../utils/dateUtils';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import SLABadge from '../../components/tickets/SLABadge';
import AssignSLAModal from '../../components/tickets/AssignSLAModal';
import slaService from '../../services/slaService';

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

// Add a file size limit and accepted file types constants (matching CreateTicketPage)
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip'
];

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
    getAgentsList,
    addAttachment,  // Add this function to the context
    getTicketHistory, // Add this function to the context
    refreshCounter,
    setRefreshCounter
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
  
  // State for file uploads
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch activity history when component mounts
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  // Determine user timezone with fallback
  const userTimeZone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Role-based permission checks
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const isCustomer = user?.role === 'customer';
  const isAgentOrAdmin = isAdmin || isAgent;
  
  // Add a state variable to manage the SLA assignment modal
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  
  // Add a state variable for department management
  const [departmentMenuAnchor, setDepartmentMenuAnchor] = useState<null | HTMLElement>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentUpdateLoading, setDepartmentUpdateLoading] = useState(false);
  
  // Add function to navigate to SLA settings tab in SettingsPage
  const navigateToSLASettings = useCallback(() => {
    // Navigate to the settings page with the SLA tab selected (index 3)
    navigate('/settings', { state: { initialTab: 3 } });
  }, [navigate]);
  
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
        const agentsList = await getAgentsList();
        
        // Log each agent's ID to diagnose the issue
        if (agentsList && agentsList.length > 0) {
          console.log('Example agent object structure:', agentsList[0]);
        }
        
        // Force agent IDs to be numbers - this is crucial for the backend
        const processedAgents = agentsList.map(agent => ({
          ...agent,
          id: typeof agent.id === 'string' ? Number(agent.id.replace(/\D/g, '')) || 1001 : agent.id
        }));
        
        setAgents(processedAgents || []); // Save the processed agent list
      } catch (error) {
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
        // Direct API call instead of using the context
        await apiClient.post(`/tickets/${id}/comments`, {
          content: commentText,
          isInternal: isInternalComment
        });
        
        // Clear the input and reset the internal flag
        setCommentText('');
        setIsInternalComment(false);
        
        // Show success notification
        addNotification('Comment added successfully', 'success');
        
        // Refresh ticket data to get the updated comments
        await fetchTicketById(id);
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
        // Get current status and the new status details
        const currentStatusName = currentTicket?.status?.name?.toLowerCase() || '';
        const newStatus = statuses.find(s => s.id === newStatusId);
        const newStatusName = newStatus?.name?.toLowerCase() || '';
        
        // Update the ticket status
        await updateTicket(id, { statusId: newStatusId });
        
        // Handle SLA pause/resume based on status change
        let slaUpdateSuccess = false;
        try {
          // If new status is "pending", pause the SLA
          if (newStatusName === 'pending') {
            console.log('Status changed to pending, pausing SLA...');
            const pauseResult = await slaService.pauseSLA(id);
            slaUpdateSuccess = pauseResult;
            console.log('SLA pause result:', pauseResult);
          } 
          // If status is changing from "pending" to something else, resume the SLA
          else if (currentStatusName === 'pending' && newStatusName !== 'pending') {
            console.log('Status changed from pending, resuming SLA...');
            const resumeResult = await slaService.resumeSLA(id);
            slaUpdateSuccess = resumeResult;
            console.log('SLA resume result:', resumeResult);
          }
        } catch (slaError) {
          console.error('Failed to update SLA pause/resume status:', slaError);
          // Don't show SLA errors to user as the main status update was successful
        }
        
        // Show appropriate notification
        if (slaUpdateSuccess) {
          if (newStatusName === 'pending') {
            addNotification('Ticket status updated and SLA timer paused.', 'success', {
              title: 'Status Updated'
            });
          } else if (currentStatusName === 'pending') {
            addNotification('Ticket status updated and SLA timer resumed.', 'success', {
              title: 'Status Updated'
            });
          }
        } else {
          addNotification('Ticket status has been updated successfully.', 'success', {
            title: 'Status Updated'
          });
        }
        
        // Refresh the ticket to get updated SLA information
        await fetchTicketById(id);
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
        // Update the ticket priority
        await updateTicket(id, { priorityId: newPriorityId });
        
        // Attempt to update the SLA policy based on the new priority
        let slaUpdateSuccess = false;
        let slaUpdateError = null;
        
        try {
          // First try the auto-assign SLA endpoint
          console.log('Updating SLA policy based on new priority...');
          const response = await apiClient.post(`/sla/auto-assign/${id}`);
          
          if (response && response.data) {
            console.log('New SLA policy assigned based on priority change:', response.data);
            slaUpdateSuccess = true;
          }
        } catch (slaError: any) {
          slaUpdateError = slaError;
          console.warn('Failed to auto-assign SLA policy after priority change, will try update-sla endpoint:', slaError);
          
          // If auto-assign fails, try our dedicated update-sla endpoint as a fallback
          try {
            const slaResponse = await apiClient.post(`/tickets/${id}/update-sla`);
            if (slaResponse && slaResponse.data) {
              console.log('SLA updated using fallback endpoint:', slaResponse.data);
              slaUpdateSuccess = true;
              slaUpdateError = null;
            }
          } catch (fallbackError: any) {
            console.error('Failed to update SLA using fallback endpoint:', fallbackError);
            slaUpdateError = fallbackError;
            // Still don't show this error to the user, as the priority update was successful
          }
        }
        
        // Get the new priority name for the notification
        const priority = priorities.find(p => p.id === newPriorityId);
        const priorityName = priority ? priority.name : 'new priority';
        
        // Show appropriate notification based on SLA update status
        if (slaUpdateSuccess) {
          addNotification(`Ticket priority changed to ${priorityName} and SLA policy has been updated.`, 'success', {
            title: 'Priority and SLA Updated'
          });
        } else {
          addNotification(`Ticket priority has been updated to ${priorityName}.`, 'success', {
            title: 'Priority Updated'
          });
          
          // Log SLA update failure for debugging
          if (slaUpdateError) {
            console.error('SLA update failed with error:', slaUpdateError);
          }
        }
        
        // Increment the refreshCounter to trigger SLA component refresh
        setRefreshCounter(prev => prev + 1);
        
        // Refresh the ticket to get updated SLA information
        await fetchTicketById(id);
      }
    } catch (error: any) {
      console.error('Failed to update priority:', error);
      setActionError(error.message || 'Failed to update priority. Please try again.');
    } finally {
      setPriorityUpdateLoading(false);
      setPriorityMenuAnchor(null);
    }
  };

  // Add a function to fetch departments
  const fetchDepartments = useCallback(async () => {
    if (!isAgentOrAdmin) return;
    
    setLoadingDepartments(true);
    try {
      // Use the correct endpoint for departments
      const response = await apiClient.get('/tickets/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }, [isAgentOrAdmin]);

  // Add a function to handle department change
  const handleDepartmentChange = async (departmentId: string | number) => {
    setDepartmentUpdateLoading(true);
    setActionError(null);
    
    try {
      if (id) {
        // Update the ticket department
        await updateTicket(id, { departmentId });
        
        addNotification('Department has been updated successfully.', 'success', {
          title: 'Department Updated'
        });
        
        // Refresh ticket data
        await fetchTicketById(id);
      }
    } catch (error: any) {
      console.error('Failed to update department:', error);
      setActionError(error.message || 'Failed to update department. Please try again.');
    } finally {
      setDepartmentUpdateLoading(false);
      setDepartmentMenuAnchor(null);
    }
  };

  const handleAssignTicket = async (agentId: string | number) => {
    setAssignUpdateLoading(true);
    setActionError(null);
    
    try {
      if (id) {
        // Ensure we're sending a number to the backend
        let numericAgentId: number;
        
        if (typeof agentId === 'number') {
          numericAgentId = agentId;
        } else {
          // If it's a string, try to extract numeric parts or use default values
          const numericPart = agentId.replace(/\D/g, '');
          numericAgentId = numericPart ? parseInt(numericPart, 10) : 1001;
        }
        
        // Find the assigned agent from our local list
        const assignedAgent = agents.find(a => a.id === agentId || a.id === numericAgentId);
        console.log('Selected agent:', assignedAgent);
        
        // Find the "Open" status ID
        const openStatus = statuses.find(status => status.name.toLowerCase() === 'open');
        const openStatusId = openStatus ? openStatus.id : null;
        
        // Initialize the update data with the assignee ID
        const updateData: any = { assigneeId: numericAgentId };
        
        // Add status update if the current status is "new"
        if (openStatusId && currentTicket?.status?.name.toLowerCase() === 'new') {
          updateData.statusId = openStatusId;
        }
        
        // Try to find the department ID from various sources
        let departmentId = null;
        
        // First, try direct API call to get user details including department
        try {
          const userResponse = await apiClient.get(`/users/${numericAgentId}`);
          console.log('User response:', userResponse);
          
          // Check if agent has a department
          if (userResponse) {
            // Log all possible department-related fields to help with debugging
            console.log('Department fields in user response:',
              userResponse.department,
              userResponse.departmentId,
              userResponse.department_id
            );
            
            if (userResponse.department && userResponse.department.id) {
              departmentId = userResponse.department.id;
              console.log('Found department.id in user response:', departmentId);
            } else if (userResponse.departmentId) {
              departmentId = userResponse.departmentId;
              console.log('Found departmentId in user response:', departmentId);
            } else if (userResponse.department_id) {
              departmentId = userResponse.department_id;
              console.log('Found department_id in user response:', departmentId);
            }
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
        
        // If we still don't have a department ID, try from our agent object
        if (!departmentId && assignedAgent) {
          console.log('Checking department from agent object:', 
            assignedAgent.department,
            assignedAgent.departmentId,
            assignedAgent.department_id
          );
          
          if (assignedAgent.department && assignedAgent.department.id) {
            departmentId = assignedAgent.department.id;
            console.log('Found department.id in agent object:', departmentId);
          } else if (assignedAgent.departmentId) {
            departmentId = assignedAgent.departmentId;
            console.log('Found departmentId in agent object:', departmentId);
          } else if (assignedAgent.department_id) {
            departmentId = assignedAgent.department_id;
            console.log('Found department_id in agent object:', departmentId);
          }
        }
        
        // If we found a department ID, include it in the update data
        if (departmentId) {
          updateData.departmentId = departmentId;
          console.log('Setting ticket department ID to:', departmentId);
        } else {
          console.warn('Could not find department ID for agent:', numericAgentId);
        }
        
        console.log('Updating ticket with data:', updateData);
        
        // Update the ticket with the data
        const updatedTicket = await updateTicket(id, updateData);
        
        // Show success notification with agent name if available
        const agentName = assignedAgent 
          ? `${assignedAgent.firstName} ${assignedAgent.lastName}` 
          : 'selected agent';
        
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

  const formatFileSize = (bytes: number | undefined | null): string => {
    if (bytes === undefined || bytes === null) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      
      // Filter out files that exceed the size limit or have invalid types
      const validFiles = newFiles.filter(file => {
        const isValidSize = file.size <= FILE_SIZE_LIMIT;
        const isValidType = ACCEPTED_FILE_TYPES.includes(file.type);
        
        if (!isValidSize) {
          setUploadError(`File ${file.name} exceeds the maximum size limit of 10MB`);
        } else if (!isValidType) {
          setUploadError(`File ${file.name} has an unsupported file type`);
        }
        
        return isValidSize && isValidType;
      });
      
      setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUploadAttachments = async () => {
    if (!id || selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    try {
      // Create FormData for the file upload
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('attachments', file, file.name);
      });
      
      // Add the ticket ID
      formData.append('ticketId', id);
      
      // Call the addAttachment function from context
      await addAttachment(id, formData);
      
      // Clear selected files and show success message
      setSelectedFiles([]);
      setUploadSuccess('Attachments uploaded successfully!');
      
      // Refresh ticket data to show new attachments
      await fetchTicketById(id);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading attachments:', error);
      setUploadError(error.message || 'Failed to upload attachments. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch activity history when component mounts
  useEffect(() => {
    const fetchTicketHistory = async () => {
      if (!id) return;
      
      setIsHistoryLoading(true);
      setHistoryError(null);
      
      try {
        const history = await getTicketHistory(id);
        setTicketHistory(history || []);
      } catch (error: any) {
        console.error('Failed to fetch ticket history:', error);
        setHistoryError(error.message || 'Failed to load ticket history.');
      } finally {
        setIsHistoryLoading(false);
      }
    };

    if (tabValue === 2) { // Only fetch when activity tab is active
      fetchTicketHistory();
    }
  }, [id, getTicketHistory, tabValue]);

  // Handle attachment download
  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      // Call the API to get the download URL
      const response = await apiClient.get(`/tickets/attachments/download/${attachmentId}`);
      
      if (response.downloadUrl) {
        // Create a temporary link and simulate a click to download
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.target = '_blank';
        
        // Set download attribute with filename if available
        if (response.filename) {
          link.download = response.filename;
        }
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      addNotification('Failed to download attachment. Please try again.', 'error');
    }
  };

  // Fetch departments when component mounts
  useEffect(() => {
    if (isAgentOrAdmin) {
      fetchDepartments();
    }
  }, [fetchDepartments, isAgentOrAdmin]);

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
                
                {/* Tags section with better type handling */}
                {currentTicket.tags && Array.isArray(currentTicket.tags) && currentTicket.tags.length > 0 && (
                  <Box mt={2}> 
                    <FieldLabel label="Tags" />
                    <Box mt={1}>
                      {currentTicket.tags.map((tagItem, index) => {
                        // Extract tag text based on type
                        let tagText = '';
                        
                        if (typeof tagItem === 'string') {
                          tagText = tagItem;
                        } else if (tagItem && typeof tagItem === 'object') {
                          // Try to extract name from common tag object formats
                          const tagObj = tagItem as any;
                          tagText = tagObj.name || tagObj.value || tagObj.tag || String(tagItem);
                        }
                        
                        // Only render chip if we have tag text
                        if (tagText) {
                          return (
                            <Chip
                              key={`tag-${index}`}
                              label={tagText}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ 
                                mr: 0.5, 
                                mb: 0.5,
                                borderRadius: '16px',
                                '&:hover': {
                                  boxShadow: 1
                                }
                              }}
                            />
                          );
                        }
                        return null; // Skip invalid tags
                      })}
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
                    {/* Only show Activity Log tab for agents and admins */}
                    {isAgentOrAdmin && (
                      <Tab
                        icon={<HistoryIcon fontSize="small" />}
                        label="Activity Log"
                        {...a11yProps(2)}
                      />
                    )}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <FieldLabel label="Attachments" />
                      
                      <Button
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        Add Attachments
                      </Button>
                      <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept={ACCEPTED_FILE_TYPES.join(',')}
                        style={{ display: 'none' }}
                      />
                    </Box>

                    {/* Upload success/error messages */}
                    {uploadSuccess && (
                      <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUploadSuccess(null)}>
                        {uploadSuccess}
                      </Alert>
                    )}
                    
                    {uploadError && (
                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
                        {uploadError}
                      </Alert>
                    )}
                    
                    {/* Selected files section */}
                    {selectedFiles.length > 0 && (
                      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Selected Files ({selectedFiles.length})
                        </Typography>
                        
                        <Grid container spacing={1}>
                          {selectedFiles.map((file, index) => (
                            <Grid item xs={12} key={`selected-${index}`}>
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: alpha(theme.palette.background.default, 0.5),
                                }}
                              >
                                <AttachmentIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                  <Typography variant="body2" noWrap>
                                    {file.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatFileSize(file.size)}
                                  </Typography>
                                </Box>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleRemoveFile(index)}
                                  sx={{ color: theme.palette.error.main }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                        
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            onClick={handleUploadAttachments}
                            disabled={isUploading}
                            startIcon={isUploading ? <CircularProgress size={20} /> : <FileUploadIcon />}
                          >
                            {isUploading ? 'Uploading...' : 'Upload Files'}
                          </Button>
                        </Box>
                      </Paper>
                    )}

                    {/* Existing attachments */}
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
                                <Box
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    width: '100%',
                                    p: 0.5, 
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => handleDownloadAttachment(attachment.id)}
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
                                  <Tooltip title="Download">
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent the parent click
                                        handleDownloadAttachment(attachment.id);
                                      }}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
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
                    
                    {isHistoryLoading ? (
                      <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={30} />
                      </Box>
                    ) : historyError ? (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {historyError}
                      </Alert>
                    ) : !Array.isArray(ticketHistory) || ticketHistory.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
                        No activity recorded yet
                      </Typography>
                    ) : (
                      <TicketTimeline 
                        events={[...timelineEvents, 
                          ...ticketHistory.map(history => ({
                            id: `history-${history.id}`,
                            type: history.field_name === 'status_id' ? 'status_change' : 
                                 history.field_name === 'priority_id' ? 'priority_change' :
                                 history.field_name === 'assignee_id' ? 'assignment' : 'edited',
                            timestamp: history.created_at,
                            user: history.user || {
                              id: 'system',
                              firstName: 'System',
                              lastName: '',
                              avatar: undefined
                            },
                            details: {
                              field: history.field_name,
                              from: history.old_value,
                              to: history.new_value,
                              oldPriority: history.field_name === 'priority_id' ? { name: history.old_value } : undefined,
                              newPriority: history.field_name === 'priority_id' ? { name: history.new_value } : undefined,
                              fromStatus: history.field_name === 'status_id' ? { name: history.old_value } : undefined,
                              toStatus: history.field_name === 'status_id' ? { name: history.new_value } : undefined,
                              fromColor: undefined, 
                              toColor: undefined,
                            }
                          })) as TimelineEvent[]
                        ].sort((a, b) => {
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
                  {/* Only show SLA information to agents and admins */}
                  {isAgentOrAdmin && (
                    <Box>
                      <FieldLabel label="SLA Status" />
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column' }}>
                        <SLABadge 
                          ticketId={Number(id)}
                          refreshTrigger={refreshCounter}
                          showDetails={true}
                          ticketPriorityId={currentTicket?.priority?.id}
                        />
                        
                        {/* Make the SLA management button visible only to admins */}
                        {isAdmin && (
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mt: 2, alignSelf: 'flex-start' }}
                            onClick={navigateToSLASettings}
                            startIcon={<SettingsIcon />}
                          >
                            Manage SLA
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )}
                  
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
                  
                  {currentTicket?.department && (
                    <Box>
                      <FieldLabel label="Department" />
                      <Box display="flex" alignItems="center">
                        <Typography variant="body1">
                          {currentTicket.department.name}
                        </Typography>
                        {isAgentOrAdmin && (
                          <>
                            {departmentUpdateLoading ? (
                              <CircularProgress size={18} sx={{ ml: 1 }} />
                            ) : (
                              <Tooltip title="Change Department">
                                <IconButton 
                                  size="small" 
                                  sx={{ ml: 1 }}
                                  onClick={(e) => setDepartmentMenuAnchor(e.currentTarget)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                  )}
                  
                  {currentTicket?.type && (
                    <Box>
                      <FieldLabel label="Type" />
                      <Typography variant="body1">
                        {currentTicket.type.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {(currentTicket?.department || currentTicket?.type) ? <Divider sx={{ my: 1 }} /> : null}
                  
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
              selected={currentTicket?.status?.id === status.id}
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
              selected={currentTicket?.priority?.id === priority.id}
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
                selected={currentTicket?.assignee?.id === agent.id}
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
        
        {/* Department change menu */}
        <Menu
          anchorEl={departmentMenuAnchor}
          open={Boolean(departmentMenuAnchor)}
          onClose={() => setDepartmentMenuAnchor(null)}
        >
          {loadingDepartments ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading departments...
            </MenuItem>
          ) : departments.length === 0 ? (
            <MenuItem disabled>No departments available</MenuItem>
          ) : (
            departments.map((department) => (
              <MenuItem
                key={department.id}
                onClick={() => handleDepartmentChange(department.id)}
                selected={currentTicket?.department?.id === department.id}
              >
                <Typography variant="body2">
                  {department.name}
                </Typography>
              </MenuItem>
            ))
          )}
        </Menu>
      </Box>

      {/* Add the SLA assignment modal */}
      <AssignSLAModal
        open={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
        ticketId={Number(id)}
        onAssign={() => {
          // Refresh ticket data
          fetchTicketById(id || '');
        }}
      />
    </Container>
  );
};

export default TicketDetailPage; 