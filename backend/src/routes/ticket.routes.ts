import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { query } from '../config/database';

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
  getAllStatuses,
  uploadTicketAttachments,
  downloadTicketAttachment,
  getTicketHistory,
  addTicketComment,
  updateTicketSLA
} from '../controllers/ticket.controller';
import { validateZod } from '../middleware/zod-validate.middleware';
import { authenticate } from '../middleware/auth.middleware';

// --- Multer Configuration ---
// Use memory storage for Supabase integration
const storage = multer.memoryStorage();

// Function to get the file size limit from settings
const getFileSizeLimit = async () => {
  try {
    // Try to get max file size from settings
    const result = await query(
      'SELECT settings_data->\'maxFileSize\' as max_file_size FROM settings WHERE category = $1 LIMIT 1',
      ['general']
    );
    
    if (result.rows.length > 0 && result.rows[0].max_file_size) {
      // Convert MB to bytes (settings are stored in MB)
      const maxSizeMB = parseInt(result.rows[0].max_file_size);
      if (!isNaN(maxSizeMB) && maxSizeMB > 0) {
        return maxSizeMB * 1024 * 1024; // Convert MB to bytes
      }
    }
    
    // Default to 5MB if not found or invalid
    return 5 * 1024 * 1024;
  } catch (error) {
    console.error('Error fetching max file size from settings:', error);
    // Default to 5MB on error
    return 5 * 1024 * 1024;
  }
};

// Initially set with default limit, will be updated on each request
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // Default 5MB
  fileFilter: (req, file, cb) => {
    // Dynamically update file size limit on each request
    getFileSizeLimit().then(maxSize => {
      (upload as any).limits.fileSize = maxSize;
      cb(null, true);
    }).catch(err => {
      cb(null, true); // Still allow the file even if we couldn't get the limit
    });
  }
});
// --- End Multer Configuration ---

const router = express.Router();

// Apply authentication middleware to all ticket routes
router.use(authenticate);

// --- Zod Schema Definitions ---
const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
  }),
});

const attachmentIdParamSchema = z.object({
  params: z.object({
    attachmentId: z.string().regex(/^\d+$/, 'Invalid attachment ID format').transform(Number),
  }),
});

const commentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ticket ID format').transform(Number),
  }),
  body: z.object({
    content: z.string().min(1, 'Comment content is required'),
    isInternal: z.boolean().optional(),
  }),
});

const ticketQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer')
      .transform(Number)
      .refine(val => val >= 1, 'Page must be a positive integer')
      .optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(1, 'Subject is required').max(255, 'Subject cannot exceed 255 characters'),
    description: z.string().min(1, 'Description is required'),
    requesterId: z.coerce.number().int().positive('Invalid requester ID format'),
    assigneeId: z.coerce.number().int().positive('Invalid assignee ID format').optional().nullable(),
    departmentId: z.coerce.number().int().positive('Invalid department ID format').optional().nullable(),
    priorityId: z.coerce.number().int().positive('Invalid priority ID format'),
    typeId: z.coerce.number().int().positive('Invalid ticket type ID format').optional().nullable(),
    dueDate: z.string().datetime('Invalid date format for due date').optional().nullable(),
    tags: z.preprocess(
      (val) => typeof val === 'string' ? JSON.parse(val) : val,
      z.array(z.string().trim().min(1, 'Tag names cannot be empty')).optional().nullable()
    ),
  }),
});

const updateTicketSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ticket ID format').transform(Number),
  }),
  body: z.object({
    subject: z.string().max(255, 'Subject cannot exceed 255 characters').optional(),
    description: z.string().optional(),
    assigneeId: z.coerce.number().int().positive('Invalid assignee ID format').optional(),
    departmentId: z.coerce.number().int().positive('Invalid department ID format').optional(),
    priorityId: z.coerce.number().int().positive('Invalid priority ID format').optional(),
    statusId: z.coerce.number().int().positive('Invalid status ID format').optional(),
    typeId: z.coerce.number().int().positive('Invalid ticket type ID format').optional(),
    dueDate: z.string().datetime('Invalid date format for due date').optional(),
    tags: z.array(z.coerce.number().int().positive('Invalid tag ID format')).optional(),
  }),
});
// --- End Schema Definitions ---

// --- Routes for fetching dropdown options ---
router.get('/departments', getAllDepartments);
router.get('/priorities', getAllPriorities);
router.get('/types', getAllTypes);
router.get('/statuses', getAllStatuses);
// --- End routes for options ---

// --- Routes for attachments, comments, and history ---
// Upload attachments to a ticket
router.post(
  '/:id/attachments',
  validateZod(idParamSchema),
  upload.array('attachments', 10), // Allow up to 10 files
  uploadTicketAttachments
);

// Download an attachment
router.get(
  '/attachments/download/:attachmentId',
  validateZod(attachmentIdParamSchema),
  downloadTicketAttachment
);

// Get ticket history
router.get(
  '/:id/history',
  validateZod(idParamSchema),
  getTicketHistory
);

// Add comment to ticket (enhanced version)
router.post(
  '/:id/comments',
  validateZod(commentSchema),
  addTicketComment
);
// --- END Routes ---

// Get all tickets
router.get(
  '/',
  validateZod(ticketQuerySchema),
  getTickets
);

// Get ticket by ID
router.get(
  '/:id',
  validateZod(idParamSchema),
  getTicketById
);

// Create a new ticket
router.post(
  '/',
  upload.array('attachments', 5),
  validateZod(createTicketSchema),
  createTicket
);

// Update a ticket
router.put(
  '/:id',
  validateZod(updateTicketSchema),
  updateTicket
);

// Add a comment to a ticket
router.post(
  '/:id/comments',
  validateZod(commentSchema),
  addComment
);

// Add route for updating SLA after ticket priority changes
router.post(
  '/:id/update-sla',
  validateZod(idParamSchema),
  updateTicketSLA
);

// Delete a ticket
router.delete(
  '/:id',
  validateZod(idParamSchema),
  deleteTicket
);

export default router; 