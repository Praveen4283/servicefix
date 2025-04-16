import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = express.Router();

/**
 * @route   POST /api/ai/analyze-sentiment
 * @desc    Analyze sentiment of text
 * @access  Private (Admin, Agent)
 */
router.post('/analyze-sentiment', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }
    
    // Use AI service to analyze sentiment
    const aiService = (await import('../services/ai.service')).default;
    const sentimentScore = await aiService.analyzeSentiment(text);
    
    return res.json({ 
      score: sentimentScore,
      sentiment: sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral'
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/ai/categorize-ticket
 * @desc    Auto-categorize ticket
 * @access  Private (Admin, Agent)
 */
router.post('/categorize-ticket', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { subject, description } = req.body;
    
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }
    
    // Use AI service to categorize ticket
    const aiService = (await import('../services/ai.service')).default;
    const category = await aiService.categorizeTicket({ subject, description } as any);
    
    return res.json({ category });
  } catch (error) {
    console.error('Error categorizing ticket:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/ai/suggest-priority
 * @desc    Suggest ticket priority
 * @access  Private (Admin, Agent)
 */
router.post('/suggest-priority', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { subject, description } = req.body;
    
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }
    
    // Use AI service to suggest priority
    const aiService = (await import('../services/ai.service')).default;
    const priority = await aiService.suggestPriority({ subject, description } as any);
    
    return res.json({ priority });
  } catch (error) {
    console.error('Error suggesting priority:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/ai/suggest-response
 * @desc    Generate response suggestion
 * @access  Private (Admin, Agent)
 */
router.post('/suggest-response', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { subject, description } = req.body;
    
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }
    
    // Use AI service to suggest response
    const aiService = (await import('../services/ai.service')).default;
    const response = await aiService.suggestResponse({ subject, description } as any);
    
    return res.json({ response });
  } catch (error) {
    console.error('Error generating response suggestion:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/ai/chatbot
 * @desc    Customer-facing chatbot
 * @access  Public
 */
router.post('/chatbot', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // This would use a more sophisticated AI service implementation
    // For now, return mock responses
    const responses = [
      "I can help you with that! Please provide more details about your issue.",
      "Have you tried turning it off and on again?",
      "Let me check our knowledge base for that...",
      "Would you like me to create a support ticket for you?",
      "I'm sorry to hear you're having trouble. Let me connect you with an agent."
    ];
    
    const botResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return res.json({ 
      response: botResponse,
      suggestTicket: message.length > 50, // Suggest ticket for longer messages
      suggestedKnowledgeArticles: [
        { id: 'kb-1', title: 'Troubleshooting common issues' },
        { id: 'kb-2', title: 'How to reset your password' }
      ]
    });
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 