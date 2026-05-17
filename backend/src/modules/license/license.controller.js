import { licenseService } from './license.service.js';

export const licenseController = {
  status: async (req, res) => {
    try {
      const status = await licenseService.checkLicense();
      res.json(status);
    } catch (error) {
      console.error('Error checking license status:', error);
      res.status(500).json({ error: 'Failed to check license status' });
    }
  },

  activate: async (req, res) => {
    try {
      const { licenseKey, pharmacyName } = req.body;
      if (!licenseKey || !pharmacyName) {
        return res.status(400).json({ error: 'License key and pharmacy name are required' });
      }

      const activatedLicense = await licenseService.activateLicense(licenseKey, pharmacyName);
      res.json({ message: 'License activated successfully', license: activatedLicense });
    } catch (error) {
      console.error('Error activating license:', error);
      res.status(400).json({ error: error.message });
    }
  },

  info: async (req, res) => {
    try {
      const info = await licenseService.getLicenseInfo();
      res.json(info);
    } catch (error) {
      console.error('Error getting license info:', error);
      res.status(500).json({ error: 'Failed to get license info' });
    }
  }
};
