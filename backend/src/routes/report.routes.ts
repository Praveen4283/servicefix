import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = express.Router();

/**
 * @route   GET /api/reports/tickets/summary
 * @desc    Get ticket summary analytics
 * @access  Private (Admin, Agent)
 */
router.get('/tickets/summary', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // This would use a reporting service to fetch actual analytics
    // For now, returning mock data
    const summary = {
      totalTickets: 1256,
      openTickets: 342,
      resolvedTickets: 824,
      closedTickets: 90,
      averageResolutionTime: '2 days, 4 hours',
      responseTimeTarget: '92%', // Percentage meeting SLA
      ticketDistribution: {
        byPriority: {
          low: 356,
          medium: 589,
          high: 245,
          urgent: 66
        },
        byStatus: {
          new: 122,
          open: 220,
          pending: 124,
          resolved: 700,
          closed: 90
        },
        byCategory: {
          'Technical Issue': 532,
          'Billing Question': 245,
          'Feature Request': 167,
          'Account Access': 142,
          'Product Information': 98,
          'General Inquiry': 72
        }
      }
    };
    
    return res.json(summary);
  } catch (error) {
    console.error('Error fetching ticket summary:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/tickets/trend
 * @desc    Get ticket trend data
 * @access  Private (Admin, Agent)
 */
router.get('/tickets/trend', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { interval = 'day', startDate, endDate } = req.query;
    
    // This would use a reporting service to fetch actual analytics
    // For now, generating mock data for the past 30 days
    const now = new Date();
    const data = Array(30).fill(0).map((_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      
      return {
        date: date.toISOString().split('T')[0],
        totalTickets: Math.floor(Math.random() * 50) + 20,
        resolvedTickets: Math.floor(Math.random() * 30) + 10,
        newTickets: Math.floor(Math.random() * 30) + 15
      };
    });
    
    return res.json(data);
  } catch (error) {
    console.error('Error fetching ticket trends:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/agents/performance
 * @desc    Get agent performance metrics
 * @access  Private (Admin)
 */
router.get('/agents/performance', authenticate, authorize([UserRole.ADMIN]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // This would use a reporting service to fetch actual analytics
    // For now, returning mock data
    const agentPerformance = [
      {
        agentId: 'agent-1',
        agentName: 'Jane Smith',
        ticketsAssigned: 145,
        ticketsResolved: 132,
        averageResolutionTime: '1 day, 14 hours',
        firstResponseTime: '45 minutes',
        customerSatisfaction: 4.8,
        responseAccuracy: '96%'
      },
      {
        agentId: 'agent-2',
        agentName: 'Michael Johnson',
        ticketsAssigned: 123,
        ticketsResolved: 110,
        averageResolutionTime: '2 days, 2 hours',
        firstResponseTime: '30 minutes',
        customerSatisfaction: 4.5,
        responseAccuracy: '92%'
      },
      {
        agentId: 'agent-3',
        agentName: 'Sarah Wilson',
        ticketsAssigned: 156,
        ticketsResolved: 145,
        averageResolutionTime: '1 day, 8 hours',
        firstResponseTime: '22 minutes',
        customerSatisfaction: 4.9,
        responseAccuracy: '98%'
      }
    ];
    
    return res.json(agentPerformance);
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/knowledge-base/usage
 * @desc    Get knowledge base usage analytics
 * @access  Private (Admin, Agent)
 */
router.get('/knowledge-base/usage', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // This would use a reporting service to fetch actual analytics
    // For now, returning mock data
    const kbUsage = {
      totalViews: 8765,
      uniqueVisitors: 3456,
      searchCount: 1984,
      searchWithResults: 1659,
      searchWithoutResults: 325,
      topArticles: [
        { id: 'kb-1', title: 'How to reset your password', views: 543, helpfulRating: 92 },
        { id: 'kb-2', title: 'Troubleshooting account access issues', views: 432, helpfulRating: 85 },
        { id: 'kb-3', title: 'Billing FAQ', views: 312, helpfulRating: 76 },
        { id: 'kb-4', title: 'Setting up two-factor authentication', views: 287, helpfulRating: 94 },
        { id: 'kb-5', title: 'Common error messages explained', views: 245, helpfulRating: 81 }
      ],
      topSearchTerms: [
        { term: 'password reset', count: 176 },
        { term: 'login issues', count: 145 },
        { term: 'billing', count: 132 },
        { term: 'two-factor', count: 98 },
        { term: 'error message', count: 87 }
      ]
    };
    
    return res.json(kbUsage);
  } catch (error) {
    console.error('Error fetching knowledge base usage:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/customer-satisfaction
 * @desc    Get customer satisfaction metrics
 * @access  Private (Admin, Agent)
 */
router.get('/customer-satisfaction', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // This would use a reporting service to fetch actual analytics
    // For now, returning mock data
    const satisfactionData = {
      overallSatisfaction: 4.6,
      responsesReceived: 876,
      satisfactionDistribution: {
        5: 534,
        4: 198,
        3: 84,
        2: 35,
        1: 25
      },
      trendData: Array(12).fill(0).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        
        return {
          month: date.toISOString().split('T')[0].substring(0, 7),
          satisfaction: (4 + (Math.random() * 0.8 - 0.4)).toFixed(1)
        };
      }),
      topFeedbackThemes: [
        { theme: 'Quick resolution', count: 243, sentiment: 'positive' },
        { theme: 'Helpful agents', count: 198, sentiment: 'positive' },
        { theme: 'Clear communication', count: 176, sentiment: 'positive' },
        { theme: 'Slow response', count: 67, sentiment: 'negative' },
        { theme: 'Technical knowledge', count: 54, sentiment: 'mixed' }
      ]
    };
    
    return res.json(satisfactionData);
  } catch (error) {
    console.error('Error fetching customer satisfaction data:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 