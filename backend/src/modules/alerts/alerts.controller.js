import { getActiveAlerts, getAlertCount } from './alerts.service.js';

export async function handleGetActiveAlerts(req, res) {
  try {
    const alerts = await getActiveAlerts();

    return res.status(200).json({
      message: 'Active alerts retrieved successfully',
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Error retrieving active alerts:', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function handleGetAlertCount(req, res) {
  try {
    const count = await getAlertCount();

    return res.status(200).json({
      message: 'Alert count retrieved successfully',
      data: { count },
    });
  } catch (error) {
    console.error('Error retrieving alert count:', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
