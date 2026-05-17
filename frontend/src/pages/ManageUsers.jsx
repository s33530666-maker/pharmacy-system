import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Users, Percent, ShieldCheck, Check, AlertCircle, X, Shield, Lock, Activity, Loader } from 'lucide-react';

const PERMISSIONS_LIST = [
  { key: 'pos', label: 'البيع' },
  { key: 'purchases', label: 'المشتريات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'settings', label: 'الإعدادات' },
  { key: 'delete', label: 'حذف السجلات' },
  { key: 'discounts', label: 'الخصومات' },
  { key: 'shift', label: 'تقفيل الشيفت' },
  { key: 'drugs', label: 'إدارة الأدوية' },
  { key: 'customers', label: 'العملاء' },
  { key: 'inventory', label: 'الجرد' },
];

export default function ManageUsers() {
  const { user: currentUser, users: authUsers, addUser, updateUser, deleteUser, updateUserPermissions, updateUserDiscountLimit, fetchUsers } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: 'CASHIER', password: '' });
  const [discountValue, setDiscountValue] = useState(0);
  const [checkedPermissions, setCheckedPermissions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initial load
  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && fetchUsers) {
      fetchUsers(true);
    }
  }, [currentUser, fetchUsers]);

  // Sync users from context
  useEffect(() => {
    if (authUsers) {
      setUsers(authUsers.filter(u => u && u.status !== 'INACTIVE' && u.id !== 'fallback-admin'));
    }
  }, [authUsers]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', role: 'CASHIER', password: '' });
    setCheckedPermissions([]);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, role: user.role, password: '' });
    setCheckedPermissions(user.permissions || []);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name) return setError('الاسم مطلوب');
    if (!editingUser && !formData.password) return setError('كلمة المرور مطلوبة للمستخدم الجديد');

    setLoading(true);
    try {
      let result;
      if (editingUser && updateUser) {
        result = await updateUser(editingUser.id, { 
          name: formData.name, 
          username: formData.username || undefined,
          role: formData.role, 
          password: formData.password || undefined 
        });
        if (updateUserPermissions) await updateUserPermissions(editingUser.id, checkedPermissions);
      } else if (addUser) {
        result = await addUser({ 
          name: formData.name, 
          role: formData.role, 
          password: formData.password,
        });
        // Set permissions after creating user
        if (result?.success && result?.userId && checkedPermissions.length > 0 && updateUserPermissions) {
          await updateUserPermissions(result.userId, checkedPermissions);
        }
      }

      if (result && !result.success) {
        setError(result.error || 'فشل في الحفظ');
      } else {
        setSuccess('تم الحفظ بنجاح');
        setShowModal(false);
        if (fetchUsers) fetchUsers(true);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    setLoading(true);
    try {
      if (deleteUser) await deleteUser(id);
      setSuccess('تم الحذف بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert('فشل في الحذف');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key) => {
    setCheckedPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleDiscountSubmit = async () => {
    if (editingUser && updateUserDiscountLimit) {
      setLoading(true);
      try {
        await updateUserDiscountLimit(editingUser.id, parseFloat(discountValue) || 0);
        setShowDiscountModal(false);
        setSuccess('تم تحديث الخصم بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        alert('فشل في تحديث الخصم');
      } finally {
        setLoading(false);
      }
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">مدير النظام</span>;
      case 'PHARMACIST': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">صيدلي</span>;
      case 'CASHIER': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">كاشير</span>;
      default: return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">{role}</span>;
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#0D1B2A] rounded-2xl border border-slate-200 dark:border-white/5">
        <Shield className="w-12 h-12 text-red-500/50 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">غير مصرح</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">هذه الصفحة متاحة لمديري النظام فقط</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px]">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-[#7C3AED]" /> إدارة المستخدمين
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">إضافة موظفين، وتحديد صلاحياتهم وحدود الخصومات</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-slate-900 dark:text-white rounded-xl text-sm font-bold transition shadow-lg shadow-[#7C3AED]/20"
        >
          <Plus size={18} /> إضافة مستخدم
        </button>
      </div>

      {success && (
        <div className="mb-6 p-3 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] rounded-xl flex items-center gap-2 text-sm">
          <Check size={16} /> {success}
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
        {users.map(user => (
          <div key={user.id} className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 rounded-2xl p-5 transition group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center text-slate-900 dark:text-white font-bold text-lg shadow-lg">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{user.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.username || 'بدون يوزر'}</p>
                </div>
              </div>
              {getRoleBadge(user.role)}
            </div>

            <div className="space-y-2 mt-auto text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-slate-500" /> الصلاحيات</span>
                <span className="text-slate-900 dark:text-white font-medium">{user.permissions?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-1.5"><Percent size={14} className="text-slate-500" /> أقصى خصم</span>
                <button 
                  onClick={() => { setEditingUser(user); setDiscountValue(user.maxDiscountLimit || 0); setShowDiscountModal(true); }}
                  className="text-[#7C3AED] hover:text-slate-900 dark:hover:text-white font-medium transition"
                >
                  {user.maxDiscountLimit || 0}%
                </button>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-1.5"><Activity size={14} className="text-slate-500" /> آخر دخول</span>
                <span className="text-slate-900 dark:text-white">منذ يومين</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
              <button 
                onClick={() => openEditModal(user)}
                className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <Edit2 size={14} /> تعديل
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                disabled={user.role === 'ADMIN'}
                className="w-9 h-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-red-500/10 text-red-400 rounded-lg transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl">
            <Users size={32} className="mx-auto mb-3 opacity-50" />
            <p>لا يوجد مستخدمين مسجلين</p>
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile only) */}
      <button 
        onClick={openAddModal}
        className="sm:hidden fixed bottom-6 left-6 w-14 h-14 bg-[#7C3AED] rounded-full shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center text-slate-900 dark:text-white z-40"
      >
        <Plus size={24} />
      </button>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#F8FAFC] dark:bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition bg-slate-100 dark:bg-white/5">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {error && (
                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">الاسم الكامل <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">اسم المستخدم (للدخول)</label>
                    <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED] dir-ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">الدور الوظيفي <span className="text-red-400">*</span></label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]">
                      <option value="CASHIER">كاشير</option>
                      <option value="PHARMACIST">صيدلي</option>
                      <option value="ADMIN">مدير</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">كلمة المرور {editingUser ? '(اترك فارغاً لعدم التغيير)' : <span className="text-red-400">*</span>}</label>
                    <div className="relative">
                      <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editingUser} className="w-full pr-10 pl-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]" />
                    </div>
                  </div>
                </div>

                {formData.role !== 'ADMIN' && (
                  <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[#7C3AED]" /> صلاحيات النظام
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PERMISSIONS_LIST.map(perm => (
                        <label key={perm.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checkedPermissions.includes(perm.key) ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30' : 'bg-[#F8FAFC] dark:bg-[#0D1117] border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10'}`}>
                          <input type="checkbox" checked={checkedPermissions.includes(perm.key)} onChange={() => togglePermission(perm.key)} className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#0D1B2A] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-[#0D1117]" />
                          <span className={`text-sm ${checkedPermissions.includes(perm.key) ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}`}>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-white/5 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-transparent border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition text-sm font-medium">إلغاء</button>
              <button type="submit" form="userForm" disabled={loading} className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-slate-900 dark:text-white rounded-xl text-sm font-bold transition shadow-lg flex justify-center items-center gap-2">
                {loading && <Loader size={16} className="animate-spin" />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Limit Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-[#F8FAFC] dark:bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">تحديد حد الخصم</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">أقصى نسبة خصم مسموحة للمستخدم <span className="font-bold text-slate-900 dark:text-white">{editingUser?.name}</span></p>
              <div className="relative">
                <Percent size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="number" 
                  min="0" max="100" 
                  value={discountValue} 
                  onChange={(e) => setDiscountValue(e.target.value)} 
                  className="w-full pr-12 pl-4 py-3 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-lg font-bold focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-white/5 flex gap-2">
              <button onClick={() => setShowDiscountModal(false)} className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-sm transition">إلغاء</button>
              <button onClick={handleDiscountSubmit} disabled={loading} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white rounded-xl text-sm font-bold transition">
                {loading ? 'جاري الحفظ...' : 'حفظ الخصم'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}