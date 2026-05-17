import express from 'express';
import { getSettings, updateSettings } from './settings.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/system', verifyToken, getSettings);
router.put('/system', verifyToken, requireRole('ADMIN'), updateSettings);

export default router;
