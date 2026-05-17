import express from 'express';
import prisma from '../../config/db.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { search } = req.query;
    
    let where = {};
    if (search && search.trim().length >= 2) {
      const searchTerm = search.trim();
      where = {
        OR: [
          { name: { contains: searchTerm } },
          { phone: { contains: searchTerm } }
        ]
      };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: { 
        account: true,
        _count: {
          select: { sales: true }
        }
      },
      take: 50,
      orderBy: { name: 'asc' }
    });

    const formattedCustomers = customers.map(c => {
      const totalDebt = c.account ? parseFloat(c.account.currentBalance || 0) : 0;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        currentBalance: totalDebt,
        totalDebt: totalDebt,
        debtLimit: c.debtLimit || 0,
        totalPoints: c.totalPoints || 0,
        loyaltyPoints: c.totalPoints || 0,
        totalInvoices: c._count?.sales || 0,
        status: totalDebt > 0 ? 'مديون' : 'مسدد',
      };
    });

    return res.status(200).json({ success: true, data: formattedCustomers });
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

router.post('/', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    const customerName = name.trim();
    const customerPhone = phone?.trim() || null;

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { name: { equals: customerName } },
          ...(customerPhone ? [{ phone: customerPhone }] : [])
        ]
      }
    });

    if (existingCustomer) {
      return res.status(400).json({ 
        success: false, 
        error: 'عميل بنفس الاسم أو رقم الهاتف موجود بالفعل',
        data: existingCustomer
      });
    }

    const customer = await prisma.customer.create({
      data: {
        name: customerName,
        phone: customerPhone,
      }
    });

    await prisma.customerAccount.create({
      data: {
        customerId: customer.id,
        currentBalance: 0,
        totalDebt: 0,
        totalPaid: 0,
        lastUpdated: new Date()
      }
    });

    const customerWithAccount = await prisma.customer.findUnique({
      where: { id: customer.id },
      include: { account: true }
    });

    return res.status(201).json({ success: true, data: customerWithAccount });
  } catch (error) {
    console.error('Error creating customer:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// GET /customers/:id/invoices - Get customer's invoice history
router.get('/:id/invoices', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: id },
      include: {
        items: {
          include: {
            batch: { select: { id: true, batchNumber: true } },
          }
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });

    // Fetch drug names for items
    const allDrugIds = [...new Set(sales.flatMap(s => s.items.map(i => i.drugId)))];
    const drugs = await prisma.drug.findMany({
      where: { id: { in: allDrugIds } },
      select: { id: true, name: true, genericName: true }
    });
    const drugMap = Object.fromEntries(drugs.map(d => [d.id, d]));

    const formattedSales = sales.map(sale => ({
      id: sale.id,
      saleDate: sale.saleDate,
      createdAt: sale.createdAt,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus || (sale.paymentMethod?.toLowerCase() === 'credit' ? 'DEFERRED' : 'PAID'),
      subtotal: sale.subtotal,
      discount: sale.discount,
      grandTotal: sale.grandTotal,
      earnedPoints: sale.earnedPoints || 0,
      cashierName: sale.user?.name || '',
      items: sale.items.map(item => ({
        id: item.id,
        drugId: item.drugId,
        drugName: item.drugName || drugMap[item.drugId]?.name || 'غير معروف',
        genericName: drugMap[item.drugId]?.genericName || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        returnedQty: item.returnedQty || 0,
      })),
    }));

    return res.status(200).json({ success: true, data: formattedSales });
  } catch (error) {
    console.error('Error fetching customer invoices:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});
// GET /customers/:id/profile - Get full customer profile
router.get('/:id/profile', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: id },
      include: {
        items: true
      },
      orderBy: { saleDate: 'desc' },
      take: 50,
    });

    // Build drug map for items
    let allDrugIds = [];
    sales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          if (item.drugId) allDrugIds.push(item.drugId);
        });
      }
    });
    allDrugIds = [...new Set(allDrugIds)];
    
    let drugMap = {};
    if (allDrugIds.length > 0) {
      const drugs = await prisma.drug.findMany({
        where: { id: { in: allDrugIds } },
        select: { id: true, name: true, genericName: true }
      });
      drugMap = Object.fromEntries(drugs.map(d => [d.id, d]));
    }

    // Calculate total sales
    const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.grandTotal || 0), 0);

    let paidInvoices = 0;
    let unpaidInvoices = 0;

    const formattedSales = sales.map(sale => {
      const isPaid = sale.status === 'paid' || sale.paymentStatus === 'PAID';
      const isPartial = sale.status === 'partial';
      let mappedStatus = 'unpaid';
      
      if (isPaid) {
        mappedStatus = 'paid';
        paidInvoices++;
      } else if (isPartial) {
        mappedStatus = 'partial';
        unpaidInvoices++;
      } else {
        unpaidInvoices++;
      }

      return {
        id: sale.id,
        saleDate: sale.saleDate || sale.createdAt,
        earnedPoints: sale.earnedPoints || Math.floor(parseFloat(sale.grandTotal || 0) / 100) * 10,
        grandTotal: parseFloat(sale.grandTotal || 0),
        paymentMethod: sale.paymentMethod || 'DEFERRED',
        status: mappedStatus,
        totalPaid: isPaid ? parseFloat(sale.grandTotal || 0) : 0, // Simplified for now
        remainingAmount: isPaid ? 0 : parseFloat(sale.grandTotal || 0), // Simplified
        items: (sale.items || []).map(item => ({
          drugId: item.drugId,
          drugName: item.drugName || drugMap[item.drugId]?.name || 'غير معروف',
          genericName: drugMap[item.drugId]?.genericName || '',
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice || 0),
          totalPrice: parseFloat(item.totalPrice || 0)
        }))
      };
    });

    // Get points history from sales
    const pointsHistory = sales
      .filter(s => s.earnedPoints > 0)
      .map(sale => ({
        type: 'earned',
        points: sale.earnedPoints || Math.floor(parseFloat(sale.grandTotal || 0) / 100) * 10,
        invoiceId: sale.id,
        date: sale.saleDate || sale.createdAt,
      }))
      .reverse();

    // Get debt payments from transactions
    const transactions = await prisma.customerTransaction.findMany({
      where: { customerId: id, type: 'PAYMENT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const debtPayments = transactions.map(t => ({
      amount: parseFloat(t.amount),
      note: t.description || '',
      date: t.createdAt,
    }));

    // Calculate total debt properly from sales and payments
    const totalPurchases = totalSales;
    const totalPaid = debtPayments.reduce((sum, p) => sum + Math.abs(parseFloat(p.amount || 0)), 0);
    const totalDebt = totalPurchases - totalPaid;
    const status = totalDebt <= 0 ? 'مسدد' : 'مديون';

    const response = {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        totalPoints: customer.totalPoints || 0,
        debtLimit: customer.debtLimit || 0,
        createdAt: customer.createdAt,
        isVip: customer.isVip || false,
      },
      totalPurchases,
      totalPaid,
      totalDebt,
      status,
      invoicesCount: sales.length,
      account: {
        totalDebt: Math.max(0, totalDebt),
        totalPaid: totalPaid,
        currentBalance: Math.max(0, totalDebt),
        lastUpdated: customer.account?.lastUpdated || new Date()
      },
      invoices: formattedSales,
      summary: {
        totalInvoices: sales.length,
        paidInvoices,
        unpaidInvoices,
        totalSales: totalSales.toFixed(2)
      },
      pointsHistory,
      debtPayments
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching customer profile:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// POST /customers/:id/pay-debt - Pay customer debt
router.post('/:id/pay-debt', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method = 'CASH', note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    if (!customer.account) {
      return res.status(400).json({ success: false, error: 'Customer account not found' });
    }

    const paymentAmount = parseFloat(amount);
    const currentBalance = parseFloat(customer.account.currentBalance || 0);
    
    // Create transaction record
    await prisma.customerTransaction.create({
      data: {
        customerId: id,
        type: 'PAYMENT',
        amount: paymentAmount,
        balance: Math.max(0, currentBalance - paymentAmount),
        description: note || 'سداد دين',
      }
    });

    // Update account balance
    const newBalance = Math.max(0, currentBalance - paymentAmount);
    const newTotalPaid = parseFloat(customer.account.totalPaid || 0) + paymentAmount;

    await prisma.customerAccount.update({
      where: { customerId: id },
      data: {
        currentBalance: newBalance,
        totalPaid: newTotalPaid,
        lastUpdated: new Date()
      }
    });

    // If this clears all debt, update any unpaid invoices
    if (newBalance === 0) {
      await prisma.sale.updateMany({
        where: { customerId: id, status: { in: ['UNPAID', 'PARTIAL'] } },
        data: { status: 'paid', paymentStatus: 'PAID' }
      });
    }

    return res.status(200).json({ 
      success: true, 
      data: { 
        paidAmount: paymentAmount, 
        remainingBalance: newBalance,
        message: 'تم سداد الدين بنجاح'
      } 
    });
  } catch (error) {
    console.error('Error paying debt:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// POST /customers/:id/redeem-points - Redeem customer points for discount
router.post('/:id/redeem-points', requireRole(['ADMIN', 'PHARMACIST', 'CASHIER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    if (!points || points < 100 || points % 100 !== 0) {
      return res.status(400).json({ success: false, error: 'Minimum 100 points required, and must be in multiples of 100' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const currentPoints = customer.totalPoints || 0;
    if (currentPoints < points) {
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }

    // Calculate discount (100 points = 10 EGP)
    const discountAmount = (points / 100) * 10;

    // Deduct points
    const newPoints = currentPoints - points;
    await prisma.customer.update({
      where: { id },
      data: { totalPoints: newPoints }
    });

    // Create points history record (if you have a points history table)
    // For now, we'll just log it in transactions as a note
    await prisma.customerTransaction.create({
      data: {
        customerId: id,
        type: 'POINTS_REDEEMED',
        amount: -points, // negative to indicate deduction
        balance: 0,
        description: `استبدال ${points} نقطة = ${discountAmount} جنية خصم`,
      }
    });

    return res.status(200).json({ 
      success: true, 
      data: { 
        redeemedPoints: points,
        discountAmount: discountAmount,
        remainingPoints: newPoints,
        message: `تم استبدال ${points} نقطة مقابل ${discountAmount} جنية خصم`
      } 
    });
  } catch (error) {
    console.error('Error redeeming points:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

export default router;