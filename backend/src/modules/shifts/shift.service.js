import prisma from '../../config/db.js';

const openShift = async (userId, openingCash) => {
  const existingOpenShift = await prisma.shift.findFirst({
    where: {
      userId,
      endTime: null,
    },
  });

  if (existingOpenShift) {
    throw new Error('An open shift already exists for this user');
  }

  const shift = await prisma.shift.create({
    data: {
      userId,
      openingCash: openingCash || 0,
      startTime: new Date(),
    },
  });

  return shift;
};

const getCurrentShift = async (userId) => {
  const shift = await prisma.shift.findFirst({
    where: {
      userId,
      endTime: null,
    },
  });

  return shift;
};

const getShiftWithDetails = async (shiftId) => {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      sales: {
        where: { status: 'COMPLETED' },
        select: {
          id: true,
          grandTotal: true,
          cashPaid: true,
          paymentMethod: true,
          saleDate: true,
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      },
      expenses: true,
    },
  });

  if (!shift) throw new Error('Shift not found');
  return shift;
};

const closeShift = async (shiftId, actualClosingCash, notes) => {
  const shift = await getShiftWithDetails(shiftId);

  if (shift.endTime) {
    throw new Error('Shift is already closed');
  }

  const totalSales = shift.sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const totalExpenses = shift.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expectedCash = shift.openingCash + totalSales - totalExpenses;
  const discrepancyNum = actualClosingCash - expectedCash;
  const discrepancyText = discrepancyNum === 0 ? 'مطابق' : discrepancyNum > 0 ? `زيادة ${discrepancyNum.toFixed(2)}` : `عجز ${Math.abs(discrepancyNum).toFixed(2)}`;

  const updatedShift = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      closingCash: actualClosingCash,
      expectedCash,
      discrepancy: discrepancyText,
      notes: notes || discrepancyText,
      endTime: new Date(),
    },
  });

  return {
    ...updatedShift,
    totalSales,
    totalExpenses,
    expectedCash,
    discrepancy: discrepancyNum,
    saleCount: shift.sales.length,
    expenseCount: shift.expenses.length,
  };
};

const getShiftSales = async (shiftId) => {
  return prisma.sale.findMany({
    where: { shiftId, status: 'COMPLETED' },
    orderBy: { saleDate: 'desc' },
    select: {
      id: true,
      grandTotal: true,
      cashPaid: true,
      paymentMethod: true,
      saleDate: true,
      customer: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          drugName: true,
        },
      },
    },
  });
};

export default {
  openShift,
  getCurrentShift,
  closeShift,
  getShiftWithDetails,
  getShiftSales,
};
