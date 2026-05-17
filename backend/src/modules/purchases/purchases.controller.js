import { createPurchase, getAllPurchases, getPurchaseById } from './purchases.service.js';

const create = async (req, res) => {
  try {
    console.log('=== PURCHASE REQUEST BODY ===', JSON.stringify(req.body, null, 2));
    const { supplierId, items, paymentStatus } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and must not be empty",
      });
    }

    const purchase = await createPurchase({
      supplierId: supplierId || null,
      items,
      paymentStatus: paymentStatus || 'PAID',
    });

    res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      data: purchase,
    });
  } catch (error) {
    console.error('Purchase creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating purchase",
    });
  }
};

const getAll = async (req, res) => {
  try {
    const purchases = await getAllPurchases();
    res.status(200).json({
      success: true,
      message: "Purchases retrieved successfully",
      data: purchases,
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving purchases",
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await getPurchaseById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase retrieved successfully",
      data: purchase,
    });
  } catch (error) {
    console.error('Get purchase by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving purchase",
    });
  }
};

export {
  create,
  getAll,
  getById,
};
