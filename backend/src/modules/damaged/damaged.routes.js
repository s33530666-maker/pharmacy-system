import express from 'express';
import { handleMoveToDamaged, handleGetDamagedHistory, handleGetExpiredBatches, handleRestoreDamaged } from './damaged.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody, damagedDrugSchema } from '../../middleware/validation.js';

const router = express.Router();

router.post('/', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), validateBody(damagedDrugSchema), handleMoveToDamaged);
router.get('/', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleGetDamagedHistory);
router.get('/expired', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleGetExpiredBatches);
router.delete('/:id', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), handleRestoreDamaged);

export default router;