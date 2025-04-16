import React from 'react';
import { Avatar, Box, Typography, Chip, Tooltip, useTheme } from '@mui/material';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Alternative to firstName/lastName
  email?: string;
  avatarUrl?: string;
  role?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

interface UserAvatarProps {
  user?: User | null;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showEmail?: boolean;
  showRole?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A component for displaying user avatar with optional name, email, and role
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'medium',
  showName = true,
  showEmail = false,
  showRole = false,
  showStatus = false,
  onClick,
  clickable = false,
  tooltipPlacement = 'bottom',
}) => {
  const theme = useTheme();
  
  if (!user) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar
          sx={{
            width: size === 'small' ? 24 : size === 'medium' ? 32 : 48,
            height: size === 'small' ? 24 : size === 'medium' ? 32 : 48,
            bgcolor: 'action.disabled',
            fontSize: size === 'small' ? '0.8rem' : size === 'medium' ? '1rem' : '1.2rem',
          }}
        >
          ?
        </Avatar>
        {showName && (
          <Typography
            variant={size === 'small' ? 'caption' : 'body2'}
            sx={{ ml: 1, color: 'text.secondary' }}
          >
            Unassigned
          </Typography>
        )}
      </Box>
    );
  }
  
  // Get user's name from available properties
  const getDisplayName = () => {
    if (user.name) {
      return user.name;
    }
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    if (user.email) {
      // Return email without domain
      return user.email.split('@')[0];
    }
    
    return 'Unknown User';
  };
  
  // Get user's initials for avatar
  const getInitials = () => {
    if (user.name) {
      const parts = user.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.name[0].toUpperCase();
    }
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return '?';
  };
  
  // Get status color
  const getStatusColor = () => {
    if (!user.status) return undefined;
    
    switch (user.status) {
      case 'online':
        return theme.palette.success.main;
      case 'away':
        return theme.palette.warning.main;
      case 'busy':
        return theme.palette.error.main;
      case 'offline':
      default:
        return theme.palette.grey[500];
    }
  };
  
  const displayName = getDisplayName();
  const contentBox = (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        cursor: (clickable || onClick) ? 'pointer' : 'default',
        '&:hover': {
          opacity: (clickable || onClick) ? 0.8 : 1,
        }
      }}
      onClick={onClick}
    >
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={user.avatarUrl}
          alt={displayName}
          sx={{
            width: size === 'small' ? 24 : size === 'medium' ? 32 : 48,
            height: size === 'small' ? 24 : size === 'medium' ? 32 : 48,
            fontSize: size === 'small' ? '0.8rem' : size === 'medium' ? '1rem' : '1.2rem',
          }}
        >
          {getInitials()}
        </Avatar>
        
        {showStatus && user.status && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: size === 'small' ? 8 : size === 'medium' ? 10 : 12,
              height: size === 'small' ? 8 : size === 'medium' ? 10 : 12,
              borderRadius: '50%',
              bgcolor: getStatusColor(),
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        )}
      </Box>
      
      {(showName || showEmail || showRole) && (
        <Box sx={{ ml: 1 }}>
          {showName && (
            <Typography
              variant={size === 'small' ? 'body2' : 'body1'}
              sx={{ fontWeight: 500, lineHeight: 1.2 }}
            >
              {displayName}
            </Typography>
          )}
          
          {showEmail && user.email && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block' }}
            >
              {user.email}
            </Typography>
          )}
          
          {showRole && user.role && (
            <Chip
              label={user.role}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
            />
          )}
        </Box>
      )}
    </Box>
  );
  
  // If onClick is provided but not showing any text details, wrap in tooltip
  if ((!showName && !showEmail && !showRole) || (onClick && !showName)) {
    return (
      <Tooltip title={displayName} placement={tooltipPlacement} arrow>
        {contentBox}
      </Tooltip>
    );
  }
  
  return contentBox;
};

export default UserAvatar; 