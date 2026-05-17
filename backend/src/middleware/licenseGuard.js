import { checkLicenseStatus } from '../modules/license/license.service.js';

/**
 * Middleware that blocks API calls when the trial period is expired
 * and the system is not activated.
 * 
 * Exempt routes (always allowed):
 * - /api/license/*  (so users can check status and activate)
 * - /api/auth/*     (so users can still log in / fetch public user list)
 * - /health         (health check)
 */
export function licenseGuard(req, res, next) {
  // Always allow license-related, auth, and health endpoints
  const exemptPrefixes = ['/api/license', '/api/auth', '/api/setup', '/health'];
  const isExempt = exemptPrefixes.some(prefix => req.path.startsWith(prefix));

  if (isExempt) {
    return next();
  }

  try {
    const status = checkLicenseStatus();

    if (status.isExpired) {
      return res.status(403).json({
        error: 'Trial period has expired. Please activate your license.',
        code: 'TRIAL_EXPIRED',
        isExpired: true,
      });
    }

    next();
  } catch (error) {
    console.error('License guard error:', error);
    // On error, allow the request through rather than blocking the system
    next();
  }
}

export default licenseGuard;
