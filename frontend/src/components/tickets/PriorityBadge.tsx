import React from 'react';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import { 
  KeyboardDoubleArrowUp, 
  KeyboardArrowUp, 
  HorizontalRule, 
  KeyboardArrowDown 
} from '@mui/icons-material';
import { useTickets } from '../../context/TicketContext'; // Import useTickets

// Define the expected structure for a priority object
interface PriorityObject {
  id: string;
  name: string;
  color: string;
}

interface PriorityBadgeProps {
  priority?: PriorityObject | string | { id: string }; // Accept full object, ID string, or object with just ID
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined' | 'minimal';
  showTooltip?: boolean;
}

/**
 * A component for displaying ticket priority with appropriate styling and icons
 */
const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority: priorityInput, // Input can be object or string ID
  size = 'medium',
  variant = 'filled',
  showTooltip = false,
}) => {
  const { priorities: allPriorities } = useTickets(); // Get all priorities from context

  let priority: PriorityObject | undefined = undefined;

  if (typeof priorityInput === 'object' && priorityInput !== null) {
    if ('name' in priorityInput && 'color' in priorityInput) {
      // It's a full PriorityObject
      priority = priorityInput as PriorityObject;
    } else if ('id' in priorityInput && allPriorities) {
      // It's an object with at least an id, try to find the full object
      priority = allPriorities.find(p => p.id === priorityInput.id);
    }
  } else if (typeof priorityInput === 'string' && allPriorities) {
    // It's a string ID
    priority = allPriorities.find(p => p.id === priorityInput);
  }

  // Choose appropriate icon based on priority name or id
  const getPriorityIcon = () => {
    if (!priority || !priority.name) {
      return <HorizontalRule fontSize="small" />; // Default/fallback icon
    }
    const priorityName = priority.name.toLowerCase();
    
    if (priorityName.includes('urgent') || priorityName.includes('critical')) {
      return <KeyboardDoubleArrowUp fontSize="small" />;
    }
    
    if (priorityName.includes('high')) {
      return <KeyboardArrowUp fontSize="small" />;
    }
    
    if (priorityName.includes('low')) {
      return <KeyboardArrowDown fontSize="small" />;
    }
    
    if (priorityName.includes('medium') || priorityName.includes('normal')) {
      return <HorizontalRule fontSize="small" />;
    }
    
    // Default icon based on priority ID
    switch (priority.id) {
      case '1':
      case 'low':
        return <KeyboardArrowDown fontSize="small" />;
      case '2':
      case 'medium':
      case 'normal':
        return <HorizontalRule fontSize="small" />;
      case '3':
      case 'high':
        return <KeyboardArrowUp fontSize="small" />;
      case '4':
      case 'urgent':
      case 'critical':
        return <KeyboardDoubleArrowUp fontSize="small" />;
      default:
        return <HorizontalRule fontSize="small" />;
    }
  };
  
  if (!priority) {
    // Render a placeholder or default badge if priority is undefined or not found
    return (
      <Chip
        label="Unknown"
        size={size}
        variant={variant === 'filled' ? 'filled' : 'outlined'}
        icon={<HorizontalRule fontSize="small" />}
        sx={{ 
          bgcolor: variant === 'filled' ? 'grey.300' : undefined,
          color: variant === 'filled' ? 'grey.800' : 'text.secondary',
          fontWeight: 500,
        }}
      />
    );
  }
  
  const badge = (() => {
    // For minimal variant (just icon and color)
    if (variant === 'minimal') {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: priority.color,
          }}
        >
          {getPriorityIcon()}
        </Box>
      );
    }
    
    // For outlined variant
    if (variant === 'outlined') {
      return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
          <Box
            component="span"
            sx={{
              color: priority.color,
              display: 'flex',
              alignItems: 'center',
              mr: 0.5,
            }}
          >
            {getPriorityIcon()}
          </Box>
          <Typography
            variant={size === 'small' ? 'caption' : 'body2'}
            component="span"
            sx={{ 
              color: priority.color,
              fontWeight: 'medium',
            }}
          >
            {priority.name}
          </Typography>
        </Box>
      );
    }
    
    // For filled variant (default)
    return (
      <Chip
        icon={getPriorityIcon()}
        label={priority.name}
        size={size}
        sx={{
          backgroundColor: priority.color,
          color: '#fff',
          fontWeight: 500,
          textTransform: 'capitalize',
          '& .MuiChip-icon': {
            color: 'inherit',
          },
        }}
      />
    );
  })();
  
  if (showTooltip) {
    return (
      <Tooltip title={`Priority: ${priority.name}`} arrow>
        {badge}
      </Tooltip>
    );
  }
  
  return badge;
};

export default PriorityBadge; 