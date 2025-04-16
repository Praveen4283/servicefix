import React from 'react';
import { 
  Box, 
  useTheme, 
  Container, 
  Typography,
  Button,
  Avatar,
  Rating,
  Grid,
  Card,
  CardContent,
  Chip,
  Fade
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DomainIcon from '@mui/icons-material/Domain';
import StoreIcon from '@mui/icons-material/Store';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

const TestimonialsSection: React.FC = () => {
  const theme = useTheme();
  const { ref: testimonialsRef, isVisible: isTestimonialsVisible } = useIntersectionObserver({
    threshold: 0.2,
    triggerOnce: true
  });
  
  // Match the feature card's state management exactly
  const [hoveredCard, setHoveredCard] = React.useState<number | null>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  
  // New state for quote animation
  const [activeQuotes, setActiveQuotes] = React.useState<{ [key: number]: boolean }>({});
  
  // Toggle quote animation for a specific card
  const toggleQuoteAnimation = (index: number) => {
    setActiveQuotes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  interface Testimonial {
    id: number;
    name: string;
    position: string;
    avatar: string;
    content: string;
    rating: number;
    company: string;
    logoColor: string;
    icon?: React.ReactNode;
  }

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      position: 'Support Manager',
      avatar: "https://randomuser.me/api/portraits/women/1.jpg",
      content: 'ServiceFix has transformed how we handle customer support. The AI-powered automation has reduced our response time by 60% and significantly improved customer satisfaction.',
      rating: 5,
      company: 'TechCorp',
      logoColor: '#3f51b5',
      icon: <DomainIcon fontSize="large" />
    },
    {
      id: 2,
      name: 'Michael Chen',
      position: 'CTO',
      content: 'The integration was seamless, and the AI suggestions are incredibly accurate. It\'s like having an extra team member who\'s always available and never gets tired.',
      avatar: "https://randomuser.me/api/portraits/men/2.jpg",
      rating: 5,
      company: 'StartupX',
      logoColor: '#FF6B6B',
      icon: <DomainIcon fontSize="large" />
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      position: 'Customer Success Director',
      content: 'We\'ve tried multiple helpdesk solutions, but ServiceFix stands out with its intelligent automations and intuitive interface. Our team was up and running in just a day.',
      avatar: "https://randomuser.me/api/portraits/women/3.jpg",
      rating: 5,
      company: 'Global Retail Inc.',
      logoColor: '#00bcd4',
      icon: <StoreIcon fontSize="large" />
    }
  ];
  
  return (
    <Box 
      ref={testimonialsRef}
      sx={{ 
        py: { xs: 10, md: 16 }, 
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #171923 0%, #0a1929 100%)' 
          : 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
        position: 'relative',
        overflow: 'hidden',
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
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {/* Animated background shapes */}
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              borderRadius: '50%',
              background: i % 2 === 0 
                ? theme.palette.mode === 'dark' 
                  ? 'radial-gradient(circle, rgba(63,81,181,0.06) 0%, rgba(63,81,181,0) 70%)'
                  : 'radial-gradient(circle, rgba(63,81,181,0.03) 0%, rgba(63,81,181,0) 70%)'
                : theme.palette.mode === 'dark'
                  ? 'radial-gradient(circle, rgba(255,107,107,0.06) 0%, rgba(255,107,107,0) 70%)'
                  : 'radial-gradient(circle, rgba(255,107,107,0.03) 0%, rgba(255,107,107,0) 70%)',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              filter: 'blur(50px)',
              opacity: isTestimonialsVisible ? 1 : 0,
              transition: 'opacity 1s ease',
              animation: isTestimonialsVisible ? `float ${Math.random() * 20 + 10}s linear infinite` : 'none',
              '@keyframes float': {
                '0%': { transform: 'translateY(0) scale(1)' },
                '50%': { transform: `translateY(${Math.random() * 80 - 40}px) scale(${Math.random() * 0.3 + 0.9})` },
                '100%': { transform: 'translateY(0) scale(1)' }
              }
            }}
          />
        ))}
        
        {/* Add decorative quote marks in background */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            fontFamily: '"Georgia", serif',
            fontSize: '15rem',
            opacity: theme.palette.mode === 'dark' ? 0.05 : 0.03,
            color: theme.palette.mode === 'dark' ? '#90caf9' : theme.palette.primary.main,
            lineHeight: 0.8,
            transform: 'rotate(-10deg)',
            userSelect: 'none',
            animation: isTestimonialsVisible ? 'fadeIn 2s ease-out' : 'none',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: theme.palette.mode === 'dark' ? 0.05 : 0.03 }
            }
          }}
        >
          "
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            right: '8%',
            fontFamily: '"Georgia", serif',
            fontSize: '15rem',
            opacity: theme.palette.mode === 'dark' ? 0.05 : 0.03,
            color: theme.palette.mode === 'dark' ? '#90caf9' : theme.palette.primary.main,
            lineHeight: 0.8,
            transform: 'rotate(10deg)',
            userSelect: 'none',
            animation: isTestimonialsVisible ? 'fadeIn 2s ease-out' : 'none',
          }}
        >
          "
        </Box>
      </Box>
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section header */}
        <Fade in={isTestimonialsVisible} timeout={800}>
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: { xs: 8, md: 12 },
              maxWidth: '800px',
              mx: 'auto',
              px: 2,
              position: 'relative',
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
                animation: isTestimonialsVisible ? 'scaleIn 1s ease-out' : 'none',
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
                animation: isTestimonialsVisible ? 'fadeInUp 0.6s ease-out' : 'none',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              TESTIMONIALS
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
                animation: isTestimonialsVisible ? 'fadeInUp 0.8s ease-out' : 'none',
              }}
            >
              What Our Clients Say
            </Typography>
            <Typography 
              variant="h6" 
              color="textSecondary" 
              sx={{ 
                fontWeight: 400,
                animation: isTestimonialsVisible ? 'fadeInUp 1s ease-out' : 'none',
                maxWidth: '800px', 
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Discover how businesses of all sizes are transforming their customer support operations with our platform
            </Typography>
          </Box>
        </Fade>

        {/* Testimonial cards in a staggered grid */}
        <Grid 
          container 
          spacing={4} 
          sx={{ 
            mt: 4,
            transformStyle: 'preserve-3d',
            perspective: '1000px',
          }}
        >
          {testimonials.map((testimonial, index) => (
            <Grid 
              item 
              xs={12} 
              md={4} 
              key={index}
              sx={{
                display: 'flex',
                transform: isTestimonialsVisible 
                  ? 'none' 
                  : `translateY(${40 + index * 20}px) rotateX(10deg)`,
                opacity: isTestimonialsVisible ? 1 : 0,
                transition: `all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.2}s`,
              }}
            >
              <Card 
                elevation={0}
                ref={(el) => cardRefs.current[index] = el}
                onMouseEnter={() => {
                  setHoveredCard(index);
                  // Start quote animation when hovering
                  setTimeout(() => toggleQuoteAnimation(index), 200);
                }}
                onMouseLeave={() => {
                  setHoveredCard(null);
                  // Reset quote animation when no longer hovering
                  setTimeout(() => toggleQuoteAnimation(index), 200);
                }}
                sx={{ 
                  width: '100%',
                  height: '100%',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 10px 30px rgba(0,0,0,0.2)'
                    : '0 10px 30px rgba(0,0,0,0.05)',
                  '&:hover': {
                    transform: 'translateY(-12px)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 20px 40px rgba(0,0,0,0.4)'
                      : '0 20px 40px rgba(0,0,0,0.1)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    background: `linear-gradient(90deg, ${testimonial.logoColor}, #FF6B6B)`,
                    transform: 'scaleX(0.2)',
                    transformOrigin: 'left',
                    transition: 'transform 0.4s ease-out',
                    opacity: 0.7,
                    zIndex: 10,
                  },
                  '&:hover::before': {
                    transform: 'scaleX(1)',
                    opacity: 1,
                  },
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.03)',
                }}
              >
                {/* Large decorative quote mark - visible on hover */}
                <Box 
                  className="quote-mark"
                  sx={{ 
                    position: 'absolute',
                    top: '10px',
                    right: '15px',
                    fontFamily: '"Georgia", serif',
                    fontSize: '120px',
                    lineHeight: 1,
                    color: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.03)' 
                      : 'rgba(63,81,181,0.03)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease-out',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  "
                </Box>
              
                <CardContent sx={{ 
                  p: 4, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  zIndex: 2,
                }}>
                  {/* User avatar and information in a row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      sx={{ 
                        width: 70, 
                        height: 70, 
                        mr: 2,
                        border: '2px solid',
                        borderColor: testimonial.logoColor,
                        transition: 'all 0.4s ease',
                        transform: hoveredCard === index ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: hoveredCard === index 
                          ? '0 10px 20px rgba(0,0,0,0.1)'
                          : 'none',
                      }}
                    />
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700,
                          color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {testimonial.name}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {testimonial.position}
                      </Typography>
                      
                      {/* Rating row inside name/position box for better layout */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          mt: 0.5,
                        }}
                      >
                        <Rating 
                          value={testimonial.rating} 
                          readOnly 
                          precision={0.5} 
                          size="small"
                          sx={{
                            '& .MuiRating-iconFilled': {
                              color: theme.palette.mode === 'dark' ? testimonial.logoColor : 'primary.main',
                            },
                            transition: 'all 0.3s ease',
                            fontSize: '0.8rem',
                          }}
                        />
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            ml: 1, 
                            fontWeight: 500,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {testimonial.rating}.0
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Testimonial text with animated quote marks */}
                  <Box sx={{ position: 'relative', mb: 3, flex: 1 }}>
                    {/* Opening quote mark */}
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: -10, 
                        left: -5,
                        fontFamily: '"Georgia", serif',
                        fontSize: '28px',
                        color: testimonial.logoColor,
                        opacity: activeQuotes[index] ? 0.8 : 0.3,
                        transition: 'all 0.4s ease',
                        transform: activeQuotes[index] ? 'translateY(-3px)' : 'translateY(0)',
                      }}
                    >
                      "
                    </Box>
                    
                    <Typography 
                      variant="body1" 
                      color="text.secondary" 
                      sx={{ 
                        flex: 1,
                        lineHeight: 1.6,
                        fontSize: '1rem',
                        opacity: theme.palette.mode === 'dark' ? 0.9 : 0.85,
                        fontStyle: 'italic',
                        pl: 2,
                        pr: 2,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {testimonial.content}
                    </Typography>
                    
                    {/* Closing quote mark */}
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        bottom: -20, 
                        right: -5,
                        fontFamily: '"Georgia", serif',
                        fontSize: '28px',
                        color: testimonial.logoColor,
                        opacity: activeQuotes[index] ? 0.8 : 0.3,
                        transition: 'all 0.4s ease',
                        transform: activeQuotes[index] ? 'translateY(3px)' : 'translateY(0)',
                      }}
                    >
                      "
                    </Box>
                  </Box>
                  
                  {/* Company chip */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={testimonial.company}
                      size="small"
                      icon={testimonial.icon ? 
                        React.cloneElement(testimonial.icon as React.ReactElement, { 
                          style: { fontSize: '1rem' },
                        }) : undefined}
                      sx={{
                        background: theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.03)' 
                          : 'rgba(0,0,0,0.04)',
                        borderRadius: '8px',
                        color: testimonial.logoColor,
                        transition: 'all 0.3s ease',
                        opacity: 0.9,
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: `${testimonial.logoColor}40`,
                        '& .MuiChip-icon': {
                          color: testimonial.logoColor,
                        }
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default TestimonialsSection; 