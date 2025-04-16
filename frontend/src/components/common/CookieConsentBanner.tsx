import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControlLabel,
  Checkbox,
  Stack,
  Slide,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Divider,
  Avatar,
  Container,
  Switch,
  alpha,
  Chip
} from '@mui/material';
import { 
  Close as CloseIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Functions as FunctionalIcon,
  BarChart as AnalyticsIcon,
  Campaign as MarketingIcon,
  Check as CheckIcon,
  CookieOutlined as CookieIcon
} from '@mui/icons-material';
import { useCookieConsent, ConsentPreferences } from '../../context/CookieConsentContext';

// Banner component
const CookieConsentBanner: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const { 
    consentPreferences, 
    showConsentBanner, 
    setShowConsentBanner,
    acceptAllCookies, 
    rejectAllCookies, 
    updateConsentPreferences,
    isConsentGiven
  } = useCookieConsent();
  
  // Local state for managing preferences in the dialog
  const [tempPreferences, setTempPreferences] = useState<Omit<ConsentPreferences, 'lastUpdated'>>({
    necessary: true,
    functional: consentPreferences.functional,
    analytics: consentPreferences.analytics,
    marketing: consentPreferences.marketing
  });

  // Open detailed cookie preferences dialog
  const handleOpenDialog = () => {
    setDialogOpen(true);
    // Reset temp preferences to match current ones
    setTempPreferences({
      necessary: true,
      functional: consentPreferences.functional,
      analytics: consentPreferences.analytics,
      marketing: consentPreferences.marketing
    });
  };

  // Close dialog without saving
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Update temp preferences while in dialog
  const handlePreferenceChange = (category: keyof Omit<ConsentPreferences, 'lastUpdated'>) => {
    if (category === 'necessary') return; // Can't toggle necessary cookies
    setTempPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Save preferences from dialog
  const handleSavePreferences = () => {
    const { necessary, ...optionalPreferences } = tempPreferences;
    updateConsentPreferences(optionalPreferences);
    setDialogOpen(false);
  };

  // If banner is not supposed to be shown, don't render anything
  if (!showConsentBanner) {
    return null;
  }

  // Function to render each category card
  const renderCategoryCard = (
    title: string, 
    description: string, 
    icon: React.ReactNode, 
    category: keyof Omit<ConsentPreferences, 'lastUpdated'>,
    isRequired: boolean = false
  ) => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2.5, 
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        background: tempPreferences[category] 
          ? alpha(theme.palette.primary.main, 0.05)
          : theme.palette.background.paper,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[2]
        }
      }}
    >
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Avatar 
          sx={{ 
            bgcolor: tempPreferences[category] 
              ? theme.palette.primary.main 
              : alpha(theme.palette.text.primary, 0.1),
            color: tempPreferences[category] 
              ? theme.palette.primary.contrastText
              : theme.palette.text.primary,
            width: 40, 
            height: 40,
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {icon}
        </Avatar>
        <Box flex={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center">
              <Typography variant="subtitle1" fontWeight="600">
                {title}
              </Typography>
              {isRequired && (
                <Chip 
                  label="Required" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Box>
            <Switch
              checked={tempPreferences[category]}
              onChange={() => handlePreferenceChange(category)}
              disabled={isRequired}
              color="primary"
              size="small"
              sx={{ 
                '& .MuiSwitch-switchBase.Mui-checked': {
                  transform: 'translateX(16px)'
                }
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <>
      {/* Backdrop overlay with fade transition */}
      <Fade in={showConsentBanner} timeout={400}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: showConsentBanner ? 'block' : 'none',
            pointerEvents: 'all',
            margin: 0,
            padding: 0,
            outline: 'none'
          }}
          onClick={(e) => e.preventDefault()}
        />
      </Fade>
      
      {/* Main consent banner */}
      <Slide direction="up" in={showConsentBanner} mountOnEnter unmountOnExit>
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: { xs: 0, md: 20 },
            left: { xs: 0, md: 20 },
            right: { xs: 0, md: 'auto' },
            width: { md: '420px' },
            maxWidth: '100%',
            zIndex: 10000, // Using highest z-index possible
            borderRadius: { xs: '16px 16px 0 0', md: '16px' },
            overflow: 'hidden',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(100,100,255,0.2)' 
              : '0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(100,100,255,0.2)',
            backgroundColor: theme.palette.background.paper,
            margin: 0,
            padding: 0
          }}
        >
          <Box sx={{ 
            p: 0.5, 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
          }} />
          
          <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Box display="flex" alignItems="center" mb={2}>
              <CookieIcon
                sx={{ 
                  mr: 1.5, 
                  color: theme.palette.primary.main,
                  fontSize: 28
                }}
              />
              <Typography variant="h6" fontWeight="bold">
                Cookie Consent
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
              We use cookies to enhance your experience, analyze site traffic, and personalize content.
              By clicking "Accept All", you consent to our use of cookies.
            </Typography>
            
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
                mb: 1.5
              }}
            >
              <Button 
                variant="outlined" 
                color="primary"
                size="large"
                onClick={handleOpenDialog}
                startIcon={<SettingsIcon />}
                sx={{ 
                  borderRadius: '10px',
                  py: 1.2,
                  fontWeight: 600,
                  borderWidth: 1.5,
                  textTransform: 'none'
                }}
                fullWidth
              >
                Customize
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                onClick={acceptAllCookies}
                startIcon={<CheckIcon />}
                sx={{ 
                  borderRadius: '10px',
                  py: 1.2,
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  textTransform: 'none',
                  boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`
                }}
                fullWidth
              >
                Accept All
              </Button>
            </Box>
            
            <Button 
              color="inherit"
              size="small"
              onClick={rejectAllCookies}
              sx={{ 
                width: '100%',
                textTransform: 'none',
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: theme.palette.text.primary,
                }
              }}
            >
              Reject Non-Essential
            </Button>
          </Box>
        </Paper>
      </Slide>

      {/* Preferences dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="cookie-preferences-dialog-title"
        scroll="paper"
        sx={{
          zIndex: 10000, // Higher than backdrop and banner
          '& .MuiDialog-paper': {
            borderRadius: 3,
            maxHeight: { xs: '90vh', sm: '80vh' },
            overflowY: 'auto',
            margin: { xs: '16px', sm: '32px' },
            backgroundImage: theme.palette.mode === 'light' 
              ? 'radial-gradient(circle at top right, #f5f9ff, transparent)'
              : 'radial-gradient(circle at top right, #162032, transparent)',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(100,100,255,0.2)' 
              : '0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(100,100,255,0.2)',
          }
        }}
        PaperProps={{
          elevation: 24
        }}
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(5px)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <CookieIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
              <Typography variant="h6" fontWeight="bold">
                Privacy Preferences
              </Typography>
            </Box>
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={handleCloseDialog} 
              aria-label="close"
              sx={{
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Typography paragraph sx={{ mb: 3, lineHeight: 1.6 }}>
            Control how we use cookies on this site. Required cookies are necessary for the website 
            to function properly and cannot be disabled.
          </Typography>

          {renderCategoryCard(
            "Essential Cookies", 
            "These cookies are necessary for the website to function properly and cannot be disabled. They include cookies for session management and security.",
            <SecurityIcon />, 
            "necessary",
            true
          )}
          
          {renderCategoryCard(
            "Functional Cookies", 
            "These enable personalized features and remember your preferences (like language or region) to enhance your experience.",
            <FunctionalIcon />, 
            "functional"
          )}
          
          {renderCategoryCard(
            "Analytics Cookies", 
            "These help us understand how you use our site, which pages are popular, and how visitors navigate, helping us improve.",
            <AnalyticsIcon />, 
            "analytics"
          )}
          
          {renderCategoryCard(
            "Marketing Cookies", 
            "These track your online activity to help advertisers deliver more relevant ads or limit how many times you see an ad.",
            <MarketingIcon />, 
            "marketing"
          )}
        </DialogContent>
        
        <Divider />
        
        <DialogActions sx={{ 
          p: 3, 
          gap: 1.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
        }}>
          <Button 
            onClick={handleCloseDialog} 
            color="inherit"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              flex: { xs: '1 1 auto', sm: '0 0 auto' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={rejectAllCookies} 
            variant="outlined" 
            color="primary"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              flex: { xs: '1 1 auto', sm: '0 0 auto' }
            }}
          >
            Reject All
          </Button>
          <Button 
            onClick={acceptAllCookies} 
            variant="outlined" 
            color="primary"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              flex: { xs: '1 1 auto', sm: '0 0 auto' }
            }}
          >
            Accept All
          </Button>
          <Button 
            onClick={handleSavePreferences} 
            variant="contained" 
            color="primary"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
              flex: { xs: '1 1 auto', sm: '0 0 auto' }
            }}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner; 