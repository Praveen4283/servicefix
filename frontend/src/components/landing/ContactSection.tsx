import React from 'react';
import { Box, Container, Typography, Grid, TextField, Button, useTheme, Paper, Fade } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import { 
  getGradientTextStyles,
  getTitleGradientStyles
} from '../../utils/styles/landingStyles';
import { List, ListItem } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const ContactSection: React.FC = () => {
  const theme = useTheme();
  const { ref, isVisible } = useIntersectionObserver({ 
    threshold: 0.1,
    triggerOnce: true 
  });

  // Custom styles that ensure visibility regardless of intersection state
  const sectionHeaderStyles = {
    mb: 2, 
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    display: 'inline-block',
    color: '#fff', // Force white color
    opacity: 1,
    animation: 'fadeInUp 0.6s ease-out',
    '@keyframes fadeInUp': {
      '0%': { opacity: 0, transform: 'translateY(20px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' }
    }
  };

  const sectionTitleStyles = {
    mb: 3, 
    fontWeight: 800,
    color: '#fff', // Force white color
    opacity: 1,
    animation: 'fadeInUp 0.8s ease-out',
  };

  const sectionSubtitleStyles = {
    fontWeight: 400,
    animation: 'fadeInUp 1s ease-out',
    maxWidth: '800px', 
    mx: 'auto',
    lineHeight: 1.6,
    mb: 4,
    opacity: 1,
    color: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white
  };

  return (
    <Box
      ref={ref}
      id="contact"
      sx={{
        position: 'relative',
        py: { xs: 8, md: 12 },
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #3f51b5 0%, #FF6B6B 100%)',
      }}
    >
      {/* Background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)`,
          backgroundSize: '20px 20px',
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6} sx={{
            opacity: 1,
            animation: 'fadeInLeft 0.8s ease-out',
            '@keyframes fadeInLeft': {
              '0%': { opacity: 0, transform: 'translateX(-20px)' },
              '100%': { opacity: 1, transform: 'translateX(0)' }
            }
          }}>
            <Box sx={{ 
              textAlign: { xs: 'center', md: 'left' }, 
              mb: { xs: 4, md: 0 }, 
              pr: { md: 6 },
              position: 'relative',
              zIndex: 2
            }}>
              {/* Small decorative element above title */}
              <Box 
                sx={{ 
                  width: '60px', 
                  height: '4px', 
                  background: '#fff',
                  mx: { xs: 'auto', md: 0 },
                  mb: 3,
                  borderRadius: '2px',
                  animation: isVisible ? 'scaleIn 1s ease-out' : 'none',
                  '@keyframes scaleIn': {
                    from: { transform: 'scaleX(0)' },
                    to: { transform: 'scaleX(1)' }
                  }
                }} 
              />
              
              <Typography variant="h6" sx={sectionHeaderStyles}>
                GET IN TOUCH
              </Typography>
              <Typography variant="h2" sx={sectionTitleStyles}>
                Let's Start a Conversation
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{
                  fontWeight: 400,
                  animation: 'fadeInUp 1s ease-out',
                  lineHeight: 1.6,
                  mb: 4,
                  opacity: 1,
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                Have questions about our platform or pricing? Need a personalized demo?
                Our team is ready to help you get started with the perfect solution.
              </Typography>

              <List component="ul" sx={{ mb: 4, pl: 0, listStyle: 'none' }}>
                <ListItem sx={{ 
                  display: 'flex', 
                  mb: 2, 
                  p: 0,
                  color: 'white',
                  animation: 'fadeInUp 1.2s ease-out'
                }}>
                  <PhoneIcon sx={{ mr: 2 }} />
                  <Typography>+1 (555) 123-4567</Typography>
                </ListItem>
                <ListItem sx={{ 
                  display: 'flex', 
                  mb: 2, 
                  p: 0,
                  color: 'white',
                  animation: 'fadeInUp 1.4s ease-out'
                }}>
                  <EmailIcon sx={{ mr: 2 }} />
                  <Typography>support@servicefix.com</Typography>
                </ListItem>
                <ListItem sx={{ 
                  display: 'flex', 
                  p: 0,
                  color: 'white',
                  animation: 'fadeInUp 1.6s ease-out'
                }}>
                  <LocationOnIcon sx={{ mr: 2 }} />
                  <Typography>123 Business Ave, San Francisco, CA 94107</Typography>
                </ListItem>
              </List>
            </Box>
          </Grid>

          <Grid item xs={12} md={6} sx={{
            opacity: 1,
            animation: 'fadeInRight 0.8s ease-out',
            '@keyframes fadeInRight': {
              '0%': { opacity: 0, transform: 'translateX(20px)' },
              '100%': { opacity: 1, transform: 'translateX(0)' }
            },
            position: 'relative',
            zIndex: 2
          }}>
            <Paper elevation={0} sx={{
              p: 4,
              borderRadius: 4,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(255, 255, 255, 0.6)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
            }}>
              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="First Name"
                      InputLabelProps={{
                        sx: { color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit' }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Last Name"
                      InputLabelProps={{
                        sx: { color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit' }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
                
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Email Address"
                  InputLabelProps={{
                    sx: { color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Company"
                  InputLabelProps={{
                    sx: { color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  label="Message"
                  InputLabelProps={{
                    sx: { color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
                
                <Button 
                  variant="contained" 
                  color="primary"
                  size="large"
                  endIcon={<SendIcon />}
                  sx={{ 
                    py: 1.5,
                    px: 3,
                    fontWeight: 600,
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Send Message
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactSection; 