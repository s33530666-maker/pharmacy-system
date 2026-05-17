import express from 'express';
import shiftController from './shift.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/open', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), shiftController.openShift);
router.post('/close', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), shiftController.closeShift);
router.get('/current', verifyToken, shiftController.getCurrentShift);
router.get('/sales', verifyToken, shiftController.getShiftSales);
router.get('/report', verifyToken, shiftController.getShiftReport);

export default router;
