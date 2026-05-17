import express from 'express';
import { licenseController } from './license.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/status', licenseController.status);
router.post('/activate', verifyToken, requireRole('ADMIN'), licenseController.activate);
router.get('/info', verifyToken, requireRole('ADMIN'), licenseController.info);

export default router;