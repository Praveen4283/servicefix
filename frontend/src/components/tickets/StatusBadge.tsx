import React from 'react';
import { Chip, Typography, Box } from '@mui/material';
import { CheckCircle, Pending, Schedule, ErrorOutline, Block } from '@mui/icons-material';

interface StatusBadgeProps {
  status: {
    id: string;
    name: string;
    color: string;
  };
  size?: 'small' | 'medium';
  showIcon?: boolean;
  variant?: 'filled' | 'outlined';
}

/**
 * A component for displaying ticket status with appropriate styling and icons
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
  showIcon = true,
  variant = 'filled',
}) => {
  // Choose appropriate icon based on status name or id
  const getStatusIcon = () => {
    if (!status || !status.name) {
      return <Schedule fontSize="small" />; // Default/fallback icon
    }
    const statusName = status.name.toLowerCase();
    
    if (statusName.includes('resolved') || statusName.includes('complete') || statusName.includes('done')) {
      return <CheckCircle fontSize="small" />;
    }
    
    if (statusName.includes('pending') || statusName.includes('waiting')) {
      return <Pending fontSize="small" />;
    }
    
    if (statusName.includes('progress') || statusName.includes('working')) {
      return <Schedule fontSize="small" />;
    }
    
    if (statusName.includes('urgent') || statusName.includes('critical')) {
      return <ErrorOutline fontSize="small" />;
    }
    
    if (statusName.includes('closed') || statusName.includes('cancelled')) {
      return <Block fontSize="small" />;
    }
    
    // Default icon based on status ID
    switch (status.id) {
      case '1':
      case 'new':
        return <Schedule fontSize="small" />;
      case '2':
      case 'open':
      case 'in_progress':
        return <Schedule fontSize="small" />;
      case '3':
      case 'pending':
        return <Pending fontSize="small" />;
      case '4':
      case 'resolved':
        return <CheckCircle fontSize="small" />;
      case '5':
      case 'closed':
        return <Block fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };
  
  if (!status) {
    // Render a placeholder or default badge if status is undefined
    return (
      <Chip
        label="Unknown"
        size={size}
        variant={variant === 'filled' ? 'filled' : 'outlined'}
        icon={showIcon ? <Schedule fontSize="small" /> : undefined}
        sx={{ 
          bgcolor: variant === 'filled' ? 'grey.300' : undefined,
          color: variant === 'filled' ? 'grey.800' : 'text.secondary',
          fontWeight: 500,
        }}
      />
    );
  }
  
  // For outlined variant
  if (variant === 'outlined') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {showIcon && (
          <Box
            component="span"
            sx={{
              color: status.color,
              display: 'flex',
              alignItems: 'center',
              mr: 0.5,
            }}
          >
            {getStatusIcon()}
          </Box>
        )}
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          component="span"
          sx={{ 
            color: status.color,
            fontWeight: 'medium',
          }}
        >
          {status.name}
        </Typography>
      </Box>
    );
  }
  
  // For filled variant (default)
  return (
    <Chip
      icon={showIcon ? getStatusIcon() : undefined}
      label={status.name}
      size={size}
      sx={{
        backgroundColor: status.color,
        color: '#fff',
        fontWeight: 500,
        textTransform: 'capitalize',
        '& .MuiChip-icon': {
          color: 'inherit',
        },
      }}
    />
  );
};

export default StatusBadge; 