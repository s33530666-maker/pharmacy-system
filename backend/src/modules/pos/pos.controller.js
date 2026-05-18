import prisma from '../../config/db.js';
import {
  createSale,
  getSalesHistory,
  processReturn,
  addExpense,
  suspendSale,
  getSuspendedSales,
  deleteSuspendedSale,
} from './pos.service.js';
import shiftService from '../shifts/shift.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getActiveShiftId = async (userId) => {
  if (!userId) return null;
  try {
    const shift = await shiftService.getCurrentShift(userId);
    return shift?.id || null;
  } catch (err) {
    console.error('getActiveShiftId error:', err.message);
    return null;
  }
};

const getOrCreateWalkInCustomer = async () => {
  let walkIn = await prisma.customer.findFirst({ where: { name: 'Walk-In Customer' } });
  if (!walkIn) {
    walkIn = await prisma.customer.create({
      data: { name: 'Walk-In Customer', phone: 'N/A' },
    });
  }
  return walkIn.id;
};

async function handleSearchDrugs(req, res) {
  try {
    const { query, form } = req.query;
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = decodeURIComponent(query).toLowerCase().trim();
    const formFilter = form && form !== 'All' ? form : null;

    const where = {
      status: { not: 'INACTIVE' },
      OR: [
        { name: { contains: searchTerm } },
        { arabicName: { contains: searchTerm } },
        { genericName: { contains: searchTerm } },
        { barcode: { contains: searchTerm } },
      ],
    };
    if (formFilter) where.dosageForm = { equals: formFilter };

    const drugs = await prisma.drug.findMany({
      where,
      take: 10,
      select: {
        id: true,
        name: true,
        arabicName: true,
        barcode: true,
        externalId: true,
        excelId: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        sellPrice: true,
        costPrice: true,
        alternatePrice: true,
        stock: true,
        batches: {
          where: { quantity: { gt: 0 } },
          select: { sellingPrice: true, quantity: true, expiryDate: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const results = drugs.map((drug) => {
      const batchStock = drug.batches.reduce((sum, b) => sum + b.quantity, 0);
      const totalStock = batchStock + (drug.stock || 0);
      const latestBatch = drug.batches[0];
      const sellPrice = latestBatch ? latestBatch.sellingPrice : drug.sellPrice;
      return {
        id: drug.id,
        name: drug.arabicName ? `${drug.name} (${drug.arabicName})` : drug.name,
        barcode: drug.barcode,
        externalId: drug.externalId || null,
        excelId: drug.excelId || null,
        genericName: drug.genericName,
        strength: drug.strength,
        dosageForm: drug.dosageForm,
        sell_price: sellPrice,
        cost_price: drug.costPrice || 0,
        publicPrice: sellPrice,
        oldPrice: drug.alternatePrice || null,
        available: totalStock > 0,
        stock: drug.stock || 0,
        batchStock,
        totalStock,
        quantity: totalStock,
        expiryDate: latestBatch ? latestBatch.expiryDate : null,
      };
    });

    return res.status(200).json({ message: `Found ${results.length} drug(s)`, data: results });
  } catch (error) {
    console.error('Search Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCreateSale(req, res) {
  try {
    const {
      userId,
      customerId,
      items,
      paymentMethod,
      paymentStatus,
      earnedPoints,
      discount,
      cashPaid,
      changeReturn,
      grandTotal,
      subtotal,
    } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }
    for (const item of items) {
      if (!item.drugId || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({ error: 'Each item must have drugId and a positive quantity' });
      }
    }

    // Resolve user (with fallback if missing)
    let finalUserId = String(userId);
    const user = await prisma.user.findUnique({ where: { id: finalUserId } });
    if (!user) {
      const fallback = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
      if (!fallback) {
        return res.status(400).json({ error: 'No active user found. Please check user configuration.' });
      }
      finalUserId = fallback.id;
    }

    // Resolve customer
    const walkInId = await getOrCreateWalkInCustomer();
    const isWalkIn = !customerId || customerId === 'walk-in' || customerId === 'Walk-In';
    let finalCustomerId = walkInId;

    if (!isWalkIn) {
      const customerIdStr = String(customerId).trim();
      if (UUID_REGEX.test(customerIdStr)) {
        const existing = await prisma.customer.findUnique({ where: { id: customerIdStr } });
        if (existing) finalCustomerId = customerIdStr;
      }
    }

    // Normalize payment method
    const creditAliases = ['credit', 'CREDIT', 'DEFERRED', 'آجل'];
    const normalizedPaymentMethod = creditAliases.includes(paymentMethod) ? 'credit' : 'cash';

    if (normalizedPaymentMethod === 'credit' && finalCustomerId === walkInId) {
      return res.status(400).json({ error: 'Valid customer is required for credit payment' });
    }

    const parsedDiscount = parseFloat(discount) || 0;
    const parsedCashPaid = parseFloat(cashPaid) || 0;
    const parsedChangeReturn = parseFloat(changeReturn) || 0;
    const parsedGrandTotal = parseFloat(grandTotal) || 0;
    const parsedSubtotal = parseFloat(subtotal) || 0;
    const parsedEarnedPoints = parseInt(earnedPoints, 10) || 0;

    // Discount limit check
    const userWithLimit = await prisma.user.findUnique({
      where: { id: finalUserId },
      select: { maxDiscountLimit: true },
    });
    const maxDiscountLimit = userWithLimit?.maxDiscountLimit || 0;
    if (maxDiscountLimit > 0 && parsedSubtotal > 0) {
      const discountPercent = (parsedDiscount / parsedSubtotal) * 100;
      if (discountPercent > maxDiscountLimit) {
        return res.status(400).json({
          error: `Discount exceeds your maximum allowed limit of ${maxDiscountLimit}%`,
        });
      }
    }

    const activeShiftId = await getActiveShiftId(finalUserId);
    const finalPaymentStatus =
      paymentStatus || (normalizedPaymentMethod === 'credit' ? 'DEFERRED' : 'PAID');

    const sale = await prisma.$transaction(
      async (tx) => {
        const saleResult = await createSale(
          {
            userId: finalUserId,
            customerId: finalCustomerId,
            items,
            paymentMethod: normalizedPaymentMethod,
            paymentStatus: finalPaymentStatus,
            earnedPoints: parsedEarnedPoints,
            discount: parsedDiscount,
            cashPaid: parsedCashPaid,
            changeReturn: parsedChangeReturn,
            grandTotal: parsedGrandTotal,
            shiftId: activeShiftId,
          },
          tx
        );

        if (normalizedPaymentMethod === 'credit') {
          let account = await tx.customerAccount.findUnique({
            where: { customerId: finalCustomerId },
          });
          if (!account) {
            account = await tx.customerAccount.create({
              data: {
                customerId: finalCustomerId,
                totalDebt: parsedGrandTotal,
                totalPaid: 0,
                currentBalance: parsedGrandTotal,
                lastUpdated: new Date(),
              },
            });
          } else {
            account = await tx.customerAccount.update({
              where: { customerId: finalCustomerId },
              data: {
                totalDebt: account.totalDebt + parsedGrandTotal,
                currentBalance: account.currentBalance + parsedGrandTotal,
                lastUpdated: new Date(),
              },
            });
          }

          await tx.customerTransaction.create({
            data: {
              customerId: finalCustomerId,
              type: 'PURCHASE',
              amount: parsedGrandTotal,
              balance: account.currentBalance,
              description: `فاتورة آجل #${saleResult.sale.id}`,
              saleId: saleResult.sale.id,
            },
          });
        }

        if (finalCustomerId && parsedEarnedPoints > 0) {
          try {
            await tx.customer.update({
              where: { id: finalCustomerId },
              data: { totalPoints: { increment: parsedEarnedPoints } },
            });
          } catch (pointsError) {
            console.warn('Could not update loyalty points:', pointsError.message);
          }
        }

        return saleResult;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return res.status(201).json({ message: 'Sale created successfully', data: sale });
  } catch (error) {
    console.error('Sale creation error:', error.message);

    if (error.message?.includes('Insufficient stock')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.code === 'DEBT_LIMIT_EXCEEDED') {
      return res.status(400).json({
        error: 'DEBT_LIMIT_EXCEEDED',
        message: error.message,
        ...error.details,
      });
    }
    if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
      return res.status(400).json({ error: 'Invalid reference data. Please check drug or customer IDs.' });
    }
    if (error.code === 'P2025') {
      return res.status(400).json({ error: 'Record not found. Please check your data.' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleGetSalesHistory(req, res) {
  try {
    const salesHistory = await getSalesHistory();
    return res.status(200).json({ message: 'Sales history retrieved successfully', data: salesHistory });
  } catch (error) {
    console.error('Error fetching sales history:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleProcessReturn(req, res) {
  try {
    const { saleId, items, reason, userId } = req.body;
    if (!saleId) return res.status(400).json({ error: 'saleId is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const validItems = items.filter((item) => item.saleItemId && item.quantity > 0);
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'At least one valid item with quantity > 0 is required' });
    }

    const result = await processReturn({ saleId, items: validItems, reason, userId });
    return res.status(200).json({
      success: true,
      message: 'تم تسجيل المرتجع بنجاح',
      refundAmount: result.refundAmount,
    });
  } catch (error) {
    console.error('Error processing return:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleAddExpense(req, res) {
  try {
    const { description, amount, category, userId } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ error: 'description and amount are required' });
    }
    const currentUserId = req.user?.id || userId;
    const activeShiftId = await getActiveShiftId(currentUserId);

    const result = await addExpense({
      description,
      amount,
      category,
      userId: currentUserId,
      shiftId: activeShiftId,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding expense:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleSuspendSale(req, res) {
  try {
    const { userId, items, totalAmount, note } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }
    const result = await suspendSale({ userId, items, totalAmount, note });
    return res.status(201).json({ message: 'Sale suspended successfully', data: result });
  } catch (error) {
    console.error('Error suspending sale:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGetSuspendedSales(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const suspended = await getSuspendedSales(userId);
    return res.status(200).json({ message: 'Suspended sales retrieved', data: suspended });
  } catch (error) {
    console.error('Error getting suspended sales:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleDeleteSuspendedSale(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });
    await deleteSuspendedSale(id);
    return res.status(200).json({ message: 'Suspended sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting suspended sale:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

const invoiceInclude = {
  customer: true,
  items: { include: { batch: { include: { drug: true } } } },
  user: { select: { name: true } },
};

async function handleSearchInvoices(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query is required (min 2 characters)' });
    }
    const searchTerm = decodeURIComponent(q).toLowerCase().trim();

    const matchingDrugs = await prisma.drug.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { arabicName: { contains: searchTerm } },
          { genericName: { contains: searchTerm } },
        ],
      },
      select: { id: true },
    });
    const drugIds = matchingDrugs.map((d) => d.id);

    const invoiceWhere = {
      OR: [
        { customer: { phone: { contains: searchTerm } } },
        { customer: { name: { contains: searchTerm } } },
        { items: { some: { drugId: { in: drugIds.length > 0 ? drugIds : [''] } } } },
      ],
    };

    if (/^\d+$/.test(searchTerm)) {
      invoiceWhere.OR.push({ receiptNumber: { contains: searchTerm } });
    }

    const invoices = await prisma.sale.findMany({
      where: invoiceWhere,
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const results = invoices.map((inv) => ({
      id: inv.id,
      receiptNumber: inv.receiptNumber,
      customerName: inv.customer?.name || 'عميل',
      customerPhone: inv.customer?.phone || '',
      cashierName: inv.user?.name || '',
      grandTotal: inv.totalAmount,
      createdAt: inv.createdAt,
      saleDate: inv.saleDate,
      items: inv.items.map((itm) => ({
        id: itm.id,
        drugId: itm.drugId,
        drugName: itm.batch?.drug?.name || itm.drugName || 'Unknown',
        genericName: itm.batch?.drug?.genericName || '',
        quantity: itm.quantity,
        unitPrice: parseFloat(itm.unitPrice),
        totalPrice: parseFloat(itm.totalPrice),
        returnedQty: itm.returnedQty || 0,
      })),
    }));
    return res.status(200).json({ message: `Found ${results.length} invoice(s)`, data: results });
  } catch (error) {
    console.error('Search Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetInvoiceById(req, res) {
  try {
    const { id } = req.params;
    const invoice = await prisma.sale.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const formattedItems = invoice.items.map((item) => ({
      id: item.id,
      drugId: item.drugId,
      drugName: item.drugName || item.batch?.drug?.name || 'Unknown',
      genericName: item.batch?.drug?.genericName || '',
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      price: parseFloat(item.unitPrice),
      totalPrice: parseFloat(item.totalPrice),
    }));

    return res.status(200).json({
      message: 'Invoice retrieved successfully',
      data: {
        id: invoice.id,
        receiptNumber: invoice.receiptNumber,
        customerName: invoice.customer?.name || 'عادي',
        customerPhone: invoice.customer?.phone || '',
        subtotal: parseFloat(invoice.subtotal),
        discount: parseFloat(invoice.discount),
        grandTotal: parseFloat(invoice.grandTotal),
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
        userName: invoice.user?.name,
        items: formattedItems,
      },
    });
  } catch (error) {
    console.error('Error getting invoice:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleReturnItem(req, res) {
  try {
    const { invoiceId, itemId, drugId, quantity } = req.body;
    if (!invoiceId || !itemId || !drugId || !quantity) {
      return res.status(400).json({ error: 'invoiceId, itemId, drugId, and quantity are required' });
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const invoice = await tx.sale.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      });
      if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });

      const item = invoice.items.find((i) => i.id === itemId);
      if (!item) throw Object.assign(new Error('Item not found in invoice'), { status: 404 });

      await tx.saleItem.delete({ where: { id: itemId } });

      await tx.drug.update({
        where: { id: drugId },
        data: { stock: { increment: quantity } },
      });

      const batch = await tx.batch.findFirst({
        where: { drugId, quantity: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
      });
      if (batch) {
        await tx.batch.update({
          where: { id: batch.id },
          data: { quantity: { increment: quantity } },
        });
      }

      const remainingItems = await tx.saleItem.findMany({ where: { saleId: invoiceId } });
      const newSubtotal = remainingItems.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
      const newGrandTotal = newSubtotal - parseFloat(invoice.discount);

      await tx.sale.update({
        where: { id: invoiceId },
        data: { subtotal: newSubtotal, grandTotal: newGrandTotal },
      });

      return tx.sale.findUnique({
        where: { id: invoiceId },
        include: { items: { include: { drug: true } } },
      });
    });

    const formattedItems = updatedInvoice.items.map((i) => ({
      id: i.id,
      drugId: i.drugId,
      drugName: i.drugName,
      genericName: i.drug?.genericName || '',
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice),
      price: parseFloat(i.unitPrice),
      totalPrice: parseFloat(i.totalPrice),
    }));

    return res.status(200).json({
      message: 'Item returned successfully',
      data: {
        updatedInvoice: {
          id: updatedInvoice.id,
          receiptNumber: updatedInvoice.receiptNumber,
          subtotal: parseFloat(updatedInvoice.subtotal),
          discount: parseFloat(updatedInvoice.discount),
          grandTotal: parseFloat(updatedInvoice.grandTotal),
          createdAt: updatedInvoice.createdAt,
          items: formattedItems,
        },
      },
    });
  } catch (error) {
    console.error('Error returning item:', error.message);
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Internal server error' });
  }
}

export {
  handleSearchDrugs,
  handleCreateSale,
  handleGetSalesHistory,
  handleProcessReturn,
  handleAddExpense,
  handleSuspendSale,
  handleGetSuspendedSales,
  handleDeleteSuspendedSale,
  handleSearchInvoices,
  handleGetInvoiceById,
  handleReturnItem,
};
