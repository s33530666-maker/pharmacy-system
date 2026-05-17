import express from 'express';
import { getAlternativesHandler } from './alt.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:drugId', verifyToken, getAlternativesHandler);

export default router;
