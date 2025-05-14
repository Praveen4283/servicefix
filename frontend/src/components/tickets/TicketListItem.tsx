import React from 'react';
import { 
  Card, 
  CardContent, 
  Box, 
  Typography, 
  Chip, 
  Avatar, 
  Grid,
  Tooltip,
  alpha
} from '@mui/material';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import SLABadge from './SLABadge';
import { Ticket } from '../../types/ticket';

interface TicketListItemProps {
  ticket: Ticket;
  onClick?: (ticketId: number) => void;
}

const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      // Convert ticket.id to number if it's a string
      const ticketId = typeof ticket.id === 'string' ? parseInt(ticket.id, 10) : ticket.id;
      onClick(ticketId as number);
    }
  };

  const getTicketTitle = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
      <Typography 
        variant="subtitle1" 
        component="h3" 
        sx={{ 
          fontWeight: 600, 
          mr: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        <Link 
          to={`/tickets/${ticket.id}`} 
          style={{ 
            color: 'inherit', 
            textDecoration: 'none',
            display: 'block'
          }}
        >
          {ticket.subject}
        </Link>
      </Typography>
      
      {ticket.id && (
        <Chip
          label={`#${ticket.id}`}
          size="small"
          sx={{ 
            height: 20, 
            fontSize: '0.65rem',
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main'
          }}
        />
      )}
    </Box>
  );
  
  const getRequesterInfo = () => {
    const requesterName = ticket.requester 
      ? `${ticket.requester.firstName} ${ticket.requester.lastName}`.trim()
      : 'Unknown User';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar
          src={ticket.requester?.avatar}
          alt={requesterName}
          sx={{ width: 24, height: 24, mr: 1, fontSize: '0.8rem' }}
        >
          {requesterName.charAt(0)}
        </Avatar>
        <Typography variant="body2" color="text.secondary" noWrap>
          {requesterName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>•</Typography>
        <Tooltip title={new Date(ticket.createdAt).toLocaleString()}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
          </Typography>
        </Tooltip>
      </Box>
    );
  };
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        },
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {getTicketTitle()}
        {getRequesterInfo()}
        
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            <StatusBadge status={{
              id: String(ticket.status.id),
              name: ticket.status.name,
              color: ticket.status.color
            }} />
          </Grid>
          <Grid item>
            <PriorityBadge priority={{
              id: String(ticket.priority.id),
              name: ticket.priority.name,
              color: ticket.priority.color
            }} />
          </Grid>
          <Grid item>
            <SLABadge ticketId={ticket.id} />
          </Grid>
          
          <Grid item sx={{ ml: 'auto' }}>
            {ticket.assignee ? (
              <Tooltip title={`Assigned to: ${ticket.assignee.firstName} ${ticket.assignee.lastName}`}>
                <Avatar
                  src={ticket.assignee.avatar}
                  alt={`${ticket.assignee.firstName} ${ticket.assignee.lastName}`}
                  sx={{ width: 32, height: 32, fontSize: '0.8rem' }}
                >
                  {ticket.assignee.firstName.charAt(0)}
                </Avatar>
              </Tooltip>
            ) : (
              <Tooltip title="Unassigned">
                <Chip
                  label="Unassigned"
                  size="small"
                  sx={{ 
                    height: 24,
                    backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.1),
                    color: 'warning.main'
                  }}
                />
              </Tooltip>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TicketListItem; 