import express from 'express';
import {
  getAllSupplierDebts,
  getSupplierDebtById,
  createSupplierDebt,
  updateSupplierDebt,
  deleteSupplierDebt,
  recordPayment,
  deletePayment,
} from './supplierDebts.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, requireRole(['ADMIN', 'CASHIER']), getAllSupplierDebts);
router.get('/:id', verifyToken, requireRole(['ADMIN', 'CASHIER']), getSupplierDebtById);
router.post('/', verifyToken, requireRole(['ADMIN', 'CASHIER']), createSupplierDebt);
router.put('/:id', verifyToken, requireRole(['ADMIN', 'CASHIER']), updateSupplierDebt);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteSupplierDebt);
router.post('/:id/payments', verifyToken, requireRole(['ADMIN', 'CASHIER']), recordPayment);
router.delete('/:id/payments/:paymentId', verifyToken, requireRole('ADMIN'), deletePayment);

export default router;
