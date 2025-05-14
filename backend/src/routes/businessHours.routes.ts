import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getAllBusinessHours,
  getBusinessHoursById,
  createBusinessHours,
  updateBusinessHours,
  deleteBusinessHours,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday
} from '../controllers/businessHours.controller';

const router = express.Router();

// Business Hours routes
router.get('/organization/:organizationId', authenticate, getAllBusinessHours);
router.get('/:id', authenticate, getBusinessHoursById);
router.post('/', authenticate, createBusinessHours);
router.put('/:id', authenticate, updateBusinessHours);
router.delete('/:id', authenticate, deleteBusinessHours);

// Holiday routes
router.get('/:businessHoursId/holidays', authenticate, getHolidays);
router.post('/holidays', authenticate, createHoliday);
router.put('/holidays/:id', authenticate, updateHoliday);
router.delete('/holidays/:id', authenticate, deleteHoliday);

export default router; 