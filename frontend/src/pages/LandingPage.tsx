import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar, 
  Toolbar, 
  IconButton, 
  useTheme, 
  CssBaseline, 
  Container,
  ThemeProvider, 
  Typography,
  Button,
  Stack,
  Menu,
  MenuItem,
  Drawer,
  List as MuiList,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  Divider,
  Tooltip,
  Fade,
  Avatar,
  Rating,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { lightTheme, darkTheme } from '../theme';
// Import HeroSection component from landing folder
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import PricingSection from '../components/landing/PricingSection';
import ContactSection from '../components/landing/ContactSection';
import FooterSection from '../components/landing/FooterSection';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/logo-animation.css';
import useIntersectionObserver from '../hooks/useIntersectionObserver';

// Navigation items
const navigationItems = [
  {
    label: 'Features',
    items: [
      { label: 'AI Automation', path: '/features/ai-automation' },
      { label: 'Analytics', path: '/features/analytics' },
      { label: 'Live Chat', path: '/features/live-chat' },
      { label: 'Team Collaboration', path: '/features/collaboration' }
    ]
  },
  {
    label: 'Solutions',
    items: [
      { label: 'Enterprise', path: '/solutions/enterprise' },
      { label: 'Small Business', path: '/solutions/small-business' },
      { label: 'Startups', path: '/solutions/startups' }
    ]
  },
  {
    label: 'Resources',
    items: [
      { label: 'Documentation', path: '/docs' },
      { label: 'API Reference', path: '/api' },
      { label: 'Community', path: '/community' },
      { label: 'Blog', path: '/blog' }
    ]
  },
  { label: 'Pricing', path: '/pricing' }
];

interface NewLandingPageProps {
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

// Header component replicated from the original LandingPage
const Header: React.FC<{ isDarkMode: boolean; onToggleTheme: () => void }> = ({ isDarkMode, onToggleTheme }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<{ [key: string]: null | HTMLElement }>({});

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, menuId: string) => {
    setAnchorEl({ ...anchorEl, [menuId]: event.currentTarget });
  };

