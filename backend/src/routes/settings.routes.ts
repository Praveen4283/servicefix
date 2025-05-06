import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  getEmailSettings, 
  updateEmailSettings, 
  testEmailSettings 
} from '../controllers/settings.controller';

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);

// Email settings routes
router.get('/email', authorize(['admin']), getEmailSettings);
router.put('/email', authorize(['admin']), updateEmailSettings);
router.post('/email/test', authorize(['admin']), testEmailSettings);

export default router; 