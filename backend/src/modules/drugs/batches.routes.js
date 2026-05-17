import express from 'express';
import prisma from '../../config/db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    const where = { quantity: { gt: 0 } };
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      where.drug = {
        OR: [
          { name: { contains: term } },
          { arabicName: { contains: term } },
        ],
      };
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        drug: { select: { id: true, name: true, arabicName: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Batches retrieved successfully',
      data: batches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving batches',
    });
  }
});

export default router;