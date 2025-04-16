import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  InputAdornment, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Paper,
  CircularProgress,
  CardHeader,
  useTheme,
  IconButton,
  Tooltip,
  Avatar,
  Fade,
  Zoom,
  Grow,
  alpha,
  Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import FolderIcon from '@mui/icons-material/Folder';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import StatsWidget from '../components/dashboard/StatsWidget';

import {
  pageContainer,
  pageHeaderSection,
  cardStyleSx,
  statsCardStyleSx,
  welcomeCardStyleSx,
  chartContainerStyle,
  buttonAnimation,
  fadeTransition
} from '../styles/commonStyles';

// Mock data
const mockCategories = [
  { id: 'cat1', name: 'Getting Started', count: 12 },
  { id: 'cat2', name: 'Account Management', count: 8 },
  { id: 'cat3', name: 'Billing & Payments', count: 10 },
  { id: 'cat4', name: 'Troubleshooting', count: 15 },
  { id: 'cat5', name: 'API Documentation', count: 7 },
  { id: 'cat6', name: 'Security', count: 5 }
];

const mockPopularArticles = [
  { id: 'art1', title: 'How to create your first ticket', views: 1524 },
  { id: 'art2', title: 'Troubleshooting common login issues', views: 1365 },
  { id: 'art3', title: 'Understanding your billing cycle', views: 982 },
  { id: 'art4', title: 'Two-factor authentication setup guide', views: 876 },
  { id: 'art5', title: 'API rate limits explained', views: 754 }
];

const mockRecentArticles = [
  { 
    id: 'art6', 
    title: 'New feature: AI-powered ticket suggestions',
    summary: 'Learn about our new AI features that help categorize and prioritize your tickets automatically.',
    tags: ['New Features', 'AI'],
    publishedDate: '2023-05-15'
  },
  { 
    id: 'art7', 
    title: 'Upcoming maintenance schedule',
    summary: 'Details about our planned maintenance windows for the next quarter.',
    tags: ['Maintenance', 'System Status'],
    publishedDate: '2023-05-10'
  },
  { 
    id: 'art8', 
    title: 'Best practices for organizing your tickets',
    summary: 'Tips and tricks for keeping your support tickets organized and efficient.',
    tags: ['Best Practices', 'Productivity'],
    publishedDate: '2023-05-05'
  }
];

const mockSearchResults = [
  { 
    id: 'art9', 
    title: 'Understanding ticket priorities',
    summary: 'Learn how our priority system works and how to set the right priority for your issues.',
    tags: ['Tickets', 'Best Practices'],
    category: 'Getting Started',
    publishedDate: '2023-04-20'
  },
  { 
    id: 'art10', 
    title: 'How priority affects response time',
    summary: 'Detailed explanation of how ticket priorities affect our response and resolution times.',
    tags: ['SLA', 'Response Time'],
    category: 'Troubleshooting',
    publishedDate: '2023-03-15'
  },
  { 
    id: 'art11', 
    title: 'Changing the priority of an existing ticket',
    summary: 'Step-by-step guide to updating the priority of tickets that have already been submitted.',
    tags: ['Tickets', 'How-to'],
    category: 'Account Management',
    publishedDate: '2023-02-28'
  }
];

// Stats for knowledge base
const knowledgeBaseStats = [
  {
    title: 'Total Articles',
    value: 157,
    icon: <LibraryBooksIcon />,
    color: '#2196f3', // primary blue
    change: { value: 12, isPositive: true },
    progress: 85,
  },
  {
    title: 'Categories',
    value: 12,
    icon: <FolderIcon />,
    color: '#9c27b0', // secondary purple
    change: { value: 3, isPositive: false },
    progress: 60,
  },
  {
    title: 'Monthly Views',
    value: '5.2K',
    icon: <VisibilityIcon />,
    color: '#ff9800', // warning orange
    change: { value: 18, isPositive: true },
    progress: 78,
  },
  {
    title: 'Helpful Rating',
    value: '92%',
    icon: <ThumbUpIcon />,
    color: '#4caf50', // success green
    change: { value: 5, isPositive: true },
    progress: 92,
  }
];

