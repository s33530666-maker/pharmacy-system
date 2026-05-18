import express from 'express';
import {
  getAllDrugs,
  getDrugById,
  getDrugQuantity,
  createDrug,
  updateDrug,
  deleteDrug,
  adjustInventory,
} from './drugs.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  createDrugSchema,
  updateDrugSchema,
  validateQuery,
} from '../../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

// /search is implemented via getAllDrugs by passing ?search=...
// Kept as a thin alias to avoid breaking the existing frontend contract.
router.get(
  '/search',
  verifyToken,
  (req, res, next) => {
    const q = (req.query.q || req.query.search || '').toString().trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Minimum 2 characters required' });
    }
    req.query.search = q;
    req.query.limit = req.query.limit || '10';
    return next();
  },
  getAllDrugs
);

router.get(
  '/',
  verifyToken,
  validateQuery(
    z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      form: z.string().optional(),
      search: z.string().optional(),
      genericName: z.string().optional(),
    })
  ),
  getAllDrugs
);
router.get('/:id', verifyToken, getDrugById);
router.get('/:id/quantity', verifyToken, getDrugQuantity);
router.post(
  '/',
  verifyToken,
  requireRole(['ADMIN', 'PHARMACIST']),
  validateBody(createDrugSchema),
  createDrug
);
router.put(
  '/:id',
  verifyToken,
  requireRole(['ADMIN', 'PHARMACIST']),
  validateBody(updateDrugSchema),
  updateDrug
);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteDrug);
router.post('/adjust', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), adjustInventory);

export default router;
