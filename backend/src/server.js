import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import os from 'os';

import prisma from './config/db.js';
import { JWT_SECRET } from './config/jwt.js';
import auditLog from './middleware/auditLogger.js';
import { licenseCheck } from './middleware/licenseCheck.js';

import licenseRoutes from './modules/license/license.routes.js';
import setupRoutes from './modules/setup/setup.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import alternativesRoutes from './modules/alternatives/alt.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import purchasesRoutes from './modules/purchases/purchases.routes.js';
import drugsRoutes from './modules/drugs/drugs.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import supplierDebtsRoutes from './modules/supplierDebts/supplierDebts.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import shiftRoutes from './modules/shifts/shift.routes.js';
import damagedRoutes from './modules/damaged/damaged.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import alertsRoutes from './modules/alerts/alerts.routes.js';
import importRoutes from './modules/import/import.routes.js';
import batchesRoutes from './modules/drugs/batches.routes.js';
import backupRoutes from './modules/backup/backup.routes.js';
import customersRoutes from './modules/customers/customers.controller.js';
import settingsRoutes from './modules/settings/settings.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// --- Security ---
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: isProd
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// --- Rate limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many import requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const backupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many backup requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// --- Body parsing ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Pharmacy System API is running',
    timestamp: new Date().toISOString(),
  });
});

// --- License gate (skips license/setup/login itself) ---
app.use(licenseCheck);

// --- Routes ---
app.use('/api/license', licenseRoutes);
app.use('/api/setup', authLimiter, setupRoutes);
app.use('/api/auth', authLimiter, auditLog, authRoutes);
app.use('/api/alternatives', alternativesRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/drugs', drugsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/supplier-debts', supplierDebtsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/damaged', damagedRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/import', importLimiter, importRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/backup', backupLimiter, backupRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/settings', settingsRoutes);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// --- Global error handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  if (isProd) {
    return res.status(err.status || 500).json({ error: 'An unexpected error occurred' });
  }
  return res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// --- Graceful shutdown ---
const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error disconnecting Prisma:', e.message);
  }
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Listen ---
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
};

const LOCAL_IP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nPharmacy System API running on http://localhost:${PORT}`);
  console.log(`Network: http://${LOCAL_IP}:${PORT}`);
  console.log(`Health: http://${LOCAL_IP}:${PORT}/health`);
  if (JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in production.');
  }
});

export default app;