// Card styles matching dashboard
const cardStyles = {
  elevation: 0,
  borderRadius: 3,
  transition: 'all 0.3s ease',
  background: (theme: any) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  boxShadow: (theme: any) => theme.palette.mode === 'dark'
    ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: (theme: any) => theme.palette.mode === 'dark'
      ? '0 12px 40px -8px rgba(0, 0, 0, 0.4)'
      : '0 12px 40px -8px rgba(0, 0, 0, 0.15)',
  },
};

// Gradient accent for cards
const gradientAccent = (theme: any) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1
  }
});

// Enhanced Material-UI components
const EnhancedCard = (props: any) => {
  return (
    <Zoom in={true} style={{ transitionDelay: props.index ? `${props.index * 100}ms` : '0ms' }}>
      <Card {...props} />
    </Zoom>
  );
};

const EnhancedGrid = (props: any) => {
  return (
    <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDuration: '800ms' }}>
      <Grid {...props} />
    </Grow>
  );
};

const KnowledgeBasePage: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulate data loading on mount
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      setSearchResults(mockSearchResults);
      setIsSearching(false);
    }, 800);
  };
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
    
    // In a real app, you would fetch articles for this category
    setArticles(mockRecentArticles);
  };
  
  // Handle article selection
  const handleArticleSelect = (article: any) => {
    setSelectedArticle(article);
  };
  
  // Handle article feedback
  const handleFeedback = (isHelpful: boolean) => {
    // In a real app, you would submit this to the API
    alert(`Thank you for your feedback! You found this article ${isHelpful ? 'helpful' : 'not helpful'}.`);
  };

  // Handle refresh
  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };
  
  // Handle create new article
  const handleCreateArticle = () => {
    alert('Create new article functionality would go here');
  };
  
  return (
    <Container 
      maxWidth={false}
      sx={{ 
        py: { xs: 2, md: 3 },
        position: 'relative',
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          right: 0,
          width: { xs: '100%', lg: '25%' },
          height: { xs: '40%', lg: '100%' },
          background: theme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: -1,
          opacity: 0.8,
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: { xs: '100%', lg: '25%' },
          height: { xs: '30%', lg: '60%' },
          background: theme.palette.mode === 'dark' 
            ? `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.dark, 0.15)} 0%, transparent 70%)`
            : `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.light, 0.15)} 0%, transparent 70%)`,
          zIndex: -1,
          opacity: 0.6,
          pointerEvents: 'none'
        }
      }}
    >
      <Box sx={{ 
        animation: 'fadeIn 1s ease forwards',
        opacity: 0,
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        }
      }}>
        <EnhancedGrid container spacing={3}>
          {/* Welcome Banner / Header */}
          <Grid item xs={12}>
            <EnhancedCard 
              index={0}
              elevation={0}
              sx={{ 
                p: 0, 
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
                borderRadius: 3,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.7)}, ${alpha(theme.palette.secondary.dark, 0.5)})`
                  : `linear-gradient(120deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.secondary.light, 0.15)})`,
                position: 'relative',
              }}
            >
              <Box sx={{ p: { xs: 3, md: 2 }, position: 'relative', zIndex: 1 }}>
                <Grid container alignItems="center" justifyContent="space-between" spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="h5" component="h1" gutterBottom sx={{
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}>
                      Knowledge Base
                    </Typography>
                    <Typography variant="subtitle1" sx={{
                      fontWeight: 500,
                      color: theme.palette.mode === 'dark' ? alpha('#fff', 0.8) : 'inherit',
                    }}>
                      Search our knowledge base for answers to common questions and solutions
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleCreateArticle}
                      sx={buttonAnimation}
                    >
                      New Article
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshData}
                      sx={buttonAnimation}
                    >
                      Refresh
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </EnhancedCard>
          </Grid>

          {/* Search Bar */}
          <Grid item xs={12}>
            <EnhancedCard 
              index={1}
              elevation={0} 
              sx={{ 
                ...cardStyles, 
                border: '1px solid', 
                borderColor: theme.palette.divider,
                ...gradientAccent(theme)
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  How can we help you today?
                </Typography>
                <form onSubmit={handleSearch}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search the knowledge base..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: isSearching ? (
                        <InputAdornment position="end">
                          <CircularProgress size={24} color="inherit" />
                        </InputAdornment>
                      ) : null
                    }}
                  />
                </form>
              </CardContent>
            </EnhancedCard>
          </Grid>

          {/* Stats Section */}
          <Grid item xs={12}>
            <StatsWidget
              stats={knowledgeBaseStats}
              loading={isLoading}
              columns={4}
              animated={true}
            />
          </Grid>

          {/* Main Content */}
          {searchResults.length > 0 ? (
            <Grid item xs={12}>
              <EnhancedCard 
                index={3}
                elevation={0} 
                sx={{ 
                  ...cardStyles, 
                  border: '1px solid', 
                  borderColor: theme.palette.divider,
                  ...gradientAccent(theme)
                }}
              >
                <CardHeader 
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      fontSize: '1.2rem',
                      color: theme.palette.text.primary,
                      letterSpacing: '0.5px',
                      mb: 1
                    }}>
                      Search Results for "{searchQuery}"
                    </Typography>
                  }
                  action={
                    <Button 
                      variant="outlined" 
                      startIcon={<FilterListIcon />}
                      sx={buttonAnimation}
                    >
                      Filter Results
                    </Button>
                  }
                  sx={{ 
                    px: 3, 
                    pt: 3, 
                    pb: 2,
                    background: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.paper, 0.4)
                      : alpha(theme.palette.background.paper, 0.7),
                  }}
                />
                <Divider />
                <CardContent sx={{ p: 3 }}>
                  {isLoading ? (
                    <Box sx={{ p: 1.5 }}>
                      {[1, 2, 3].map((i) => (
                        <Skeleton
                          key={i}
                          variant="rectangular"
                          height={100}
                          sx={{ 
                            mb: 2,
                            borderRadius: 1,
                            animation: 'pulse 1.5s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 0.6 },
                              '50%': { opacity: 1 },
                              '100%': { opacity: 0.6 }
                            }
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Grid container spacing={3}>
                      {searchResults.map((article) => (
                        <Grid item xs={12} key={article.id}>
                          <Card 
                            elevation={0} 
                            sx={{ 
                              border: '1px solid',
                              borderColor: theme.palette.divider,
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                boxShadow: theme.shadows[3],
                                transform: 'translateY(-4px)',
                              }
                            }}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {article.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {article.publishedDate}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {article.summary}
                              </Typography>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                  {article.tags.map((tag: string) => (
                                    <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
                                  ))}
                                </Box>
                                <Button 
                                  endIcon={<ArrowForwardIcon />} 
                                  color="primary"
                                  onClick={() => handleArticleSelect(article)}
                                  sx={buttonAnimation}
                                >
                                  Read Article
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </EnhancedCard>
            </Grid>
          ) : selectedArticle ? (
            <Grid item xs={12}>
              <EnhancedCard 
                index={3}
                elevation={0} 
                sx={{ 
                  ...cardStyles, 
                  border: '1px solid', 
                  borderColor: theme.palette.divider,
                  ...gradientAccent(theme)
                }}
              >
                <CardHeader
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      fontSize: '1.2rem',
                      color: theme.palette.text.primary,
                      letterSpacing: '0.5px'
                    }}>
                      {selectedArticle.title}
                    </Typography>
                  } 
                  subheader={
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.text.secondary,
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      lineHeight: 1.5
                    }}>
                      Published: {selectedArticle.publishedDate}
                    </Typography>
                  }
                  action={
                    <Box>
                      <Button 
                        variant="outlined"
                        onClick={() => setSelectedArticle(null)}
                        sx={buttonAnimation}
                      >
                        ← Back to Articles
                      </Button>
                    </Box>
                  }
                  sx={{ 
                    px: 3, 
                    pt: 3, 
                    pb: 2,
                    background: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.paper, 0.4)
                      : alpha(theme.palette.background.paper, 0.7),
                  }}
                />
                <Divider />
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" mb={2}>
                    {selectedArticle.tags?.map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
                    ))}
                  </Box>
                  
                  <Typography paragraph>
                    {selectedArticle.summary}
                  </Typography>
                  
                  <Typography paragraph>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget
                    ultricies aliquam, nunc nisl aliquet nunc, quis aliquam nisl nunc vel nisl. Nullam
                    euismod, nisl eget ultricies aliquam, nunc nisl aliquet nunc, quis aliquam nisl
                    nunc vel nisl.
                  </Typography>
                  
                  <Typography paragraph>
                    Nullam euismod, nisl eget ultricies aliquam, nunc nisl aliquet nunc, quis aliquam
                    nisl nunc vel nisl. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </Typography>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Box textAlign="center" sx={{ 
                    p: 3, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    borderRadius: 2
                  }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Was this article helpful?
                    </Typography>
                    <Box>
                      <Button 
                        variant="contained"
                        color="success"
                        startIcon={<ThumbUpIcon />} 
                        onClick={() => handleFeedback(true)}
                        sx={{ mr: 2, ...buttonAnimation }}
                      >
                        Yes
                      </Button>
                      <Button 
                        variant="contained"
                        color="error"
                        startIcon={<ThumbDownIcon />} 
                        onClick={() => handleFeedback(false)}
                        sx={buttonAnimation}
                      >
                        No
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </EnhancedCard>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {/* Left sidebar - Categories */}
                <Grid item xs={12} md={3}>
                  <EnhancedCard 
                    index={3}
                    elevation={0} 
                    sx={{ 
                      ...cardStyles, 
                      border: '1px solid', 
                      borderColor: theme.palette.divider,
                      height: '100%',
                      ...gradientAccent(theme)
                    }}
                  >
                    <CardHeader 
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px'
                        }}>
                          Categories
                        </Typography>
                      }
                      sx={{ 
                        px: 3, 
                        pt: 3, 
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    {isLoading ? (
                      <Box sx={{ p: 2 }}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Skeleton
                            key={i}
                            variant="rectangular"
                            height={40}
                            sx={{ 
                              mb: 1,
                              borderRadius: 1,
                              animation: 'pulse 1.5s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%': { opacity: 0.6 },
                                '50%': { opacity: 1 },
                                '100%': { opacity: 0.6 }
                              }
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <List component="nav" sx={{ p: 0 }}>
                        {mockCategories.map((category) => (
                          <React.Fragment key={category.id}>
                            <ListItem 
                              button 
                              selected={selectedCategory === category.id}
                              onClick={() => handleCategorySelect(category.id)}
                              sx={{ 
                                transition: 'all 0.2s',
                                '&.Mui-selected': {
                                  bgcolor: theme.palette.mode === 'dark' 
                                    ? 'rgba(255,255,255,0.08)' 
                                    : 'rgba(0,0,0,0.04)'
                                },
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                  transform: 'translateX(4px)',
                                },
                              }}
                            >
                              <Avatar 
                                sx={{ 
                                  mr: 2, 
                                  bgcolor: 'primary.main',
                                  width: 32,
                                  height: 32
                                }}
                              >
                                <FolderIcon fontSize="small" />
                              </Avatar>
                              <ListItemText 
                                primary={<Typography variant="body1" sx={{ fontWeight: 500 }}>{category.name}</Typography>} 
                                secondary={`${category.count} articles`} 
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </EnhancedCard>
                  
                  <EnhancedCard 
                    index={4}
                    elevation={0} 
                    sx={{ 
                      ...cardStyles, 
                      border: '1px solid', 
                      borderColor: theme.palette.divider,
                      mt: 3,
                      ...gradientAccent(theme)
                    }}
                  >
                    <CardHeader 
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px'
                        }}>
                          Popular Articles
                        </Typography>
                      }
                      sx={{ 
                        px: 3, 
                        pt: 3, 
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    {isLoading ? (
                      <Box sx={{ p: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton
                            key={i}
                            variant="rectangular"
                            height={40}
                            sx={{ 
                              mb: 1,
                              borderRadius: 1,
                              animation: 'pulse 1.5s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%': { opacity: 0.6 },
                                '50%': { opacity: 1 },
                                '100%': { opacity: 0.6 }
                              }
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <List component="nav" sx={{ p: 0 }}>
                        {mockPopularArticles.map((article) => (
                          <React.Fragment key={article.id}>
                            <ListItem 
                              button
                              onClick={() => handleArticleSelect(article)}
                              sx={{ 
                                transition: 'all 0.2s',
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                  transform: 'translateX(4px)',
                                },
                              }}
                            >
                              <Avatar 
                                sx={{ 
                                  mr: 2, 
                                  bgcolor: 'secondary.main',
                                  width: 32,
                                  height: 32
                                }}
                              >
                                <LibraryBooksIcon fontSize="small" />
                              </Avatar>
                              <ListItemText 
                                primary={<Typography variant="body1" sx={{ fontWeight: 500 }}>{article.title}</Typography>} 
                                secondary={`${article.views.toLocaleString()} views`} 
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </EnhancedCard>
                </Grid>
                
                {/* Main content - Articles */}
                <Grid item xs={12} md={9}>
                  <EnhancedCard 
                    index={5}
                    elevation={0} 
                    sx={{ 
                      ...cardStyles, 
                      border: '1px solid', 
                      borderColor: theme.palette.divider,
                      ...gradientAccent(theme)
                    }}
                  >
                    <CardHeader 
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 1
                        }}>
                          {selectedCategory 
                            ? mockCategories.find(c => c.id === selectedCategory)?.name 
                            : "Recent Articles"
                          }
                        </Typography>
                      }
                      subheader={
                        <Typography variant="body2" sx={{ 
                          color: theme.palette.text.secondary,
                          fontWeight: 500,
                          fontSize: '0.9rem',
                          lineHeight: 1.5
                        }}>
                          Browse our latest knowledge base content
                        </Typography>
                      }
                      action={
                        <Button 
                          variant="contained" 
                          color="primary" 
                          startIcon={<HelpOutlineIcon />}
                          sx={buttonAnimation}
                        >
                          Open a ticket
                        </Button>
                      }
                      sx={{ 
                        px: 3, 
                        pt: 3, 
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                      {isLoading ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <CircularProgress />
                          <Typography sx={{ mt: 2 }}>Loading articles...</Typography>
                        </Box>
                      ) : (
                        <Grid container spacing={3}>
                          {(selectedCategory ? articles : mockRecentArticles).map((article) => (
                            <Grid item xs={12} key={article.id}>
                              <Card 
                                elevation={0} 
                                sx={{ 
                                  border: '1px solid',
                                  borderColor: theme.palette.divider,
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: theme.shadows[3],
                                  }
                                }}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                      {article.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {article.publishedDate}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" paragraph>
                                    {article.summary}
                                  </Typography>
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                      {article.tags?.map((tag: string) => (
                                        <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
                                      ))}
                                    </Box>
                                    <Button 
                                      endIcon={<ArrowForwardIcon />} 
                                      color="primary"
                                      onClick={() => handleArticleSelect(article)}
                                      sx={buttonAnimation}
                                    >
                                      Read Article
                                    </Button>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </CardContent>
                  </EnhancedCard>
                </Grid>
              </Grid>
            </Grid>
          )}
        </EnhancedGrid>
      </Box>
    </Container>
  );
};

export default KnowledgeBasePage; 