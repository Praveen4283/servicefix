import React from 'react';
import { Box, Container, Typography, Grid, Link as MuiLink, Divider, IconButton, useTheme, Stack } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Link as RouterLink } from 'react-router-dom';
import '../../styles/logo-animation.css';

// Match the navigation structure from the top bar
const footerNavigation = [
  {
    title: 'Features',
    links: [
      { title: 'AI Automation', href: '/features/ai-automation' },
      { title: 'Analytics', href: '/features/analytics' },
      { title: 'Live Chat', href: '/features/live-chat' },
      { title: 'Team Collaboration', href: '/features/collaboration' }
    ]
  },
  {
    title: 'Solutions',
    links: [
      { title: 'Enterprise', href: '/solutions/enterprise' },
      { title: 'Small Business', href: '/solutions/small-business' },
      { title: 'Startups', href: '/solutions/startups' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { title: 'Documentation', href: '/docs' },
      { title: 'API Reference', href: '/api' },
      { title: 'Community', href: '/community' },
      { title: 'Blog', href: '/blog' }
    ]
  },
  {
    title: 'Company',
    links: [
      { title: 'About Us', href: '/about' },
      { title: 'Pricing', href: '/pricing' },
      { title: 'Contact Us', href: '#contact' }
    ]
  }
];

const FooterSection: React.FC = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box 
      component="footer" 
      sx={{
        py: { xs: 3, md: 4 },
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : '#0A1929',
        color: '#fff',
        borderTop: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          {/* Logo and social icons column */}
          <Grid item xs={12} sm={4} lg={3}>
            {/* Logo and brand section */}
            <Typography
              variant="h5"
              component={RouterLink}
              to="/"
              sx={{
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: '#fff',
                mb: 1.5
              }}
            >
              <Box
                className="logo-container"
                sx={{
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Box
                  component="img"
                  src="/android-chrome-192x192.png"
                  alt="ServiceFix"
                  className="logo-animation"
                  sx={{
                    height: { xs: 35, sm: 40 },
                    width: 'auto',
                    mr: 1.5,
                    display: 'block'
                  }}
                />
              </Box>
              <Typography
                component="span"
                sx={{
                  background: 'linear-gradient(45deg, #3f51b5, #FF6B6B)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  fontSize: { xs: '1.2rem', sm: '1.4rem' },
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    background: 'linear-gradient(45deg, #FF6B6B, #3f51b5)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    letterSpacing: '0.7px',
                    textShadow: '0 0 5px rgba(63, 81, 181, 0.3)'
                  }
                }}
              >
                ServiceFix
              </Typography>
            </Typography>
            
            {/* Tagline */}
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2, 
                opacity: 0.8, 
                maxWidth: 280, 
                fontSize: '0.8rem',
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.8)' : '#fff' 
              }}
            >
              AI-powered service automation platform for seamless customer support
            </Typography>
            
            {/* Social media icons */}
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              {[FacebookIcon, TwitterIcon, LinkedInIcon].map((Icon, index) => (
                <IconButton 
                  key={index}
                  aria-label={`Social media ${index}`} 
                  size="small"
                  sx={{ 
                    color: '#fff',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      backgroundColor: 'primary.main',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)' 
                    }
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* Navigation links columns */}
          {footerNavigation.map((section, index) => (
            <Grid item xs={6} sm={2} key={section.title}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 1.5,
                  color: theme.palette.primary.main,
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.5px'
                }}
              >
                {section.title}
              </Typography>
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                {section.links.map((link) => (
                  <Box component="li" key={link.title} sx={{ mb: 1 }}>
                    <MuiLink 
                      component={RouterLink}
                      to={link.href}
                      underline="none"
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        transition: 'all 0.2s',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        '&:hover': { 
                          color: theme.palette.primary.light,
                          transform: 'translateX(3px)'
                        }
                      }}
                    >
                      {link.title}
                    </MuiLink>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        
        {/* Bottom section with copyright and legal links */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'row', 
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'nowrap'
          }}
        >
          {/* Copyright */}
          <Typography 
            variant="body2" 
            sx={{ 
              opacity: 0.7, 
              fontSize: '0.7rem' 
            }}
          >
            © {currentYear} ServiceFix. All rights reserved.
          </Typography>
          
          {/* Legal links */}
          <Stack 
            direction="row" 
            spacing={2} 
            sx={{ 
              justifyContent: 'center',
              flexWrap: 'nowrap'
            }}
          >
            <MuiLink 
              component={RouterLink}
              to="/terms"
              variant="body2"
              underline="hover" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.7rem',
                '&:hover': { color: theme.palette.primary.light }
              }}
            >
              Terms
            </MuiLink>
            <MuiLink 
              component={RouterLink}
              to="/privacy" 
              variant="body2"
              underline="hover" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.7rem',
                '&:hover': { color: theme.palette.primary.light }
              }}
            >
              Privacy
            </MuiLink>
            <MuiLink 
              component={RouterLink}
              to="/cookies" 
              variant="body2"
              underline="hover" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.7rem',
                '&:hover': { color: theme.palette.primary.light }
              }}
            >
              Cookies
            </MuiLink>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default FooterSection; 