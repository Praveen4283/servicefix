import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Divider,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
  alpha,
  useTheme
} from '@mui/material';
import { 
  Security as SecurityIcon,
  Functions as FunctionalIcon,
  BarChart as AnalyticsIcon,
  Campaign as MarketingIcon 
} from '@mui/icons-material';
import { useCookieConsent, ConsentPreferences } from '../context/CookieConsentContext';
import AppLayout from '../components/layout/AppLayout';

const CookiesPage: React.FC = () => {
  const theme = useTheme();
  const { 
    consentPreferences, 
    updateConsentPreferences, 
    acceptAllCookies, 
    rejectAllCookies,
    isConsentGiven
  } = useCookieConsent();
  
  // Local state for managing preferences
  const [localPreferences, setLocalPreferences] = useState<Omit<ConsentPreferences, 'lastUpdated'>>({
    necessary: true,
    functional: consentPreferences.functional,
    analytics: consentPreferences.analytics,
    marketing: consentPreferences.marketing
  });
  
  // Update local state when context preferences change
  useEffect(() => {
    setLocalPreferences({
      necessary: true,
      functional: consentPreferences.functional,
      analytics: consentPreferences.analytics,
      marketing: consentPreferences.marketing
    });
  }, [consentPreferences]);
  
  // Handle toggle change
  const handleToggleChange = (category: keyof Omit<ConsentPreferences, 'lastUpdated'>) => {
    if (category === 'necessary') return; // Can't toggle necessary cookies
    
    const updatedPreferences = {
      ...localPreferences,
      [category]: !localPreferences[category]
    };
    
    setLocalPreferences(updatedPreferences);
  };
  
  // Save preferences
  const handleSavePreferences = () => {
    const { necessary, ...optionalPreferences } = localPreferences;
    updateConsentPreferences(optionalPreferences);
  };
  
  // Get formatted last updated date
  const getLastUpdatedText = () => {
    if (!consentPreferences.lastUpdated) return 'Not set yet';
    
    return new Date(consentPreferences.lastUpdated).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <AppLayout>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Cookie Settings
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage how we use cookies on this website. Some cookies are necessary for the website 
            to function properly and cannot be disabled.
          </Typography>
          
          {isConsentGiven && (
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Last updated: {getLastUpdatedText()}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Grid container spacing={3}>
            {/* Necessary Cookies */}
            <Grid item xs={12}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.05)
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <SecurityIcon 
                      sx={{ 
                        color: theme.palette.primary.main,
                        fontSize: 28
                      }} 
                    />
                    <Box flex={1}>
                      <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center"
                        mb={1}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          Essential Cookies
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={true}
                              disabled
                              color="primary"
                            />
                          }
                          label="Always Active"
                          labelPlacement="start"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        These cookies are necessary for the website to function properly and cannot be disabled. 
                        They are usually set in response to actions made by you such as logging in 
                        or filling in forms.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Functional Cookies */}
            <Grid item xs={12}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  borderColor: localPreferences.functional 
                    ? theme.palette.primary.main 
                    : theme.palette.divider,
                  bgcolor: localPreferences.functional 
                    ? alpha(theme.palette.primary.main, 0.05) 
                    : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <FunctionalIcon 
                      sx={{ 
                        color: localPreferences.functional 
                          ? theme.palette.primary.main 
                          : theme.palette.text.secondary,
                        fontSize: 28
                      }} 
                    />
                    <Box flex={1}>
                      <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center"
                        mb={1}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          Functional Cookies
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={localPreferences.functional}
                              onChange={() => handleToggleChange('functional')}
                              color="primary"
                            />
                          }
                          label={localPreferences.functional ? "Enabled" : "Disabled"}
                          labelPlacement="start"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        These cookies enable personalized features and remember your preferences 
                        (such as language or region selection) to enhance your experience.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Analytics Cookies */}
            <Grid item xs={12}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  borderColor: localPreferences.analytics 
                    ? theme.palette.primary.main 
                    : theme.palette.divider,
                  bgcolor: localPreferences.analytics 
                    ? alpha(theme.palette.primary.main, 0.05) 
                    : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <AnalyticsIcon 
                      sx={{ 
                        color: localPreferences.analytics 
                          ? theme.palette.primary.main 
                          : theme.palette.text.secondary,
                        fontSize: 28
                      }} 
                    />
                    <Box flex={1}>
                      <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center"
                        mb={1}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          Analytics Cookies
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={localPreferences.analytics}
                              onChange={() => handleToggleChange('analytics')}
                              color="primary"
                            />
                          }
                          label={localPreferences.analytics ? "Enabled" : "Disabled"}
                          labelPlacement="start"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        These help us understand how visitors use our site, which pages are popular, 
                        and how visitors navigate. This helps us improve our website and services.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Marketing Cookies */}
            <Grid item xs={12}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  borderColor: localPreferences.marketing 
                    ? theme.palette.primary.main 
                    : theme.palette.divider,
                  bgcolor: localPreferences.marketing 
                    ? alpha(theme.palette.primary.main, 0.05) 
                    : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <MarketingIcon 
                      sx={{ 
                        color: localPreferences.marketing 
                          ? theme.palette.primary.main 
                          : theme.palette.text.secondary,
                        fontSize: 28
                      }} 
                    />
                    <Box flex={1}>
                      <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center"
                        mb={1}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          Marketing Cookies
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={localPreferences.marketing}
                              onChange={() => handleToggleChange('marketing')}
                              color="primary"
                            />
                          }
                          label={localPreferences.marketing ? "Enabled" : "Disabled"}
                          labelPlacement="start"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        These track your activity to help deliver more relevant advertising 
                        or to limit how many times you see an ad. They may be shared with third parties.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box 
            sx={{ 
              mt: 4, 
              display: 'flex', 
              gap: 2,
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              justifyContent: { xs: 'center', sm: 'flex-end' }
            }}
          >
            <Button 
              variant="outlined" 
              color="primary"
              onClick={rejectAllCookies}
              sx={{ 
                px: 3, 
                py: 1,
                borderRadius: 2,
                flex: { xs: '1 1 auto', sm: '0 0 auto' }
              }}
            >
              Reject All
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={acceptAllCookies}
              sx={{ 
                px: 3, 
                py: 1,
                borderRadius: 2,
                flex: { xs: '1 1 auto', sm: '0 0 auto' }
              }}
            >
              Accept All
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSavePreferences}
              sx={{ 
                px: 3, 
                py: 1,
                borderRadius: 2,
                flex: { xs: '1 1 auto', sm: '0 0 auto' }
              }}
            >
              Save Preferences
            </Button>
          </Box>
        </Paper>
      </Container>
    </AppLayout>
  );
};

export default CookiesPage; 