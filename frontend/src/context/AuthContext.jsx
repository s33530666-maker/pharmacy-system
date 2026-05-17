import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const API_BASE = '';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const decodeToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      if (parsed && !parsed.permissions) {
        parsed.permissions = [];
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTempAdmin, setIsTempAdmin] = useState(false);

  const usersCache = React.useRef({
    activeUsers: { data: null, timestamp: 0 },
    allUsers: { data: null, timestamp: 0 },
  });
  const CACHE_DURATION = 5 * 60 * 1000;

  const fetchActiveUsers = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = usersCache.current.activeUsers;
    
    if (!force && cached.data && now - cached.timestamp < CACHE_DURATION) {
      return;
    }
    
    try {
      const response = await api.get('/auth/users/public');
      let fetchedUsers = response.data.users || [];
      
      // تأكد إن Admin موجود دايماً في الـ dropdown بغض النظر عن الـ DB
      const hasAdmin = fetchedUsers.some(
        user => user.name === 'Admin' || user.username === 'Admin'
      );
      if (!hasAdmin) {
        fetchedUsers = [
          { id: 'fallback-admin', name: 'Admin', username: 'Admin', role: 'admin' },
          ...fetchedUsers,  // Admin أول واحد في القائمة
        ];
      }
      
      usersCache.current.activeUsers = { data: fetchedUsers, timestamp: now };
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to fetch active users:', err);
      // لو الـ API فشلت خالص، اعرض Admin على الأقل
      setUsers([{ id: 'fallback-admin', name: 'Admin', username: 'Admin', role: 'admin' }]);
    }
  }, []);

  const fetchUsers = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = usersCache.current.allUsers;
    
    if (!force && cached.data && now - cached.timestamp < CACHE_DURATION) {
      return;
    }
    
    try {
      const response = await api.get('/auth/users');
      const userData = response.data.users || [];
      usersCache.current.allUsers = { data: userData, timestamp: now };
      setUsers(userData);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      if (cached.data) {
        setUsers(cached.data);
      }
    }
  }, []);

  // Initial auth check — always sets isLoading to false in finally
  useEffect(() => {
    const initAuth = async () => {
      try {
        await fetchActiveUsers();
      } catch (err) {
        console.error('Initial auth check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers();
    }
    console.log('User permissions:', user?.permissions);
  }, [user?.role, user?.permissions, fetchUsers]);

  const login = async (name, password) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { name, password });
      const data = response.data;
      if (data.token) {
        const userData = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          maxDiscountLimit: data.user.maxDiscountLimit || 0,
          permissions: data.user.permissions || [],
        };
        setToken(data.token);
        setUser(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, error: data.error || 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const addUser = async (newUser) => {
    try {
      const response = await api.post('/auth/register', newUser);
      await fetchUsers(true);
      const createdUser = response.data?.user;
      return { success: true, userId: createdUser?.id };
    } catch (error) {
      console.error('Add user error:', error);
      const errorData = error.response?.data;
      let errorMessage = 'فشل في إضافة المستخدم';
      if (errorData?.errors && errorData.errors.length > 0) {
        errorMessage = errorData.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join(' | ');
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      return { success: false, error: errorMessage };
    }
  };

  const updateUser = async (id, updates) => {
    try {
      await api.put(`/auth/users/${id}`, updates);
      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.response?.data?.error };
    }
  };

  const updateUserDiscountLimit = async (id, maxDiscountLimit) => {
    try {
      await api.put(`/auth/users/${id}/discount-limit`, { maxDiscountLimit });
      await fetchUsers();
      return { success: true };
    } catch (error) {
      console.error('Update discount limit error:', error);
      return { success: false, error: error.response?.data?.error };
    }
  };

  const updateUserPermissions = async (id, permissions) => {
    const payload = { permissions };
    console.log('Permissions payload:', JSON.stringify(payload, null, 2));
    try {
      await api.put(`/auth/users/${id}/permissions`, payload);
      await fetchUsers(true);
      return { success: true };
    } catch (error) {
      console.error('Update permissions error:', error);
      console.log('Error response:', JSON.stringify(error.response?.data, null, 2));
      const errorData = error.response?.data;
      if (errorData?.errors && errorData.errors.length > 0) {
        return { success: false, error: errorData.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: errorData?.error || errorData?.message || 'Failed to update permissions' };
    }
  };

  const deleteUser = async (id) => {
    try {
      await api.delete(`/auth/users/${id}`);
      await fetchUsers(true);
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: error.response?.data?.error };
    }
  };

  const logout = () => {
    const activeShift = localStorage.getItem('activeShift');
    if (activeShift) {
      alert('الرجاء إنهاء الشيفت أولاً قبل الخروج');
      return false;
    }
    setUser(null);
    setToken(null);
    setUsers([]);
    setIsTempAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return true;
  };

  const enableTempAdmin = (password) => {
    if (password === '5555') {
      setIsTempAdmin(true);
      return { success: true };
    }
    return { success: false, error: 'كلمة المرور غير صحيحة' };
  };

  const disableTempAdmin = () => {
    setIsTempAdmin(false);
  };

  const effectiveUser = isTempAdmin && user 
    ? { ...user, role: 'ADMIN', permissions: ['all'] } 
    : user;

  const value = {
    user: effectiveUser,
    actualUser: user,
    isTempAdmin,
    enableTempAdmin,
    disableTempAdmin,
    token,
    users,
    isLoading,
    login,
    addUser,
    updateUser,
    updateUserDiscountLimit,
    updateUserPermissions,
    deleteUser,
    logout,
    fetchUsers,
    fetchActiveUsers,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};