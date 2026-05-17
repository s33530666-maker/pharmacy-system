import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Search, Loader, CreditCard, CheckCircle, TrendingUp, ChevronDown, ChevronUp, Star, X, Wallet, Receipt, Gift, Calendar, Phone, User, Building, History, Percent, DollarSign, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api.js';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', { params: { search } });
      if (res.data?.success) {
        setCustomers(res.data.data);
      } else {
        setError(res.data?.error || 'فشل تحميل العملاء');
      }
    } catch (err) {
      console.error(err);
      setError('فشل تحميل العملاء');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  useEffect(() => {
    if (id) {
      setSelectedCustomerId(id);
    }
  }, [id]);

  const handleCustomerClick = (customerId) => {
    navigate(`/customers/${customerId}`);
  };

  const closeModal = () => {
    setSelectedCustomerId(null);
    navigate('/customers');
  };

  return (
    <div className="min-h-screen p-6 bg-[#F8F9FA] dark:bg-[#0F172A]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة العملاء</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">عرض حسابات العملاء وملفاتهم الشخصية</p>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map((c) => {
              const debt = parseFloat(
                c.account?.currentBalance ?? 
                c.totalDebt ?? 
                c.currentBalance ?? 
                c.balance ?? 
                0
              );
              const isMديون = debt > 0;
              
              return (
                <div
                  key={c.id}
                  onClick={() => handleCustomerClick(c.id)}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-4 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{c.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{c.phone || 'بدون رقم'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {(c.totalPoints || c.loyaltyPoints || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500" fill="currentColor" />
                            <span className="text-xs text-amber-600 dark:text-amber-400">{c.totalPoints || c.loyaltyPoints} نقطة</span>
                          </div>
                        )}
                        {c.debtLimit > 0 && (
                          <span className="text-xs text-blue-500 dark:text-blue-400">| حد الدين: {c.debtLimit.toFixed(0)} ج</span>
                        )}
                      </div>
                    </div>
                    <div className="mr-4 flex flex-col items-end gap-1">
                      {isMديون ? (
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full border border-red-200 dark:border-red-700/50 whitespace-nowrap">
                          مديون: {debt.toFixed(2)} ج
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 whitespace-nowrap">
                          ✓ مسدد
                        </span>
                      )}
                      <span className={`text-lg font-bold ${isMديون ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'}`}>
                        {debt > 0 ? `${debt.toFixed(2)} ج` : '0 ج'}
                      </span>
                      {c.debtLimit > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          متاح: {(c.debtLimit - debt).toFixed(2)} ج
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {customers.length === 0 && !loading && (
              <div className="col-span-full p-12 text-center text-gray-500 dark:text-slate-400">
                لا يوجد عملاء
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCustomerId && (
        <CustomerProfileModal
          customerId={selectedCustomerId}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function CustomerProfileModal({ customerId, onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPointsRedeemModal, setShowPointsRedeemModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [editingDebtLimit, setEditingDebtLimit] = useState(false);
  const [debtLimitValue, setDebtLimitValue] = useState('');
  const [updatingDebtLimit, setUpdatingDebtLimit] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${customerId}/profile`);
      setProfile(res.data);
    } catch (err) {
      console.error(err);
      setError('فشل تحميل الملف الشخصي');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const toggleInvoice = (id) => {
    setExpandedInvoiceId(expandedInvoiceId === id ? null : id);
  };

  const handlePaymentClick = (e, invoice) => {
    e.stopPropagation();
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedInvoiceForPayment(null);
    fetchProfile();
  };

  const handlePointsRedeemSuccess = () => {
    setShowPointsRedeemModal(false);
    fetchProfile();
  };

  const handleUpdateDebtLimit = async () => {
    const limit = parseFloat(debtLimitValue);
    if (isNaN(limit) || limit < 0) {
      setError('يرجى إدخال رقم صحيح');
      return;
    }
    try {
      setUpdatingDebtLimit(true);
      setError('');
      await api.put(`/pos/customer-ledger/${customerId}/debt-limit`, { debtLimit: limit });
      setEditingDebtLimit(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      setError('فشل تحديث حد الدين');
    } finally {
      setUpdatingDebtLimit(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Loader className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm text-center">
          <p className="text-red-500 font-bold mb-4">{error || 'حدث خطأ'}</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-slate-700 rounded-xl text-gray-800 dark:text-white">إغلاق</button>
        </div>
      </div>
    );
  }

  const { customer, account, invoices, summary, pointsHistory, debtPayments } = profile;

  const tabs = [
    { id: 'info', label: 'معلومات العميل', icon: User },
    { id: 'invoices', label: 'الفواتير', icon: Receipt },
    { id: 'points', label: 'النقاط', icon: Gift },
    { id: 'debt', label: 'المديونية', icon: Wallet },
  ];

  return (
    <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/30 shadow-inner">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{customer.name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${customer.isVip ? 'bg-amber-500 text-white' : 'bg-white/20 text-white'}`}>
                  {customer.isVip ? 'VIP' : 'عادي'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 opacity-80">
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  {customer.phone || 'لا يوجد رقم'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  منذ {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) : 'غير محدد'}
                </span>
              </div>
            </div>
            <div className="text-left">
              <div className="text-3xl font-bold text-amber-400 flex items-center gap-1">
                <Star className="w-6 h-6" fill="currentColor" />
                {customer.totalPoints || 0}
              </div>
              <p className="text-sm opacity-80">نقاط会员</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 shrink-0">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats Cards */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                  الإحصائيات
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard icon={Receipt} color="blue" label="إجمالي الفواتير" value={`${summary.totalInvoices} فاتورة`} />
                  <StatCard icon={DollarSign} color="emerald" label="إجمالي المشتريات" value={`${summary.totalSales || 0} ج`} />
                  <StatCard icon={CreditCard} color={account.totalDebt > 0 ? "red" : "gray"} label="المديونية" value={`${account.totalDebt.toFixed(2)} ج`} />
                  <StatCard icon={CheckCircle} color="emerald" label="المدفوع" value={`${account.totalPaid.toFixed(2)} ج`} />
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-violet-600" />
                  معلومات الحساب
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-500 dark:text-slate-400">الرصيد الحالي</span>
                      <span className={`font-bold ${account.currentBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {account.currentBalance > 0 ? `${account.currentBalance.toFixed(2)} ج (مستحق)` : '0 ج (مسدد)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-500 dark:text-slate-400">آخر تحديث</span>
                      <span className="text-gray-900 dark:text-white">
                        {account.lastUpdated ? new Date(account.lastUpdated).toLocaleDateString('ar-EG') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-500 dark:text-slate-400">نقاط الولاء</span>
                      <span className="font-bold text-amber-500">{customer.totalPoints || 0} نقطة</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-500 dark:text-slate-400">حد الدين الأقصى</span>
                      {editingDebtLimit ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={debtLimitValue}
                            onChange={(e) => setDebtLimitValue(e.target.value)}
                            className="w-20 px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                            placeholder="0"
                          />
                          <button
                            onClick={handleUpdateDebtLimit}
                            disabled={updatingDebtLimit}
                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingDebtLimit(false)}
                            className="text-xs px-2 py-1 text-gray-500"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-500">
                            {profile?.customer?.debtLimit > 0 ? `${profile.customer.debtLimit} ج` : 'غير محدد (مفتوح)'}
                          </span>
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={() => {
                                setDebtLimitValue(profile?.customer?.debtLimit?.toString() || '0');
                                setEditingDebtLimit(true);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-600"
                            >
                              تعديل
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {profile?.customer?.debtLimit > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-500 dark:text-slate-400">الائتمان المتاح</span>
                        <span className="font-bold text-emerald-500">
                          {Math.max(0, profile.customer.debtLimit - (account.currentBalance || 0)).toFixed(2)} ج
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">سجل الفواتير ({summary.totalInvoices})</h3>
              </div>
              
              {invoices.length === 0 ? (
                <p className="text-center text-gray-500 py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                  لا يوجد فواتير مسجلة
                </p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => {
                    const isExpanded = expandedInvoiceId === inv.id;
                    const paymentMethodLabel = 
                      (inv.paymentMethod === 'CASH' || inv.paymentMethod === 'cash') ? 'كاش' : 
                      (inv.paymentMethod === 'CREDIT' || inv.paymentMethod === 'credit') ? 'آجل' : 
                      (inv.paymentMethod === 'VISA' || inv.paymentMethod === 'visa') ? 'فيزا' : 
                      inv.paymentMethod || 'كاش';
                    return (
                      <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all">
                        <div 
                          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30"
                          onClick={() => toggleInvoice(inv.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-500 dark:text-slate-400">
                                {new Date(inv.saleDate).toLocaleDateString('ar-EG')}
                              </span>
                              <span className="text-xs text-gray-400">#{inv.id.substring(0, 8)}</span>
                            </div>
                            <div className="flex gap-2">
                              <StatusBadge status={inv.status} />
                              <span className={`text-xs px-2 py-1 rounded ${inv.paymentMethod === 'CASH' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : inv.paymentMethod === 'CREDIT' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                {paymentMethodLabel}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="font-bold text-gray-900 dark:text-white">{inv.grandTotal.toFixed(2)} ج</p>
                              {inv.status !== 'paid' && (
                                <p className="text-xs text-red-500">الباقي: {inv.remainingAmount.toFixed(2)} ج</p>
                              )}
                            </div>
                            
                            {inv.status !== 'paid' && (
                              <button 
                                onClick={(e) => handlePaymentClick(e, inv)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition shadow-sm"
                              >
                                تسجيل دفعة
                              </button>
                            )}
                            
                            <div className="text-gray-400">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-slate-700/50 p-4 bg-gray-50/50 dark:bg-slate-800/50">
                            {inv.earnedPoints > 0 && (
                              <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                                <Star size={16} fill="currentColor" />
                                <span>+{inv.earnedPoints} نقطة مكتسبة</span>
                              </div>
                            )}
                            {inv.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/30 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate block" dir="ltr" title={item.drugName}>
                                    {item.drugName}
                                  </p>
                                  {item.genericName && (
                                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate" dir="ltr" title={item.genericName}>
                                      {item.genericName}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                    الكمية: {item.quantity} × {item.unitPrice.toFixed(2)} ج
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0 mr-2">
                                  {item.totalPrice.toFixed(2)} ج
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'points' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  نقاط الولاء
                </h3>
                <button
                  onClick={() => setShowPointsRedeemModal(true)}
                  disabled={!customer.totalPoints || customer.totalPoints < 100}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
                    customer.totalPoints >= 100
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  استبدال نقاط
                </button>
              </div>

              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">رصيد النقاط الحالي</p>
                    <p className="text-4xl font-bold mt-1">{customer.totalPoints || 0}</p>
                    <p className="text-sm opacity-80 mt-2">كل 100 ج = 10 نقاط</p>
                  </div>
                  <Star className="w-16 h-16 opacity-50" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-500" />
                  سجل النقاط
                </h4>
                {pointsHistory && pointsHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {pointsHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/30 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.type === 'earned' ? 'شراء' : item.type === 'redeemed' ? 'استبدال' : 'مكافأة'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {item.invoiceId ? `فاتورة #${item.invoiceId.substring(0, 8)}` : ''} • {new Date(item.date).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <span className={`font-bold ${item.type === 'earned' ? 'text-emerald-500' : item.type === 'redeemed' ? 'text-red-500' : 'text-amber-500'}`}>
                          {item.type === 'earned' ? '+' : item.type === 'redeemed' ? '-' : '+'}{Math.abs(item.points)} نقطة
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">لا يوجد سجل نقاط</p>
                )}
              </div>

              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-3">
                  <Percent className="w-8 h-8 text-violet-600" />
                  <div>
                    <p className="font-bold text-violet-700 dark:text-violet-300">قواعد النقاط</p>
                    <p className="text-sm text-violet-600 dark:text-violet-400">كل 100 جنية مشتريات = 10 نقاط</p>
                    <p className="text-sm text-violet-600 dark:text-violet-400">100 نقطة = 10 جنية خصم</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debt' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-red-500" />
                  إدارة المديونية
                </h3>
                {account.currentBalance > 0 && (
                  <button
                    onClick={() => {
                      setSelectedInvoiceForPayment({ remainingAmount: account.currentBalance, isFullDebt: true });
                      setShowPaymentModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition"
                  >
                    سداد الدين
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-xl p-4 ${account.totalDebt > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                  <p className="text-sm text-gray-500 dark:text-slate-400">إجمالي المديونية</p>
                  <p className={`text-2xl font-bold ${account.totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {account.totalDebt.toFixed(2)} ج
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <p className="text-sm text-gray-500 dark:text-slate-400">المدفوع</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{account.totalPaid.toFixed(2)} ج</p>
                </div>
                <div className={`rounded-xl p-4 ${account.currentBalance > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                  <p className="text-sm text-gray-500 dark:text-slate-400">المستحق</p>
                  <p className={`text-2xl font-bold ${account.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {account.currentBalance > 0 ? `${account.currentBalance.toFixed(2)} ج` : '0 ج'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${account.currentBalance > 0 ? 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300' : 'bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300'}`}>
                    {account.currentBalance > 0 ? 'غير مسدد' : 'مسدد'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-500" />
                  سجل المدفوعات
                </h4>
                {debtPayments && debtPayments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {debtPayments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700/30 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.amount.toFixed(2)} ج</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {payment.note || 'سداد'} • {new Date(payment.date).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">لا يوجد مدفوعات مسجلة</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && selectedInvoiceForPayment && (
        <DebtPaymentModal 
          invoice={selectedInvoiceForPayment} 
          customerId={customerId}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoiceForPayment(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showPointsRedeemModal && (
        <PointsRedeemModal 
          customerId={customerId}
          currentPoints={customer.totalPoints || 0}
          onClose={() => setShowPointsRedeemModal(false)}
          onSuccess={handlePointsRedeemSuccess}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  const colorMap = {
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400",
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-gray-100 dark:border-slate-700/50">
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'paid') {
    return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 px-2.5 py-1 rounded-md text-xs font-bold">مسدد ✓</span>;
  }
  if (status === 'partial') {
    return <span className="bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-md text-xs font-bold">جزئي</span>;
  }
  return <span className="bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-2.5 py-1 rounded-md text-xs font-bold">غير مسدد</span>;
}

function DebtPaymentModal({ invoice, customerId, onClose, onSuccess }) {
  const [amount, setAmount] = useState(invoice.isFullDebt ? invoice.remainingAmount : (invoice.remainingAmount || invoice.grandTotal));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = invoice.isFullDebt 
        ? `/customers/${customerId}/pay-debt`
        : `/pos/customer-debts/mark-paid/${invoice.id}`;
      
      const res = await api.post(endpoint, { 
        amount: parseFloat(amount),
        method: 'CASH',
        note: note || undefined
      });
      
      if (res.data?.success) {
        onSuccess();
      } else {
        setError(res.data?.error || 'فشل تسجيل الدفع');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'حدث خطأ أثناء الدفع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117]/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          {invoice.isFullDebt ? 'سداد الدين كاملاً' : 'تسجيل دفعة'}
        </h3>
        
        <div className="mb-4 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600">
          {invoice.isFullDebt ? (
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-500 dark:text-slate-400">المبلغ المستحق:</span>
              <span className="text-red-500">{invoice.remainingAmount.toFixed(2)} ج</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-slate-400">رقم الفاتورة:</span>
                <span className="font-mono text-gray-900 dark:text-white">#{invoice.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500 dark:text-slate-400">الباقي:</span>
                <span className="text-red-500">{invoice.remainingAmount.toFixed(2)} ج</span>
              </div>
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">المبلغ</label>
          <div className="relative">
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-bold text-lg"
              autoFocus
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">ج</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">ملاحظة (اختياري)</label>
          <input 
            type="text" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة على الدفع..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition"
          >
            إلغاء
          </button>
          <button 
            onClick={handlePay}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PointsRedeemModal({ customerId, currentPoints, onClose, onSuccess }) {
  const [redeemAmount, setRedeemAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pointsValue = Math.floor(redeemAmount / 10);
  const discountValue = Math.floor(redeemAmount / 100) * 10;

  const handleRedeem = async () => {
    if (redeemAmount < 100) {
      setError('الحد الأدنى للاستبدال 100 نقطة');
      return;
    }
    
    if (redeemAmount > currentPoints) {
      setError('النقاط غير كافية');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post(`/customers/${customerId}/redeem-points`, { 
        points: parseInt(redeemAmount)
      });
      
      if (res.data?.success) {
        onSuccess();
      } else {
        setError(res.data?.error || 'فشل استبدال النقاط');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'حدث خطأ أثناء الاستبدال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117]/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 text-amber-500" />
          استبدال النقاط
        </h3>
        
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">نقاطك المتاحة:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{currentPoints} نقطة</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">عدد النقاط</label>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setRedeemAmount(Math.max(100, redeemAmount - 100))}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              <MinusIcon />
            </button>
            <input 
              type="number" 
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 text-center py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold text-lg"
            />
            <button 
              onClick={() => setRedeemAmount(Math.min(currentPoints, redeemAmount + 100))}
              disabled={redeemAmount >= currentPoints}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              <PlusIcon />
            </button>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>100 نقطة = 10 ج</span>
            <span>الخصم: {discountValue} جنية</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition"
          >
            إلغاء
          </button>
          <button 
            onClick={handleRedeem}
            disabled={loading || redeemAmount < 100}
            className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : `استبدال (${discountValue} ج خصم)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function MinusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}