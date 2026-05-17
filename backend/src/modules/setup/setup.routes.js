import express from 'express';
import rateLimit from 'express-rate-limit';
import { getSetupStatus, initializeSystem } from './setup.controller.js';

const router = express.Router();

// Strict rate limit: max 5 attempts per hour for the initialize endpoint
const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'تم تجاوز الحد المسموح به للمحاولات. يرجى الانتظار ساعة والمحاولة مجدداً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/setup/status — no auth, no rate limit
router.get('/status', getSetupStatus);

// POST /api/setup/initialize — no auth, strict rate limit
router.post('/initialize', setupLimiter, initializeSystem);

export default router;