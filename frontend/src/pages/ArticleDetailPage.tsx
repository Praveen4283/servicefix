import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Chip,
  Button,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  DateRange as DateRangeIcon,
  Category as CategoryIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import apiClient from '../services/apiClient';
import { showSuccess, showError } from '../utils/notificationUtils';

// Mock article data - This would be replaced with actual API calls
const mockArticleData = {
  id: 'art1',
  title: 'How to create your first ticket',
  content: `
# Creating Your First Support Ticket

When you encounter an issue that requires assistance, creating a support ticket is the first step to getting help. This guide will walk you through the process.

## Step 1: Navigate to the Tickets Section

From your dashboard, click on the "Tickets" option in the main navigation menu. This will take you to the tickets overview page.

## Step 2: Click "Create New Ticket"

Look for the "Create New Ticket" button, typically located in the top-right corner of the page. Click on this button to open the ticket creation form.

## Step 3: Fill Out the Ticket Information

The ticket form will ask you for several pieces of information:

- **Subject**: A brief, descriptive title for your issue
- **Description**: A detailed explanation of the problem you're experiencing
- **Category**: Select the category that best fits your issue
- **Priority**: Choose the appropriate priority level (Low, Medium, High, Critical)
- **Attachments**: Add any relevant screenshots or files that might help illustrate the issue

## Step 4: Submit Your Ticket

Once you've filled out all the required fields, click the "Submit" button at the bottom of the form. Your ticket will be sent to our support team, and you'll receive a confirmation email with your ticket number.

## Step 5: Track Your Ticket

You can track the status of your ticket at any time by returning to the Tickets section. Your ticket will be listed with its current status (Open, In Progress, Pending, Resolved).

## Tips for Effective Tickets

- Be as specific as possible in your description
- Include any error messages you've encountered
- Mention any troubleshooting steps you've already tried
- Provide context about when the issue started

Need more help? Contact our support team directly at support@servicefix.com
  `,
  author: {
    id: 'user1',
    name: 'Technical Support Team',
    avatar: '/avatars/support-team.jpg'
  },
  category: {
    id: 'cat1',
    name: 'Getting Started'
  },
  tags: ['tickets', 'support', 'getting started', 'how-to'],
  publishedDate: '2023-06-15',
  updatedDate: '2023-08-10',
  views: 1524,
  helpfulCount: 128,
  notHelpfulCount: 12,
  relatedArticles: [
    {
      id: 'art2',
      title: 'Understanding ticket priorities',
      category: 'Getting Started'
    },
    {
      id: 'art3',
      title: 'How to add attachments to your ticket',
      category: 'Getting Started'
    },
    {
      id: 'art4',
      title: 'Checking the status of your tickets',
      category: 'Account Management'
    }
  ]
};

// Card styles matching dashboard style
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

interface ArticleData {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
  };
  tags: string[];
  publishedDate: string;
  updatedDate?: string;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  relatedArticles: {
    id: string;
    title: string;
    category: string;
  }[];
}

