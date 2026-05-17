import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const EMERGENCY_KEY_HASH = process.env.EMERGENCY_KEY_HASH;

export const hasUsers = async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ hasUsers: count > 0 });
  } catch (error) {
    console.error('hasUsers error:', error);
    res.status(500).json({ error: 'Failed to check users' });
  }
};

export const setupStatus = async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ needsSetup: count === 0 });
  } catch (error) {
    console.error('setupStatus error:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
};

export const registerFirst = async (req, res) => {
  try {
    const { name, password, email } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (name.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'System already has users. Admin registration required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { name } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

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

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن',
      isFirstUser: true,
      token,
      user: { id: user.id, name: user.name, role: user.role, permissions: ['all'] },
    });
  } catch (error) {
    console.error('RegisterFirst error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const register = async (req, res) => {
  try {
    const { name, password, role, email } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (name.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required to create additional users' });
      }
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required to create users' });
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { name },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    if (isFirstUser) {
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

      const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return res.status(201).json({
        message: 'First user created successfully',
        isFirstUser: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          permissions: ['all'],
        },
      });
    }

    const validRoles = ['ADMIN', 'CASHIER', 'PHARMACIST', 'TECHNICIAN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be ADMIN, CASHIER, PHARMACIST, or TECHNICIAN' });
    }

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

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        permissions: user.permissions ? JSON.parse(user.permissions) : [],
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }


    const user = await prisma.user.findUnique({
      where: { name },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const plainTextPassword = password;
    const hash = user.password;
    const match = await bcrypt.compare(plainTextPassword, hash);
    console.log(`[DEBUG] Login attempt for: ${name}, bcrypt.compare result: ${match}`);

    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        maxDiscountLimit: user.maxDiscountLimit || 0,
        permissions: user.permissions ? JSON.parse(user.permissions) : [],
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const emergencyAccess = async (req, res) => {
  try {
    const { emergencyKey } = req.body;

    if (!emergencyKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const match = await bcrypt.compare(emergencyKey, EMERGENCY_KEY_HASH);

    if (!match) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Upsert a dummy user in the database so foreign key constraints (like Shifts, Sales) don't fail
    await prisma.user.upsert({
      where: { id: 'emergency-access' },
      update: { name: 'Emergency Admin', role: 'ADMIN', status: 'ACTIVE' },
      create: {
        id: 'emergency-access',
        name: 'Emergency Admin',
        password: 'emergency-access-no-login',
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: JSON.stringify(['all'])
      }
    });

    const token = jwt.sign(
      { id: 'emergency-access', name: 'Emergency Admin', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ token, user: { id: 'emergency-access', name: 'Emergency Admin', role: 'ADMIN', permissions: ['all'] } });
  } catch {
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

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        ...user,
        permissions: user.permissions ? JSON.parse(user.permissions) : [],
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const getActiveUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }

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

    const parsedUsers = users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : [],
    }));

    res.json({ users: parsedUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }

    const { id } = req.params;
    const { name, role, status, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (role) {
      const validRoles = ['ADMIN', 'CASHIER', 'PHARMACIST', 'TECHNICIAN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updateData.role = role;
    }
    if (status) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateData.status = status;
    }
    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      const hash = await bcrypt.hash(password, 10);
      updateData.password = hash;
    }

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

    res.json({
      user: {
        ...user,
        permissions: user.permissions ? JSON.parse(user.permissions) : [],
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }

    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { name: true }
    });

    if (targetUser && targetUser.name.toLowerCase() === 'admin') {
      return res.status(403).json({ error: 'Cannot delete the default admin user' });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

export const updateUserDiscountLimit = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }

    const { id } = req.params;
    const { maxDiscountLimit } = req.body;

    if (maxDiscountLimit === undefined || maxDiscountLimit === null) {
      return res.status(400).json({ error: 'maxDiscountLimit is required' });
    }

    const limit = parseFloat(maxDiscountLimit);
    if (isNaN(limit) || limit < 0 || limit > 100) {
      return res.status(400).json({ error: 'maxDiscountLimit must be between 0 and 100' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { maxDiscountLimit: limit },
      select: {
        id: true,
        name: true,
        maxDiscountLimit: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Update discount limit error:', error);
    res.status(500).json({ error: 'Failed to update discount limit' });
  }
};

export const updateUserPermissions = async (req, res) => {
  try {
    console.log('=== PERMISSIONS UPDATE ===');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin only.' });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    console.log('permissions value:', permissions);
    console.log('permissions type:', typeof permissions);
    console.log('is array:', Array.isArray(permissions));

    if (!Array.isArray(permissions)) {
      console.log('VALIDATION FAILED: permissions is not an array');
      return res.status(400).json({ error: 'permissions must be an array' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { permissions: JSON.stringify(permissions) },
      select: {
        id: true,
        name: true,
        permissions: true,
      },
    });

    res.json({
      user: {
        ...user,
        permissions: user.permissions ? JSON.parse(user.permissions) : [],
      }
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
};
