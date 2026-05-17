import prisma from '../../config/db.js';

export const getAllDrugs = async (req, res) => {
  try {
    const { page = 1, limit = 50, form, search, genericName } = req.query;
    
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 20000);
    const skip = (pageNum - 1) * limitNum;

    let where = {};

    // Include all drugs that are not explicitly INACTIVE
    where.status = { not: 'INACTIVE' };

    if (form && form !== 'All') {
      where.dosageForm = form;
    }

    // Special handling for alternatives search by genericName
    if (genericName && genericName.trim()) {
      const term = genericName.trim().toLowerCase();
      where.genericName = { contains: term };
    } else if (search && search.trim()) {
      const searchTerm = search.trim();
      const isNumbersOnly = /^\d+$/.test(searchTerm);
      
      if (isNumbersOnly) {
        where.OR = [
          { barcode: searchTerm },
          { bagNumber: searchTerm },
        ];
      } else {
        const term = searchTerm.toLowerCase();
        where.OR = [
          { name: { contains: term } },
          { arabicName: { contains: term } },
          { genericName: { contains: term } },
        ];
      }
    }

    const [drugs, totalCount] = await Promise.all([
      prisma.drug.findMany({
        where,
        select: {
          id: true,
          name: true,
          arabicName: true,
          barcode: true,
          bagNumber: true,
          externalId: true,
          genericName: true,
          description: true,
          strength: true,
          dosageForm: true,
          manufacturer: true,
          sellPrice: true,
          alternatePrice: true,
          costPrice: true,
          stock: true,
          stripsPerBox: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          batches: {
            where: { quantity: { gt: 0 } },
            select: { quantity: true, expiryDate: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.drug.count({ where }),
    ]);

    console.log('[DEBUG] Total drugs in DB:', totalCount);
    console.log('[DEBUG] Drugs returned:', drugs.length);
    if (drugs.length > 0) {
      console.log('[DEBUG] First drug:', { name: drugs[0].name, status: drugs[0].status, stock: drugs[0].stock });
    }

    const drugsWithAvailability = drugs.map(drug => {
      const totalBatchStock = drug.batches.reduce((sum, b) => sum + b.quantity, 0);
      
      const nearestExpiry = drug.batches
        .filter(b => b.expiryDate)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0]?.expiryDate || null;

      return {
        ...drug,
        stock: totalBatchStock,
        totalStock: totalBatchStock,
        quantity: totalBatchStock,
        available: totalBatchStock > 0,
        expiryDate: nearestExpiry,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Drugs retrieved successfully',
      data: drugsWithAvailability,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDrugById = async (req, res) => {
  try {
    const { id } = req.params;

    const drug = await prisma.drug.findUnique({
      where: { id },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            expiryDate: true,
            costPrice: true,
            sellingPrice: true,
            supplier: {
              select: { id: true, name: true },
            },
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!drug) {
      return res.status(404).json({
        success: false,
        message: 'Drug not found',
      });
    }

    const totalStock = drug.batches.reduce((sum, batch) => sum + batch.quantity, 0);

    res.status(200).json({
      success: true,
      message: 'Drug retrieved successfully',
      data: {
        ...drug,
        totalStock,
      },
    });
  } catch (error) {
    console.error('Error fetching drug:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving drug',
    });
  }
};

export const getDrugQuantity = async (req, res) => {
  try {
    const { id } = req.params;

    const drug = await prisma.drug.findUnique({
      where: { id },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            expiryDate: true,
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!drug) {
      return res.status(404).json({
        success: false,
        message: 'Drug not found',
      });
    }

    const batchStock = drug.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    const totalQuantity = batchStock;

    res.status(200).json({
      success: true,
      message: 'Drug quantity retrieved successfully',
      data: {
        drugId: drug.id,
        totalQuantity,
        batches: drug.batches,
      },
    });
  } catch (error) {
    console.error('Error fetching drug quantity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving drug quantity',
    });
  }
};

export const createDrug = async (req, res) => {
  try {
    const {
      name,
      arabicName,
      barcode,
      bagNumber,
      externalId,
      genericName,
      description,
      strength,
      dosageForm,
      manufacturer,
      stock,
      sellPrice,
      alternatePrice,
      costPrice,
    } = req.body;

    if (!name || !genericName || !strength || !dosageForm || !manufacturer) {
      return res.status(400).json({
        success: false,
        message: 'name, genericName, strength, dosageForm, and manufacturer are required',
      });
    }

    if (barcode) {
      const existingDrug = await prisma.drug.findUnique({
        where: { barcode },
      });
      if (existingDrug) {
        return res.status(409).json({
          success: false,
          message: 'Drug with this barcode already exists',
        });
      }
    }

    const drug = await prisma.drug.create({
      data: {
        name,
        arabicName: arabicName || null,
        barcode: barcode || null,
        bagNumber: bagNumber || null,
        externalId: externalId || null,
        genericName,
        description: description || null,
        strength,
        dosageForm,
        manufacturer,
        sellPrice: parseFloat(sellPrice) || 0,
        alternatePrice: parseFloat(alternatePrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Drug created successfully',
      data: drug,
    });
  } catch (error) {
    console.error('Error creating drug:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating drug',
    });
  }
};

export const updateDrug = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      arabicName,
      barcode,
      bagNumber,
      externalId,
      genericName,
      description,
      strength,
      dosageForm,
      manufacturer,
      status,
      stock,
      sellPrice,
      alternatePrice,
      costPrice,
    } = req.body;

    console.log('[updateDrug] Received body:', JSON.stringify(req.body));
    console.log('[updateDrug] stock value:', stock, 'type:', typeof stock);

    const existingDrug = await prisma.drug.findUnique({
      where: { id },
    });

    if (!existingDrug) {
      return res.status(404).json({
        success: false,
        message: 'Drug not found',
      });
    }

    if (barcode && barcode !== existingDrug.barcode) {
      const barcodeExists = await prisma.drug.findUnique({
        where: { barcode },
      });
      if (barcodeExists) {
        return res.status(409).json({
          success: false,
          message: 'Drug with this barcode already exists',
        });
      }
    }

    let parsedStock = 0;
    if (stock !== undefined && stock !== null) {
      const num = parseInt(stock, 10);
      parsedStock = isNaN(num) ? 0 : num;
    }

    let parsedSellPrice;
    if (sellPrice !== undefined && sellPrice !== null) {
      const sp = parseFloat(sellPrice);
      parsedSellPrice = isNaN(sp) ? 0 : sp;
    }

    let parsedCostPrice;
    if (costPrice !== undefined && costPrice !== null) {
      const cp = parseFloat(costPrice);
      parsedCostPrice = isNaN(cp) ? 0 : cp;
    }

    let parsedAlternatePrice;
    if (alternatePrice !== undefined && alternatePrice !== null) {
      const ap = parseFloat(alternatePrice);
      parsedAlternatePrice = isNaN(ap) ? 0 : ap;
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (arabicName !== undefined) updateData.arabicName = arabicName;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (bagNumber !== undefined) updateData.bagNumber = bagNumber;
    if (externalId !== undefined) updateData.externalId = externalId || null;
    if (genericName) updateData.genericName = genericName;
    if (description !== undefined) updateData.description = description;
    if (strength) updateData.strength = strength;
    if (dosageForm) updateData.dosageForm = dosageForm;
    if (manufacturer) updateData.manufacturer = manufacturer;
    if (status) updateData.status = status;

    if (stock !== undefined && stock !== null) {
      updateData.stock = parsedStock;
    }
    if (parsedSellPrice !== undefined) {
      updateData.sellPrice = parsedSellPrice;
    }
    if (parsedAlternatePrice !== undefined) {
      updateData.alternatePrice = parsedAlternatePrice;
    }
    if (parsedCostPrice !== undefined) {
      updateData.costPrice = parsedCostPrice;
    }

    console.log('[updateDrug] updateData to be sent:', JSON.stringify(updateData));

    const drug = await prisma.drug.update({
      where: { id },
      data: updateData,
    });

    console.log('[updateDrug] Updated drug:', JSON.stringify(drug));

    res.status(200).json({
      success: true,
      message: 'Drug updated successfully',
      data: drug,
    });
  } catch (error) {
    console.error('Error updating drug:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating drug',
    });
  }
};

export const deleteDrug = async (req, res) => {
  try {
    const { id } = req.params;

    const existingDrug = await prisma.drug.findUnique({
      where: { id },
    });

    if (!existingDrug) {
      return res.status(404).json({
        success: false,
        message: 'Drug not found',
      });
    }

    const activeBatches = await prisma.batch.findMany({
      where: {
        drugId: id,
        quantity: { gt: 0 },
      },
    });

    if (activeBatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete drug with active stock. Please clear all batches first.',
      });
    }

    const drug = await prisma.drug.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Drug deleted successfully',
      data: drug,
    });
  } catch (error) {
    console.error('Error deleting drug:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving drug',
    });
  }
};

export const adjustInventory = async (req, res) => {
  try {
    console.log('[DEBUG] Inventory adjust request:', req.body);
    const { adjustments } = req.body;

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return res.status(400).json({ success: false, error: 'No adjustments provided' });
    }

    await prisma.$transaction(async (tx) => {
      for (const adj of adjustments) {
        const { drugId, physicalQty } = adj;

        if (!drugId) {
          throw new Error('Missing drugId in adjustment');
        }
        if (physicalQty === undefined || physicalQty === null || isNaN(Number(physicalQty))) {
          throw new Error(`Invalid physical quantity for drug ${drugId}`);
        }

        await tx.drug.update({
          where: { id: drugId },
          data: { stock: Number(physicalQty) },
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Inventory adjustments saved successfully',
    });
  } catch (error) {
    console.error('Error saving inventory adjustments:', error.message);
    return res.status(400).json({ success: false, error: error.message || 'Invalid data provided' });
  }
};
