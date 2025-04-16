import React from 'react';
import { 
  Button, 
  Tooltip, 
  IconButton, 
  Badge, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  Box,
  useTheme,
  Chip,
  alpha,
  Paper,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  List,
  Avatar
} from '@mui/material';
import { 
  Cookie as CookieIcon,
  Settings as SettingsIcon, 
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Functions as FunctionalIcon,
  BarChart as AnalyticsIcon,
  Campaign as MarketingIcon
} from '@mui/icons-material';
import { useCookieConsent } from '../../context/CookieConsentContext';

// Component props
interface CookieStatusIndicatorProps {
  variant?: 'icon' | 'button';
  placement?: 'footer' | 'header';
}

// Cookie Status Indicator component
const CookieStatusIndicator: React.FC<CookieStatusIndicatorProps> = ({ 
  variant = 'icon',
  placement = 'footer'
}) => {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { 
    consentPreferences, 
    isConsentGiven, 
    setShowConsentBanner
  } = useCookieConsent();
  
  // Calculate number of enabled cookie categories
  const enabledCategories = Object.entries(consentPreferences)
    .filter(([key, value]) => key !== 'lastUpdated' && value === true)
    .length;
  
  // Get total number of possible categories (excluding lastUpdated)
  const totalCategories = Object.keys(consentPreferences).filter(key => key !== 'lastUpdated').length;
  
  // Handle opening cookie banner
  const handleManageCookies = () => {
    setShowConsentBanner(true);
    setDialogOpen(false);
  };
  
  // Toggle dialog
  const handleToggleDialog = () => {
    setDialogOpen(!dialogOpen);
  };
  
  // Get an appropriate color based on consent status
  const getStatusColor = () => {
    if (!isConsentGiven) return theme.palette.grey[500]; // No consent given yet
    
    const ratio = enabledCategories / totalCategories;
    if (ratio === 1) return theme.palette.success.main; // All accepted
    if (ratio === 0.25) return theme.palette.error.main; // Only necessary
    return theme.palette.primary.main; // Some accepted
  };
  
  // Get status text
  const getStatusText = () => {
    if (!isConsentGiven) return 'No Preference Set';
    
    const ratio = enabledCategories / totalCategories;
    if (ratio === 1) return 'All Cookies Enabled';
    if (ratio === 0.25) return 'Essential Only';
    return `${enabledCategories}/${totalCategories} Categories Enabled`;
  };
  
  // Render status label
  const StatusLabel = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 0.5
      }}
    >
      <Box 
        sx={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          bgcolor: getStatusColor(), 
          boxShadow: `0 0 0 2px ${alpha(getStatusColor(), 0.2)}`
        }} 
      />
      <Typography 
        variant="caption"
        sx={{ 
          fontWeight: 500,
          color: theme.palette.mode === 'dark' 
            ? theme.palette.grey[400] 
            : theme.palette.text.secondary
        }}
      >
        {getStatusText()}
      </Typography>
    </Box>
  );
  
  // Get badge content based on preferences
  const badgeContent = isConsentGiven ? enabledCategories : '!';
  
  // Render different variants
  if (variant === 'icon') {
    return (
      <>
        <Tooltip 
          title="Cookie Settings" 
          arrow
        >
          <IconButton 
            onClick={handleToggleDialog}
            size="small"
            sx={{
              position: 'relative',
              color: getStatusColor(),
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'scale(1.1)',
                color: theme.palette.primary.main
              }
            }}
          >
            <Badge 
              badgeContent={badgeContent} 
              color={isConsentGiven ? (
                enabledCategories === totalCategories ? "success" : "primary"
              ) : "error"}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.65rem', 
                  height: 16, 
                  minWidth: 16,
                  padding: '0 4px'
                }
              }}
            >
              <CookieIcon fontSize={placement === 'header' ? 'small' : 'medium'} />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <Dialog 
          open={dialogOpen} 
          onClose={handleToggleDialog}
          PaperProps={{
            elevation: 24,
            sx: {
              borderRadius: 3,
              width: 300,
              maxWidth: '90vw',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
              <CookieIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              Cookie Status
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ px: 2, pt: 0 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current cookie preferences for this website:
              </Typography>
              
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(getStatusColor(), 0.05),
                  borderColor: alpha(getStatusColor(), 0.3),
                  mb: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      color: getStatusColor(), 
                      fontWeight: 'bold',
                      mr: 1
                    }}
                  >
                    {enabledCategories}
                  </Typography>
                  <Box>
                    <Typography variant="body2" sx={{ lineHeight: 1.2 }}>out of</Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.2 }}>{totalCategories} categories</Typography>
                  </Box>
                </Box>
                <Typography 
                  variant="body2" 
                  fontWeight="500" 
                  textAlign="center"
                  color={getStatusColor()}
                >
                  {getStatusText()}
                </Typography>
              </Paper>
              
              <List disablePadding sx={{ mb: 1 }}>
                <ListItem dense disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: consentPreferences.necessary ? theme.palette.success.main : 'transparent' }}>
                      {consentPreferences.necessary ? <CheckCircleIcon fontSize="small" /> : <SecurityIcon fontSize="small" />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Necessary" 
                    secondary="Always active"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                
                <ListItem dense disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar sx={{ 
                      width: 24, 
                      height: 24, 
                      bgcolor: consentPreferences.functional ? theme.palette.success.main : theme.palette.grey[300]
                    }}>
                      {consentPreferences.functional ? <CheckCircleIcon fontSize="small" /> : <FunctionalIcon fontSize="small" />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Functional" 
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
                
                <ListItem dense disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar sx={{ 
                      width: 24, 
                      height: 24, 
                      bgcolor: consentPreferences.analytics ? theme.palette.success.main : theme.palette.grey[300]
                    }}>
                      {consentPreferences.analytics ? <CheckCircleIcon fontSize="small" /> : <AnalyticsIcon fontSize="small" />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Analytics" 
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
                
                <ListItem dense disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar sx={{ 
                      width: 24, 
                      height: 24, 
                      bgcolor: consentPreferences.marketing ? theme.palette.success.main : theme.palette.grey[300]
                    }}>
                      {consentPreferences.marketing ? <CheckCircleIcon fontSize="small" /> : <MarketingIcon fontSize="small" />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Marketing" 
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </Box>
          </DialogContent>
          
          <Divider />
          
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleManageCookies}
              startIcon={<SettingsIcon />}
              variant="contained"
              fullWidth
              color="primary"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`
              }}
            >
              Manage Cookie Settings
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
  
  // Button variant
  return (
    <Button
      size="small"
      onClick={handleToggleDialog}
      startIcon={<CookieIcon fontSize="small" />}
      variant="text"
      sx={{
        color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[700],
        textTransform: 'none',
        fontWeight: 500,
        borderRadius: 2,
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
        }
      }}
    >
      Cookies <StatusLabel />
    </Button>
  );
};

export default CookieStatusIndicator; 