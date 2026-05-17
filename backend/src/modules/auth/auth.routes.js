import express from 'express';
import { login, register, registerFirst, getCurrentUser, getAllUsers, updateUser, deleteUser, updateUserDiscountLimit, updateUserPermissions, getActiveUsers, emergencyAccess, hasUsers, setupStatus } from './auth.controller.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody, loginSchema, registerSchema, updateUserSchema, discountLimitSchema, permissionsSchema } from '../../middleware/validation.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Unauthorized' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/emergency-access', emergencyLimiter, emergencyAccess);

router.get('/setup-status', setupStatus);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/register/first', authLimiter, registerFirst);
router.post('/register', authLimiter, verifyToken, register);
router.get('/has-users', hasUsers);
router.get('/users/public', getActiveUsers);
router.get('/me', verifyToken, getCurrentUser);
router.get('/users', verifyToken, requireRole('ADMIN'), getAllUsers);
router.put('/users/:id', verifyToken, requireRole('ADMIN'), validateBody(updateUserSchema), updateUser);
router.delete('/users/:id', verifyToken, requireRole('ADMIN'), deleteUser);
router.put('/users/:id/discount-limit', verifyToken, requireRole('ADMIN'), validateBody(discountLimitSchema), updateUserDiscountLimit);
router.put('/users/:id/permissions', verifyToken, requireRole('ADMIN'), validateBody(permissionsSchema), updateUserPermissions);



export default router;