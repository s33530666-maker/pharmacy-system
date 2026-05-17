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
import { validateBody, createDrugSchema, updateDrugSchema, validateQuery } from '../../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Minimum 2 characters required' });
    }
    const searchTerm = q.trim();
    const isNumbersOnly = /^\d+$/.test(searchTerm);
    
    let where = { status: { not: 'INACTIVE' } };
    if (isNumbersOnly) {
      where.OR = [
        { barcode: searchTerm },
        { bagNumber: searchTerm },
      ];
    } else {
      const term = searchTerm.toLowerCase();
      where.OR = [
        { name: { contains: term } },
        { arabicName: { contains: term } },
        { genericName: { contains: term } },
      ];
    }

    const drugs = await prisma.drug.findMany({
      where,
      select: {
        id: true,
        name: true,
        arabicName: true,
        barcode: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        sellPrice: true,
        costPrice: true,
        stock: true,
      },
      take: 10,
    });

    const results = drugs.filter(d => d.stock > 0).map(drug => ({
      ...drug,
      available: drug.stock > 0,
    }));

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Drug search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

router.get('/', verifyToken, validateQuery(z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  form: z.string().optional(),
  search: z.string().optional(),
})), getAllDrugs);
router.get('/:id', verifyToken, getDrugById);
router.get('/:id/quantity', verifyToken, getDrugQuantity);
router.post('/', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), validateBody(createDrugSchema), createDrug);
router.put('/:id', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), validateBody(updateDrugSchema), updateDrug);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteDrug);
router.post('/adjust', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), adjustInventory);

export default router;
