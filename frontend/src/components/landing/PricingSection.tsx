import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Card, Button, Switch, FormControlLabel, useTheme, Divider, List, ListItem, ListItemIcon, ListItemText, Fade } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

interface PricingPlan {
  id: number;
  title: string;
  description: string;
  price: {
    monthly: number;
    annually: number;
  };
  features: Array<{
    text: string;
    included: boolean;
  }>;
  isPopular?: boolean;
  buttonText: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 1,
    title: "Starter",
    description: "Perfect for individuals and small teams just getting started.",
    price: {
      monthly: 29,
      annually: 24,
    },
    features: [
      { text: "Up to 5 team members", included: true },
      { text: "Basic analytics", included: true },
      { text: "10GB storage", included: true },
      { text: "Email support", included: true },
      { text: "Advanced security", included: false },
      { text: "Custom branding", included: false },
      { text: "API access", included: false },
      { text: "Priority support", included: false },
    ],
    buttonText: "Get Started",
  },
  {
    id: 2,
    title: "Professional",
    description: "Ideal for growing businesses and teams with more demands.",
    price: {
      monthly: 79,
      annually: 69,
    },
    features: [
      { text: "Up to 15 team members", included: true },
      { text: "Advanced analytics", included: true },
      { text: "100GB storage", included: true },
      { text: "Priority email support", included: true },
      { text: "Advanced security", included: true },
      { text: "Custom branding", included: true },
      { text: "API access", included: false },
      { text: "24/7 phone support", included: false },
    ],
    isPopular: true,
    buttonText: "Go Professional",
  },
  {
    id: 3,
    title: "Enterprise",
    description: "Advanced features and support for large-scale organizations.",
    price: {
      monthly: 199,
      annually: 179,
    },
    features: [
      { text: "Unlimited team members", included: true },
      { text: "Enterprise analytics", included: true },
      { text: "Unlimited storage", included: true },
      { text: "Dedicated support", included: true },
      { text: "Advanced security", included: true },
      { text: "Custom branding", included: true },
      { text: "API access", included: true },
      { text: "24/7 priority support", included: true },
    ],
    buttonText: "Contact Sales",
  }
];

const PricingSection: React.FC = () => {
  const theme = useTheme();
  const [annualBilling, setAnnualBilling] = useState(true);
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 });

  const handleBillingChange = () => {
    setAnnualBilling(!annualBilling);
  };

  return (
    <Box 
      component="section" 
      id="pricing" 
      sx={{ 
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}
      ref={ref}
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
          animation: isVisible ? 'float 30s ease-in-out infinite alternate' : 'none',
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
          animation: isVisible ? 'float2 25s ease-in-out infinite alternate' : 'none',
          '@keyframes float2': {
            '0%': { transform: 'translateY(0) scale(1)' },
            '100%': { transform: 'translateY(-5%) scale(1.05)' },
          },
        }}
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section header with fade in animation */}
        <Fade in={isVisible} timeout={800}>
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
                animation: isVisible ? 'scaleIn 1s ease-out' : 'none',
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
                animation: isVisible ? 'fadeInUp 0.6s ease-out' : 'none',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              PRICING PLANS
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
                animation: isVisible ? 'fadeInUp 0.8s ease-out' : 'none',
              }}
            >
              Choose the Perfect Plan
            </Typography>
            <Typography 
              variant="h6" 
              color="textSecondary" 
              sx={{ 
                fontWeight: 400,
                animation: isVisible ? 'fadeInUp 1s ease-out' : 'none',
                maxWidth: '800px', 
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Flexible pricing options designed to fit businesses of all sizes. Select the plan that works best for your needs.
            </Typography>

            {/* Billing toggle */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              mb: 6,
              animation: isVisible ? 'fadeInUp 1s ease-out' : 'none',
            }}>
              <Typography variant="body1" sx={{ mr: 1 }}>Monthly</Typography>
              <FormControlLabel
                control={<Switch checked={annualBilling} onChange={handleBillingChange} />}
                label=""
              />
              <Typography variant="body1" sx={{ ml: 1 }}>
                Annual
                <Typography
                  component="span"
                  sx={{
                    ml: 1,
                    backgroundColor: theme.palette.primary.main,
                    color: '#fff',
                    fontSize: '0.75rem',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  Save 15%
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Fade>

        <Grid container spacing={4}>
          {pricingPlans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id} sx={{
              animation: isVisible ? `fadeInUp ${0.6 + plan.id * 0.2}s ease-out` : 'none',
              opacity: isVisible ? 1 : 0,
              pt: 2,
            }}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  borderRadius: '20px',
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'visible',
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 10px 30px rgba(0,0,0,0.2)'
                    : '0 10px 30px rgba(0,0,0,0.05)',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.03)',
                  '&:hover': plan.isPopular ? {} : {
                    transform: 'translateY(-12px)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 20px 40px rgba(0,0,0,0.4)'
                      : '0 20px 40px rgba(0,0,0,0.1)'
                  },
                  ...(plan.isPopular && {
                    transform: 'scale(1.05)',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(63,81,181,0.1)'
                      : 'rgba(63,81,181,0.03)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 20px 40px rgba(0,0,0,0.4)'
                      : '0 20px 40px rgba(0,0,0,0.1)'
                  }),
                }}
              >
                {plan.isPopular && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -20,
                      right: 20,
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      py: 0.8,
                      px: 3,
                      borderRadius: '30px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 10px rgba(63,81,181,0.3)',
                      zIndex: 1,
                    }}
                  >
                    Most Popular
                  </Box>
                )}
                
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {plan.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 48 }}>
                  {plan.description}
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
                  ${annualBilling ? plan.price.annually : plan.price.monthly}
                  <Typography component="span" variant="body1" sx={{ fontWeight: 400, ml: 1 }}>
                    /month
                  </Typography>
                </Typography>
                {annualBilling && (
                  <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                    Billed annually (${plan.price.annually * 12}/year)
                  </Typography>
                )}
                
                <Divider sx={{ my: 3 }} />
                
                <List sx={{ flexGrow: 1, mb: 3 }}>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} disableGutters dense>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {feature.included ? (
                          <CheckCircleIcon color="primary" />
                        ) : (
                          <RemoveCircleOutlineIcon color="disabled" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature.text} 
                        sx={{ 
                          opacity: feature.included ? 1 : 0.6,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Button
                  variant={plan.isPopular ? "contained" : "outlined"}
                  color="primary"
                  size="large"
                  fullWidth
                  sx={{
                    py: 1.5,
                    borderRadius: '10px',
                    fontWeight: 600,
                    mt: 'auto',
                  }}
                >
                  {plan.buttonText}
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default PricingSection; 