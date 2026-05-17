import express from 'express';
import { handleGetActiveAlerts, handleGetAlertCount } from './alerts.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/active', verifyToken, handleGetActiveAlerts);
router.get('/count', verifyToken, handleGetAlertCount);

export default router;
