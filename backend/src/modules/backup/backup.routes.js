import express from 'express';
import { backupDatabase, exportAsJson } from './backup.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/db', verifyToken, requireRole('ADMIN'), backupDatabase);
router.get('/json', verifyToken, requireRole('ADMIN'), exportAsJson);

export default router;