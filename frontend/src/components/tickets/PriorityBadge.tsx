import React from 'react';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import { 
  KeyboardDoubleArrowUp, 
  KeyboardArrowUp, 
  HorizontalRule, 
  KeyboardArrowDown 
} from '@mui/icons-material';

interface PriorityBadgeProps {
  priority: {
    id: string;
    name: string;
    color: string;
  };
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined' | 'minimal';
  showTooltip?: boolean;
}

/**
 * A component for displaying ticket priority with appropriate styling and icons
 */
const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'medium',
  variant = 'filled',
  showTooltip = false,
}) => {
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
    // Render a placeholder or default badge if priority is undefined
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