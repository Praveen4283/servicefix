import React, { useState, ReactNode } from 'react';
import '../../../src/styles/logo-animation.css';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Divider, 
  IconButton, 
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  alpha,
  Button,
  ListItemIcon,
  ListItemText,
  Container,
  Paper,
  List,
  ListItem,
  Link as MuiLink,
  Stack
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Book as KnowledgeBaseIcon,
  BarChart as ReportsIcon,
  InsertChart as BarChartIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationContainer, useNotification, NotificationMenu } from '../../context/NotificationContext';
import { useTheme as useThemeContext } from '../../context/ThemeContext';
import CookieStatusIndicator from '../common/CookieStatusIndicator';

// Layout props
interface AppLayoutProps {
  children: ReactNode;
}

// Unified layout component
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { toggleTheme, isDarkMode } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAuthenticated = !!user;
  const isAuthPage = location.pathname === '/login' || 
                    location.pathname === '/register' || 
                    location.pathname === '/forgot-password' || 
                    location.pathname.includes('/reset-password');
  
  // Handle profile menu
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Close profile menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle logout
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Menu items based on user role
  const getMenuItems = () => {
    if (!isAuthenticated) return [];
    
    const menuItems = [
      // Common items for all users
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        visible: true,
      },
      {
        text: 'Tickets',
        icon: <TicketIcon />,
        path: '/tickets',
        visible: true,
      },
      {
        text: 'Knowledge Base',
        icon: <KnowledgeBaseIcon />,
        path: '/knowledge',
        visible: true,
      },
    ];

    // Items only for agents and admins
    if (user?.role === 'admin' || user?.role === 'agent') {
      // Items for both agents and admins
      if (user?.role === 'agent') {
        menuItems.push(
          {
            text: 'Reports',
            icon: <ReportsIcon />,
            path: '/reports',
            visible: true,
          }
        );
      }
      
      // Admin-only items
      if (user?.role === 'admin') {
        menuItems.push(
          {
            text: 'Reports',
            icon: <ReportsIcon />,
            path: '/reports',
            visible: true,
          },
          {
            text: 'Analytics',
            icon: <BarChartIcon />,
            path: '/analytics',
            visible: true,
          },
          {
            text: 'Users',
            icon: <PeopleIcon />,
            path: '/users',
            visible: true,
          },
          {
            text: 'Settings',
            icon: <SettingsIcon />,
            path: '/settings',
            visible: true,
          }
        );
      }
    }

    return menuItems.filter(item => item.visible);
  };

  // Render user profile menu
  const renderProfileMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
        <ListItemIcon>
          <AccountIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  // Render mobile menu (only for authenticated users)
  const renderMobileMenu = isAuthenticated && (
    <Menu
      anchorEl={mobileMenuOpen ? document.body : null}
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: '100%',
          top: '64px !important',
          left: '0 !important',
          right: '0 !important',
          mt: 0,
          borderRadius: 0,
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
        },
      }}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
    >
      <List sx={{ width: '100%', p: 1 }}>
        {getMenuItems().map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              py: 1.5,
              bgcolor: location.pathname === item.path || 
                (location.pathname.startsWith(item.path) && item.path !== '/')
                ? alpha(theme.palette.primary.main, 0.1)
                : 'transparent',
              color: location.pathname === item.path || 
                (location.pathname.startsWith(item.path) && item.path !== '/')
                ? theme.palette.primary.main
                : theme.palette.text.primary,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: (location.pathname === item.path || 
                  (location.pathname.startsWith(item.path) && item.path !== '/'))
                  ? theme.palette.primary.main
                  : theme.palette.text.primary
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                fontWeight: 500,
                fontSize: '1rem'
              }}
            />
          </ListItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <ListItem 
          button
          onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
        >
          <ListItemIcon>
            <AccountIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItem>
        <ListItem 
          button
          onClick={toggleTheme}
        >
          <ListItemIcon>
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText primary={isDarkMode ? "Light Mode" : "Dark Mode"} />
        </ListItem>
        <ListItem 
          button
          onClick={() => { logout(); setMobileMenuOpen(false); }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Menu>
  );

  // Desktop navigation links
  const renderDesktopNavLinks = () => {
    const menuItems = getMenuItems();
    
    return (
      <>
        {menuItems.map((item) => (
          <Button
            key={item.text}
            startIcon={item.icon}
            onClick={() => handleNavigation(item.path)}
            sx={{
              mx: 0.5,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              color: theme.palette.text.primary,
              fontWeight: (location.pathname === item.path || 
                (location.pathname.startsWith(item.path) && item.path !== '/')) 
                ? 600 : 400,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            {item.text}
          </Button>
        ))}
      </>
    );
  };

  // Render authentication buttons (for unauthenticated users)
  const renderAuthButtons = () => (
    <Box>
      <Button 
        component={Link} 
        to="/login" 
        variant="outlined"
        sx={{ 
          mr: 2,
          color: theme.palette.mode === 'dark' ? 'inherit' : 'text.primary',
          '&:hover': {
            transform: 'translateY(-2px)',
            transition: 'transform 0.2s'
          }
        }}
      >
        Log In
      </Button>
      <Button 
        component={Link} 
        to="/register" 
        variant="contained"
        color="primary"
        sx={{ 
          borderRadius: '28px',
          px: 3,
          '&:hover': {
            transform: 'translateY(-2px)',
            transition: 'transform 0.2s'
          }
        }}
      >
        Register
      </Button>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      overflow: 'hidden',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #0a1929 0%, #171923 100%)' 
        : 'linear-gradient(135deg, #f8faff 0%, #f0f4fa 100%)',
    }}>
      {/* Background gradient elements */}
      {isAuthPage && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
        }}>
          <Box sx={{
            position: 'absolute',
            width: '70%',
            height: '70%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(63,81,181,0.07) 0%, rgba(63,81,181,0) 70%)',
            top: '-30%',
            right: '-20%',
            filter: 'blur(60px)',
          }} />
          <Box sx={{
            position: 'absolute',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,107,0.07) 0%, rgba(255,107,107,0) 70%)',
            bottom: '-20%',
            left: '-10%',
            filter: 'blur(60px)',
          }} />
        </Box>
      )}
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: '100%',
          zIndex: theme.zIndex.drawer + 2,
          backdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.8)
            : alpha(theme.palette.background.paper, 0.95),
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0,0,0,0.2)'
            : '0 4px 20px rgba(0,0,0,0.05)',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' 
            ? alpha(theme.palette.divider, 0.1) 
            : alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Container maxWidth={isAuthenticated ? false : (isAuthPage ? "lg" : "xl")} disableGutters={false}>
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: { xs: 2, sm: 2 } }}>
            {/* Left section: Logo and mobile menu toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Mobile menu toggle - only for authenticated users */}
              {isAuthenticated && isMobile && (
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="menu"
                  onClick={toggleMobileMenu}
                  sx={{ mr: 1, color: theme.palette.text.primary }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              {/* Logo */}
              <Box 
                component={Link} 
                to={isAuthenticated ? "/dashboard" : "/"} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  textDecoration: 'none',
                  mr: isAuthenticated ? 3 : 2 // Increase right margin when authenticated
                }}
              >
                <Box
                  component="img"
                  src="/android-chrome-192x192.png"
                  alt="ServiceFix"
                  className="logo-animation"
                  sx={{ 
                    height: { xs: 40, sm: 45 },
                    width: 'auto',
                    mr: 1,
                    display: 'block'
                  }}
                />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 800,
                    background: 'linear-gradient(45deg, #3f51b5, #FF6B6B)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
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
              </Box>

              {/* Desktop navigation (authenticated only) - Moved inside left section */}
              {isAuthenticated && !isMobile && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  {renderDesktopNavLinks()}
                </Box>
              )}
            </Box>
            
            {/* Right section: Different based on auth state */}
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                {/* Search Icon */}
                <IconButton 
                  color="inherit" 
                  onClick={() => navigate('/search')} 
                  size="large"
                  sx={{ color: theme.palette.text.primary, mx: { xs: 0.5, sm: 1 } }}
                >
                  <SearchIcon />
                </IconButton>

                {/* Theme Toggle Button */}
                <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                  <IconButton
                    color="inherit"
                    onClick={toggleTheme}
                    size="small"
                    sx={{ 
                      mr: 2,
                      color: theme.palette.text.primary,
                      transition: 'transform 0.3s, background 0.2s',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        transform: 'rotate(30deg)'
                      }
                    }}
                    aria-label="toggle dark/light mode"
                  >
                    {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
                
                {/* Notifications - replaced with NotificationMenu component */}
                <NotificationMenu />

                {/* User Profile */}
                <Tooltip title="Account settings">
                  <IconButton
                    edge="end"
                    onClick={handleProfileMenuOpen}
                    color="inherit"
                    sx={{ 
                      color: theme.palette.text.primary,
                      ml: { xs: 0.5, sm: 1 },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1)
                      }
                    }}
                  >
                    {user?.avatarUrl ? (
                      <Avatar 
                        src={user.avatarUrl} 
                        alt={`${user.firstName} ${user.lastName}`}
                        sx={{ 
                          width: 34, 
                          height: 34,
                          border: '2px solid',
                          borderColor: theme.palette.primary.main
                        }}
                      />
                    ) : (
                      <Avatar sx={{ 
                        width: 34, 
                        height: 34, 
                        bgcolor: theme.palette.primary.main,
                        border: '2px solid',
                        borderColor: theme.palette.primary.main
                      }}>
                        {user?.firstName?.charAt(0) || ''}
                        {user?.lastName?.charAt(0) || ''}
                      </Avatar>
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              // Authentication buttons for unauthenticated users
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                {/* Theme Toggle Button */}
                <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                  <IconButton
                    color="inherit"
                    onClick={toggleTheme}
                    size="small"
                    sx={{ 
                      mr: 2,
                      color: theme.palette.text.primary,
                      transition: 'transform 0.3s, background 0.2s',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        transform: 'rotate(30deg)'
                      }
                    }}
                    aria-label="toggle dark/light mode"
                  >
                    {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
                
                {renderAuthButtons()}
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main content */}
      {isAuthPage ? (
        // Auth pages layout (centered paper)
        <Container 
          maxWidth="sm" 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 4,
            mt: '64px',
            zIndex: 1,
            position: 'relative',
          }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 4,
              width: '100%',
              borderRadius: 3,
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.1)',
              border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.1 : 0.3)}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {children}
          </Paper>
        </Container>
      ) : (
        // App pages layout (full-width)
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            pt: '64px', // Space for AppBar
            px: 2, // Add light padding for authenticated users
            overflowX: 'hidden',
            background: isAuthenticated ? (
              theme.palette.mode === 'dark' 
                ? alpha(theme.palette.background.default, 0.9)
                : alpha(theme.palette.background.default, 0.6)
            ) : 'transparent',
            // Background gradient accents for authenticated pages
            position: 'relative',
            ...(isAuthenticated && {
              '&::before': {
                content: '""',
                position: 'fixed',
                top: 0,
                right: 0,
                width: { xs: '100%', lg: '35%' },
                height: { xs: '40%', lg: '100%' },
                background: theme.palette.mode === 'dark' 
                  ? `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.dark, 0.2)} 0%, transparent 60%)`
                  : `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 60%)`,
                zIndex: -1,
                pointerEvents: 'none'
              },
              '&::after': {
                content: '""',
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: { xs: '100%', lg: '30%' },
                height: { xs: '30%', lg: '60%' },
                background: theme.palette.mode === 'dark' 
                  ? `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.dark, 0.2)} 0%, transparent 60%)`
                  : `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.light, 0.2)} 0%, transparent 60%)`,
                zIndex: -1,
                pointerEvents: 'none'
              }
            })
          }}
        >
          {children}
        </Box>
      )}
      
      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 1.5,
          px: 2,
          mt: 'auto',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.7)
            : alpha(theme.palette.background.paper, 0.7),
        }}
      >
        <Container maxWidth={isAuthenticated ? false : "lg"} disableGutters={false}>
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
                fontSize: '0.7rem',
                color: theme.palette.text.secondary
              }}
            >
              © {new Date().getFullYear()} ServiceFix. All rights reserved.
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
                component={Link}
                to="/terms"
                variant="body2"
                underline="hover" 
                sx={{ 
                  color: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.primary.main, 0.8) 
                    : theme.palette.primary.main,
                  fontSize: '0.7rem',
                  '&:hover': { color: theme.palette.primary.light }
                }}
              >
                Terms
              </MuiLink>
              <MuiLink 
                component={Link}
                to="/privacy" 
                variant="body2"
                underline="hover" 
                sx={{ 
                  color: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.primary.main, 0.8) 
                    : theme.palette.primary.main,
                  fontSize: '0.7rem',
                  '&:hover': { color: theme.palette.primary.light }
                }}
              >
                Privacy
              </MuiLink>
              <MuiLink 
                component={Link}
                to="/cookies" 
                variant="body2"
                underline="hover" 
                sx={{ 
                  color: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.primary.main, 0.8) 
                    : theme.palette.primary.main,
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

      {/* Popups and Menus */}
      {isAuthenticated && renderProfileMenu}
      {isAuthenticated && renderMobileMenu}
      <NotificationContainer />
    </Box>
  );
};

export default AppLayout; 