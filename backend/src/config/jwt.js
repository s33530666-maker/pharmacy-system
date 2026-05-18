import jwt from 'jsonwebtoken';

export const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (
  process.env.NODE_ENV === 'production' &&
  JWT_SECRET === 'your-secret-key-change-in-production'
) {
  // Fail fast in production rather than silently using the default secret.
  // eslint-disable-next-line no-console
  console.error('FATAL: JWT_SECRET is not configured in production.');
  process.exit(1);
}

export const signUserToken = (user, expiresIn = JWT_EXPIRES_IN) =>
  jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn }
  );

export const verifyJwt = (token) => jwt.verify(token, JWT_SECRET);
