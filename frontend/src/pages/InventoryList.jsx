import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Save, 
  Loader, 
  CheckCircle, 
  XCircle,
  ToggleLeft,
  ToggleRight,
  Calculator,
  RefreshCw
} from 'lucide-react';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const LOW_STOCK_THRESHOLD = 10;
const EXPIRING_DAYS_THRESHOLD = 90;

const InventoryPage = () => {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dosageFormFilter, setDosageFormFilter] = useState('');
  const [stockTakingMode, setStockTakingMode] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [physicalCounts, setPhysicalCounts] = useState({});
  const [previousPhysicalCounts, setPreviousPhysicalCounts] = useState({});
  
  const physicalInputRefs = useRef({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, dosageFormFilter]);

  const fetchDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/drugs', {
        params: {
          page: currentPage,
          limit: 50,
          search: debouncedSearch,
          form: dosageFormFilter || undefined,
        }
      });
      const drugsArray = Array.isArray(response.data?.data) ? response.data.data : 
                        Array.isArray(response.data) ? response.data : [];
      setDrugs(drugsArray);

      if (response.data?.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching drugs:', err);
      setError('فشل تحميل بيانات المخزون');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, dosageFormFilter]);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs]);

  useAutoRefresh(fetchDrugs, 15000);

  const dosageForms = useMemo(() => {
    const forms = [...new Set(drugs.map(d => d.dosageForm).filter(Boolean))];
    return forms.sort();
  }, [drugs]);

  const stats = useMemo(() => {
    const totalValue = drugs.reduce((sum, drug) => {
      const qty = drug.totalStock || 0;
      const cost = drug.costPrice || 0;
      return sum + (qty * cost);
    }, 0);

    const lowStockCount = drugs.filter(drug => 
      (drug.totalStock || 0) <= LOW_STOCK_THRESHOLD
    ).length;

    const expiringSoonCount = drugs.filter(drug => {
      if (!drug.expiryDate) return false;
      const expiry = new Date(drug.expiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= EXPIRING_DAYS_THRESHOLD;
    }).length;

    return {
      totalValue,
      lowStockCount,
      expiringSoonCount,
      totalItems: drugs.length,
      totalQuantity: drugs.reduce((sum, d) => sum + (d.totalStock || 0), 0)
    };
  }, [drugs]);

  const handlePhysicalCountChange = useCallback((drugId, value) => {
    const numericValue = value === '' ? '' : parseInt(value, 10);
    setPhysicalCounts(prev => ({
      ...prev,
      [drugId]: numericValue
    }));
  }, []);

  const calculateVariance = useCallback((drug) => {
    const systemQty = drug.totalStock || 0;
    const physicalQty = physicalCounts[drug.id];
    if (physicalQty === '' || physicalQty === null || isNaN(physicalQty)) {
      return null;
    }
    return physicalQty - systemQty;
  }, [physicalCounts]);

  const handleKeyDown = useCallback((e, drugId, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      const nextDrug = drugs[nextIndex];
      if (nextDrug && physicalInputRefs.current[nextDrug.id]) {
        physicalInputRefs.current[nextDrug.id].focus();
      }
    }
  }, [drugs]);

  const handleSaveAdjustments = useCallback(async () => {
    const adjustments = drugs
      .map(drug => {
        const variance = calculateVariance(drug);
        if (variance !== null) {
          return {
            drugId: drug.id,
            systemQty: parseInt(drug.totalStock || 0, 10),
            physicalQty: parseInt(physicalCounts[drug.id], 10),
            variance: parseInt(variance, 10)
          };
        }
        return null;
      })
      .filter(item => item !== null && item.variance !== 0);

    if (adjustments.length === 0) {
      setError('لا توجد تعديلات للحفظ');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/drugs/adjust', { adjustments });
      setSuccess('تم حفظ التسوية بنجاح');
      setPhysicalCounts({});
      setPreviousPhysicalCounts(prev => ({ ...prev, ...physicalCounts }));
      setStockTakingMode(false);
      fetchDrugs();

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error saving adjustments:', err);
      setError(err.response?.data?.error || 'فشل حفظ التسوية');
    } finally {
      setSaving(false);
    }
  }, [drugs, physicalCounts, calculateVariance, fetchDrugs]);

  const toggleStockTakingMode = useCallback(() => {
    if (!stockTakingMode) {
      const initialCounts = {};
      drugs.forEach(drug => {
        initialCounts[drug.id] = drug.totalStock || 0;
      });
      setPhysicalCounts(initialCounts);
    } else {
      setPhysicalCounts({});
    }
    setStockTakingMode(!stockTakingMode);
  }, [stockTakingMode, drugs]);

  const resetPhysicalCounts = useCallback(() => {
    const initialCounts = {};
    drugs.forEach(drug => {
      initialCounts[drug.id] = drug.totalStock || 0;
    });
    setPhysicalCounts(initialCounts);
  }, [drugs]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG');
    } catch {
      return dateStr;
    }
  };

  const getVarianceColor = (variance) => {
    if (variance === null) return '';
    if (variance < 0) return 'text-red-600 dark:text-red-400';
    if (variance > 0) return 'text-green-600 dark:text-green-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  const getVarianceBgColor = (variance) => {
    if (variance === null) return '';
    if (variance < 0) return 'bg-red-50 dark:bg-red-900/20';
    if (variance > 0) return 'bg-green-50 dark:bg-green-900/20';
    return '';
  };

  const modifiedCount = useMemo(() => {
    return drugs.filter(drug => {
      const variance = calculateVariance(drug);
      return variance !== null && variance !== 0;
    }).length;
  }, [drugs, calculateVariance]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              جرد المخزن وتسوية الأرصدة
            </h1>
          </div>
          
          <button
            type="button"
            onClick={toggleStockTakingMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              stockTakingMode 
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {stockTakingMode ? (
              <ToggleRight className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ToggleLeft className="w-5 h-5" aria-hidden="true" />
            )}
            {stockTakingMode ? 'وضع الجرد نشط' : 'تفعيل وضع الجرد'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm flex items-center gap-2" role="status">
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">إجمالي قيمة المخزن</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                  {formatCurrency(stats.totalValue)} ج.م
                </p>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 text-xs text-blue-600 dark:text-blue-400">
              {stats.totalItems} صنف · {stats.totalQuantity} وحدة
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">نواقص المخزون</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">
                  {stats.lowStockCount}
                </p>
              </div>
              <div className="p-3 bg-red-200 dark:bg-red-800 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700 text-xs text-red-600 dark:text-red-400">
              أقل من {LOW_STOCK_THRESHOLD} وحدة
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">صلاحية وشيكة</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1">
                  {stats.expiringSoonCount}
                </p>
              </div>
              <div className="p-3 bg-amber-200 dark:bg-amber-800 rounded-full">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700 text-xs text-amber-600 dark:text-amber-400">
              خلال {EXPIRING_DAYS_THRESHOLD} يوم
            </div>
          </div>
        </div>

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-xl shadow-[var(--md-shadow-1)] p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <label htmlFor="inventory-search" className="sr-only">بحث</label>
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="inventory-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو الباركود..."
                  className="w-full pe-10 ps-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <label htmlFor="dosage-form-filter" className="sr-only">تصفية بالشكل الصيدلاني</label>
              <select
                id="dosage-form-filter"
                value={dosageFormFilter}
                onChange={(e) => setDosageFormFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">كل الأشكال الصيدلانية</option>
                {dosageForms.map(form => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>عدد النتائج: {totalItems}</span>
            </div>

            {stockTakingMode && (
              <button
                type="button"
                onClick={resetPhysicalCounts}
                className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                إعادة تعيين
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]" role="grid">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                <tr>
<th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">الباركود</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 w-full min-w-0">اسم药业</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">الشكل الصيدلاني</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">تاريخ الانتهاء</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">سعر التكلفة</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">سعر البيع</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">رصيد النظام</th>
                  {stockTakingMode && (
                    <>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">الكمية الفعلية</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">العجز/الزيادة</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading && drugs.length === 0 ? (
                  <tr>
                    <td colSpan={stockTakingMode ? 9 : 7} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                        <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />
                        جاري التحميل...
                      </div>
                    </td>
                  </tr>
                ) : drugs.length === 0 ? (
                  <tr>
                    <td colSpan={stockTakingMode ? 9 : 7} className="px-4 py-8 text-center text-slate-600 dark:text-slate-400">
                      لا توجد أدوية
                    </td>
                  </tr>
                ) : (
                  drugs.map((drug, index) => {
                    const variance = calculateVariance(drug);
                    const hasDiscrepancy = variance !== null && variance !== 0;
                    
                    return (
                      <tr 
                        key={drug.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
                          hasDiscrepancy ? getVarianceBgColor(variance) : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                            {drug.barcode || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-full min-w-0">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={drug.name}>{drug.name}</p>
                            {drug.arabicName && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={drug.arabicName}>{drug.arabicName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {drug.dosageForm || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${
                            drug.expiryDate ? (() => {
                              const expiry = new Date(drug.expiryDate);
                              const now = new Date();
                              const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                              if (days <= 30) return 'text-red-600 dark:text-red-400 font-semibold';
                              if (days <= 90) return 'text-amber-600 dark:text-amber-400';
                              return 'text-slate-700 dark:text-slate-300';
                            })() : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {formatDate(drug.expiryDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {formatCurrency(drug.costPrice)} ج.م
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {formatCurrency(drug.sellPrice)} ج.م
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${
                            (drug.totalStock || 0) <= LOW_STOCK_THRESHOLD 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-slate-900 dark:text-white'
                          }`}>
                            {drug.totalStock || 0}
                          </span>
                        </td>
                        {stockTakingMode && (
                          <>
                            <td className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20">
                              <label htmlFor={`physical-${drug.id}`} className="sr-only">
                                الكمية الفعلية لـ {drug.name}
                              </label>
                              <input
                                id={`physical-${drug.id}`}
                                ref={(el) => { physicalInputRefs.current[drug.id] = el; }}
                                type="number"
                                min="0"
                                value={physicalCounts[drug.id] === undefined ? '' : physicalCounts[drug.id]}
                                onChange={(e) => handlePhysicalCountChange(drug.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, drug.id, index)}
                                className="w-20 px-2 py-1 text-sm border border-amber-300 dark:border-amber-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20">
                              {variance !== null ? (
                                <span className={`text-sm font-bold ${getVarianceColor(variance)}`}>
                                  {variance > 0 ? '+' : ''}{variance}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 mb-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              السابق
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              التالي
            </button>
          </div>
        )}

        {stockTakingMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Calculator className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <span className="font-medium">وضع الجرد نشط</span>
              </div>
              
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-600"></div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">عدد التعديلات:</span>
                <span className={`font-bold ${
                  modifiedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {modifiedCount}
                </span>
              </div>
              
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-600"></div>
              
              <button
                type="button"
                onClick={toggleStockTakingMode}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium"
              >
                إلغاء
              </button>
              
              <button
                type="button"
                onClick={handleSaveAdjustments}
                disabled={saving || modifiedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" aria-hidden="true" />
                    حفظ التسوية
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;