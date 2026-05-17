import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  AlertCircle, Plus, Trash2, Search, Loader, RefreshCw, AlertTriangle, 
  Package, RotateCcw, X, Check, Calendar, Activity, Download, UploadCloud 
} from 'lucide-react';
import api from '../../utils/api';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PAGE_SIZE = 20;

const REASONS = [
  { value: 'EXPIRED', label: 'منتهي الصلاحية' },
  { value: 'DAMAGED', label: 'تالف/مكسور' },
  { value: 'STOLEN', label: 'سرقة/مفقود' },
  { value: 'OTHER', label: 'أخرى' },
];

export default function DamagedDrugsPage() {
  const [activeTab, setActiveTab] = useState('damaged'); // damaged, expired, report

  // Damaged Tab State
  const [damagedHistory, setDamagedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [pagination, setPagination] = useState({ offset: 0, total: 0, totalPages: 0 });
  const [restoringId, setRestoringId] = useState(null);

  // Expired Tab State
  const [expiredDrugs, setExpiredDrugs] = useState([]);
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [selectedExpired, setSelectedExpired] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drugSearchResults, setDrugSearchResults] = useState([]);
  const [drugSearchLoading, setDrugSearchLoading] = useState(false);
  const [formData, setFormData] = useState({ quantity: '', reason: 'DAMAGED', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const searchInputRef = useRef(null);

  // Stats
  const totalDamagedQty = damagedHistory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalLoss = damagedHistory.reduce((sum, item) => sum + (item.costLoss || 0), 0);

  // --- Data Fetching ---

  const fetchDamaged = useCallback(async (opts = {}) => {
    const { forceRefetch = false } = opts;
    if (forceRefetch) setRefreshing(true);
    else setLoading(true);

    try {
      setError('');
      const search = opts.search || historySearch;
      const res = await api.get(`/damaged?limit=${PAGE_SIZE}&offset=${pagination.offset}&search=${encodeURIComponent(search)}`);

      if (res.data?.success) {
        setDamagedHistory(res.data.data || []);
        setPagination(res.data.pagination || { offset: 0, total: 0, totalPages: 0 });
      }
    } catch (err) {
      console.error('[fetchDamaged]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.offset, historySearch]);

  const fetchExpiredDrugs = useCallback(async () => {
    setLoadingExpired(true);
    try {
      // Assuming /drugs endpoint returns all drugs or we could have a specific endpoint. 
      // We will fetch all drugs and filter client side for now.
      const res = await api.get('/drugs');
      const allDrugs = res.data?.data || res.data || [];
      
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      const expiring = allDrugs.filter(d => {
        if (!d.expiryDate || d.stock <= 0) return false;
        const expDate = new Date(d.expiryDate);
        return expDate <= ninetyDaysFromNow;
      });

      // Sort by expiry date ascending
      expiring.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      setExpiredDrugs(expiring);
    } catch (err) {
      console.error('[fetchExpiredDrugs]', err);
    } finally {
      setLoadingExpired(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'damaged' || activeTab === 'report') {
      fetchDamaged({ search: historySearch });
    }
    if (activeTab === 'expired' || activeTab === 'report') {
      fetchExpiredDrugs();
    }
  }, [activeTab, pagination.offset]);

  const searchDrugs = useCallback(async (query) => {
    if (!query.trim() || query.trim().length < 2) {
      setDrugSearchResults([]);
      return;
    }
    setDrugSearchLoading(true);
    try {
      const res = await api.get(`/drugs/search?q=${encodeURIComponent(query.trim())}`);
      const drugsData = res.data?.data || [];
      setDrugSearchResults(drugsData.slice(0, 10));
    } catch (err) {
      console.error('[searchDrugs]', err);
      setDrugSearchResults([]);
    } finally {
      setDrugSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchDrugs(searchQuery);
      else setDrugSearchResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchDrugs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'damaged' || activeTab === 'report') {
        fetchDamaged({ search: historySearch, forceRefetch: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [historySearch, activeTab]);

  // --- Handlers ---

  const handleOpenModal = (drug) => {
    setSelectedDrug(drug);
    setFormData({ quantity: '', reason: 'DAMAGED', notes: '' });
    setSearchQuery('');
    setDrugSearchResults([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDrug(null);
    setFormData({ quantity: '', reason: '', notes: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.quantity || !formData.reason) {
      setError('يرجى استكمال جميع الحقول المطلوبة');
      return;
    }
    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty <= 0 || qty > selectedDrug.stock) {
      setError(`الكمية يجب أن تكون بين 1 و${selectedDrug.stock}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/damaged', {
        drugId: selectedDrug.id,
        quantity: Number(qty),
        reason: formData.reason,
        notes: formData.notes || undefined,
      });

      if (res.data?.success) {
        setSuccess('تم تسجيل التالف بنجاح!');
        handleCloseModal();
        await fetchDamaged({ forceRefetch: true });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.data?.error || 'فشل تسجيل التالف');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'فشل تسجيل التالف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (damagedId) => {
    if (!window.confirm('هل أنت متأكد من استعادة هذا العنصر؟ سيتم إضافة الكمية مرة أخرى للمخزون.')) return;

    try {
      setRestoringId(damagedId);
      const res = await api.delete(`/damaged/${damagedId}`);
      if (res.data?.success) {
        setSuccess('تم استعادة العنصر بنجاح!');
        await fetchDamaged({ forceRefetch: true });
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'فشل استعادة العنصر');
    } finally {
      setRestoringId(null);
    }
  };

  const moveToDamagedBulk = async () => {
    if (selectedExpired.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من نقل ${selectedExpired.length} صنف إلى التالف؟`)) return;

    setLoadingExpired(true);
    let successCount = 0;
    try {
      for (const id of selectedExpired) {
        const drug = expiredDrugs.find(d => d.id === id);
        if (drug) {
          await api.post('/damaged', {
            drugId: drug.id,
            quantity: drug.stock,
            reason: 'EXPIRED',
            notes: 'نقل تلقائي من قائمة المنتهي',
          });
          successCount++;
        }
      }
      setSuccess(`تم نقل ${successCount} صنف إلى التالف بنجاح`);
      setSelectedExpired([]);
      fetchExpiredDrugs();
      fetchDamaged();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('حدث خطأ أثناء نقل بعض الأصناف');
    } finally {
      setLoadingExpired(false);
    }
  };

  const exportLossReport = () => {
    const data = damagedHistory.map(item => ({
      'اسم الدواء': item.drug?.name || '-',
      'الباركود': item.drug?.barcode || '-',
      'الكمية': item.quantity,
      'السبب': REASONS.find(r => r.value === item.reason)?.label || item.reason,
      'قيمة الخسارة': item.costLoss || 0,
      'التاريخ': new Date(item.createdAt).toLocaleDateString('ar-EG'),
      'ملاحظات': item.notes || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير التوالف");
    XLSX.writeFile(wb, `Loss_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Formatting ---

  const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);

  const getReasonBadge = (reason) => {
    if (reason === 'EXPIRED') return <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded-full border border-red-500/20">منتهي الصلاحية</span>;
    if (reason === 'DAMAGED') return <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs font-medium rounded-full border border-orange-500/20">تالف/مكسور</span>;
    if (reason === 'STOLEN') return <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-full border border-purple-500/20">سرقة/مفقود</span>;
    return <span className="px-2 py-1 bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-medium rounded-full border border-slate-500/20">أخرى</span>;
  };

  const getExpiryStatus = (date) => {
    if (!date) return null;
    const today = new Date();
    const expDate = new Date(date);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'منتهي الصلاحية', indicator: '🔴' };
    if (diffDays <= 30) return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: `ينتهي خلال ${diffDays} يوم`, indicator: '🟡' };
    return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: `ينتهي خلال ${diffDays} يوم`, indicator: '🟠' };
  };

  // --- Charts Data ---
  const pieData = useMemo(() => {
    const counts = {};
    damagedHistory.forEach(item => {
      counts[item.reason] = (counts[item.reason] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: REASONS.find(r => r.value === key)?.label || key,
      value: counts[key]
    }));
  }, [damagedHistory]);
  
  const COLORS = ['#EF4444', '#F59E0B', '#8B5CF6', '#64748B'];

  if (loading && activeTab === 'damaged' && damagedHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <Loader className="animate-spin text-[#7C3AED] mb-4" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-[#F1F5F9] p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Stats Cards (Height 80px) */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">إدارة التالف والمنتهي</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">تتبع الخسائر، الأدوية التالفة، ومنتهية الصلاحية</p>
            </div>
          </div>
        </div>

        {/* 2 Compact Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#0D1B2A] border border-red-500/20 rounded-2xl p-4 h-[80px] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">إجمالي التالف (وحدات)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{totalDamagedQty}</p>
                  <span className="text-sm text-red-400 font-medium border-r border-slate-200 dark:border-white/10 pr-2">{formatCurrency(totalLoss)} خسارة</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0D1B2A] border border-orange-500/20 rounded-2xl p-4 h-[80px] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Calendar size={24} className="text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">منتهي الصلاحية (قريباً)</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{expiredDrugs.length} <span className="text-sm text-orange-400 font-normal">صنف بحاجة لمراجعة</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-sm text-emerald-400">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-px">
          <button
            onClick={() => setActiveTab('damaged')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'damaged' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-white/20'}`}
          >
            سجل التالف
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'expired' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-white/20'}`}
          >
            منتهي الصلاحية
            {expiredDrugs.length > 0 && (
              <span className="bg-orange-500 text-slate-900 dark:text-white text-[10px] px-1.5 py-0.5 rounded-full">{expiredDrugs.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'report' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:border-white/20'}`}
          >
            تقرير الخسائر
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg min-h-[500px]">
          
          {/* TAB 1: DAMAGED */}
          {activeTab === 'damaged' && (
            <div className="p-5 space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative w-full md:w-96 z-10">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="ابحث لإضافة تالف (الاسم أو الباركود)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-[#7C3AED]/30 rounded-xl text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] text-slate-900 dark:text-white placeholder-slate-500"
                  />
                  {searchQuery.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {drugSearchLoading ? (
                        <div className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-sm">جاري البحث...</div>
                      ) : drugSearchResults.length > 0 ? (
                        drugSearchResults.map((drug) => (
                          <button
                            key={drug.id}
                            onClick={() => handleOpenModal(drug)}
                            className="w-full text-right px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/5 border-b border-slate-200 dark:border-white/5 last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">{drug.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{drug.barcode || 'لا يوجد باركود'}</p>
                            </div>
                            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg">المتاح: {drug.stock}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-sm">لا توجد نتائج</div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                    <input
                      type="text"
                      placeholder="تصفية السجل..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pr-9 pl-4 py-2 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <button onClick={() => fetchDamaged({ forceRefetch: true })} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl transition">
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-white/5 rounded-xl">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 dark:bg-[#1B2A3B]/50 border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 font-medium w-full min-w-0">اسم الدواء</th>
                      <th className="px-4 py-3 font-medium">الباركود</th>
                      <th className="px-4 py-3 font-medium text-center">الكمية</th>
                      <th className="px-4 py-3 font-medium text-center">السبب</th>
                      <th className="px-4 py-3 font-medium text-center">الخسارة</th>
                      <th className="px-4 py-3 font-medium text-center">التاريخ</th>
                      <th className="px-4 py-3 font-medium text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {damagedHistory.length > 0 ? (
                      damagedHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] h-12 transition-colors">
                          <td className="px-4 w-full min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.drug?.name || 'غير متاح'}>{item.drug?.name || 'غير متاح'}</p>
                          </td>
                          <td className="px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{item.drug?.barcode || '-'}</td>
                          <td className="px-4 text-center">
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-xs font-bold">{item.quantity}</span>
                          </td>
                          <td className="px-4 text-center">{getReasonBadge(item.reason)}</td>
                          <td className="px-4 text-center font-bold text-red-400">{formatCurrency(item.costLoss || 0)}</td>
                          <td className="px-4 text-center text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</td>
                          <td className="px-4 text-center">
                            <button
                              onClick={() => handleRestore(item.id)}
                              disabled={restoringId === item.id}
                              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                            >
                              {restoringId === item.id ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                              استعادة
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">{historySearch ? 'لا توجد نتائج' : 'لا توجد سجلات تالف'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: EXPIRED (NEW) */}
          {activeTab === 'expired' && (
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">الأدوية المنتهية الصلاحية أو التي ستنتهي خلال 90 يوماً</p>
                <div className="flex gap-2">
                  <button 
                    onClick={fetchExpiredDrugs} 
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl transition"
                    title="تحديث"
                  >
                    <RefreshCw size={18} className={loadingExpired ? 'animate-spin' : ''} />
                  </button>
                  {selectedExpired.length > 0 && (
                    <button 
                      onClick={moveToDamagedBulk}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition flex items-center gap-2"
                    >
                      <Trash2 size={16} /> نقل المحدد للتالف ({selectedExpired.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-white/5 rounded-xl">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 dark:bg-[#1B2A3B]/50 border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 text-center w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 dark:border-white/20 bg-transparent text-[#7C3AED]"
                          checked={selectedExpired.length === expiredDrugs.length && expiredDrugs.length > 0}
                          onChange={(e) => setSelectedExpired(e.target.checked ? expiredDrugs.map(d => d.id) : [])}
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">اسم الدواء</th>
                      <th className="px-4 py-3 font-medium text-center">الكمية المتاحة</th>
                      <th className="px-4 py-3 font-medium text-center">تاريخ الانتهاء</th>
                      <th className="px-4 py-3 font-medium text-center">الحالة</th>
                      <th className="px-4 py-3 font-medium text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {loadingExpired ? (
                      <tr><td colSpan="6" className="px-4 py-12 text-center"><Loader className="animate-spin mx-auto text-orange-400" /></td></tr>
                    ) : expiredDrugs.length > 0 ? (
                      expiredDrugs.map((drug) => {
                        const status = getExpiryStatus(drug.expiryDate);
                        return (
                          <tr key={drug.id} className="hover:bg-white/[0.02] h-12 transition-colors">
                            <td className="px-4 text-center">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 dark:border-white/20 bg-transparent text-[#7C3AED]"
                                checked={selectedExpired.includes(drug.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedExpired([...selectedExpired, drug.id]);
                                  else setSelectedExpired(selectedExpired.filter(id => id !== drug.id));
                                }}
                              />
                            </td>
                            <td className="px-4 font-medium text-slate-900 dark:text-white" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={drug.name}>{drug.name}</td>
                            <td className="px-4 text-center">
                              <span className="bg-slate-500/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold border border-slate-200 dark:border-white/5">{drug.stock}</span>
                            </td>
                            <td className="px-4 text-center font-mono text-xs">{new Date(drug.expiryDate).toLocaleDateString('ar-EG')}</td>
                            <td className="px-4 text-center">
                              {status && (
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border flex items-center justify-center gap-1 w-max mx-auto ${status.bg} ${status.color} ${status.border}`}>
                                  {status.indicator} {status.text}
                                </span>
                              )}
                            </td>
                            <td className="px-4 text-center">
                              <button
                                onClick={() => {
                                  setSelectedDrug(drug);
                                  setFormData({ quantity: drug.stock, reason: 'EXPIRED', notes: 'نقل من قائمة المنتهي' });
                                  setShowModal(true);
                                }}
                                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 mx-auto"
                              >
                                <Trash2 size={12} /> للتالف
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">لا توجد أدوية منتهية أو قريبة الانتهاء</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REPORT (NEW) */}
          {activeTab === 'report' && (
            <div className="p-5 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">إحصائيات وتقارير الخسائر</h3>
                <button 
                  onClick={exportLossReport}
                  className="px-4 py-2 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  <Download size={16} /> تصدير Excel
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reason Breakdown Pie Chart */}
                <div className="bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/5 rounded-2xl p-4 h-80">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 text-center">توزيع التوالف حسب السبب</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #0D1B2A)', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#F1F5F9' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Info */}
                <div className="bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col justify-center space-y-6">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">إجمالي الخسائر المادية</p>
                    <p className="text-3xl font-bold text-red-400">{formatCurrency(totalLoss)}</p>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-white/5 w-full"></div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">إجمالي الوحدات التالفة</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalDamagedQty} وحدة</p>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-white/5 w-full"></div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    يعتمد التقرير على السجلات المسجلة في نظام التوالف. تأكد من جرد الأدوية المنتهية بشكل دوري ونقلها للتالف لحساب الخسائر بدقة.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add Damaged Modal */}
      {showModal && selectedDrug && (
        <div className="fixed inset-0 bg-[#F8FAFC] dark:bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 className="text-red-400" size={20} /> إضافة للتالف
              </h3>
              <button onClick={handleCloseModal} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 p-4 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/5 rounded-xl">
              <p className="font-medium text-slate-900 dark:text-white">{selectedDrug.name}</p>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{selectedDrug.barcode || '-'}</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg text-xs font-bold">المتاح: {selectedDrug.stock}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">الكمية التالفة</label>
                <input
                  type="number"
                  min="1"
                  max={selectedDrug.stock}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="أدخل الكمية"
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  required
                />
                {formData.quantity && (
                  <p className="text-xs text-red-400 mt-1.5">
                    قيمة الخسارة المتوقعة: {formatCurrency((selectedDrug.costPrice || 0) * parseInt(formData.quantity || 0))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">السبب</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  required
                >
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">ملاحظات (اختياري)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="سبب التلف أو ملاحظات أخرى..."
                  rows="2"
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED] resize-none"
                />
              </div>

              {/* Fake Photo Upload UI */}
              <div>
                 <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">صورة التالف (اختياري)</label>
                 <div className="w-full border border-dashed border-slate-300 dark:border-white/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition">
                   <UploadCloud size={20} className="text-slate-500 dark:text-slate-400" />
                   <span className="text-xs text-slate-500 dark:text-slate-400">انقر لرفع صورة</span>
                 </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-2.5 bg-transparent border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition">
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-slate-900 dark:text-white rounded-xl font-medium transition flex justify-center items-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  نقل للتالف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}