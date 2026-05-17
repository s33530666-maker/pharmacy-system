import shiftService from './shift.service.js';

const openShift = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { openingCash } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const shift = await shiftService.openShift(userId, openingCash);

    return res.status(201).json({
      success: true,
      message: 'Shift opened successfully',
      data: shift,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const closeShift = async (req, res) => {
  try {
    const { shiftId, actualClosingCash, notes } = req.body;

    if (!shiftId || actualClosingCash === undefined) {
      return res.status(400).json({
        success: false,
        message: 'shiftId and actualClosingCash are required',
      });
    }

    const shift = await shiftService.closeShift(shiftId, actualClosingCash, notes);

    return res.status(200).json({
      success: true,
      message: 'Shift closed successfully',
      data: shift,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getCurrentShift = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const shift = await shiftService.getCurrentShift(userId);

    if (!shift) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({ success: true, data: shift });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getShiftSales = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const shift = await shiftService.getCurrentShift(userId);
    if (!shift) {
      return res.status(200).json({ success: true, data: [] });
    }

    const sales = await shiftService.getShiftSales(shift.id);
    return res.status(200).json({ success: true, data: sales });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getShiftReport = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const shift = await shiftService.getCurrentShift(userId);
    if (!shift) {
      return res.status(200).json({ success: true, data: null });
    }

    const details = await shiftService.getShiftWithDetails(shift.id);
    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  openShift,
  closeShift,
  getCurrentShift,
  getShiftSales,
  getShiftReport,
};

export default {
  openShift,
  closeShift,
  getCurrentShift,
  getShiftSales,
  getShiftReport,
};
