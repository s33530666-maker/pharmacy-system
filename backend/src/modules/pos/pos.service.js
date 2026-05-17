import prisma from '../../config/db.js';

async function createSale(payload, tx = prisma) {
  console.log('=== SERVICE PAYLOAD RECEIVED ===');
  console.log(payload);

  const {
    userId,
    customerId,
    items,
    paymentMethod = 'cash',
    paymentStatus = 'PAID',
    earnedPoints = 0,
    discount = 0,
    cashPaid = 0,
    changeReturn = 0,
    grandTotal = 0,
    shiftId = null,
  } = payload;

  console.log('=== CREATE SALE STARTED ===');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  if (!userId) {
    throw new Error("userId is required");
  }
  if (!customerId) {
    throw new Error("customerId is required");
  }
  if (!items || items.length === 0) {
    throw new Error("No items provided");
  }

  const effectiveCustomerId = String(customerId).trim();
  const effectiveUserId = String(userId).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(effectiveCustomerId)) {
    throw new Error("customerId must be a valid UUID");
  }
  if (!uuidRegex.test(effectiveUserId)) {
    throw new Error("userId must be a valid UUID");
  }

  const parsedDiscount = Number(discount) || 0;
  const parsedCashPaid = Number(cashPaid) || 0;
  const parsedChangeReturn = Number(changeReturn) || 0;
  const parsedGrandTotal = Number(grandTotal) || 0;

  // Check debt limit for credit sales
  if (paymentMethod === 'credit' && parsedGrandTotal > 0) {
    const customer = await prisma.customer.findUnique({
      where: { id: effectiveCustomerId },
      include: { account: true }
    });
    if (customer) {
      const debtLimit = customer.debtLimit || 0;
      if (debtLimit > 0) {
        // Use the authoritative account balance
        const currentDebt = customer.account ? parseFloat(customer.account.currentBalance || 0) : 0;
        const newTotalDebt = currentDebt + parsedGrandTotal;
        
        if (newTotalDebt > debtLimit) {
          const error = new Error("تم تجاوز الحد الأقصى للدين");
          error.code = "DEBT_LIMIT_EXCEEDED";
          error.details = {
            currentDebt: Math.max(0, currentDebt),
            debtLimit: debtLimit,
            saleAmount: parsedGrandTotal,
            availableCredit: Math.max(0, debtLimit - currentDebt)
          };
          throw error;
        }
      }
    }
  }


  console.log('Phase 1: Validating stock availability...');
  
  const validatedItems = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const drugId = item.drugId;
    
    if (!drugId) {
      throw new Error(`Item ${i}: drugId is required`);
    }
    
    const requestedQty = Number(item.quantity);
    if (!requestedQty || requestedQty <= 0) {
      throw new Error(`Item ${i}: quantity must be a positive number`);
    }
    
    const drug = await tx.drug.findUnique({ where: { id: drugId } });
    
    if (!drug) {
      throw new Error(`Drug not found: ${drugId}`);
    }
    
    const batches = await tx.batch.findMany({
      where: { drugId: drugId, quantity: { gt: 0 } },
    });
    
    const batchStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const totalStock = batchStock;
    
    if (totalStock < requestedQty) {
      throw new Error(
        `Insufficient stock for "${drug.name}". Required: ${requestedQty}, Available: ${totalStock}`
      );
    }
    
    validatedItems.push({
      ...item,
      drug,
      requestedQty,
      batchStock,
      totalStock,
      batches,
    });
  }
  
  console.log('Stock validation passed for', validatedItems.length, 'items');

  console.log('Phase 2: Creating sale transaction (using provided tx)...');
  
  const itemsData = [];
  
  for (let i = 0; i < validatedItems.length; i++) {
    const validatedItem = validatedItems[i];
    const drugId = validatedItem.drugId;
    const qty = Math.floor(Number(validatedItem.quantity)) || 1;
    const price = validatedItem.price;
    const unitPrice = Number(price) || 0;
    const drug = validatedItem.drug;
    
    const batches = await tx.batch.findMany({
      where: { drugId: drugId, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
    });
    
    let remainingQty = qty;

    if (batches && batches.length > 0) {
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const batchQuantity = Number(batch.quantity) || 0;
        const deductFromBatch = Math.min(remainingQty, batchQuantity);
        
        if (deductFromBatch > 0) {
          itemsData.push({
            drugId: drugId,
            batchId: batch.id,
            quantity: deductFromBatch,
            unitPrice: Number(batch.sellingPrice) || unitPrice,
            totalPrice: deductFromBatch * (Number(batch.sellingPrice) || unitPrice),
          });
          
          await tx.batch.update({
            where: { id: batch.id },
            data: { quantity: batchQuantity - deductFromBatch },
          });
          
          remainingQty -= deductFromBatch;
        }
      }
      
      if (remainingQty > 0) {
        throw new Error(`Insufficient stock in batches for drug ${drugId}. Requested: ${qty}, Available: ${qty - remainingQty}`);
      }
    }
  }
  
  console.log('Items prepared for sale:', itemsData.length);
  
  const newSale = await tx.sale.create({
    data: {
      userId: effectiveUserId,
      customerId: effectiveCustomerId,
      saleDate: new Date(),
      status: 'COMPLETED',
      grandTotal: parsedGrandTotal,
      subtotal: parsedGrandTotal + parsedDiscount,
      discount: parsedDiscount,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus || 'PAID',
      earnedPoints: parseInt(earnedPoints) || 0,
      shiftId: shiftId || null,
      items: {
        create: itemsData.map(function(item) {
          return {
            drugId: item.drugId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          };
        }),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      items: true,
      payments: true,
    },
  });
  
  console.log('Sale created:', newSale.id);
  
  const paymentAmount = paymentMethod === 'credit' ? 0 : (parsedCashPaid || parsedGrandTotal);

  await tx.payment.create({
    data: {
      customerId: effectiveCustomerId,
      saleId: newSale.id,
      amount: paymentAmount,
      paymentMethod: paymentMethod,
      paymentDate: new Date(),
    },
  });

  // NOTE: Loyalty points are handled in pos.controller.js to avoid double-counting


  // NOTE: Credit (آجل) account updates are handled in pos.controller.js to avoid double-deduction


  console.log('=== CREATE SALE COMPLETED SUCCESSFULLY ===');
  
  return {
    sale: newSale,
    discount: parsedDiscount,
    changeReturn: parsedChangeReturn,
    paymentMethod: paymentMethod,
  };
}

