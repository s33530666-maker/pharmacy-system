import express from 'express';
import { getAllSuppliers, createSupplier, getSupplierById, getSupplierLedger, addSupplierPayment } from './suppliers.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, getAllSuppliers);
router.get('/:id', verifyToken, getSupplierById);
router.get('/:id/ledger', verifyToken, getSupplierLedger);
router.post('/', verifyToken, createSupplier);
router.post('/:id/pay', verifyToken, addSupplierPayment);

export default router;