import prisma from '../../config/db.js';

export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Suppliers retrieved successfully',
      data: suppliers,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving suppliers',
    });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, email, phone, address, city, state, postalCode, country } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required',
      });
    }

    const normalizedName = name.trim();
    const existingSupplier = await prisma.supplier.findFirst({
      where: { name: normalizedName },
    });

    if (existingSupplier) {
      return res.status(409).json({
        success: false,
        message: 'Supplier with this name already exists',
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: normalizedName,
        email: email?.trim() || `${Date.now()}@supplier.local`,
        phone: phone?.trim() || '0000000000',
        address: address?.trim() || 'Not Specified',
        city: city?.trim() || 'Not Specified',
        state: state?.trim() || 'Not Specified',
        postalCode: postalCode?.trim() || '00000',
        country: country?.trim() || 'Not Specified',
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating supplier',
    });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          include: {
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
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Supplier retrieved successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving supplier',
    });
  }
};

export const getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    const [purchases, payments] = await Promise.all([
      prisma.purchase.findMany({
        where: { supplierId: id },
        orderBy: { purchaseDate: 'asc' },
        select: {
          id: true,
          purchaseDate: true,
          totalAmount: true,
          paymentStatus: true,
          paidAmount: true,
        },
      }),
      prisma.supplierPayment.findMany({
        where: { supplierId: id },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          amount: true,
          notes: true,
        },
      }),
    ]);

    const ledger = [
      ...purchases.map((p) => ({
        type: 'PURCHASE',
        id: p.id,
        date: p.purchaseDate,
        amount: p.totalAmount,
        paymentStatus: p.paymentStatus,
        paidAmount: p.paidAmount,
        description: `Purchase - ${p.totalAmount.toFixed(2)}`,
      })),
      ...payments.map((p) => ({
        type: 'PAYMENT',
        id: p.id,
        date: p.date,
        amount: -p.amount,
        description: `Payment - ${p.amount.toFixed(2)}${p.notes ? ` (${p.notes})` : ''}`,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledgerWithBalance = ledger.map((entry) => {
      runningBalance += entry.type === 'PURCHASE' ? entry.amount : entry.amount;
      return {
        ...entry,
        runningBalance,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Supplier ledger retrieved successfully',
      data: {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          totalDebt: supplier.totalDebt,
          balance: supplier.balance,
        },
        ledger: ledgerWithBalance,
        summary: {
          totalPurchases: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
          totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
          currentDebt: supplier.totalDebt,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving supplier ledger',
    });
  }
};

export const addSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.supplierPayment.create({
        data: {
          supplierId: id,
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
          notes: notes?.trim() || null,
        },
      });

      await tx.supplier.update({
        where: { id },
        data: {
          totalDebt: {
            decrement: parseFloat(amount),
          },
        },
      });

      return newPayment;
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    console.error('Error adding supplier payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording payment',
    });
  }
};
