import prisma from '../../config/db.js';

export async function moveToDamaged(drugId, qty, reason, notes) {
  return await prisma.$transaction(async (tx) => {
    const drug = await tx.drug.findUnique({
      where: { id: drugId },
    });

    if (!drug) {
      throw new Error(`Drug ${drugId} not found`);
    }

    if (drug.stock < qty) {
      throw new Error(
        `Insufficient stock. Available: ${drug.stock}, Requested: ${qty}`
      );
    }

    const costLoss = drug.costPrice * qty;

    await tx.drug.update({
      where: { id: drugId },
      data: { stock: { decrement: qty } },
    });

    const damagedDrug = await tx.damagedDrug.create({
      data: {
        drugId,
        quantity: qty,
        reason,
        costLoss,
        notes: notes || null,
      },
      include: {
        drug: { select: { id: true, name: true, arabicName: true, barcode: true } },
      },
    });

    return damagedDrug;
  });
}

export async function restoreDamaged(damagedDrugId) {
  return await prisma.$transaction(async (tx) => {
    const damagedDrug = await tx.damagedDrug.findUnique({
      where: { id: damagedDrugId },
    });

    if (!damagedDrug) {
      throw new Error(`Damaged drug record ${damagedDrugId} not found`);
    }

    await tx.drug.update({
      where: { id: damagedDrug.drugId },
      data: { stock: { increment: damagedDrug.quantity } },
    });

    await tx.damagedDrug.delete({
      where: { id: damagedDrugId },
    });

    return { success: true, message: 'Damaged drug restored successfully' };
  });
}

export async function getDamagedDrugsHistory(limit = 20, offset = 0, search = '') {
  const where = {};
  if (search.trim()) {
    where.drug = {
      OR: [
        { name: { contains: search } },
        { arabicName: { contains: search } },
        { barcode: { contains: search } },
      ],
    };
  }

  const [damagedDrugs, total] = await Promise.all([
    prisma.damagedDrug.findMany({
      where,
      include: {
        drug: { select: { id: true, name: true, arabicName: true, barcode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.damagedDrug.count({ where }),
  ]);

  return { data: damagedDrugs, total, limit, offset };
}

export async function getDamagedDrugsCount() {
  return await prisma.damagedDrug.count();
}

export async function getExpiredBatches(search = '', limit = 50, offset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const drugWhere = search.trim() ? {
    OR: [
      { name: { contains: search } },
      { arabicName: { contains: search } },
    ],
  } : {};

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where: {
        expiryDate: { lt: today },
        quantity: { gt: 0 },
        drug: drugWhere,
      },
      include: {
        drug: { select: { id: true, name: true, arabicName: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.batch.count({
      where: {
        expiryDate: { lt: today },
        quantity: { gt: 0 },
      },
    }),
  ]);

  return { data: batches, total, limit, offset };
}