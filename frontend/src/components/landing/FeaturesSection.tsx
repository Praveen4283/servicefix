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

// Feature card interface
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  chips?: string[];
}

// Feature card component with enhanced animation, 3D effects, and chips
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, chips }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;  // -0.5 to 0.5
    const y = (e.clientY - top) / height - 0.5;  // -0.5 to 0.5
    
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <Card
      ref={cardRef}
      elevation={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      sx={{
        height: '100%',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: isHovered 
          ? `perspective(1000px) rotateX(${mousePosition.y * -8}deg) rotateY(${mousePosition.x * 8}deg) translateY(-12px)`
          : 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)',
        transformStyle: 'preserve-3d',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
        boxShadow: isHovered 
          ? theme.palette.mode === 'dark'
            ? '0 20px 40px rgba(0,0,0,0.4)'
            : '0 20px 40px rgba(0,0,0,0.1)'
          : theme.palette.mode === 'dark'
            ? '0 10px 30px rgba(0,0,0,0.2)'
            : '0 10px 30px rgba(0,0,0,0.05)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #3f51b5, #FF6B6B)',
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0.2)',
          transformOrigin: 'left',
          transition: 'transform 0.4s ease-out',
          opacity: isHovered ? 1 : 0.7,
          zIndex: 10,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(63,81,181,0.05) 0%, rgba(255,107,107,0.05) 100%)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          zIndex: 1,
        },
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' 
          ? 'rgba(255,255,255,0.05)' 
          : 'rgba(0,0,0,0.03)',
      }}
    >
      <CardContent sx={{ 
        p: 4, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        zIndex: 2,
        transform: isHovered ? `translateZ(20px)` : 'translateZ(0)',
        transition: 'transform 0.4s ease-out',
      }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            width: 70,
            height: 70,
            borderRadius: '16px',
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, rgba(63,81,181,0.15) 0%, rgba(255,107,107,0.15) 100%)' 
              : 'linear-gradient(135deg, rgba(63,81,181,0.08) 0%, rgba(255,107,107,0.08) 100%)',
            color: theme.palette.mode === 'dark' ? '#90caf9' : '#3f51b5',
            fontSize: '2.2rem',
            transition: 'all 0.4s ease',
            transform: isHovered ? `scale(1.1) rotate(5deg) translateZ(30px)` : 'scale(1) rotate(0) translateZ(0)',
            boxShadow: isHovered 
              ? '0 10px 20px rgba(63,81,181,0.2)' 
              : '0 6px 12px rgba(63,81,181,0.1)',
          }}
        >
          {icon}
        </Box>
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            position: 'relative',
            display: 'inline-block',
            transition: 'all 0.3s ease',
            mb: 2,
            color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
            transform: isHovered ? 'translateZ(20px)' : 'translateZ(0)',
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            mb: 3,
            flex: 1,
            lineHeight: 1.6,
            fontSize: '1rem',
            opacity: 0.85
          }}
        >
          {description}
        </Typography>
        {chips && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {chips.map((chip, index) => (
              <Chip
                key={index}
                label={chip}
                size="small"
                sx={{
                  background: isHovered
                    ? 'linear-gradient(90deg, rgba(63,81,181,0.08), rgba(255,107,107,0.08))'
                    : theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.05)' 
                      : 'rgba(0,0,0,0.04)',
                  color: theme.palette.mode === 'dark' ? '#fff' : 'text.primary',
                  fontWeight: 500,
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  py: 1,
                  border: '1px solid',
                  borderColor: isHovered
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(63,81,181,0.15)'
                    : 'transparent',
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Features section component with enhanced animations
const FeaturesSection: React.FC = () => {
  const theme = useTheme();
  const { ref: featuresSectionRef, isVisible: isFeaturesVisible } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '0px'
  });
  
  // Features array matching LandingPage.tsx
  const features = [
    {
      icon: <AutoAwesomeIcon fontSize="large" />,
      title: 'AI-Powered Automation',
      description: 'Automate ticket classification, routing, and response suggestions with advanced AI capabilities.',
      chips: ['Machine Learning', 'NLP', 'Automation']
    },
    {
      icon: <AnalyticsIcon fontSize="large" />,
      title: 'Smart Analytics',
      description: 'Get actionable insights with real-time analytics and customizable dashboards.',
      chips: ['Real-time', 'Predictive', 'Custom Reports']
    },
    {
      icon: <ApiIcon fontSize="large" />,
      title: 'Seamless Integration',
      description: 'Connect with your favorite tools and customize workflows to match your needs.',
      chips: ['API', 'Webhooks', 'Custom Apps']
    },
    {
      icon: <SecurityIcon fontSize="large" />,
      title: 'Enterprise Security',
      description: 'Bank-grade security with SSO, 2FA, and compliance with major security standards.',
      chips: ['SSO', 'GDPR', 'ISO 27001']
    },
    {
      icon: <ChatIcon fontSize="large" />,
      title: 'Live Chat Support',
      description: 'Engage with customers in real-time through AI-powered chat with smart routing and instant responses.',
      chips: ['Real-time', 'AI Chat', 'Instant Support']
    },
    {
      icon: <QueryStatsIcon fontSize="large" />,
      title: 'Knowledge Management',
      description: 'Create, organize, and share knowledge articles with an intuitive, powerful knowledge base.',
      chips: ['AI Suggestions', 'Templates', 'Version Control']
    }
  ];
  
  return (
    <Box 
      ref={featuresSectionRef}
      id="features"
      sx={{ 
        py: { xs: 10, md: 16 },
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #171923 0%, #0a1929 100%)' 
          : 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decorations with parallax effect */}
      <Box 
        sx={{ 
          position: 'absolute',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(63,81,181,0.05) 0%, rgba(63,81,181,0) 70%)',
          top: '10%',
          right: '-10%',
          filter: 'blur(80px)',
          zIndex: 0,
          animation: isFeaturesVisible ? 'float 30s ease-in-out infinite alternate' : 'none',
          '@keyframes float': {
            '0%': { transform: 'translateY(0) scale(1)' },
            '100%': { transform: 'translateY(5%) scale(1.05)' },
          },
        }}
      />
      <Box 
        sx={{ 
          position: 'absolute',
          width: '40%',
          height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,107,0.05) 0%, rgba(255,107,107,0) 70%)',
          bottom: '10%',
          left: '-10%',
          filter: 'blur(80px)',
          zIndex: 0,
          animation: isFeaturesVisible ? 'float2 25s ease-in-out infinite alternate' : 'none',
          '@keyframes float2': {
            '0%': { transform: 'translateY(0) scale(1)' },
            '100%': { transform: 'translateY(-5%) scale(1.05)' },
          },
        }}
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section header with fade in animation */}
        <Fade in={isFeaturesVisible} timeout={800}>
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: { xs: 8, md: 12 },
              maxWidth: '800px',
              mx: 'auto',
              px: 2,
            }}
          >
            {/* Small decorative element above title */}
            <Box 
              sx={{ 
                width: '60px', 
                height: '4px', 
                background: 'linear-gradient(90deg, #3f51b5, #FF6B6B)',
                mx: 'auto',
                mb: 3,
                borderRadius: '2px',
                animation: isFeaturesVisible ? 'scaleIn 1s ease-out' : 'none',
                '@keyframes scaleIn': {
                  from: { transform: 'scaleX(0)' },
                  to: { transform: 'scaleX(1)' }
                }
              }} 
            />
            
            <Typography 
              variant="h6" 
              color="primary" 
              sx={{ 
                mb: 2, 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                display: 'inline-block',
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(90deg, #90caf9, #f48fb1)' 
                  : 'linear-gradient(90deg, #3f51b5, #f50057)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                animation: isFeaturesVisible ? 'fadeInUp 0.6s ease-out' : 'none',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              FEATURES
            </Typography>
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 3, 
                fontWeight: 800,
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(90deg, #fff, rgba(255,255,255,0.8))' 
                  : 'linear-gradient(90deg, #1a237e, #3949ab)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                animation: isFeaturesVisible ? 'fadeInUp 0.8s ease-out' : 'none',
              }}
            >
              Everything You Need in One Platform
            </Typography>
            <Typography 
              variant="h6" 
              color="textSecondary" 
              sx={{ 
                fontWeight: 400,
                animation: isFeaturesVisible ? 'fadeInUp 1s ease-out' : 'none',
              }}
            >
              Our AI-powered service desk combines all the tools you need to deliver exceptional support experiences
            </Typography>
          </Box>
        </Fade>

        {/* Features grid with staggered animation */}
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={feature.title}>
              <Fade
                in={isFeaturesVisible}
                timeout={800 + (index * 200)}
                style={{ 
                  transitionDelay: isFeaturesVisible ? `${index * 100}ms` : '0ms',
                  transform: isFeaturesVisible ? 'none' : 'translateY(40px)',
                  opacity: isFeaturesVisible ? 1 : 0,
                }}
              >
                <Box>
                  <FeatureCard {...feature} />
                </Box>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default FeaturesSection;