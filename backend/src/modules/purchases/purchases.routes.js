import express from 'express';
import { create, getAll, getById } from './purchases.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody, createPurchaseSchema } from '../../middleware/validation.js';

const router = express.Router();

router.post('/', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), validateBody(createPurchaseSchema), create);
router.get('/', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), getAll);
router.get('/:id', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), getById);

export default router;
