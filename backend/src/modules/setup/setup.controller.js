import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';
import { licenseService } from '../license/license.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/setup/status
 * Returns { needsSetup: true } if no users exist, { needsSetup: false } otherwise.
 * No auth required.
 */
export const getSetupStatus = async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ needsSetup: count === 0 });
  } catch (error) {
    console.error('[Setup] getSetupStatus error:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
};

/**
 * POST /api/setup/initialize
 * Creates the first admin user + starts 14-day trial license.
 * Blocked (403) if any user already exists.
 */
export const initializeSystem = async (req, res) => {
  try {
    // Guard: only works when zero users exist
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'تم إعداد النظام مسبقاً. لا يمكن إعادة الإعداد.' });
    }

    const { name, password, pharmacyName } = req.body;

    // Validation
    if (!name || !password) {
      return res.status(400).json({ error: 'اسم المدير وكلمة المرور مطلوبان.' });
    }
    if (name.trim().length < 3) {
      return res.status(400).json({ error: 'اسم المدير يجب أن يكون 3 أحرف على الأقل.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' });
    }

    const resolvedPharmacyName = (pharmacyName || name).trim();

    // Create the first admin
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        password: hash,
        role: 'ADMIN',
        status: 'ACTIVE',
        maxDiscountLimit: 100,
        permissions: JSON.stringify(['all']),
      },
    });

    // Start 14-day trial license automatically
    try {
      await licenseService.generateTrialLicense(resolvedPharmacyName);
      console.log(`✅ [Setup] Trial license created for: ${resolvedPharmacyName}`);
    } catch (licErr) {
      console.warn('[Setup] License trial init warning:', licErr.message);
    }

    // Sign JWT so frontend can log the user in immediately
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log(`✅ [Setup] First admin created: ${user.name}`);

    return res.status(201).json({
      success: true,
      message: 'تم إعداد النظام بنجاح!',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        maxDiscountLimit: user.maxDiscountLimit,
        permissions: ['all'],
      },
    });
  } catch (error) {
    console.error('[Setup] initializeSystem error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إعداد النظام. حاول مجدداً.' });
  }
};
