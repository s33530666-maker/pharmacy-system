import prisma from '../../config/db.js';

export async function getActiveAlerts() {
  const LOW_STOCK_LIMIT = 50; // Default low stock threshold
  const EXPIRY_WARNING_DAYS = 90;

  // Calculate date 90 days from now
  const expiryWarningDate = new Date();
  expiryWarningDate.setDate(expiryWarningDate.getDate() + EXPIRY_WARNING_DAYS);

  const alerts = [];

  // Get drugs with low stock
  const drugBatches = await prisma.batch.groupBy({
    by: ['drugId'],
    _sum: {
      quantity: true,
    },
  });

  const lowStockAlerts = [];
  for (const group of drugBatches) {
    if (group._sum.quantity <= LOW_STOCK_LIMIT) {
      const drug = await prisma.drug.findUnique({
        where: { id: group.drugId },
      });

      if (drug && drug.status === 'ACTIVE') {
        lowStockAlerts.push({
          id: `low-stock-${group.drugId}`,
          drugId: group.drugId,
          drugName: drug.name,
          alertType: 'LOW_STOCK',
          message: `Low stock alert: ${drug.name} (${group._sum.quantity} units remaining)`,
          currentStock: group._sum.quantity,
          isResolved: false,
          createdAt: new Date(),
        });
      }
    }
  }

  // Get batches expiring soon
  const expiringBatches = await prisma.batch.findMany({
    where: {
      expiryDate: {
        lte: expiryWarningDate,
        gte: new Date(),
      },
      quantity: {
        gt: 0,
      },
    },
    include: { drug: true },
  });

  const expiryAlerts = expiringBatches
    .filter((batch) => batch.drug.status === 'ACTIVE')
    .map((batch) => ({
      id: `expiry-${batch.id}`,
      batchId: batch.id,
      drugId: batch.drugId,
      drugName: batch.drug.name,
      batchNumber: batch.batchNumber,
      alertType: 'EXPIRY_WARNING',
      message: `Expiry warning: ${batch.drug.name} (Batch ${batch.batchNumber}) expires on ${batch.expiryDate.toDateString()}`,
      expiryDate: batch.expiryDate,
      remainingQty: batch.quantity,
      isResolved: false,
      createdAt: new Date(),
    }));

  // Combine and remove duplicates
  const allAlerts = [...lowStockAlerts, ...expiryAlerts];
  const uniqueAlerts = Array.from(new Map(allAlerts.map((item) => [item.id, item])).values());

  return uniqueAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getAlertCount() {
  const alerts = await getActiveAlerts();
  return alerts.length;
}

export async function getAlertsByType(alertType) {
  const alerts = await getActiveAlerts();
  return alerts.filter((alert) => alert.alertType === alertType);
}
