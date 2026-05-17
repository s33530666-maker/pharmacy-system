import { licenseService } from '../modules/license/license.service.js';

export const licenseCheck = async (req, res, next) => {
  // Always allowed routes
  const path = req.path;
  const isLicenseRoute = path === '/api/license/status' || path === '/api/license/activate';
  const isSetupRoute = path.startsWith('/api/setup');
  const isAuthLoginRoute = path === '/api/auth/login';
  const isAuthUsersPublicRoute = path === '/api/auth/users/public' && req.method === 'GET';

  if (isLicenseRoute || isSetupRoute || isAuthLoginRoute || isAuthUsersPublicRoute) {
    return next();
  }

  try {
    const status = await licenseService.checkLicense();
    if (!status.valid) {
      return res.status(402).json({ error: "LICENSE_EXPIRED", reason: status.reason });
    }
    next();
  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({ error: 'Failed to verify license' });
  }
};

export default licenseCheck;
