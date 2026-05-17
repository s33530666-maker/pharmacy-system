import express from 'express';
import { handleSearchDrugs, handleCreateSale, handleGetSalesHistory, handleProcessReturn, handleAddExpense, handleSuspendSale, handleGetSuspendedSales, handleDeleteSuspendedSale, handleSearchInvoices, handleGetInvoiceById, handleReturnItem } from './pos.controller.js';
import customerLedgerRoutes from './customerLedger.controller.js';
import customerDebtsRoutes from './customerDebts.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody, createSaleSchema, processReturnSchema, expenseSchema, suspendSaleSchema } from '../../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

router.get('/search', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER', 'TECHNICIAN']), handleSearchDrugs);
router.post('/sale', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), validateBody(createSaleSchema), handleCreateSale);
router.get('/history', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleGetSalesHistory);
router.post('/return', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), validateBody(processReturnSchema), handleProcessReturn);
router.post('/return-item', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), validateBody(z.object({
  invoiceId: z.string().min(1),
  itemId: z.string().min(1),
  drugId: z.string().min(1),
  quantity: z.number().int().positive(),
})), handleReturnItem);
router.get('/invoices/search', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleSearchInvoices);
router.get('/invoices/:id', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleGetInvoiceById);
router.post('/expense', verifyToken, requireRole(['ADMIN', 'CASHIER']), validateBody(expenseSchema), handleAddExpense);
router.post('/suspend', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), validateBody(suspendSaleSchema), handleSuspendSale);
router.get('/suspended', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleGetSuspendedSales);
router.delete('/suspended/:id', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), handleDeleteSuspendedSale);

router.use('/customer-ledger', customerLedgerRoutes);
router.use('/customer-debts', customerDebtsRoutes);

export default router;
