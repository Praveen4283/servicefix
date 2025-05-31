import { Router } from 'express';

// Import versioned routes
import v1Routes from './v1';

const router = Router();

// API version routes
router.use('/v1', v1Routes);

// Default route uses the latest API version
router.use('/', v1Routes);

export default router; 