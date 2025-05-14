import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  getEmailSettings, 
  updateEmailSettings, 
  testEmailSettings,
  getGeneralSettings,
  updateGeneralSettings,
  getTicketSettings,
  updateTicketSettings,
  getSLASettings,
  updateSLASettings
} from '../controllers/settings.controller';

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);

// Email settings routes
router.get('/email', authorize(['admin']), getEmailSettings);
router.put('/email', authorize(['admin']), updateEmailSettings);
router.post('/email/test', authorize(['admin']), testEmailSettings);

// General settings routes
router.get('/general', authorize(['admin']), getGeneralSettings);
router.put('/general', authorize(['admin']), updateGeneralSettings);

// Ticket settings routes
router.get('/ticket', authorize(['admin']), getTicketSettings);
router.put('/ticket', authorize(['admin']), updateTicketSettings);

// SLA settings routes
router.get('/sla', authorize(['admin']), getSLASettings);
router.put('/sla', authorize(['admin']), updateSLASettings);

export default router; 