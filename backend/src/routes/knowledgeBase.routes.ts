import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = express.Router();

/**
 * @route   GET /api/kb
 * @desc    Get all public knowledge base articles
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // This would use the KnowledgeBaseService to get articles
    const articles = await import('../services/knowledgeBase.service')
      .then(module => module.default.searchArticles(req.query.q as string || '', {
        visibility: 'public',
        status: 'published',
        ...req.query
      }));
      
    return res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/kb/:id
 * @desc    Get a knowledge base article by ID
 * @access  Public/Private (depending on visibility)
 */
router.get('/:id', async (req, res) => {
  try {
    const knowledgeBaseService = (await import('../services/knowledgeBase.service')).default;
    const article = await knowledgeBaseService.getArticleById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Check if article is public or user has appropriate role
    if (article.visibility !== 'public' && (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.AGENT))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Increment view count
    await knowledgeBaseService.incrementViewCount(req.params.id);
    
    return res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/kb
 * @desc    Create a new knowledge base article
 * @access  Private (Admin, Agent)
 */
router.post('/', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { title, content, status, visibility, tags, category } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    const knowledgeBaseService = (await import('../services/knowledgeBase.service')).default;
    
    // Convert req.user.id to number
    const authorIdNumber = parseInt(req.user.id, 10);
    if (isNaN(authorIdNumber)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const article = await knowledgeBaseService.createArticle({
      title,
      content,
      status,
      visibility,
      tags,
      category,
      authorId: authorIdNumber // Use the converted number
    });
    
    return res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/kb/:id
 * @desc    Update a knowledge base article
 * @access  Private (Admin, Agent)
 */
router.put('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { title, content, status, visibility, tags, category } = req.body;
    
    const knowledgeBaseService = (await import('../services/knowledgeBase.service')).default;
    const article = await knowledgeBaseService.getArticleById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Convert req.user.id to number for comparison
    const reqUserIdNumber = parseInt(req.user.id, 10);
    if (isNaN(reqUserIdNumber)) {
        return res.status(400).json({ message: 'Invalid user ID format in request' });
    }

    // Only admins can edit anyone's articles, agents can only edit their own
    if (req.user.role !== UserRole.ADMIN && article.authorId !== reqUserIdNumber) { // Compare with converted number
      return res.status(403).json({ message: 'Not authorized to edit this article' });
    }
    
    const updatedArticle = await knowledgeBaseService.updateArticle(req.params.id, {
      title,
      content,
      status,
      visibility,
      tags,
      category
    });
    
    return res.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/kb/:id/feedback
 * @desc    Submit feedback for a knowledge base article
 * @access  Public
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const { isHelpful } = req.body;
    
    if (typeof isHelpful !== 'boolean') {
      return res.status(400).json({ message: 'isHelpful field is required and must be a boolean' });
    }
    
    const knowledgeBaseService = (await import('../services/knowledgeBase.service')).default;
    const success = await knowledgeBaseService.recordFeedback(req.params.id, isHelpful);
    
    if (!success) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    return res.json({ message: 'Feedback recorded' });
  } catch (error) {
    console.error('Error recording feedback:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 