async function getSalesHistory() {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        items: { 
          include: { 
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          }
        },
        payments: { select: { id: true, amount: true, paymentMethod: true, paymentDate: true } },
      },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });

    const allDrugs = await prisma.drug.findMany({ 
      select: { id: true, name: true, genericName: true, barcode: true } 
    });
    const drugMap = Object.fromEntries(allDrugs.map(d => [d.id, d]));

    return sales.map(sale => {
      const primaryPayment = sale.payments && sale.payments.length > 0 ? sale.payments[0] : null;
      return {
        ...sale,
        cashierName: sale.user?.name,
        customerName: sale.customer?.name,
        customerPhone: sale.customer?.phone,
        paymentMethod: primaryPayment?.paymentMethod || 'CASH',
        items: sale.items.map(item => ({
          ...item,
          drugName: drugMap[item.drugId]?.name || 'Unknown',
          genericName: drugMap[item.drugId]?.genericName || '',
          barcode: drugMap[item.drugId]?.barcode || '',
          expiryDate: item.batch?.expiryDate || null,
        }))
      };
    });
  } catch (error) {
    console.error('Error in getSalesHistory:', error.message);
    throw error;
  }
}

async function processReturn(payload) {
  const { saleId, items } = payload;

  if (!saleId) throw new Error('saleId is required');
  if (!items || items.length === 0) throw new Error('items array is required');

  let totalRefundAmount = 0;

  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    
    if (!sale) {
      throw new Error('Sale not found');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const saleItemId = item.saleItemId;
      const returnQty = parseInt(item.quantity) || 0;
      
      if (returnQty <= 0) continue;

      const saleItem = await tx.saleItem.findUnique({ where: { id: saleItemId } });
      
      if (!saleItem) {
        throw new Error('SaleItem not found: ' + saleItemId);
      }

      const alreadyReturned = saleItem.returnedQty || 0;
      const maxReturnable = saleItem.quantity - alreadyReturned;

      if (returnQty > maxReturnable) {
        throw new Error(`Return quantity (${returnQty}) exceeds remaining sale quantity (${maxReturnable}) for item ${saleItemId}`);
      }

      const refundAmount = returnQty * parseFloat(saleItem.unitPrice);
      totalRefundAmount += refundAmount;

      if (saleItem.batchId) {
        try {
          const batch = await tx.batch.findUnique({ where: { id: saleItem.batchId } });
          if (batch) {
            await tx.batch.update({
              where: { id: batch.id },
              data: { quantity: batch.quantity + returnQty },
            });
          }
        } catch (batchError) {
          console.error('Warning: Could not restore batch quantity:', batchError.message);
        }
      } else {
        try {
          const drug = await tx.drug.findUnique({ where: { id: saleItem.drugId } });
          if (drug) {
            await tx.drug.update({
              where: { id: saleItem.drugId },
              data: { stock: (drug.stock || 0) + returnQty },
            });
          }
        } catch (drugError) {
          console.error('Warning: Could not restore drug stock:', drugError.message);
        }
      }

      await tx.saleItem.update({
        where: { id: saleItemId },
        data: { returnedQty: { increment: returnQty } },
      });
    }

    const salePayments = await tx.payment.findFirst({ where: { saleId: saleId } });
    if (salePayments && salePayments.paymentMethod === 'DEFERRED') {
      try {
        const account = await tx.customerAccount.findUnique({ 
          where: { customerId: sale.customerId } 
        });
        
        if (account) {
          await tx.customerAccount.update({
            where: { customerId: sale.customerId },
            data: {
              currentBalance: account.currentBalance - totalRefundAmount,
              lastUpdated: new Date(),
            },
          });

          await tx.customerTransaction.create({
            data: {
              customerId: sale.customerId,
              type: 'RETURN',
              amount: -totalRefundAmount,
              balance: account.currentBalance - totalRefundAmount,
              description: `مرتجع من فاتورة #${saleId}`,
              saleId: saleId,
              createdAt: new Date(),
            },
          });
        }
      } catch (accountError) {
        console.error('Warning: Could not update customer account:', accountError.message);
      }
    }

    return { 
      success: true, 
      refundAmount: totalRefundAmount,
      saleId: saleId,
      returnedItems: items.length
    };
  });
}

