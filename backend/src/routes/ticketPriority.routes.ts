import { Router } from 'express';
import ticketPriorityController from '../controllers/ticketPriority.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Get all ticket priorities for organization
router.get(
  '/',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  ticketPriorityController.getAllPriorities
);

// Get ticket priority by ID
router.get(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  ticketPriorityController.getPriorityById
);

// Create a new ticket priority
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  ticketPriorityController.createPriority
);

// Update a ticket priority
router.put(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  ticketPriorityController.updatePriority
);

// Delete a ticket priority
router.delete(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  ticketPriorityController.deletePriority
);

export default router;