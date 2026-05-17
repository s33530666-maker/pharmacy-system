import express from 'express';
import prisma from '../../config/db.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { 
        account: true,
        _count: { select: { sales: true } }
      },
      orderBy: { name: 'asc' },
    });

    // Get all sales and payments to calculate totalDebt properly
    const customerIds = customers.map(c => c.id);
    const [allSales, allPayments] = await Promise.all([
      prisma.sale.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, grandTotal: true }
      }),
      prisma.payment.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, amount: true }
      }),
    ]);

    // Calculate totalDebt for each customer
    const salesByCustomer = {};
    const paymentsByCustomer = {};
    
    allSales.forEach(s => {
      salesByCustomer[s.customerId] = (salesByCustomer[s.customerId] || 0) + parseFloat(s.grandTotal || 0);
    });
    
    allPayments.forEach(p => {
      paymentsByCustomer[p.customerId] = (paymentsByCustomer[p.customerId] || 0) + parseFloat(p.amount || 0);
    });

    const formattedCustomers = customers.map(c => {
      const totalPurchases = salesByCustomer[c.id] || 0;
      const totalPaid = paymentsByCustomer[c.id] || 0;
      const totalDebt = totalPurchases - totalPaid;
      const status = totalDebt <= 0 ? 'مسدد' : 'مديون';

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalPoints: c.totalPoints || 0,
        debtLimit: c.debtLimit || 0,
        isVip: c.isVip || false,
        createdAt: c.createdAt,
        totalPurchases,
        totalPaid,
        totalDebt,
        status,
        account: c.account ? {
          currentBalance: c.account.currentBalance || 0,
          totalDebt: c.account.totalDebt || 0,
          totalPaid: c.account.totalPaid || 0,
        } : null,
        totalInvoices: c._count?.sales || 0,
      };
    });

    return res.status(200).json({ success: true, data: formattedCustomers });
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/accounts', requireRole(['ADMIN', 'CASHIER']), async (req, res) => {
  try {
    const accounts = await prisma.customerAccount.findMany({
      include: { customer: true },
      orderBy: { currentBalance: 'desc' },
    });

    return res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching customer accounts:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.get('/:customerId', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { account: true },
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const sales = await prisma.sale.findMany({
      where: { customerId },
      select: { grandTotal: true },
    });

    const payments = await prisma.payment.findMany({
      where: { customerId },
      select: { amount: true },
    });

    const totalPurchases = sales.reduce((sum, s) => sum + parseFloat(s.grandTotal || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalDebt = totalPurchases - totalPaid;
    const status = totalDebt <= 0 ? 'مسدد' : 'مديون';

    return res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          totalPoints: customer.totalPoints || 0,
          debtLimit: customer.debtLimit || 0,
          isVip: customer.isVip || false,
          createdAt: customer.createdAt,
        },
        totalPurchases,
        totalPaid,
        totalDebt,
        status,
        invoicesCount: sales.length,
        account: customer.account ? {
          currentBalance: customer.account.currentBalance || 0,
          totalDebt: customer.account.totalDebt || 0,
          totalPaid: customer.account.totalPaid || 0,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching customer account:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.get('/accounts/:customerId', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID is required' });
    }

    const [account, transactions, creditSales] = await Promise.all([
      prisma.customerAccount.findUnique({
        where: { customerId },
        include: { customer: true },
      }),
      prisma.customerTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.sale.findMany({
        where: { 
          customerId, 
          OR: [
            { paymentMethod: 'CREDIT' },
            { paymentMethod: 'credit' },
            { paymentStatus: { in: ['DEFERRED', 'UNPAID'] } }
          ]
        },
        include: {
          items: { select: { id: true, drugName: true, quantity: true, unitPrice: true, totalPrice: true } },
          payments: { select: { id: true, amount: true, paymentMethod: true, paymentDate: true } },
        },
        orderBy: { saleDate: 'desc' },
      }),
    ]);

    const invoices = creditSales.map(sale => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: sale.id,
        saleDate: sale.saleDate,
        grandTotal: parseFloat(sale.grandTotal),
        subtotal: parseFloat(sale.subtotal),
        discount: parseFloat(sale.discount),
        totalPaid,
        remainingAmount: parseFloat(sale.grandTotal) - totalPaid,
        status: totalPaid >= parseFloat(sale.grandTotal) ? 'paid' : 'unpaid',
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        account: account ? {
          id: account.id,
          currentBalance: account.currentBalance,
          totalDebt: account.totalDebt,
          totalPaid: account.totalPaid,
          customer: account.customer,
        } : null,
        transactions,
        invoices,
      },
    });
  } catch (error) {
    console.error('Error fetching customer account:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/accounts/:customerId/pay', requireRole(['ADMIN', 'CASHIER']), async (req, res) => {
  try {
    const { customerId } = req.params;
    const { amount, description } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const paymentAmount = parseFloat(amount);

    await prisma.$transaction(async (tx) => {
      let account = await tx.customerAccount.findUnique({ where: { customerId } });

      if (!account) {
        throw Object.assign(new Error('Customer account not found'), { status: 404 });
      }

      if (account.currentBalance < paymentAmount) {
        throw Object.assign(new Error('Payment amount exceeds current balance'), { status: 400 });
      }

      account = await tx.customerAccount.update({
        where: { customerId },
        data: {
          totalPaid: account.totalPaid + paymentAmount,
          currentBalance: account.currentBalance - paymentAmount,
          lastUpdated: new Date(),
        },
      });

      // Distribute payment across unpaid sales to keep statuses in sync
      const unpaidSales = await tx.sale.findMany({
        where: { 
          customerId, 
          paymentMethod: 'DEFERRED' 
        },
        include: { payments: true },
        orderBy: { saleDate: 'asc' }
      });

      let remainingToAllocate = paymentAmount;
      for (const sale of unpaidSales) {
        if (remainingToAllocate <= 0) break;

        const saleTotalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const saleRemaining = parseFloat(sale.grandTotal) - saleTotalPaid;

        if (saleRemaining > 0) {
          const allocAmount = Math.min(saleRemaining, remainingToAllocate);
          
          await tx.payment.create({
            data: {
              customerId,
              saleId: sale.id,
              amount: allocAmount,
              paymentMethod: 'CASH',
              paymentDate: new Date(),
            }
          });

          remainingToAllocate -= allocAmount;
        }
      }

      await tx.customerTransaction.create({
        data: {
          customerId,
          type: 'PAYMENT',
          amount: -paymentAmount,
          balance: account.currentBalance,
          description: description || `دفع نقدي`,
          createdAt: new Date(),
        },
      });
    });

    res.status(200).json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    const status = error.status || 500;
    console.error('Error recording payment:', error.message);
    res.status(status).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/transactions', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { customerId, limit = 100, offset = 0 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 100, 200);
    const pageOffset = parseInt(offset) || 0;

    const where = customerId ? { customerId } : {};

    const [transactions, total] = await Promise.all([
      prisma.customerTransaction.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        take: pageLimit,
        skip: pageOffset,
      }),
      prisma.customerTransaction.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: { limit: pageLimit, offset: pageOffset, total, totalPages: Math.ceil(total / pageLimit) },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.get('/search', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Search query is required (min 2 characters)' });
    }

    const searchTerm = decodeURIComponent(q).trim().toLowerCase();

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
        ],
      },
      include: { account: true },
      take: 20,
    });

    return res.status(200).json({ success: true, data: customers });
  } catch (error) {
    console.error('Error searching customers:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// PUT /customer-ledger/:customerId/debt-limit - Update customer debt limit (ADMIN only)
router.put('/:customerId/debt-limit', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { customerId } = req.params;
    const { debtLimit } = req.body;

    if (debtLimit === undefined || debtLimit === null) {
      return res.status(400).json({ success: false, error: 'debtLimit is required' });
    }

    const parsedLimit = parseFloat(debtLimit);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      return res.status(400).json({ success: false, error: 'debtLimit must be a non-negative number' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { debtLimit: parsedLimit },
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Debt limit updated successfully',
      data: { debtLimit: parsedLimit }
    });
  } catch (error) {
    console.error('Error updating debt limit:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

export default router;
