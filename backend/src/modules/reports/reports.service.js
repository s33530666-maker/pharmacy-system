import prisma from '../../config/db.js';

const getDashboardSummary = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's sales total
  const todaySalesResult = await prisma.sale.aggregate({
    where: {
      saleDate: {
        gte: today,
        lt: tomorrow,
      },
      status: 'COMPLETED',
    },
    _sum: {
      grandTotal: true,
    },
  });

  const todaySales = todaySalesResult._sum.grandTotal || 0;

  // Calculate net profit for today's sales
  const todaySaleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        saleDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'COMPLETED',
      },
    },
    include: {
      batch: {
        select: {
          costPrice: true,
        },
      },
    },
  });

  const netProfit = todaySaleItems.reduce((sum, item) => {
    const cost = item.batch?.costPrice || 0;
    const profit = (item.unitPrice - cost) * item.quantity;
    return sum + profit;
  }, 0);

  // Get low stock count (drugs with total quantity <= 10 across all batches)
  const allDrugs = await prisma.drug.findMany({
    include: {
      batches: {
        select: {
          quantity: true,
        },
      },
    },
  });

  // Get low stock count
  const settings = await prisma.systemSettings.findFirst();
  const LOW_STOCK_THRESHOLD = settings?.lowStockThreshold ?? 5;
  
  const lowStockCount = allDrugs.filter((drug) => {
    const totalQty = drug.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    return totalQty < LOW_STOCK_THRESHOLD;
  }).length;

  // Get expiring soon count (within 90 days with qty > 0)
  const expiringDate = new Date();
  expiringDate.setDate(expiringDate.getDate() + 90);

  const expiringSoonCount = await prisma.batch.count({
    where: {
      expiryDate: {
        lte: expiringDate,
        gte: today,
      },
      quantity: {
        gt: 0,
      },
    },
  });

  return {
    todaySales: parseFloat(todaySales.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    lowStockCount,
    expiringSoonCount,
  };
};

const getRecentTransactions = async () => {
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: {
      saleDate: 'desc',
    },
    select: {
      id: true,
      saleDate: true,
      grandTotal: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          batch: {
            select: {
              drug: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return recentSales.map(sale => ({
    ...sale,
    items: sale.items.map(item => ({
      ...item,
      drugName: item.batch?.drug?.name || 'Unknown',
    })),
  }));
};

const getDailyExpenses = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expensesResult = await prisma.expense.aggregate({
    where: {
      expenseDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return expensesResult._sum.amount || 0;
};

const getLowStockItems = async (customThreshold = null) => {
  let threshold = customThreshold;
  if (!threshold) {
    const settings = await prisma.systemSettings.findFirst();
    threshold = settings?.lowStockThreshold ?? 5;
  }

  const allDrugs = await prisma.drug.findMany({
    include: {
      batches: {
        select: { quantity: true },
      },
    },
  });

  const salesCounts = await prisma.saleItem.groupBy({
    by: ['drugId'],
    _sum: { quantity: true },
  });
  const salesMap = Object.fromEntries(salesCounts.map(s => [s.drugId, s._sum.quantity || 0]));

  return allDrugs
    .map((drug) => {
      const totalQty = drug.batches.reduce((sum, b) => sum + b.quantity, 0);
      return {
        id: drug.id,
        name: drug.name,
        arabicName: drug.arabicName,
        totalQuantity: totalQty,
        totalSold: salesMap[drug.id] || 0,
        threshold: threshold
      };
    })
    .filter((drug) => drug.totalQuantity < threshold)
    .sort((a, b) => a.totalQuantity - b.totalQuantity);
};

const getTopSellingDrugs = async (limit = 10) => {
  const topItems = await prisma.saleItem.groupBy({
    by: ['drugId'],
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: limit,
  });

  if (topItems.length === 0) return [];

  const drugIds = topItems.map(i => i.drugId);
  const drugs = await prisma.drug.findMany({
    where: { id: { in: drugIds } },
    select: { id: true, name: true, arabicName: true },
  });
  const drugMap = Object.fromEntries(drugs.map(d => [d.id, d]));

  return topItems.map(item => ({
    id: item.drugId,
    name: drugMap[item.drugId]?.name || 'Unknown',
    arabicName: drugMap[item.drugId]?.arabicName || '',
    totalQty: item._sum.quantity || 0,
    totalRevenue: item._sum.totalPrice || 0,
  }));
};

const getMonthlyRevenue = async () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await prisma.sale.aggregate({
    where: {
      saleDate: { gte: startOfMonth },
      status: 'COMPLETED',
    },
    _sum: { grandTotal: true },
    _count: true,
  });

  return {
    monthlyRevenue: parseFloat((result._sum.grandTotal || 0).toFixed(2)),
    totalSales: result._count || 0,
  };
};

const getExpiringSoonItems = async (days = 90) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + days);

  const expiringBatches = await prisma.batch.findMany({
    where: {
      expiryDate: {
        gte: today,
        lte: expiryDate,
      },
      quantity: { gt: 0 },
    },
    include: {
      drug: {
        select: {
          id: true,
          name: true,
          arabicName: true,
        },
      },
    },
    orderBy: {
      expiryDate: 'asc',
    },
  });

  return expiringBatches.map((batch) => {
    const diffTime = Math.abs(new Date(batch.expiryDate) - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      id: batch.id,
      drugName: batch.drug?.name || 'Unknown',
      arabicName: batch.drug?.arabicName || '',
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      daysUntilExpiry: diffDays
    };
  });
};

const getWeeklySalesData = async () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const salesByDay = await prisma.sale.groupBy({
    by: ['saleDate'],
    where: {
      saleDate: {
        gte: weekAgo,
        lte: today,
      },
      status: 'COMPLETED',
    },
    _sum: {
      grandTotal: true,
    },
  });

  const salesByDayMap = {};
  salesByDay.forEach((sale) => {
    const dayStr = new Date(sale.saleDate).toISOString().split('T')[0];
    salesByDayMap[dayStr] = sale._sum.grandTotal || 0;
  });

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const dayStr = d.toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.push({
      name: dayNames[d.getDay()],
      date: dayStr,
      sales: salesByDayMap[dayStr] || 0,
    });
  }

  return days;
};

