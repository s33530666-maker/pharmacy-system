import prisma from '../config/db.js';

const SENSITIVE_OPERATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const SENSITIVE_ENDPOINTS = [
  '/api/auth/users',
  '/api/drugs',
  '/api/pos/sale',
  '/api/purchases',
  '/api/damaged',
  '/api/backup',
];

const formatTimestamp = () => new Date().toISOString();

export default async function auditLog(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', async () => {
    try {
      const isSensitiveOperation = SENSITIVE_OPERATIONS.includes(req.method);
      const isSensitiveEndpoint = SENSITIVE_ENDPOINTS.some(endpoint => req.path.startsWith(endpoint));
      const isAuthRequest = req.path.includes('/auth/login') || req.path.includes('/auth/register');

      if (!isSensitiveOperation || isAuthRequest) {
        return;
      }

      const userId = req.user?.id || null;
      const userRole = req.user?.role || null;
      const action = `${req.method} ${req.path}`;
      const method = req.method;
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      let details = {};
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
        details = { requestBody: sanitizedBody };
      }

      if (isSensitiveEndpoint && isSuccess) {
        details.responseStatus = statusCode;
      }

      const auditEntry = {
        timestamp: formatTimestamp(),
        userId,
        userRole,
        action,
        method,
        ip,
        userAgent,
        statusCode,
        isSuccess,
        endpoint: req.path,
        query: req.query,
        details: Object.keys(details).length > 0 ? details : undefined,
      };

      console.log(`[AUDIT] ${formatTimestamp()} | User: ${userId || 'anonymous'} | ${method} ${req.path} | Status: ${statusCode}`);

      try {
        await prisma.auditLog.create({
          data: {
            userId: userId || '',
            action: action,
            method: method,
            endpoint: req.path,
            ipAddress: ip,
            userAgent: userAgent.substring(0, 500),
            statusCode: statusCode,
            success: isSuccess,
            details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
          },
        });
      } catch (dbError) {
        console.error('[AUDIT] Failed to write audit log to database:', dbError.message);
      }
    } catch (error) {
      console.error('[AUDIT] Error in audit logger:', error.message);
    }
  });

  next();
}