const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real implementation, this would be an API call
        // const response = await apiClient.get(`/knowledge/articles/${id}`);
        // setArticle(response);
        
        // For now, we'll use mock data
        setTimeout(() => {
          setArticle(mockArticleData);
          setLoading(false);
        }, 800); // Simulate loading
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load the article. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchArticle();
    
    // Check if article is bookmarked
    const checkBookmarked = () => {
      const bookmarks = JSON.parse(localStorage.getItem('kbBookmarks') || '[]');
      setIsBookmarked(bookmarks.includes(id));
    };
    
    checkBookmarked();
    
    // Record view
    const recordView = async () => {
      try {
        // In a real implementation:
        // await apiClient.post(`/knowledge/articles/${id}/view`);
        console.log('View recorded for article:', id);
      } catch (err) {
        console.error('Error recording view:', err);
      }
    };
    
    recordView();
  }, [id]);
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  const toggleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('kbBookmarks') || '[]');
    
    if (isBookmarked) {
      const updatedBookmarks = bookmarks.filter((bookmarkId: string) => bookmarkId !== id);
      localStorage.setItem('kbBookmarks', JSON.stringify(updatedBookmarks));
      setIsBookmarked(false);
      showSuccess('Article removed from bookmarks');
    } else {
      bookmarks.push(id);
      localStorage.setItem('kbBookmarks', JSON.stringify(bookmarks));
      setIsBookmarked(true);
      showSuccess('Article added to bookmarks');
    }
  };
  
  const handleFeedback = async (isHelpful: boolean) => {
    if (feedbackSubmitted) {
      showError('You have already submitted feedback for this article');
      return;
    }
    
    try {
      // In a real implementation:
      // await apiClient.post(`/knowledge/articles/${id}/feedback`, { isHelpful });
      
      setFeedbackSubmitted(true);
      
      if (isHelpful) {
        setArticle(prev => prev ? { ...prev, helpfulCount: prev.helpfulCount + 1 } : null);
        showSuccess('Thank you for your feedback!');
      } else {
        setArticle(prev => prev ? { ...prev, notHelpfulCount: prev.notHelpfulCount + 1 } : null);
        showSuccess('Thank you for your feedback. We will improve this article.');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showError('Failed to submit feedback. Please try again.');
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.title,
        text: `Check out this knowledge base article: ${article?.title}`,
        url: window.location.href,
      }).then(() => {
        console.log('Article shared successfully');
      }).catch((error) => {
        console.error('Error sharing article:', error);
      });
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          showSuccess('Article link copied to clipboard');
        })
        .catch((err) => {
          console.error('Error copying to clipboard:', err);
          showError('Failed to copy link. Please try again.');
        });
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleArticleClick = (articleId: string) => {
    navigate(`/knowledge/${articleId}`);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Error Loading Article
          </Typography>
          <Typography variant="body1" paragraph>
            {error}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
          >
            Go Back
          </Button>
        </Paper>
      </Container>
    );
  }
  
  if (!article) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Article Not Found
          </Typography>
          <Typography variant="body1" paragraph>
            The article you're looking for doesn't exist or has been removed.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
          >
            Go Back
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/knowledge')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArticleIcon fontSize="small" sx={{ mr: 0.5 }} />
          Knowledge Base
        </Link>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/knowledge', { state: { category: article.category.id } })}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <CategoryIcon fontSize="small" sx={{ mr: 0.5 }} />
          {article.category.name}
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          {article.title}
        </Typography>
      </Breadcrumbs>
      
      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              ...gradientAccent(theme)
            }}
          >
            {/* Article Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {article.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip
                    icon={<CategoryIcon />}
                    label={article.category.name}
                    size="small"
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                    <DateRangeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Published: {new Date(article.publishedDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {article.updatedDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                      <DateRangeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Updated: {new Date(article.updatedDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={article.author.avatar}
                    alt={article.author.name}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  >
                    {article.author.name.charAt(0)}
                  </Avatar>
                  <Typography variant="body2" color="text.secondary">
                    {article.author.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                    <VisibilityIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {article.views} views
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box>
                <Tooltip title={isBookmarked ? "Remove Bookmark" : "Bookmark"}>
                  <IconButton onClick={toggleBookmark} color={isBookmarked ? "primary" : "default"}>
                    {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share">
                  <IconButton onClick={handleShare}>
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print">
                  <IconButton onClick={handlePrint}>
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Article Content */}
            <Box className="article-content" sx={{ mb: 4 }}>
              <ReactMarkdown>
                {article.content}
              </ReactMarkdown>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Article Tags */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tags:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {article.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/knowledge', { state: { tag } })}
                  />
                ))}
              </Box>
            </Box>
            
            {/* Article Feedback */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">
                Was this article helpful?
              </Typography>
              <Box>
                <Button
                  startIcon={<ThumbUpIcon />}
                  onClick={() => handleFeedback(true)}
                  color="success"
                  variant={feedbackSubmitted ? "outlined" : "text"}
                  disabled={feedbackSubmitted}
                  sx={{ mr: 1 }}
                >
                  Yes ({article.helpfulCount})
                </Button>
                <Button
                  startIcon={<ThumbDownIcon />}
                  onClick={() => handleFeedback(false)}
                  color="error"
                  variant={feedbackSubmitted ? "outlined" : "text"}
                  disabled={feedbackSubmitted}
                >
                  No ({article.notHelpfulCount})
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Related Articles */}
          <Card sx={{ ...cardStyles, mb: 3, ...gradientAccent(theme) }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Related Articles
              </Typography>
              <List disablePadding>
                {article.relatedArticles.map((relatedArticle) => (
                  <React.Fragment key={relatedArticle.id}>
                    <ListItem
                      button
                      onClick={() => handleArticleClick(relatedArticle.id)}
                      sx={{ px: 0 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ArticleIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={relatedArticle.title}
                        secondary={relatedArticle.category}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
          
          {/* Need More Help */}
          <Card sx={{ ...cardStyles, ...gradientAccent(theme) }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Need More Help?
              </Typography>
              <Typography variant="body2" paragraph>
                If you couldn't find what you were looking for, our support team is ready to assist you.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => navigate('/tickets/create')}
              >
                Create Support Ticket
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ArticleDetailPage; 