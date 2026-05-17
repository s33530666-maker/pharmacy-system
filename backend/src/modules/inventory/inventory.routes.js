import express from 'express';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { adjustInventory, getInventoryStats } from './inventory.controller.js';

const router = express.Router();

router.post('/adjust', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), adjustInventory);
router.get('/stats', verifyToken, getInventoryStats);

export default router;