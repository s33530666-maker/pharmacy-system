import bcrypt from 'bcrypt';
import prisma from '../../config/db.js';
import { signUserToken } from '../../config/jwt.js';

const EMERGENCY_KEY_HASH = process.env.EMERGENCY_KEY_HASH;

const VALID_ROLES = ['ADMIN', 'CASHIER', 'PHARMACIST', 'TECHNICIAN'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const parsePermissions = (raw) => {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const toPublicUser = (user) => ({
  ...user,
  permissions: parsePermissions(user.permissions),
});

export const hasUsers = async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ hasUsers: count > 0 });
  } catch (error) {
    console.error('hasUsers error:', error);
    res.status(500).json({ error: 'Failed to check users' });
  }
};

export const registerFirst = async (req, res) => {
  try {
    const { name, password, email } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res
        .status(403)
        .json({ error: 'System already has users. Admin registration required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { name } });
    if (existingUser) return res.status(409).json({ error: 'Username already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        password: hash,
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: JSON.stringify(['all']),
      },
    });

    const token = signUserToken(user);

    return res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن',
      isFirstUser: true,
      token,
      user: { id: user.id, name: user.name, role: user.role, permissions: ['all'] },
    });
  } catch (error) {
    console.error('RegisterFirst error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const register = async (req, res) => {
  try {
    const { name, password, role, email } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { name } });
    if (existingUser) return res.status(409).json({ error: 'Username already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        password: hash,
        role: role || 'TECHNICIAN',
        status: 'ACTIVE',
      },
    });

    const token = signUserToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        permissions: parsePermissions(user.permissions),
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await prisma.user.findUnique({ where: { name } });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    if (user.status !== 'ACTIVE') return res.status(403).json({ error: 'Account is not active' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    const token = signUserToken(user);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        maxDiscountLimit: user.maxDiscountLimit || 0,
        permissions: parsePermissions(user.permissions),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const emergencyAccess = async (req, res) => {
  try {
    const { emergencyKey } = req.body;
    if (!emergencyKey || !EMERGENCY_KEY_HASH) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const match = await bcrypt.compare(emergencyKey, EMERGENCY_KEY_HASH);
    if (!match) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.user.upsert({
      where: { id: 'emergency-access' },
      update: { name: 'Emergency Admin', role: 'ADMIN', status: 'ACTIVE' },
      create: {
        id: 'emergency-access',
        name: 'Emergency Admin',
        password: 'emergency-access-no-login',
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: JSON.stringify(['all']),
      },
    });

    const token = signUserToken(
      { id: 'emergency-access', name: 'Emergency Admin', role: 'ADMIN' },
      '1h'
    );

    return res.json({
      token,
      user: {
        id: 'emergency-access',
        name: 'Emergency Admin',
        role: 'ADMIN',
        permissions: ['all'],
      },
    });
  } catch (error) {
    console.error('emergencyAccess error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        maxDiscountLimit: true,
        email: true,
        permissions: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const getActiveUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ users });
  } catch (error) {
    console.error('Get active users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        maxDiscountLimit: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ users: users.map(toPublicUser) });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status, password } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        maxDiscountLimit: true,
        permissions: true,
      },
    });

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.name.toLowerCase() === 'admin') {
      return res.status(403).json({ error: 'Cannot delete the default admin user' });
    }

    await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

export const updateUserDiscountLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxDiscountLimit } = req.body;

    const limit = parseFloat(maxDiscountLimit);
    if (Number.isNaN(limit) || limit < 0 || limit > 100) {
      return res.status(400).json({ error: 'maxDiscountLimit must be between 0 and 100' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { maxDiscountLimit: limit },
      select: { id: true, name: true, maxDiscountLimit: true },
    });
    return res.json({ user });
  } catch (error) {
    console.error('Update discount limit error:', error);
    return res.status(500).json({ error: 'Failed to update discount limit' });
  }
};

export const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions must be an array' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { permissions: JSON.stringify(permissions) },
      select: { id: true, name: true, permissions: true },
    });

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Update permissions error:', error);
    return res.status(500).json({ error: 'Failed to update permissions' });
  }
};
