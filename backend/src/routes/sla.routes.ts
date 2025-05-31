import { Router } from 'express';
import slaController from '../controllers/sla.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Get all SLA policies for organization
router.get(
  '/organization/:organizationId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.getAllSLAPolicies
);

// Get SLA policy by ID
router.get(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.getSLAPolicyById
);

// Get SLA policies by priority
router.get(
  '/priority/:priorityId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.getSLAPoliciesByPriority
);

// Create a new SLA policy
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  slaController.createSLAPolicy
);

// Update an SLA policy
router.put(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  slaController.updateSLAPolicy
);

// Delete an SLA policy
router.delete(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  slaController.deleteSLAPolicy
);

// Assign an SLA policy to a ticket
router.post(
  '/assign',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.assignSLAToTicket
);

// Get SLA status for a ticket
router.get(
  '/ticket/:ticketId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.getTicketSLAStatus
);

// Get SLA metrics
router.get(
  '/metrics',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  slaController.getSLAMetrics
);

// Auto-assign SLA policy for a ticket based on its current priority
router.post(
  '/auto-assign/:ticketId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.autoAssignSLAForTicket
);

// Pause SLA for a ticket (typically when status changes to "pending")
router.post(
  '/pause/:ticketId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.pauseSLA
);

// Resume SLA for a ticket (typically when status changes from "pending" to active)
router.post(
  '/resume/:ticketId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.resumeSLA
);

// Check for missed first responses (admin only)
router.get(
  '/check-missed-first-responses',
  authenticate,
  authorize([UserRole.ADMIN]),
  slaController.checkMissedFirstResponses
);

// Force recalculation of SLA status for a ticket
router.post(
  '/recalculate/:ticketId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.recalculateTicketSLA
);

// Fix SLA breach status for all tickets
router.post(
  '/fix-breach-status',
  authenticate,
  authorize([UserRole.ADMIN, 'manager']),
  slaController.fixSLABreachStatus
);

// Fix SLA breach status for a specific ticket
router.post(
  '/fix-breach-status/:ticketId',
  authenticate,
  authorize([UserRole.ADMIN, 'manager', UserRole.AGENT]),
  slaController.fixSLABreachStatus
);

export default router; 