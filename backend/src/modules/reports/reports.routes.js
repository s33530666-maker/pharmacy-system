import express from 'express';
import {
  dashboardController,
  recentTransactionsController,
  dailyExpensesController,
  lowStockController,
  expiringSoonController,
  weeklySalesController,
  topSellingController,
  monthlyRevenueController,
  monthlyProfitController,
  expiredDrugsController,
  customerDebtsController,
  supplierDebtsController,
  applyAuditStockController,
} from './reports.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/dashboard', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), dashboardController);
router.get('/recent-transactions', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), recentTransactionsController);
router.get('/daily-expenses', verifyToken, requireRole(['ADMIN', 'CASHIER']), dailyExpensesController);
router.get('/low-stock', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), lowStockController);
router.get('/expiring-soon', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), expiringSoonController);
router.get('/weekly-sales', verifyToken, requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), weeklySalesController);
router.get('/top-selling', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), topSellingController);
router.get('/monthly-revenue', verifyToken, requireRole('ADMIN'), monthlyRevenueController);
router.get('/monthly-profit', verifyToken, requireRole('ADMIN'), monthlyProfitController);
router.get('/expired-count', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), expiredDrugsController);
router.get('/customer-debts', verifyToken, requireRole('ADMIN'), customerDebtsController);
router.get('/supplier-debts', verifyToken, requireRole('ADMIN'), supplierDebtsController);
router.post('/audit-stock', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), applyAuditStockController);

export default router;
