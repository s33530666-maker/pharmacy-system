import prisma from '../../config/db.js';

export const licenseService = {
  // 1. generateTrialLicense(pharmacyName)
  generateTrialLicense: async (pharmacyName) => {
    const existingTrial = await prisma.license.findFirst({
      where: { type: 'TRIAL', pharmacyName }
    });
    
    if (existingTrial) return existingTrial;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    return prisma.license.create({
      data: {
        pharmacyName,
        licenseKey: `TRIAL-${Date.now()}`,
        type: 'TRIAL',
        status: 'ACTIVE',
        activatedAt: new Date(),
        expiresAt,
        usedAt: new Date(),
      }
    });
  },

  // 2. activateLicense(licenseKey, pharmacyName)
  activateLicense: async (licenseKey, pharmacyName) => {
    const license = await prisma.license.findUnique({
      where: { licenseKey }
    });

    if (!license) {
      throw new Error('كود التفعيل غير صحيح');
    }

    if (license.usedAt) {
      throw new Error('الكود مستخدم من قبل');
    }

    if (license.pharmacyName.trim().toLowerCase() !== pharmacyName.trim().toLowerCase()) {
      throw new Error('اسم الصيدلية غير متطابق');
    }

    let expiresAt = null;
    if (license.type === 'MONTHLY') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else if (license.type === 'YEARLY') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);
    }

    return prisma.license.update({
      where: { licenseKey },
      data: {
        usedAt: new Date(),
        activatedAt: new Date(),
        expiresAt,
        status: 'ACTIVE'
      }
    });
  },

  // 3. checkLicense()
  checkLicense: async () => {
    const activeLicense = await prisma.license.findFirst({
      orderBy: { activatedAt: 'desc' },
      where: { status: { in: ['ACTIVE', 'EXPIRED'] } }
    });

    if (!activeLicense) {
      return { valid: false, reason: 'NO_LICENSE' };
    }

    if (activeLicense.type === 'LIFETIME') {
      return { 
        valid: true, 
        type: 'LIFETIME', 
        status: 'ACTIVE',
        pharmacyName: activeLicense.pharmacyName,
        activatedAt: activeLicense.activatedAt,
        expiresAt: null,
        daysRemaining: null,
        reason: null
      };
    }

    const now = new Date();
    if (activeLicense.expiresAt && activeLicense.expiresAt < now) {
      if (activeLicense.status !== 'EXPIRED') {
        await prisma.license.update({
          where: { id: activeLicense.id },
          data: { status: 'EXPIRED' }
        });
      }
      return { 
        valid: false, 
        type: activeLicense.type, 
        status: 'EXPIRED',
        pharmacyName: activeLicense.pharmacyName,
        activatedAt: activeLicense.activatedAt,
        expiresAt: activeLicense.expiresAt,
        daysRemaining: 0, 
        reason: 'EXPIRED'
      };
    }

    const daysRemaining = activeLicense.expiresAt 
      ? Math.ceil((activeLicense.expiresAt - now) / (1000 * 60 * 60 * 24))
      : null;

    return { 
      valid: true, 
      type: activeLicense.type, 
      status: 'ACTIVE',
      pharmacyName: activeLicense.pharmacyName,
      activatedAt: activeLicense.activatedAt,
      expiresAt: activeLicense.expiresAt,
      daysRemaining,
      reason: null
    };
  },

  // 4. getLicenseInfo()
  getLicenseInfo: async () => {
    return prisma.license.findFirst({
      orderBy: { activatedAt: 'desc' }
    });
  }
};
