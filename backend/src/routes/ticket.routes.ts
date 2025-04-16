import express from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import path from 'path';

import { 
  getTickets, 
  getTicketById, 
  createTicket, 
  updateTicket, 
  addComment, 
  deleteTicket,
  getAllDepartments,
  getAllPriorities,
  getAllTypes,
  getAllStatuses
} from '../controllers/ticket.controller';
import { validateRequest } from '../middleware/validate-request.middleware';
import { authenticate } from '../middleware/auth.middleware';

// --- Multer Configuration ---
// Use memory storage for Supabase integration
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
});
// --- End Multer Configuration ---

const router = express.Router();

// Apply authentication middleware to all ticket routes
router.use(authenticate);

// --- Routes for fetching dropdown options ---
router.get('/departments', getAllDepartments);
router.get('/priorities', getAllPriorities);
router.get('/types', getAllTypes);
router.get('/statuses', getAllStatuses);
// --- End routes for options ---

// Get all tickets
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isString().withMessage('Sort field must be a string'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    validateRequest,
  ],
  getTickets
);

// Get ticket by ID
router.get(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid ticket ID format'),
    validateRequest,
  ],
  getTicketById
);

// Create a new ticket
router.post(
  '/',
  upload.array('attachments', 5),
  [
    body('subject').notEmpty().withMessage('Subject is required')
      .isLength({ max: 255 }).withMessage('Subject cannot exceed 255 characters'),
    body('description').notEmpty().withMessage('Description is required'),
    body('requesterId')
      .notEmpty().withMessage('Requester ID is required')
      .isInt({ min: 1 }).withMessage('Invalid requester ID format'),
    body('assigneeId')
      .optional({ nullable: true })
      .if((value) => value !== '')
      .isInt({ min: 1 }).withMessage('Invalid assignee ID format'),
    body('departmentId')
      .optional({ nullable: true })
      .if((value) => value !== '')
      .isInt({ min: 1 }).withMessage('Invalid department ID format'),
    body('priorityId')
      .notEmpty().withMessage('Priority ID is required')
      .isInt({ min: 1 }).withMessage('Invalid priority ID format'),
    body('typeId')
      .optional({ nullable: true })
      .if((value) => value !== '')
      .isInt({ min: 1 }).withMessage('Invalid ticket type ID format'),
    body('dueDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601().withMessage('Invalid date format for due date'),
    body('tags')
      .optional({ nullable: true, checkFalsy: true })
      .customSanitizer(value => {
        try {
          return JSON.parse(value);
        } catch (e) { 
          return value;
        }
      })
      .isArray().withMessage('Tags must be an array of strings'),
    body('tags.*')
      .optional({ nullable: true, checkFalsy: true })
      .isString().withMessage('Each tag must be a string')
      .trim()
      .notEmpty().withMessage('Tag names cannot be empty'),
    validateRequest,
  ],
  createTicket
);

// Update a ticket
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid ticket ID format'),
    body('subject').optional().isString().withMessage('Subject must be a string')
      .isLength({ max: 255 }).withMessage('Subject cannot exceed 255 characters'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('assigneeId').optional().isInt({ min: 1 }).withMessage('Invalid assignee ID format'),
    body('departmentId').optional().isInt({ min: 1 }).withMessage('Invalid department ID format'),
    body('priorityId').optional().isInt({ min: 1 }).withMessage('Invalid priority ID format'),
    body('statusId').optional().isInt({ min: 1 }).withMessage('Invalid status ID format'),
    body('typeId').optional().isInt({ min: 1 }).withMessage('Invalid ticket type ID format'),
    body('dueDate').optional().isISO8601().withMessage('Invalid date format for due date'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isInt({ min: 1 }).withMessage('Invalid tag ID format'),
    validateRequest,
  ],
  updateTicket
);

// Add a comment to a ticket
router.post(
  '/:id/comments',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid ticket ID format'),
    body('content').notEmpty().withMessage('Comment content is required'),
    body('isInternal').optional().isBoolean().withMessage('isInternal must be a boolean'),
    validateRequest,
  ],
  addComment
);

// Delete a ticket
router.delete(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid ticket ID format'),
    validateRequest,
  ],
  deleteTicket
);

export default router; 