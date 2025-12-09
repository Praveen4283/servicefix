import { Router } from 'express';

// Import all route modules
import authRoutes from '../auth.routes';
import userRoutes from '../user.routes';
import ticketRoutes from '../ticket.routes';
import knowledgeBaseRoutes from '../knowledgeBase.routes';
import reportRoutes from '../report.routes';
import aiRoutes from '../ai.routes';
import chatbotRoutes from '../chatbot.routes';
import notificationRoutes from '../notification.routes';
import logRoutes from '../log.routes';
import settingsRoutes from '../settings.routes';
import slaRoutes from '../sla.routes';
import ticketPriorityRoutes from '../ticketPriority.routes';
import businessHoursRoutes from '../businessHours.routes';

const router = Router();

// Register all v1 routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tickets', ticketRoutes);
router.use('/knowledge', knowledgeBaseRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
router.use('/chat', chatbotRoutes);
router.use('/notifications', notificationRoutes);
router.use('/logs', logRoutes);
router.use('/settings', settingsRoutes);
router.use('/sla', slaRoutes);
router.use('/ticket-priorities', ticketPriorityRoutes);
router.use('/business-hours', businessHoursRoutes);

export default router;