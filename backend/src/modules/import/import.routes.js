import express from 'express';
import multer from 'multer';
import { importDrugs } from './import.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/drugs', verifyToken, requireRole(['ADMIN', 'PHARMACIST']), upload.single('file'), importDrugs);

export default router;
