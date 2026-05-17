import prisma from '../../config/db.js';

const createPurchase = async (purchaseData) => {
  const { supplierId, items, paymentStatus = 'PAID' } = purchaseData;

  return await prisma.$transaction(async (tx) => {
    let finalSupplierId = supplierId;

    if (!finalSupplierId) {
      let unknownSupplier = await tx.supplier.findFirst({
        where: { name: 'Unknown Supplier' },
      });

      if (!unknownSupplier) {
        unknownSupplier = await tx.supplier.create({
          data: {
            name: 'Unknown Supplier',
            email: 'unknown@supplier.com',
            phone: '0000000000',
            address: 'Not Specified',
            city: 'Not Specified',
            state: 'Not Specified',
            postalCode: '00000',
            country: 'Not Specified',
            status: 'ACTIVE',
          },
        });
      }

      finalSupplierId = unknownSupplier.id;
    }

    const totalAmount = items.reduce((sum, item) => {
      const discount = parseFloat(item.discount) || 0;
      const costPrice = parseFloat(item.costPrice) || 0;
      const finalCost = costPrice * (1 - discount / 100);
      return sum + finalCost * item.quantity;
    }, 0);

    const isDeferred = paymentStatus === 'DEFERRED';
    const paidAmount = isDeferred ? 0 : totalAmount;

    const purchase = await tx.purchase.create({
      data: {
        supplierId: finalSupplierId,
        purchaseDate: new Date(),
        status: 'COMPLETED',
        totalAmount,
        paymentStatus: isDeferred ? 'DEFERRED' : 'PAID',
        paidAmount,
      },
    });

    const supplierUpdates = {
      balance: {
        increment: totalAmount,
      },
    };

    if (isDeferred) {
      supplierUpdates.totalDebt = {
        increment: totalAmount,
      };
    }

    await tx.supplier.update({
      where: { id: finalSupplierId },
      data: supplierUpdates,
    });

    for (const item of items) {
      const {
        drugId,
        quantity,
        costPrice,
        discount,
        finalCost,
        sellingPrice,
        oldPrice,
        expiryDate,
        batchNumber,
      } = item;

      const parsedCostPrice = parseFloat(costPrice) || 0;
      const parsedDiscount = parseFloat(discount) || 0;
      const parsedFinalCost = parseFloat(finalCost) || (parsedCostPrice * (1 - parsedDiscount / 100));
      const parsedSellingPrice = parseFloat(sellingPrice) || 0;
      const parsedOldPrice = oldPrice === null || oldPrice === undefined || oldPrice === '' ? 0 : (parseFloat(oldPrice) || 0);
      const batchNumberToUse = batchNumber || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const drug = await tx.drug.findUnique({
        where: { id: drugId },
      });

      if (!drug) {
        throw new Error(`Drug with ID ${drugId} not found`);
      }

      let batch = await tx.batch.findFirst({
        where: {
          drugId,
          batchNumber: batchNumberToUse,
        },
      });

      if (batch) {
        batch = await tx.batch.update({
          where: { id: batch.id },
          data: {
            quantity: batch.quantity + quantity,
            costPrice: parsedCostPrice,
            sellingPrice: parsedSellingPrice,
            updatedAt: new Date(),
          },
        });
      } else {
        batch = await tx.batch.create({
          data: {
            drugId,
            supplierId: finalSupplierId,
            batchNumber: batchNumberToUse,
            quantity,
            expiryDate: new Date(expiryDate),
            manufacturingDate: new Date(),
            costPrice: parsedCostPrice,
            sellingPrice: parsedSellingPrice,
          },
        });
      }

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          batchId: batch.id,
          quantity,
          unitCost: parsedFinalCost,
          totalCost: parsedFinalCost * quantity,
        },
      });

await tx.drug.update({
        where: { id: drugId },
        data: {
          costPrice: parsedCostPrice,
          sellPrice: parsedSellingPrice,
          alternatePrice: parsedOldPrice,
        },
      });
    }

    return await tx.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        supplier: true,
        items: {
          include: {
            batch: {
              include: {
                drug: true,
              },
            },
          },
        },
      },
    });
  });
};

const getAllPurchases = async () => {
  return await prisma.purchase.findMany({
    include: {
      supplier: true,
      items: {
        include: {
          batch: {
            include: {
              drug: true,
            },
          },
        },
      },
    },
    orderBy: {
      purchaseDate: 'desc',
    },
  });
};

const getPurchaseById = async (purchaseId) => {
  return await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      supplier: true,
      items: {
        include: {
          batch: {
            include: {
              drug: true,
            },
          },
        },
      },
    },
  });
};

export {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
};
