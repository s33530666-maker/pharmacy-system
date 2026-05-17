import prisma from '../../config/db.js';

export const adjustInventory = async (req, res) => {
  try {
    const { adjustments } = req.body;

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return res.status(400).json({ error: 'لا توجد تعديلات للحفظ' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const adjustment of adjustments) {
      const { drugId, physicalQty, variance } = adjustment;

      if (!drugId || physicalQty === undefined || variance === undefined) {
        results.failed.push({ drugId, reason: 'بيانات ناقصة' });
        continue;
      }

      try {
        const drug = await prisma.drug.findUnique({
          where: { id: parseInt(drugId) }
        });

        if (!drug) {
          results.failed.push({ drugId, reason: 'الدواء غير موجود' });
          continue;
        }

        await prisma.drug.update({
          where: { id: parseInt(drugId) },
          data: { stock: parseInt(physicalQty) }
        });

        await prisma.auditLog.create({
          data: {
            action: 'INVENTORY_ADJUSTMENT',
            details: JSON.stringify({
              drugId: parseInt(drugId),
              drugName: drug.name,
              previousStock: drug.stock,
              newStock: parseInt(physicalQty),
              variance: parseInt(variance),
              adjustedBy: req.user?.name || 'SYSTEM'
            }),
            userId: req.user?.id || null
          }
        });

        results.success.push({ drugId, newStock: physicalQty });
      } catch (err) {
        console.error(`Error adjusting drug ${drugId}:`, err);
        results.failed.push({ drugId, reason: err.message });
      }
    }

    if (results.failed.length > 0 && results.success.length === 0) {
      return res.status(400).json({
        error: 'فشل حفظ التعديلات',
        results
      });
    }

    res.status(200).json({
      success: true,
      message: `تم تعديل ${results.success.length} صنف بنجاح`,
      results
    });
  } catch (err) {
    console.error('Inventory adjustment error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

export const getInventoryStats = async (req, res) => {
  try {
    const drugs = await prisma.drug.findMany({
      where: { status: { not: 'INACTIVE' } },
      select: {
        id: true,
        name: true,
        stock: true,
        costPrice: true,
        expiryDate: true
      }
    });

    const totalValue = drugs.reduce((sum, drug) => {
      return sum + ((drug.stock || 0) * (drug.costPrice || 0));
    }, 0);

    const now = new Date();
    const thresholdDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    const lowStockCount = drugs.filter(d => (d.stock || 0) <= 10).length;
    const expiringSoonCount = drugs.filter(d => {
      if (!d.expiryDate) return false;
      const expiry = new Date(d.expiryDate);
      return expiry > now && expiry <= thresholdDate;
    }).length;

    res.status(200).json({
      success: true,
      data: {
        totalValue,
        lowStockCount,
        expiringSoonCount,
        totalItems: drugs.length
      }
    });
  } catch (err) {
    console.error('Error getting inventory stats:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};