import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Paper,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  FormatListBulleted as StatusIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  AddCircle as CreatedIcon,
  AttachFile as AttachmentIcon,
  Schedule as ScheduleIcon,
  Flag as PriorityIcon,
  FormatListBulleted as CategoryIcon,
} from '@mui/icons-material';

export interface TimelineEvent {
  id: string;
  type: 'comment' | 'status_change' | 'assignment' | 'created' | 'edited' | 'attachment' | 'due_date' | 'priority_change' | 'category_change';
  timestamp: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  details: {
    // For comments
    content?: string;
    isInternal?: boolean;
    
    // For status changes
    from?: string;
    to?: string;
    fromColor?: string;
    toColor?: string;
    
    // For assignments
    assignee?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    
    // For attachments
    fileName?: string;
    fileSize?: number;
    
    // For due date changes
    oldDate?: string;
    newDate?: string;
    
    // For priority changes
    oldPriority?: string;
    newPriority?: string;
    oldColor?: string;
    newColor?: string;
    
    // For category changes
    field?: string;
    oldValue?: string;
    newValue?: string;
  };
}

interface TicketTimelineProps {
  events: TimelineEvent[];
}

const TicketTimeline: React.FC<TicketTimelineProps> = ({ events }) => {
  const theme = useTheme();
  
  // Format date
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
  
  // Get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) return `${diffSec} sec ago`;
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
  };
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Get icon for event type
  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'comment':
        return <CommentIcon />;
      case 'status_change':
        return <StatusIcon />;
      case 'assignment':
        return <PersonIcon />;
      case 'created':
        return <CreatedIcon />;
      case 'edited':
        return <EditIcon />;
      case 'attachment':
        return <AttachmentIcon />;
      case 'due_date':
        return <ScheduleIcon />;
      case 'priority_change':
        return <PriorityIcon />;
      case 'category_change':
        return <CategoryIcon />;
      default:
        return <EditIcon />;
    }
  };
  
  // Get color for event type
  const getEventColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'comment':
        return event.details.isInternal ? theme.palette.warning.main : theme.palette.info.main;
      case 'status_change':
        return event.details.toColor || theme.palette.success.main;
      case 'assignment':
        return theme.palette.secondary.main;
      case 'created':
        return theme.palette.primary.main;
      case 'edited':
        return theme.palette.info.main;
      case 'attachment':
        return theme.palette.secondary.main;
      case 'due_date':
        return theme.palette.warning.main;
      case 'priority_change':
        return event.details.newColor || theme.palette.error.main;
      case 'category_change':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };
  
  // Get event title
  const getEventTitle = (event: TimelineEvent) => {
    const userName = `${event.user.firstName} ${event.user.lastName}`;
    
    switch (event.type) {
      case 'comment':
        return `${userName} ${event.details.isInternal ? 'added an internal note' : 'commented'}`;
      case 'status_change':
        return `${userName} changed status from "${event.details.from}" to "${event.details.to}"`;
      case 'assignment':
        if (event.details.assignee) {
          const assigneeName = `${event.details.assignee.firstName} ${event.details.assignee.lastName}`;
          return `${userName} assigned ticket to ${assigneeName}`;
        }
        return `${userName} unassigned the ticket`;
      case 'created':
        return `${userName} created this ticket`;
      case 'edited':
        return `${userName} edited the ticket`;
      case 'attachment':
        return `${userName} added attachment: ${event.details.fileName}`;
      case 'due_date':
        if (event.details.newDate) {
          return `${userName} ${event.details.oldDate ? 'updated' : 'set'} the due date to ${formatDate(event.details.newDate)}`;
        }
        return `${userName} removed the due date`;
      case 'priority_change':
        return `${userName} changed priority from "${event.details.oldPriority}" to "${event.details.newPriority}"`;
      case 'category_change':
        return `${userName} changed ${event.details.field} from "${event.details.oldValue}" to "${event.details.newValue}"`;
      default:
        return `${userName} updated the ticket`;
    }
  };
  
  if (!events || events.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body2" color="textSecondary">
          No activity yet
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {events.map((event, index) => (
        <Box key={event.id} sx={{ position: 'relative' }}>
          {/* Timeline Line */}
          {index < events.length - 1 && (
            <Box
              sx={{
                position: 'absolute',
                left: 16,
                top: 32,
                bottom: 0,
                width: 2,
                bgcolor: 'divider',
                zIndex: 0,
              }}
            />
          )}
          
          <Box display="flex" mb={3} sx={{ position: 'relative', zIndex: 1 }}>
            {/* Event Icon */}
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: getEventColor(event),
                mr: 2,
              }}
            >
              {getEventIcon(event)}
            </Avatar>
            
            {/* Event Content */}
            <Box flexGrow={1}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={0.5}
              >
                <Typography variant="subtitle2">
                  {getEventTitle(event)}
                  {event.details.isInternal && (
                    <Chip
                      size="small"
                      label="Internal"
                      color="warning"
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {getRelativeTime(event.timestamp)}
                </Typography>
              </Box>
              
              {/* Comment content */}
              {event.type === 'comment' && event.details.content && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mt: 1,
                    backgroundColor: event.details.isInternal
                      ? alpha(theme.palette.warning.light, 0.1)
                      : 'background.paper',
                    borderLeftColor: event.details.isInternal
                      ? theme.palette.warning.main
                      : undefined,
                    borderLeftWidth: event.details.isInternal ? 4 : 1,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {event.details.content}
                  </Typography>
                </Paper>
              )}
              
              {/* Attachment details */}
              {event.type === 'attachment' && event.details.fileName && (
                <Box
                  sx={{
                    mt: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AttachmentIcon
                    fontSize="small"
                    color="action"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" noWrap>
                    {event.details.fileName}
                    {event.details.fileSize && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="textSecondary"
                        sx={{ ml: 1 }}
                      >
                        ({formatFileSize(event.details.fileSize)})
                      </Typography>
                    )}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default TicketTimeline; 