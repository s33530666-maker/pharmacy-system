import prisma from '../config/db.js';
import { verifyJwt } from '../config/jwt.js';

const mapJwtError = (error) => {
  if (error.name === 'TokenExpiredError') return { status: 401, body: { error: 'Token has expired' } };
  if (error.name === 'JsonWebTokenError') return { status: 401, body: { error: 'Invalid token' } };
  return { status: 401, body: { error: 'Token verification failed' } };
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
};

export const verifyToken = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = verifyJwt(token);
    return next();
  } catch (error) {
    const { status, body } = mapJwtError(error);
    return res.status(status).json(body);
  }
};

export const requireRole = (allowedRoles) => {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${rolesArray.join(', ')}`,
      });
    }
    return next();
  };
};

export const optionalAuthOrFirstUser = () => async (req, res, next) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) return next();

    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = verifyJwt(token);
    if (decoded.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });

    req.user = decoded;
    return next();
  } catch (error) {
    const { status, body } = mapJwtError(error);
    return res.status(status).json(body);
  }
};

export default verifyToken;
