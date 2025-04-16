import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  useTheme,
  Divider,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Avatar,
  Rating,
  Fade,
  IconButton,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  AppBar,
  Toolbar,
  Drawer,
  List as MuiList,
  ListItemButton,
  styled,
  Paper,
  Tabs,
  Tab,
  MobileStepper
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Support as SupportIcon,
  Speed as SpeedIcon,
  AutoAwesome as AutoAwesomeIcon,
  Security as SecurityIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Analytics as AnalyticsIcon,
  Api as ApiIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  QueryStats as QueryStatsIcon,
  Bolt as BoltIcon,
  Menu as MenuIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Business as BusinessIcon,
  Domain as DomainIcon,
  Store as StoreIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Computer as ComputerIcon,
  Apartment as ApartmentIcon,
  Cloud as CloudIcon,
  LocalHospital as HealthcareIcon, 
  School as EducationIcon,
  ShoppingCart as RetailIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/logo-animation.css';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

// Hero Section Component
const HeroSection: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [activeTextIndex, setActiveTextIndex] = useState(0);
  const [isTextChanging, setIsTextChanging] = useState(false);
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '0px'
  });
  
  const textOptions = [
    'Customer Service',
    'Support Tickets',
    'IT Service Desk',
    'Field Operations',
    'Team Workflows'
  ];
  
  // Enhanced text rotation animation with proper transitions
  React.useEffect(() => {
    const rotateText = () => {
      setIsTextChanging(true);
      
      // Wait for fade out, then change text
      setTimeout(() => {
        setActiveTextIndex((activeTextIndex + 1) % textOptions.length);
        
        // Fade in new text with a slight delay
        setTimeout(() => {
          setIsTextChanging(false);
        }, 400);
      }, 400);
    };
    
    const interval = setInterval(rotateText, 4000);
    return () => clearInterval(interval);
  }, [activeTextIndex]);

  // Mouse parallax effect for 3D movement
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return; // Don't apply on mobile devices
    
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    // Calculate normalized position (-1 to 1)
    const x = (clientX / innerWidth) * 2 - 1;
    const y = (clientY / innerHeight) * 2 - 1;
    
    setMousePosition({ x, y });
  }, [isMobile]);
  
  return (
    <Box
      ref={ref}
      onMouseMove={handleMouseMove}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #0a1929 0%, #171923 100%)' 
          : 'linear-gradient(135deg, #f8faff 0%, #f0f4fa 100%)',
        pt: { xs: 12, md: 16 },
        pb: { xs: 10, md: 14 },
        overflow: 'hidden',
        perspective: '1000px', // Add perspective for 3D effect
      }}
    >
      {/* Enhanced hero image background with advanced parallax effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          opacity: theme.palette.mode === 'dark' ? 0.12 : 0.15,
          transform: `translate3d(${mousePosition.x * -20}px, ${mousePosition.y * -20}px, 0)`,
          transition: 'transform 0.1s ease-out',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(10,25,41,0.95) 0%, rgba(23,25,35,0.95) 100%)'
              : 'linear-gradient(135deg, rgba(248,250,255,0.95) 0%, rgba(240,244,250,0.95) 100%)',
            zIndex: 1,
          }
        }}
      >
        <Box
          component="img"
          src="/images/hero.png"
          alt="ServiceFix Platform Background"
          sx={{
            width: '110%',
            height: '110%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: theme.palette.mode === 'dark'
              ? 'brightness(0.2) blur(5px)'
              : 'brightness(1.2) blur(5px)',
            animation: 'parallaxBg 30s ease-in-out infinite alternate',
            '@keyframes parallaxBg': {
              '0%': { transform: 'scale(1) translate(-2%, -2%)' },
              '100%': { transform: 'scale(1.05) translate(2%, 2%)' },
            }
          }}
        />
      </Box>

      {/* Enhanced animated background elements with 3D effects */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 1,
        pointerEvents: 'none', // Don't interfere with mouse events
      }}>
        {/* Primary gradient orbs with enhanced 3D effect */}
        <Box sx={{
          position: 'absolute',
          width: '80%',
          height: '80%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(63,81,181,0.05) 0%, rgba(63,81,181,0) 70%)',
          top: '-20%',
          right: '-10%',
          filter: 'blur(30px)',
          animation: 'float 24s ease-in-out infinite alternate',
          transform: `translate3d(${mousePosition.x * -40}px, ${mousePosition.y * -40}px, 100px)`,
          transition: 'transform 0.3s ease-out',
        }} />
        <Box sx={{
          position: 'absolute',
          width: '70%',
          height: '70%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,107,0.05) 0%, rgba(255,107,107,0) 70%)',
          bottom: '-20%',
          left: '-10%',
          filter: 'blur(30px)',
          animation: 'float2 20s ease-in-out infinite alternate',
          transform: `translate3d(${mousePosition.x * 40}px, ${mousePosition.y * 40}px, 50px)`,
          transition: 'transform 0.3s ease-out',
          '@keyframes float2': {
            '0%': { transform: 'translate(0, 0) scale(1)' },
            '100%': { transform: 'translate(5%, 5%) scale(1.1)' },
          },
        }} />
        
        {/* 3D Animated floating elements */}
        {[...Array(3)].map((_, i) => (
          <Box 
            key={i}
            sx={{
              position: 'absolute',
              width: ['25vw', '20vw', '15vw'][i],
              height: ['25vw', '20vw', '15vw'][i],
              maxWidth: ['250px', '200px', '150px'][i],
              maxHeight: ['250px', '200px', '150px'][i],
              borderRadius: '50%',
              background: [
                'radial-gradient(circle, rgba(100,120,255,0.03) 0%, rgba(100,120,255,0) 70%)',
                'radial-gradient(circle, rgba(255,107,107,0.03) 0%, rgba(255,107,107,0) 70%)',
                'radial-gradient(circle, rgba(100,255,200,0.03) 0%, rgba(100,255,200,0) 70%)'
              ][i],
              top: ['15%', '60%', '30%'][i],
              left: ['10%', '70%', '60%'][i],
              filter: 'blur(20px)',
              animation: `pulse ${12 + i * 4}s ease-in-out infinite ${i * 2}s`,
              transform: `translate3d(${mousePosition.x * (10 + i * 10)}px, ${mousePosition.y * (10 + i * 10)}px, ${50 + i * 30}px) rotateX(${mousePosition.y * 10}deg) rotateY(${mousePosition.x * -10}deg)`,
              transition: 'transform 0.3s ease-out',
              '@keyframes pulse': {
                '0%': { opacity: 0.3, transform: 'scale(1) translateZ(0)' },
                '50%': { opacity: 0.7, transform: 'scale(1.1) translateZ(50px)' },
                '100%': { opacity: 0.3, transform: 'scale(1) translateZ(0)' },
              }
            }}
          />
        ))}
        
        {/* Optimized floating particles with 3D movement */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Box
            key={i + 'particle'}
            sx={{
              position: 'absolute',
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              borderRadius: '50%',
              background: i % 3 === 0 
                ? 'rgba(63,81,181,0.3)' 
                : i % 3 === 1
                  ? 'rgba(255,107,107,0.3)'
                  : 'rgba(100,255,200,0.3)',
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
              filter: 'blur(0.5px)',
              opacity: 0.6,
              transform: `translate3d(${mousePosition.x * (5 + i * 3)}px, ${mousePosition.y * (5 + i * 3)}px, ${i * 20}px)`,
              transition: 'transform 0.15s linear',
              animation: `floatParticle${i % 3} ${Math.random() * 15 + 10}s linear infinite ${i * 0.8}s`,
              '@keyframes floatParticle0': {
                '0%': { transform: 'translateY(0) translateX(0) translateZ(0) rotate(0deg)', opacity: 0 },
                '10%': { opacity: 0.6 },
                '90%': { opacity: 0.6 },
                '100%': { transform: 'translateY(-70vh) translateX(30px) translateZ(50px) rotate(360deg)', opacity: 0 }
              },
              '@keyframes floatParticle1': {
                '0%': { transform: 'translateY(0) translateX(0) translateZ(0) rotate(0deg)', opacity: 0 },
                '10%': { opacity: 0.6 },
                '90%': { opacity: 0.6 },
                '100%': { transform: 'translateY(-60vh) translateX(-40px) translateZ(30px) rotate(-360deg)', opacity: 0 }
              },
              '@keyframes floatParticle2': {
                '0%': { transform: 'translateY(0) translateX(0) translateZ(0) rotate(0deg)', opacity: 0 },
                '10%': { opacity: 0.6 },
                '90%': { opacity: 0.6 },
                '100%': { transform: 'translateY(-80vh) translateX(20px) translateZ(70px) rotate(180deg)', opacity: 0 }
              }
            }}
          />
        ))}
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Fade in={true} timeout={1000}>
              <Box
                sx={{
                  transform: isMobile ? 'none' : `translate3d(${mousePosition.x * -15}px, ${mousePosition.y * -15}px, 0)`,
                  transition: 'transform 0.2s ease-out',
                }}
              >
                {/* Enhanced eyebrow text with subtle animation */}
                <Box 
                  sx={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.08)' 
                      : 'rgba(63,81,181,0.08)',
                    borderRadius: '30px',
                    px: 2.5,
                    py: 1,
                    mb: 3,
                    backdropFilter: 'blur(4px)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 4px 20px rgba(0,0,0,0.08)'
                      : '0 4px 20px rgba(0,0,0,0.03)',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(63,81,181,0.15)',
                    animation: 'fadeSlideIn 1s ease-out',
                  }}
                >
                  <AutoAwesomeIcon 
                    sx={{ 
                      mr: 1, 
                      color: theme.palette.mode === 'dark' ? 'white' : 'primary.main',
                      textShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
                    }} 
                  />
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      color: theme.palette.mode === 'dark' ? 'white' : 'primary.main',
                      fontWeight: 600,
                      textShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
                    }}
                  >
                    AI-Powered Service Management
                  </Typography>
                </Box>
                
                {/* Enhanced heading with 3D gradient and animated text rotation */}
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.2rem', sm: '3rem', md: '3.5rem' },
                    fontWeight: 800,
                    mb: 2,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%)'
                      : 'linear-gradient(90deg, #1a237e 0%, #3949ab 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    textShadow: 'none',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    animation: 'fadeSlideIn 1.2s ease-out',
                    '@keyframes fadeSlideIn': {
                      '0%': { opacity: 0, transform: 'translateY(20px)' },
                      '100%': { opacity: 1, transform: 'translateY(0)' }
                    },
                    transform: isMobile ? 'none' : 'perspective(1000px) rotateX(1deg)',
                  }}
                >
                  Transform Your<br />
                  <Box 
                    sx={{ 
                      position: 'relative',
                      height: { xs: '3rem', sm: '4rem', md: '5rem' },
                      overflow: 'hidden',
                      display: 'block',
                      marginTop: '0.2em',
                      width: '100%',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-block',
                        opacity: isTextChanging ? 0 : 1,
                        transform: isTextChanging ? 'translateY(20px)' : 'translateY(0)',
                        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(90deg, #90caf9, #f48fb1)'
                          : 'linear-gradient(90deg, #3f51b5, #f50057)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        fontWeight: 700,
                        textAlign: 'center',
                        px: 1,
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: '-8px',
                          left: 0,
                          width: '100%',
                          height: '2px',
                          background: 'linear-gradient(90deg, #3f51b5, #FF6B6B)',
                          borderRadius: '2px',
                          opacity: isTextChanging ? 0 : 0.7,
                          transition: 'opacity 0.4s ease-in-out',
                          display: 'block',
                        } 
                      }}
                    >
                      {textOptions[activeTextIndex]}
                    </Box>
                  </Box>
                </Typography>

                {/* Enhanced description with perspective */}
                <Typography
                  variant="h5"
                  sx={{
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    mb: 4,
                    maxWidth: 500,
                    fontWeight: 400,
                    lineHeight: 1.5,
                    animation: 'fadeSlideIn 1.4s ease-out',
                  }}
                >
                  Streamline customer support with our intelligent service desk platform that learns and evolves with your business.
                </Typography>

                {/* Enhanced call-to-action buttons with 3D effect */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 5 }}>
                  <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/register')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                      boxShadow: '0 10px 20px rgba(63,81,181,0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      animation: 'fadeSlideIn 1.6s ease-out',
                      transition: 'all 0.3s ease',
                      transform: `perspective(1000px) translateZ(0) scale(1) ${isMobile ? '' : `translate3d(${mousePosition.x * -5}px, ${mousePosition.y * -5}px, 0)`}`,
                      '&:hover': {
                        transform: 'scale(1.05) translateY(-3px)',
                        boxShadow: '0 15px 30px rgba(63,81,181,0.4)',
                      },
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        transition: 'all 0.6s ease',
                      },
                      '&:hover:before': {
                        left: '100%',
                      }
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{
                      py: 1.5,
                      px: 3,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                      borderWidth: '2px',
                      animation: 'fadeSlideIn 1.8s ease-out',
                      transition: 'all 0.3s ease',
                      transform: `perspective(1000px) translateZ(0) ${isMobile ? '' : `translate3d(${mousePosition.x * -3}px, ${mousePosition.y * -3}px, 0)`}`,
                      '&:hover': {
                        borderWidth: '2px',
                        transform: 'translateY(-3px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 8px 20px rgba(255,255,255,0.1)'
                          : '0 8px 20px rgba(0,0,0,0.08)',
                      }
                    }}
                  >
                    Log In
                  </Button>
                </Stack>
              </Box>
            </Fade>
          </Grid>
          
          {/* Enhanced image section with perspective 3D effect */}
          <Grid item xs={12} md={6}>
            <Fade in={true} timeout={1500}>
              <Box
                sx={{
                  position: 'relative',
                  mt: { xs: 2, md: 0 },
                  transformStyle: 'preserve-3d',
                  perspective: '1000px',
                  transform: isMobile ? 'none' : `translate3d(${mousePosition.x * 10}px, ${mousePosition.y * 10}px, 0) rotateY(${mousePosition.x * -3}deg) rotateX(${mousePosition.y * 3}deg)`,
                  transition: 'transform 0.3s ease-out',
                }}
              >
                {/* Floating UI elements to suggest product functionality */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '-5%',
                    right: '5%',
                    zIndex: 3,
                    background: theme.palette.mode === 'dark' ? 'rgba(30,40,60,0.8)' : 'rgba(255,255,255,0.85)',
                    borderRadius: '12px',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 10px 30px rgba(0,0,0,0.25)'
                      : '0 10px 30px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)',
                    p: 2,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(63,81,181,0.1)',
                    animation: 'floatUI 8s ease-in-out infinite',
                    transform: 'translateZ(50px) scale(0.9)',
                    '@keyframes floatUI': {
                      '0%': { transform: 'translateZ(50px) translateY(0) scale(0.9)' },
                      '50%': { transform: 'translateZ(50px) translateY(-15px) scale(0.9)' },
                      '100%': { transform: 'translateZ(50px) translateY(0) scale(0.9)' }
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Task completed</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Response time: 3m 24s</Typography>
                </Box>

                {/* New floating UI element on the left side */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '20%',
                    left: '-5%',
                    zIndex: 3, 
                    background: theme.palette.mode === 'dark' ? 'rgba(30,40,60,0.8)' : 'rgba(255,255,255,0.85)',
                    borderRadius: '12px',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 10px 30px rgba(0,0,0,0.25)'
                      : '0 10px 30px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)',
                    p: 2,
                    maxWidth: '160px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(63,81,181,0.1)',
                    animation: 'floatUI3 10s ease-in-out infinite 0.5s',
                    transform: 'translateZ(60px) scale(0.9)',
                    '@keyframes floatUI3': {
                      '0%': { transform: 'translateZ(60px) translateY(0) scale(0.9)' },
                      '50%': { transform: 'translateZ(60px) translateY(-12px) scale(0.9)' },
                      '100%': { transform: 'translateZ(60px) translateY(0) scale(0.9)' }
                    }
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <BoltIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Priority Status</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    New ticket from VIP customer requires immediate attention
                  </Typography>
                </Box>

                {/* AI Assistant floating UI element */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '0%',
                    left: '10%',
                    zIndex: 3,
                    background: theme.palette.mode === 'dark' ? 'rgba(30,40,60,0.8)' : 'rgba(255,255,255,0.85)',
                    borderRadius: '12px',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 10px 30px rgba(0,0,0,0.25)'
                      : '0 10px 30px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)',
                    p: 2,
                    maxWidth: '150px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(63,81,181,0.1)',
                    animation: 'floatUI2 9s ease-in-out infinite 1s',
                    transform: 'translateZ(80px) scale(0.85)',
                    '@keyframes floatUI2': {
                      '0%': { transform: 'translateZ(80px) translateY(0) scale(0.85)' },
                      '50%': { transform: 'translateZ(80px) translateY(-20px) scale(0.85)' },
                      '100%': { transform: 'translateZ(80px) translateY(0) scale(0.85)' }
                    }
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.8rem' }}>AI</Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>AI Assistant</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Suggestion: Categorize as "Network Issue"
                  </Typography>
                </Box>

                {/* Enhanced 3D hero image with advanced animations */}
                <Box
                  component="img"
                  src="/images/hero.png"
                  alt="ServiceFix Platform"
                  sx={{
                    width: '100%',
                    maxWidth: { xs: '100%', md: '120%' },
                    position: 'relative',
                    zIndex: 2,
                    borderRadius: '24px',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 30px 60px rgba(0,0,0,0.4), 0 0 30px rgba(63,81,181,0.15)'
                      : '0 30px 60px rgba(0,0,0,0.15), 0 0 30px rgba(63,81,181,0.1)',
                    transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg) translateZ(0)',
                    animation: 'float3D 8s ease-in-out infinite',
                    transition: 'all 0.3s ease',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(63,81,181,0.1)',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))',
                    '@keyframes float3D': {
                      '0%': { transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg) translateY(0px) translateZ(0)' },
                      '50%': { transform: 'perspective(1000px) rotateY(-8deg) rotateX(8deg) translateY(-15px) translateZ(30px)' },
                      '100%': { transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg) translateY(0px) translateZ(0)' }
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(45deg, rgba(63,81,181,0.1), rgba(255,107,107,0.1))',
                      borderRadius: '24px',
                      opacity: 0.5,
                      pointerEvents: 'none',
                    }
                  }}
                />
                
                {/* Enhanced decorative elements with glassmorphism */}
                <Box 
                  sx={{ 
                    position: 'absolute',
                    bottom: { xs: '-5%', md: '5%' },
                    right: { xs: '-5%', md: '-15%' },
                    width: '180px',
                    height: '180px',
                    borderRadius: '30px',
                    background: 'rgba(255,107,107,0.08)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 20px 40px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.05)'
                      : '0 20px 40px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.5)',
                    zIndex: 0,
                    animation: 'rotate 30s linear infinite',
                    '@keyframes rotate': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: '10px',
                      borderRadius: '25px',
                      border: '1px dashed rgba(255,255,255,0.15)',
                    }
                  }} 
                />
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: { xs: '-15%', md: '40%' },  // Move it down and away from Priority Status box
                    left: { xs: '-15%', md: '-20%' }, // Move it further left to avoid overlap
                    width: '140px',
                    height: '140px',
                    borderRadius: '24px',
                    background: 'rgba(63,81,181,0.08)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 20px 40px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.05)'
                      : '0 20px 40px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.5)',
                    zIndex: 0, // Keep lower z-index so it stays behind content
                    animation: 'rotate 40s linear infinite reverse',
                    opacity: 0.7, // Lower opacity to make it less distracting
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: '15px',
                      borderRadius: '12px',
                      border: '1px dashed rgba(255,255,255,0.15)',
                    }
                  }}
                />
                
                {/* Additional smaller geometric shapes */}
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: '40%',
                    right: '-5%',
                    width: '60px',
                    height: '60px',
                    borderRadius: '14px',
                    background: theme.palette.mode === 'dark' 
                      ? 'rgba(63,81,181,0.15)' 
                      : 'rgba(63,81,181,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transform: 'rotate(15deg)',
                    zIndex: 0,
                    animation: 'bounce 5s ease-in-out infinite',
                    '@keyframes bounce': {
                      '0%, 100%': { transform: 'rotate(15deg) translateY(0px)' },
                      '50%': { transform: 'rotate(15deg) translateY(-20px)' },
                    }
                  }} 
                />
                <Box 
                  sx={{ 
                    position: 'absolute',
                    bottom: '30%',
                    left: '-2%',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: theme.palette.mode === 'dark' 
                      ? 'rgba(255,107,107,0.15)' 
                      : 'rgba(255,107,107,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transform: 'rotate(-15deg)',
                    zIndex: 0,
                    animation: 'bounce 6s ease-in-out 1s infinite',
                  }} 
                />
              </Box>
            </Fade>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
export default HeroSection; 