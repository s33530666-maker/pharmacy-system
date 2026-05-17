import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ScanBarcode, Package, AlertTriangle, CheckCircle, RefreshCw, X, Search, Loader, ChevronDown } from 'lucide-react';
import api from '../utils/api.js';

const MAX_AUDIT_ENTRIES = 500;

const InventoryAudit = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedDrug, setScannedDrug] = useState(null);
  const [actualQty, setActualQty] = useState('');
  const [auditResults, setAuditResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDrugPicker, setShowDrugPicker] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allDrugs, setAllDrugs] = useState([]);
  const [drugPickerSearch, setDrugPickerSearch] = useState('');
  const barcodeInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadAuditHistory();
  }, []);

  const loadAuditHistory = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('inventoryAuditResults') || '[]');
      setAuditResults(saved);
    } catch (e) {
      setAuditResults([]);
    }
  }, []);

  const getAllDrugs = useCallback(async () => {
    if (allDrugs.length > 0) return allDrugs;
    try {
      setLoading(true);
      const response = await api.get('/drugs');
      const drugs = response.data?.data || [];
      setAllDrugs(drugs);
      return drugs;
    } catch (err) {
      console.error('Error fetching drugs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [allDrugs.length]);

  const findDrugByBarcode = useCallback(async (barcode) => {
    const drugs = await getAllDrugs();
    return drugs.find(d => d.barcode === barcode || d.bagNumber === barcode) || null;
  }, [getAllDrugs]);

  const handleBarcodeScan = useCallback(async (barcode) => {
    if (!barcode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const drug = await findDrugByBarcode(barcode.trim());
      if (drug) {
        setScannedDrug(drug);
        setActualQty(String(drug.totalStock || 0));
        setShowModal(true);
      } else {
        setError('مفيش دواء بالباركود ده!');
      }
    } catch (err) {
      setError('حدث خطأ في البحث');
    } finally {
      setLoading(false);
    }
  }, [findDrugByBarcode]);

  const handleBarcodeChange = useCallback((e) => {
    setBarcodeInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (e.target.value.trim().length >= 3) {
        handleBarcodeScan(e.target.value);
      }
    }, 400);
  }, [handleBarcodeScan]);

  const submitAudit = useCallback(() => {
    const parsed = parseInt(actualQty, 10);
    if (!scannedDrug || isNaN(parsed) || parsed < 0) return;

    const expectedQty = scannedDrug.totalStock || 0;
    const discrepancy = parsed - expectedQty;

    const auditEntry = {
      id: Date.now(),
      drugId: scannedDrug.id,
      barcode: scannedDrug.barcode,
      drugName: scannedDrug.name,
      arabicName: scannedDrug.arabicName,
      expectedQty,
      actualQty: parsed,
      discrepancy,
      status: discrepancy === 0 ? 'matched' : discrepancy > 0 ? 'overage' : 'shortage',
      auditedAt: new Date().toISOString(),
    };

    let updated = [auditEntry, ...auditResults].slice(0, MAX_AUDIT_ENTRIES);
    setAuditResults(updated);
    try {
      localStorage.setItem('inventoryAuditResults', JSON.stringify(updated));
    } catch (e) {
      const trimmed = [auditEntry];
      setAuditResults(trimmed);
      localStorage.setItem('inventoryAuditResults', JSON.stringify(trimmed));
    }
    setShowModal(false);
    setScannedDrug(null);
    setActualQty('');
  }, [scannedDrug, actualQty, auditResults]);

  const syncStock = useCallback(async (auditId) => {
    const entry = auditResults.find(a => a.id === auditId);
    if (!entry) return;

    setLoading(true);
    try {
      await api.post('/reports/audit-stock', { drugId: entry.drugId, newStock: entry.actualQty });

      const updated = auditResults.map(a =>
        a.id === auditId ? { ...a, synced: true, syncedAt: new Date().toISOString() } : a
      );
      setAuditResults(updated);
      localStorage.setItem('inventoryAuditResults', JSON.stringify(updated));
      setAllDrugs([]);
    } catch (err) {
      setError('فشل تحديث المخزون');
    } finally {
      setLoading(false);
    }
  }, [auditResults]);

  const clearHistory = useCallback(() => {
    if (!window.confirm('تمسح كل سجلات الجرد؟')) return;
    setAuditResults([]);
    localStorage.setItem('inventoryAuditResults', '[]');
  }, []);

  const openDrugPicker = useCallback(async () => {
    setDrugPickerSearch('');
    setLoading(true);
    try {
      const drugs = await getAllDrugs();
      setShowDrugPicker(true);
    } catch (err) {
      setError('فشل تحميل الأدوية');
    } finally {
      setLoading(false);
    }
  }, [getAllDrugs]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setScannedDrug(null);
    setActualQty('');
    setError('');
  }, []);

  const closeDrugPicker = useCallback(() => {
    setShowDrugPicker(false);
    setDrugPickerSearch('');
  }, []);

  const selectDrugFromPicker = useCallback((drug) => {
    setScannedDrug(drug);
    setActualQty(String(drug.totalStock || 0));
    setShowDrugPicker(false);
    setShowModal(true);
  }, []);

  const filteredDrugPicker = useMemo(() => {
    if (!drugPickerSearch.trim()) return allDrugs.slice(0, 50);
    const term = drugPickerSearch.toLowerCase();
    return allDrugs.filter(d =>
      d.name?.toLowerCase().includes(term) ||
      d.arabicName?.toLowerCase().includes(term) ||
      d.barcode?.includes(term) ||
      d.genericName?.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [allDrugs, drugPickerSearch]);

  const filteredResults = useMemo(() => {
    if (!searchInput.trim()) return auditResults;
    return auditResults.filter(a =>
      a.drugName?.toLowerCase().includes(searchInput.toLowerCase()) ||
      a.arabicName?.toLowerCase().includes(searchInput.toLowerCase()) ||
      a.barcode?.includes(searchInput)
    );
  }, [auditResults, searchInput]);

  const stats = useMemo(() => {
    const shortages = auditResults.filter(a => a.discrepancy < 0).length;
    const overages = auditResults.filter(a => a.discrepancy > 0).length;
    const matched = auditResults.filter(a => a.discrepancy === 0).length;
    return { shortages, overages, matched };
  }, [auditResults]);

  const calculatedDiscrepancy = useMemo(() => {
    const parsed = parseInt(actualQty, 10);
    if (!scannedDrug || isNaN(parsed) || parsed < 0) return 0;
    return parsed - (scannedDrug.totalStock || 0);
  }, [scannedDrug, actualQty]);

  const getDiscrepancyClass = (discrepancy) => {
    if (discrepancy < 0) return 'text-red-600 dark:text-red-400';
    if (discrepancy > 0) return 'text-green-600 dark:text-green-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  const getStatusBadge = (status) => {
    if (status === 'matched') return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
    if (status === 'overage') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
  };

  const getStatusText = (status) => {
    if (status === 'matched') return 'مطابق';
    if (status === 'overage') return 'زيادة';
    return 'عجز';
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG');
    } catch {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ScanBarcode className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            جرد المخزن
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-[var(--md-radius-md)] text-red-700 dark:text-red-400 text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">امسح الباركود</h2>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <label htmlFor="barcode-scan" className="sr-only">مسح الباركود</label>
              <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
              <input
                id="barcode-scan"
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={handleBarcodeChange}
                placeholder="امسح أو اكتب الباركود..."
                className="w-full pe-12 ps-4 py-3 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-slate-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={openDrugPicker}
              disabled={loading}
              className="px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-2"
              aria-label="اختيار دواء يدوي"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" aria-hidden="true" /> : <ChevronDown className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            سيتم البحث تلقائياً بعد 3 حروف أو اضغط Enter
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">عجز</p>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-300 mt-1">{stats.shortages}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">مطابق</p>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-300 mt-1">{stats.matched}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">زيادة</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-300 mt-1">{stats.overages}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <label htmlFor="audit-search" className="sr-only">بحث في السجلات</label>
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="audit-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ابحث باسم الدواء أو الباركود..."
                  className="w-full pe-10 ps-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={clearHistory}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition text-sm font-semibold"
            >
              مسح السجل
            </button>
          </div>

          {filteredResults.length === 0 ? (
            <div className="p-12 text-center">
              <ScanBarcode className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-slate-600 dark:text-slate-400">مفيش سجلات جرد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="grid">
                <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <tr className="text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <th scope="col" className="px-4 py-3">الدواء</th>
                    <th scope="col" className="px-4 py-3">المتوقع</th>
                    <th scope="col" className="px-4 py-3">الفعلى</th>
                    <th scope="col" className="px-4 py-3">الفرق</th>
                    <th scope="col" className="px-4 py-3">الحالة</th>
                    <th scope="col" className="px-4 py-3">التاريخ</th>
                    <th scope="col" className="px-4 py-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredResults.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3">
                        <div dir="ltr" className="text-right">
                          <p className="font-medium text-slate-900 dark:text-white" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.drugName}>{entry.drugName}</p>
                          {entry.arabicName && <p className="text-xs text-slate-500 dark:text-slate-400" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.arabicName}>{entry.arabicName}</p>}
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{entry.barcode || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-900 dark:text-white">{entry.expectedQty}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-900 dark:text-white">{entry.actualQty}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-lg ${getDiscrepancyClass(entry.discrepancy)}`}>
                          {entry.discrepancy > 0 ? '+' : ''}{entry.discrepancy}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(entry.status)}`}>
                          {getStatusText(entry.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(entry.auditedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.discrepancy !== 0 && !entry.synced && (
                          <button
                            type="button"
                            onClick={() => syncStock(entry.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-1 mx-auto disabled:opacity-50"
                            aria-label={`تحديث مخزون ${entry.drugName}`}
                          >
                            <RefreshCw className="w-3 h-3" aria-hidden="true" />
                            تحديث
                          </button>
                        )}
                        {entry.synced && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                            محدث
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showDrugPicker && (
          <div
            className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeDrugPicker(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="picker-title"
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 id="picker-title" className="text-lg font-semibold text-slate-900 dark:text-white">اختر دواء</h3>
                <button
                  type="button"
                  onClick={closeDrugPicker}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
                </button>
              </div>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={drugPickerSearch}
                    onChange={(e) => setDrugPickerSearch(e.target.value)}
                    placeholder="ابحث باسم الدواء أو الباركود..."
                    className="w-full pe-10 ps-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredDrugPicker.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">مفيش أدوية مطابقة</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredDrugPicker.map(drug => (
                      <button
                        key={drug.id}
                        type="button"
                        onClick={() => selectDrugFromPicker(drug)}
                        className="w-full px-4 py-3 text-right hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                      >
                        <p dir="ltr" className="font-medium text-right text-slate-900 dark:text-white">{drug.name}</p>
                        {drug.arabicName && <p className="text-xs text-slate-500 dark:text-slate-400">{drug.arabicName}</p>}
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {drug.barcode || drug.bagNumber || '-'} — المخزون: {drug.totalStock || 0}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {filteredDrugPicker.length} من {allDrugs.length} دواء
                </span>
              </div>
            </div>
          </div>
        )}

        {showModal && scannedDrug && (
          <div
            className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">إدخال الكمية الفعلية</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
                </button>
              </div>

              <div className="p-4">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">اسم الدواء</p>
                  <p dir="ltr" className="text-lg font-semibold text-right text-slate-900 dark:text-white">{scannedDrug.name}</p>
                  {scannedDrug.arabicName && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{scannedDrug.arabicName}</p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">{scannedDrug.barcode || '-'}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-600 dark:text-slate-400">الكمية المتوقعة</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{scannedDrug.totalStock || 0}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="actual-qty" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    الكمية الفعلية
                  </label>
                  <input
                    id="actual-qty"
                    type="number"
                    value={actualQty}
                    onChange={(e) => setActualQty(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    min="0"
                  />
                </div>

                {actualQty && !isNaN(parseInt(actualQty, 10)) && (
                  <div className={`mt-4 p-3 rounded-lg text-center ${
                    calculatedDiscrepancy < 0
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : calculatedDiscrepancy > 0
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <p className="text-sm text-slate-600 dark:text-slate-400">الفرق</p>
                    <p className={`text-2xl font-bold ${getDiscrepancyClass(calculatedDiscrepancy)}`}>
                      {calculatedDiscrepancy > 0 ? '+' : ''}
                      {calculatedDiscrepancy}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={submitAudit}
                  disabled={!actualQty || isNaN(parseInt(actualQty, 10))}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  تأكيد الجرد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAudit;
