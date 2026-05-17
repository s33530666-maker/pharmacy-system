import express from 'express';
import prisma from '../../config/db.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/debts-summary', requireRole('ADMIN'), async (req, res) => {
  try {
    const accounts = await prisma.customerAccount.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { currentBalance: 'desc' },
    });

    const unpaidAccounts = accounts.filter(a => a.currentBalance > 0);
    const totalUnpaid = unpaidAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalPaid = accounts.reduce((sum, a) => sum + a.totalPaid, 0);

    res.status(200).json({
      success: true,
      data: unpaidAccounts,
      summary: { totalUnpaid, totalPaid, unpaidCount: unpaidAccounts.length },
    });
  } catch (error) {
    console.error('Get debts summary error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error retrieving debts summary' });
  }
});

router.get('/sales-with-deferred', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { status, customerId, search, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 50, 100);
    const pageOffset = parseInt(offset) || 0;

    const where = { paymentMethod: 'DEFERRED' };

    if (status === 'unpaid') {
      where.payments = { none: {} };
    } else if (status === 'paid') {
      where.payments = { some: { amount: { gt: 0 } } };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      where.customer = {
        OR: [
          { name: { contains: term } },
          { phone: { contains: term } },
        ],
      };
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          items: {
            select: { id: true, drugName: true, quantity: true, unitPrice: true, totalPrice: true },
          },
          payments: true,
        },
        orderBy: { saleDate: 'desc' },
        take: pageLimit,
        skip: pageOffset,
      }),
      prisma.sale.count({ where }),
    ]);

    const salesWithStatus = sales.map(sale => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        ...sale,
        totalPaid,
        remainingAmount: parseFloat(sale.grandTotal) - totalPaid,
        status: totalPaid >= parseFloat(sale.grandTotal) ? 'paid' : 'unpaid',
      };
    });

    res.status(200).json({
      success: true,
      data: salesWithStatus,
      pagination: {
        limit: pageLimit,
        offset: pageOffset,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error('Get deferred sales error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error retrieving deferred sales' });
  }
});

router.post('/mark-paid/:saleId', requireRole(['ADMIN', 'CASHIER']), async (req, res) => {
  try {
    const { saleId } = req.params;
    const { amount, method } = req.body;

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (sale.paymentMethod !== 'DEFERRED') {
      return res.status(400).json({ success: false, message: 'Only deferred sales can be marked as paid' });
    }

    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = parseFloat(sale.grandTotal) - totalPaid;
    const paymentAmount = amount ? Math.min(parseFloat(amount), remainingAmount) : remainingAmount;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          customerId: sale.customerId,
          saleId: sale.id,
          amount: paymentAmount,
          paymentMethod: method || 'CASH',
          paymentDate: new Date(),
        },
      });

      const account = await tx.customerAccount.findUnique({ where: { customerId: sale.customerId } });

      if (account) {
        await tx.customerAccount.update({
          where: { customerId: sale.customerId },
          data: {
            totalPaid: account.totalPaid + paymentAmount,
            currentBalance: Math.max(0, account.currentBalance - paymentAmount),
            lastUpdated: new Date(),
          },
        });

        await tx.customerTransaction.create({
          data: {
            customerId: sale.customerId,
            type: 'PAYMENT',
            amount: -paymentAmount,
            balance: Math.max(0, account.currentBalance - paymentAmount),
            description: `دفع فاتورة #${saleId}`,
            saleId: sale.id,
            paymentId: payment.id,
          },
        });
      }

      return payment;
    });

    res.status(201).json({ success: true, message: 'Payment recorded', data: result });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error marking as paid' });
  }
});

export default router;
