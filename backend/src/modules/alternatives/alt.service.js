import prisma from '../../config/db.js';

async function getAlternatives(drugId) {
  // Step 1: Fetch the active ingredient of the requested drug
  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
  });

  if (!drug) {
    throw new Error(`Drug with id ${drugId} not found`);
  }

  const activeIngredient = drug.genericName;

  // Step 2: Query all other drugs with the same active ingredient
  const alternativeDrugs = await prisma.drug.findMany({
    where: {
      genericName: activeIngredient,
      id: {
        not: drugId,
      },
      status: 'ACTIVE',
    },
    include: {
      batches: {
        where: {
          expiryDate: {
            gt: new Date(),
          },
        },
      },
    },
  });

  // Step 3: Calculate total available stock for each alternative
  const alternativesWithStock = await Promise.all(
    alternativeDrugs.map(async (altDrug) => {
      let totalStock = 0;

      for (const batch of altDrug.batches) {
        // Fetch sold quantities from SaleItem
        const soldItems = await prisma.saleItem.aggregate({
          where: { batchId: batch.id },
          _sum: { quantity: true },
        });

        // Fetch damaged quantities from DamagedDrug
        const damagedItems = await prisma.damagedDrug.aggregate({
          where: { batchId: batch.id },
          _sum: { quantity: true },
        });

        const sold = soldItems._sum.quantity || 0;
        const damaged = damagedItems._sum.quantity || 0;
        const qtyRemaining = batch.quantity - sold - damaged;

        if (qtyRemaining > 0) {
          totalStock += qtyRemaining;
        }
      }

      return {
        id: altDrug.id,
        name: altDrug.name,
        genericName: altDrug.genericName,
        strength: altDrug.strength,
        dosageForm: altDrug.dosageForm,
        manufacturer: altDrug.manufacturer,
        totalAvailableStock: totalStock,
      };
    })
  );

  // Step 4: Filter out drugs with 0 total stock and sort by highest stock first
  const result = alternativesWithStock
    .filter((alt) => alt.totalAvailableStock > 0)
    .sort((a, b) => b.totalAvailableStock - a.totalAvailableStock);

  return result;
}

export {
  getAlternatives,
};
