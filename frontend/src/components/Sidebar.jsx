import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, ShoppingBag, Pill, TrendingUp, Users, Truck, Package, AlertTriangle, Settings, UserCog, BarChart2, Clock, LogOut, Moon, Sun, X, Key, Shield
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const NAV_ITEMS = [
  { key: 'pos',       label: 'شاشة البيع',    path: '/pos',             icon: ShoppingCart },
  { key: 'purchases', label: 'المشتريات',      path: '/purchases',       icon: ShoppingBag },
  { key: 'drugs',     label: 'الأدوية',        path: '/manage-drugs',    icon: Pill },
  { key: 'sales',     label: 'المبيعات',       path: '/sales-history',   icon: TrendingUp },
  { key: 'customers', label: 'العملاء',        path: '/customers',  icon: Users },
  { key: 'suppliers', label: 'الموردون',       path: '/suppliers',      icon: Truck },
  { key: 'inventory', label: 'المخزن',         path: '/inventory',      icon: Package },
  { key: 'damaged',   label: 'التالف',         path: '/damaged',         icon: AlertTriangle },
  { key: 'settings',  label: 'الإعدادات',      path: '/settings',        icon: Settings },
  { key: 'reports',   label: 'الإحصائيات',     path: '/',                icon: BarChart2 },
  { key: 'shift',     label: 'الشيفت',         path: '/shifts',          icon: Clock },
];

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, actualUser, enableTempAdmin } = useAuth()
  const { isDark, toggle } = useTheme()

  const [showTempAdminModal, setShowTempAdminModal] = useState(false)
  const [tempAdminPassword, setTempAdminPassword] = useState('')
  const [tempAdminError, setTempAdminError] = useState('')

  const isActive = (path) => location.pathname === path

  let userPermissions = [];
  try {
    if (Array.isArray(user?.permissions)) {
      userPermissions = user.permissions;
    } else if (typeof user?.permissions === 'string') {
      userPermissions = JSON.parse(user.permissions);
    }
  } catch (e) {
    console.error('Failed to parse user permissions in Sidebar', e);
  }

  const visibleNavItems = user?.role === 'ADMIN'
    ? NAV_ITEMS
    : NAV_ITEMS.filter(item => userPermissions.includes(item.key));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login')
  }

  const handleTempAdminSubmit = (e) => {
    e.preventDefault();
    const result = enableTempAdmin(tempAdminPassword);
    if (result.success) {
      setShowTempAdminModal(false);
      setTempAdminPassword('');
      setTempAdminError('');
    } else {
      setTempAdminError(result.error);
    }
  };

  return (
    <nav className="h-16 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white overflow-x-auto no-print" style={{ boxShadow: 'var(--md-shadow-1)' }}>
      <div className="flex items-center gap-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-[var(--md-primary)] text-white rounded-full shadow-sm'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white rounded-full'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600">{actualUser?.name || user?.name}</span>
        
        {actualUser?.role !== 'ADMIN' && (
          <button
            onClick={() => setShowTempAdminModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 transition-colors border border-orange-200 dark:border-orange-800/50"
            title="دخول مؤقت كمدير"
          >
            <Shield size={14} />
            <span className="hidden sm:inline">مدير مؤقت</span>
          </button>
        )}

        <button
          onClick={toggle}
          className="p-2 rounded-full hover:bg-[var(--md-primary-container)] transition-colors"
        >
          {isDark ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} className="text-gray-500" />}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          <LogOut size={14} />
          <span>خروج</span>
        </button>
      </div>

      {/* Temp Admin Modal */}
      {showTempAdminModal && (
        <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" dir="rtl">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-gray-800 dark:text-white">
                <Shield className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-lg">دخول مؤقت كمدير</h3>
              </div>
              <button 
                onClick={() => {
                  setShowTempAdminModal(false);
                  setTempAdminPassword('');
                  setTempAdminError('');
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleTempAdminSubmit} className="p-6">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                أدخل كلمة مرور المدير للحصول على صلاحيات كاملة بشكل مؤقت.
              </p>
              
              <div className="mb-6 relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  كلمة مرور المدير
                </label>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={tempAdminPassword}
                    onChange={(e) => setTempAdminPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all dark:text-white"
                    placeholder="••••"
                    autoFocus
                  />
                </div>
                {tempAdminError && (
                  <p className="text-red-500 text-sm mt-2 font-medium">{tempAdminError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTempAdminModal(false);
                    setTempAdminPassword('');
                    setTempAdminError('');
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-xl font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!tempAdminPassword}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md shadow-orange-500/20"
                >
                  تأكيد الدخول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  )
}