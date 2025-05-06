import express from 'express';
import { logController } from '../controllers/log.controller';

const router = express.Router();

// Route to receive logs from frontend
router.post('/', logController.saveFrontendLog);

export default router; 