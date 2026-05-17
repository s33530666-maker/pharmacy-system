import prisma from '../../config/db.js';

export const getAllSupplierDebts = async (req, res) => {
  try {
    const debts = await prisma.supplierDebt.findMany({
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      message: 'Supplier debts retrieved',
      data: debts,
    });
  } catch (error) {
    console.error('Get supplier debts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving supplier debts',
    });
  }
};

export const getSupplierDebtById = async (req, res) => {
  try {
    const { id } = req.params;

    const debt = await prisma.supplierDebt.findUnique({
      where: { id },
      include: {
        supplier: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: 'Supplier debt not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Supplier debt retrieved',
      data: debt,
    });
  } catch (error) {
    console.error('Get supplier debt by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving supplier debt',
    });
  }
};

export const createSupplierDebt = async (req, res) => {
  try {
    const { supplierId, invoiceAmount, dueDate, notes } = req.body;

    if (!supplierId || !invoiceAmount) {
      return res.status(400).json({
        success: false,
        message: 'supplierId and invoiceAmount are required',
      });
    }

    const parsedAmount = parseFloat(invoiceAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice amount must be a positive number',
      });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    const debt = await prisma.supplierDebt.create({
      data: {
        supplierId,
        invoiceAmount: parsedAmount,
        paidAmount: 0,
        currentBalance: parsedAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
      include: {
        supplier: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Supplier debt created',
      data: debt,
    });
  } catch (error) {
    console.error('Create supplier debt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating supplier debt',
    });
  }
};

export const updateSupplierDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceAmount, dueDate, notes } = req.body;

    const debt = await prisma.supplierDebt.findUnique({ where: { id } });
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: 'Supplier debt not found',
      });
    }

    const updateData = {};
    if (invoiceAmount !== undefined) {
      const parsed = parseFloat(invoiceAmount);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invoice amount',
        });
      }
      updateData.invoiceAmount = parsed;
      updateData.currentBalance = parsed - debt.paidAmount;
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.supplierDebt.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        payments: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Supplier debt updated',
      data: updated,
    });
  } catch (error) {
    console.error('Update supplier debt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating supplier debt',
    });
  }
};

export const deleteSupplierDebt = async (req, res) => {
  try {
    const { id } = req.params;

    const debt = await prisma.supplierDebt.findUnique({ where: { id } });
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: 'Supplier debt not found',
      });
    }

    if (debt.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete debt with payments. Delete payments first.',
      });
    }

    await prisma.supplierDebt.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Supplier debt deleted',
    });
  } catch (error) {
    console.error('Delete supplier debt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting supplier debt',
    });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes, paymentDate } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required',
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    const debt = await prisma.supplierDebt.findUnique({ where: { id } });
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: 'Supplier debt not found',
      });
    }

    if (parsedAmount > debt.currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance (${debt.currentBalance.toFixed(2)})`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.supplierDebtPayment.create({
        data: {
          supplierDebtId: id,
          amount: parsedAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
        },
      });

      const updatedDebt = await tx.supplierDebt.update({
        where: { id },
        data: {
          paidAmount: debt.paidAmount + parsedAmount,
          currentBalance: debt.currentBalance - parsedAmount,
        },
        include: {
          supplier: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      });

      return { payment, debt: updatedDebt };
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded',
      data: result,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording payment',
    });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    const payment = await prisma.supplierDebtPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.supplierDebtId !== id) {
      return res.status(400).json({
        success: false,
        message: 'Payment does not belong to this debt',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.supplierDebt.findUnique({ where: { id } });

      await tx.supplierDebtPayment.delete({ where: { id: paymentId } });

      const updatedDebt = await tx.supplierDebt.update({
        where: { id },
        data: {
          paidAmount: debt.paidAmount - payment.amount,
          currentBalance: debt.currentBalance + payment.amount,
        },
        include: {
          supplier: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      });

      return updatedDebt;
    });

    res.status(200).json({
      success: true,
      message: 'Payment deleted',
      data: result,
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting payment',
    });
  }
};
