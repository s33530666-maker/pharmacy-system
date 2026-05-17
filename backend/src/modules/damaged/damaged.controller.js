import { moveToDamaged, getDamagedDrugsHistory, getExpiredBatches, restoreDamaged } from './damaged.service.js';

export async function handleMoveToDamaged(req, res) {
  try {
    console.log('[DEBUG] Request body:', req.body);
    const { drugId, quantity, reason, notes } = req.body;
    const userId = req.user?.id;

    if (!drugId) {
      return res.status(400).json({ success: false, error: 'drugId is required' });
    }
    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, error: 'quantity must be greater than 0' });
    }
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, error: 'reason is required' });
    }

    const result = await moveToDamaged(drugId, Number(quantity), reason.trim(), notes || undefined);

    return res.status(201).json({
      success: true,
      message: 'Drug marked as damaged successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error marking drug as damaged:', error.message);
    console.error('Error stack:', error.stack);

    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('Insufficient stock')) {
      return res.status(409).json({ success: false, error: error.message });
    }

    return res.status(400).json({ success: false, error: error.message || 'Invalid data provided' });
  }
}

export async function handleGetDamagedHistory(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    const result = await getDamagedDrugsHistory(limit, offset, search);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    console.error('Error retrieving damaged drugs history:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

export async function handleGetExpiredBatches(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    const result = await getExpiredBatches(search, limit, offset);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    console.error('Error retrieving expired batches:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

export async function handleRestoreDamaged(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Damaged drug ID is required' });
    }

    const result = await restoreDamaged(id);

    return res.status(200).json({
      success: true,
      message: 'Damaged drug restored successfully',
    });
  } catch (error) {
    console.error('Error restoring damaged drug:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}