async function addExpense(payload) {
  const { description, amount, category, date, userId, shiftId } = payload;

  const expense = await prisma.expense.create({
    data: {
      description: description,
      amount: parseFloat(amount) || 0,
      expenseDate: date ? new Date(date) : new Date(),
      category: category || 'OTHER',
      userId: userId,
      shiftId: shiftId || null,
    },
  });

  return expense;
}

async function suspendSale(payload) {
  const { userId, items, totalAmount, note } = payload;

  if (!items || items.length === 0) {
    throw new Error('No items provided');
  }

  const suspended = await prisma.suspendedSale.create({
    data: {
      userId: String(userId),
      customerId: null,
      status: 'SUSPENDED',
      totalAmount: parseFloat(totalAmount) || 0,
      note: note || null,
      items: {
        create: items.map(item => ({
          drugId: item.drugId,
          drugName: item.drugName || item.name || 'Unknown',
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice || item.box_price) || 0,
          totalPrice: parseFloat(item.totalPrice) || ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1)),
        })),
      },
    },
    include: {
      items: true,
    },
  });

  return suspended;
}

async function getSuspendedSales(userId) {
  const suspended = await prisma.suspendedSale.findMany({
    where: { userId: String(userId) },
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const drugIds = [...new Set(suspended.flatMap(s => s.items.map(i => i.drugId)))];
  
  const drugs = await prisma.drug.findMany({
    where: { id: { in: drugIds } },
    include: {
      batches: {
        where: { quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
        take: 1
      }
    }
  });

  const drugMap = Object.fromEntries(drugs.map(d => [d.id, d]));

  return suspended.map(sale => ({
    ...sale,
    items: sale.items.map(item => ({
      ...item,
      expiryDate: drugMap[item.drugId]?.batches?.[0]?.expiryDate || null
    }))
  }));
}

async function deleteSuspendedSale(id) {
  const suspended = await prisma.suspendedSale.findUnique({
    where: { id },
  });

  if (!suspended) {
    throw new Error('Suspended sale not found');
  }

  await prisma.suspendedSale.delete({
    where: { id },
  });

  return { success: true };
}

export { createSale, getSalesHistory, processReturn, addExpense, suspendSale, getSuspendedSales, deleteSuspendedSale };
