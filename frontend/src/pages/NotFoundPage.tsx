import React from 'react';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Error as ErrorIcon } from '@mui/icons-material';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '80vh',
          py: 5,
        }}
      >
        <ErrorIcon
          sx={{
            fontSize: 100,
            color: theme.palette.error.main,
            mb: 4,
            opacity: 0.6,
          }}
        />
        
        <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 700, mb: 2 }}>
          404
        </Typography>
        
        <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
            size="large"
          >
            Go to Home
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate(-1)}
            size="large"
          >
            Go Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFoundPage; 