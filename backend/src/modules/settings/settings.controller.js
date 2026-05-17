import * as settingsService from './settings.service.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSystemSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { lowStockThreshold } = req.body;
    const settings = await settingsService.updateSystemSettings({ lowStockThreshold });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
};