const getMonthlyProfit = async () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthSaleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        saleDate: { gte: startOfMonth },
        status: 'COMPLETED',
      },
      batchId: { not: null },
    },
    include: {
      batch: { select: { costPrice: true } },
    },
  });

  const totalRevenue = monthSaleItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalCost = monthSaleItems.reduce((sum, item) => {
    const cost = item.batch?.costPrice || 0;
    return sum + (cost * item.quantity);
  }, 0);

  const result = await prisma.sale.aggregate({
    where: {
      saleDate: { gte: startOfMonth },
      status: 'COMPLETED',
    },
    _count: true,
  });

  return {
    monthlyProfit: parseFloat((totalRevenue - totalCost).toFixed(2)),
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalSales: result._count || 0,
  };
};

const applyAuditStock = async (drugId, newStock, userId) => {
  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    include: { batches: { orderBy: { expiryDate: 'asc' } } },
  });
  if (!drug) throw new Error('Drug not found');

  const totalBatchQty = drug.batches.reduce((s, b) => s + b.quantity, 0);
  const diff = newStock - totalBatchQty;

  if (diff === 0) return { drugId, newStock, batchesUpdated: 0 };

  let remaining = diff;
  const updatedBatches = [];

  if (diff > 0) {
    for (const batch of drug.batches) {
      if (remaining <= 0) break;
      const addQty = Math.min(remaining, 10000);
      const updated = await prisma.batch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity + addQty },
      });
      updatedBatches.push(updated);
      remaining -= addQty;
    }
  } else {
    for (const batch of drug.batches) {
      if (remaining >= 0) break;
      const reduceQty = Math.min(Math.abs(remaining), batch.quantity);
      const updated = await prisma.batch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity - reduceQty },
      });
      updatedBatches.push(updated);
      remaining += reduceQty;
    }
  }

  return { drugId, newStock, batchesUpdated: updatedBatches.length };
};

const getExpiredDrugsCount = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.batch.count({
    where: {
      expiryDate: { lt: today },
      quantity: { gt: 0 },
    },
  });
};

const getCustomerDebts = async () => {
  const result = await prisma.customerAccount.aggregate({
    _sum: { currentBalance: true, totalDebt: true },
    _count: true,
  });
  return {
    totalDebt: parseFloat((result._sum.currentBalance || 0).toFixed(2)),
    totalCustomers: result._count || 0,
  };
};

const getSupplierDebts = async () => {
  const result = await prisma.supplierDebt.aggregate({
    _sum: { currentBalance: true },
    _count: true,
  });
  return {
    totalDebt: parseFloat((result._sum.currentBalance || 0).toFixed(2)),
    totalSuppliers: result._count || 0,
  };
};

export {
  getDashboardSummary,
  getRecentTransactions,
  getDailyExpenses,
  getLowStockItems,
  getExpiringSoonItems,
  getWeeklySalesData,
  getTopSellingDrugs,
  getMonthlyRevenue,
  getMonthlyProfit,
  getExpiredDrugsCount,
  getCustomerDebts,
  getSupplierDebts,
  applyAuditStock,
};