  const handleMenuClose = (menuId: string) => {
    setAnchorEl({ ...anchorEl, [menuId]: null });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    Object.keys(anchorEl).forEach(key => handleMenuClose(key));
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{
        backgroundColor: isScrolled ? 'background.paper' : 'transparent',
        boxShadow: isScrolled ? 1 : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h5"
            component={Link}
            to="/"
            sx={{
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              flexGrow: { xs: 1, md: 0 }
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
                  height: { xs: 45, sm: 50 },
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
                fontSize: '1.4rem',
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

          {isMobile ? (
            <>
              <IconButton
                color={theme.palette.mode === 'dark' ? "inherit" : "default"}
                onClick={() => setMobileMenuOpen(true)}
                sx={{ 
                  ml: 2,
                  color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary'
                }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
              >
                <Box sx={{ width: 280, pt: 2 }}>
                  <MuiList>
                    {navigationItems.map((item, index) => (
                      <React.Fragment key={index}>
                        {item.items ? (
                          <>
                            <ListItem>
                              <Typography variant="subtitle2" color="text.secondary">
                                {item.label}
                              </Typography>
                            </ListItem>
                            {item.items.map((subItem, subIndex) => (
                              <ListItemButton
                                key={subIndex}
                                onClick={() => handleNavigate(subItem.path)}
                                sx={{ pl: 4 }}
                              >
                                <ListItemText primary={subItem.label} />
                              </ListItemButton>
                            ))}
                          </>
                        ) : (
                          <ListItemButton
                            onClick={() => handleNavigate(item.path!)}
                          >
                            <ListItemText primary={item.label} />
                          </ListItemButton>
                        )}
                      </React.Fragment>
                    ))}
                  </MuiList>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ px: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                      </Typography>
                      <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
                        <IconButton
                          onClick={onToggleTheme}
                          color={theme.palette.mode === 'dark' ? "inherit" : "default"}
                          sx={{
                            color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary',
                            '&:hover': {
                              transform: 'rotate(180deg)',
                              transition: 'transform 0.5s'
                            }
                          }}
                        >
                          {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      onClick={() => handleNavigate('/login')}
                      sx={{ mb: 1 }}
                    >
                      Log In
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => handleNavigate('/register')}
                    >
                      Start Free Trial
                    </Button>
                  </Box>
                </Box>
              </Drawer>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Stack
              direction="row"
              spacing={4}
              alignItems="center"
              sx={{ ml: 6, flexGrow: 1 }}
            >
              {navigationItems.map((item, index) => (
                <Box key={index}>
                  {item.items ? (
                    <>
                      <Button
                        color={theme.palette.mode === 'dark' ? "inherit" : "primary"}
                        endIcon={<KeyboardArrowDownIcon />}
                        onClick={(e) => handleMenuOpen(e, item.label)}
                        sx={{
                          color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        {item.label}
                      </Button>
                      <Menu
                        anchorEl={anchorEl[item.label]}
                        open={Boolean(anchorEl[item.label])}
                        onClose={() => handleMenuClose(item.label)}
                        MenuListProps={{
                          'aria-labelledby': `${item.label}-button`
                        }}
                        sx={{
                          mt: 1,
                          '& .MuiPaper-root': {
                            borderRadius: 2,
                            minWidth: 180
                          }
                        }}
                      >
                        {item.items.map((subItem, subIndex) => (
                          <MenuItem
                            key={subIndex}
                            onClick={() => handleNavigate(subItem.path)}
                          >
                            {subItem.label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </>
                  ) : (
                    <Button
                      color={theme.palette.mode === 'dark' ? "inherit" : "primary"}
                      onClick={() => handleNavigate(item.path!)}
                      sx={{
                        color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary',
                        '&:hover': {
                          color: 'primary.main'
                        }
                      }}
                    >
                      {item.label}
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
              <IconButton
                onClick={onToggleTheme}
                color={theme.palette.mode === 'dark' ? "inherit" : "default"}
                sx={{
                  mr: 1,
                  color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary',
                  '&:hover': {
                    transform: 'rotate(180deg)',
                    transition: 'transform 0.5s'
                  }
                }}
              >
                    {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
                
                <Button
                  color={theme.palette.mode === 'dark' ? "inherit" : "primary"}
                  variant={theme.palette.mode === 'dark' ? "text" : "outlined"}
                  onClick={() => navigate('/login')}
                  sx={{
                    color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary',
                    mr: 2,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      transition: 'transform 0.2s'
                    }
                  }}
                >
                  Log In
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/register')}
                  sx={{
                    borderRadius: '28px',
                    px: 3,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      transition: 'transform 0.2s'
                    }
                  }}
                >
                  Start Free Trial
                </Button>
          </Box>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

const LandingPage: React.FC<NewLandingPageProps> = ({ isDarkMode: externalDarkMode, onToggleTheme: externalToggleTheme }) => {
  const [internalDarkMode, setInternalDarkMode] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  // If external control is provided, use it; otherwise, manage state internally
  const darkMode = externalDarkMode !== undefined ? externalDarkMode : internalDarkMode;
  
  const toggleTheme = () => {
    if (externalToggleTheme) {
      externalToggleTheme();
    } else {
      setInternalDarkMode(!internalDarkMode);
      localStorage.setItem('darkMode', (!internalDarkMode).toString());
    }
  };

  // Load dark mode preference from localStorage on initial render when not externally controlled
  useEffect(() => {
    if (externalDarkMode === undefined) {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode !== null) {
        setInternalDarkMode(savedDarkMode === 'true');
      } else {
        // Use system preference as fallback
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setInternalDarkMode(prefersDarkMode);
      }
    }
  }, [externalDarkMode]);

  const currentTheme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
    <Box sx={{ 
      position: 'relative',
      overflowX: 'hidden', // Prevent horizontal scrolling from animations
    }}>
        <Header isDarkMode={darkMode} onToggleTheme={toggleTheme} />
        
      <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <ContactSection />
        <FooterSection />
    </Box>
    </ThemeProvider>
  );
};

export default LandingPage;