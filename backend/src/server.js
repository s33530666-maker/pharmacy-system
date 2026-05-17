import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import os from 'os';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';


// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for legitimate use
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for login/register endpoints
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRelaxedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Relaxed limit for other auth endpoints (users, public)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit import operations
  message: { error: 'Too many import requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Pharmacy System API is running', timestamp: new Date().toISOString() });
});

// Import audit logger utility
import auditLog from './middleware/auditLogger.js';
import { licenseCheck } from './middleware/licenseCheck.js';

// License check — blocks non-license API calls when license invalid/expired
app.use(licenseCheck);

// API Routes with auth middleware and rate limiting
app.use('/api/license', (await import('./modules/license/license.routes.js')).default);
app.use('/api/setup', authRelaxedLimiter, (await import('./modules/setup/setup.routes.js')).default);
app.use('/api/auth', authRelaxedLimiter, auditLog, (await import('./modules/auth/auth.routes.js')).default);
app.use('/api/alternatives', (await import('./modules/alternatives/alt.routes.js')).default);
app.use('/api/pos', (await import('./modules/pos/pos.routes.js')).default);
app.use('/api/purchases', (await import('./modules/purchases/purchases.routes.js')).default);
app.use('/api/drugs', (await import('./modules/drugs/drugs.routes.js')).default);
app.use('/api/suppliers', (await import('./modules/suppliers/suppliers.routes.js')).default);
app.use('/api/supplier-debts', (await import('./modules/supplierDebts/supplierDebts.routes.js')).default);
app.use('/api/reports', (await import('./modules/reports/reports.routes.js')).default);
app.use('/api/shifts', (await import('./modules/shifts/shift.routes.js')).default);
app.use('/api/damaged', (await import('./modules/damaged/damaged.routes.js')).default);
app.use('/api/inventory', (await import('./modules/inventory/inventory.routes.js')).default);
app.use('/api/alerts', (await import('./modules/alerts/alerts.routes.js')).default);
app.use('/api/import', importLimiter, (await import('./modules/import/import.routes.js')).default);
app.use('/api/batches', (await import('./modules/drugs/batches.routes.js')).default);
app.use('/api/backup', authLimiter, (await import('./modules/backup/backup.routes.js')).default);
app.use('/api/customers', (await import('./modules/customers/customers.controller.js')).default);
app.use('/api/settings', (await import('./modules/settings/settings.routes.js')).default);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'An unexpected error occurred' });
  } else {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Pharmacy System API is running on http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${LOCAL_IP}:${PORT}`);
  console.log(`📊 API Health Check: http://${LOCAL_IP}:${PORT}/health`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET === 'your-secret-key-change-in-production' ? '⚠️ Using default secret - CHANGE IN PRODUCTION!' : '✅ Configured'}`);
  console.log(`🔒 Rate limiting: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Development mode'}\n`);
});

export { JWT_SECRET };
export default app;