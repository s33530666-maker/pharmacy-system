import bcrypt from 'bcrypt';
import prisma from '../../config/db.js';
import { signUserToken } from '../../config/jwt.js';
import { licenseService } from '../license/license.service.js';

/**
 * GET /api/setup/status
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
 * Creates the first admin user + 14-day trial license. Blocked once any user exists.
 */
export const initializeSystem = async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'تم إعداد النظام مسبقاً. لا يمكن إعادة الإعداد.' });
    }

    const { name, password, pharmacyName } = req.body;

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

    try {
      await licenseService.generateTrialLicense(resolvedPharmacyName);
    } catch (licErr) {
      console.warn('[Setup] License trial init warning:', licErr.message);
    }

    const token = signUserToken(user);

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
