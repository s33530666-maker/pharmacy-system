import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, X, Search, Loader, Check, Barcode, QrCode } from 'lucide-react';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useTheme } from '../context/ThemeContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

const DrugsManagement = () => {
  const { isDark } = useTheme();
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeDrug, setBarcodeDrug] = useState(null);
  const [newBarcode, setNewBarcode] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [rowEditingId, setRowEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ sellPrice: 0, costPrice: 0, stock: 0, externalId: '' });
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    arabicName: '',
    barcode: '',
    genericName: '',
    description: '',
    strength: '',
    dosageForm: '',
    manufacturer: '',
    stock: 0,
    expiryDate: '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const fetchDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/drugs', {
        params: {
          page: currentPage,
          limit: 50,
          search: debouncedSearchTerm
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
      console.error('Fetch error:', err);
      setError('Error fetching drugs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs, currentPage, debouncedSearchTerm]);

  useAutoRefresh(fetchDrugs, 15000);

  useEffect(() => {
    if (showModal && modalRef.current) {
      const inputs = modalRef.current.querySelectorAll('input, select, textarea');
      if (inputs.length > 0) {
        setTimeout(() => inputs[0].focus(), 100);
      }
    }
  }, [showModal]);

  const handleOpenModal = useCallback((drug = null) => {
    if (drug) {
      setIsEditing(true);
      setEditingId(drug.id);
      setFormData({
        name: drug.name || '',
        arabicName: drug.arabicName || '',
        barcode: drug.barcode || '',
        genericName: drug.genericName || '',
        description: drug.description || '',
        strength: drug.strength || '',
        dosageForm: drug.dosageForm || '',
        manufacturer: drug.manufacturer || '',
        stock: drug.totalStock || 0,
        expiryDate: drug.expiryDate || '',
      });
    } else {
      setIsEditing(false);
      setEditingId(null);
      setFormData({
        name: '',
        arabicName: '',
        barcode: '',
        genericName: '',
        description: '',
        strength: '',
        dosageForm: '',
        manufacturer: '',
        stock: 0,
        expiryDate: '',
      });
    }
    setShowModal(true);
    setError('');
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setIsEditing(false);
    setEditingId(null);
    setError('');
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'expiryDate') {
      let cleaned = value.replace(/\D/g, '').slice(0, 4);
      if (cleaned.length >= 2) {
        const month = cleaned.slice(0, 2);
        const year = cleaned.slice(2);
        setFormData(prev => ({ ...prev, [name]: `${month}/20${year}` }));
      } else {
        setFormData(prev => ({ ...prev, [name]: cleaned }));
      }
    } else if (name === 'stock') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      setError('Drug name is required');
      return false;
    }
    if (!formData.genericName.trim()) {
      setError('Generic name is required');
      return false;
    }
    if (!formData.strength.trim()) {
      setError('Strength is required');
      return false;
    }
    if (!formData.dosageForm.trim()) {
      setError('Dosage form is required');
      return false;
    }
    if (!formData.manufacturer.trim()) {
      setError('Manufacturer is required');
      return false;
    }
    return true;
  }, [formData]);

  const handleSaveDrug = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        ...formData,
        stock: parseInt(formData.stock) || 0,
      };

      let response;
      if (isEditing) {
        response = await api.put(`/drugs/${editingId}`, payload);
      } else {
        response = await api.post('/drugs', payload);
      }

      if (response.status === 200 || response.status === 201) {
        setSuccess(isEditing ? 'Drug updated successfully!' : 'Drug created successfully!');
        handleCloseModal();
        fetchDrugs();
      } else {
        setError(response.data?.message || 'Failed to save drug');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Error saving drug');
    } finally {
      setActionLoading(false);
    }
  }, [formData, isEditing, editingId, validateForm, handleCloseModal, fetchDrugs]);

  const handleDeleteDrug = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this drug?')) {
      return;
    }

    setActionLoading(id);
    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/drugs/${id}`);

      if (response.ok) {
        setSuccess('Drug deleted successfully!');
        fetchDrugs();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete drug');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Error deleting drug');
    } finally {
      setActionLoading(null);
    }
  }, [fetchDrugs]);

  const handleStartEdit = useCallback((drug) => {
    setRowEditingId(drug.id);
    setEditValues({
      sellPrice: drug.sellPrice ?? 0,
      costPrice: drug.costPrice ?? 0,
      stock: drug.totalStock ?? 0,
      externalId: drug.externalId ?? '',
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setRowEditingId(null);
    setEditValues({ sellPrice: 0, costPrice: 0, stock: 0, externalId: '' });
  }, []);

  const handleSaveEdit = useCallback(async (drugId) => {
    try {
      const payload = {
        stock: parseInt(editValues.stock, 10) || 0,
        sellPrice: parseFloat(editValues.sellPrice) || 0,
        costPrice: parseFloat(editValues.costPrice) || 0,
      };

      const response = await api.put(`/drugs/${drugId}`, payload);

      if (response.ok) {
        setSuccess('Drug updated successfully!');
        setRowEditingId(null);
        fetchDrugs();
      } else {
        const errorData = response.data;
        setError(errorData.message || 'Failed to update drug');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Error updating drug');
    }
  }, [editValues, fetchDrugs]);

  const handleEditValueChange = useCallback((field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleOpenBarcodeModal = useCallback((drug) => {
    setBarcodeDrug(drug);
    setNewBarcode(drug.barcode || '');
    setShowBarcodeModal(true);
    setError('');
    setSuccess('');
  }, []);

  const handleCloseBarcodeModal = useCallback(() => {
    setShowBarcodeModal(false);
    setBarcodeDrug(null);
    setNewBarcode('');
  }, []);

  const handleSaveBarcode = useCallback(async () => {
    if (!barcodeDrug) return;
    setActionLoading('barcode');
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/drugs/${barcodeDrug.id}`, { barcode: newBarcode });
      if (response.ok) {
        setSuccess('تم تحديث الباركود بنجاح');
        handleCloseBarcodeModal();
        fetchDrugs();
      } else {
        setError(response.data?.message || 'فشل تحديث الباركود');
      }
    } catch (err) {
      console.error('Barcode update error:', err);
      setError('خطأ في تحديث الباركود');
    } finally {
      setActionLoading(null);
    }
  }, [barcodeDrug, newBarcode, handleCloseBarcodeModal, fetchDrugs]);

  const isNumericOnly = (str) => /^\d+$/.test(str);

  const formatPrice = useCallback((price) => {
    return (price || 0).toFixed(2);
  }, []);

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-[#0F172A]' : 'bg-[#F8F9FA]'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>إدارة الأصناف</h1>
            <p className={isDark ? 'text-[#64748B]' : 'text-[#5F6368]'}>إضافة وتعديل وحذف الأدوية</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label htmlFor="drug-search" className="sr-only">بحث عن دواء</label>
            <div className="relative">
              <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#64748B]' : 'text-[#5F6368]'}`} aria-hidden="true" />
              <input
                id="drug-search"
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2.5 border rounded-full bg-transparent focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'border-[#475569] text-[#F1F5F9] placeholder-[#64748B] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                    : 'border-[#E8EAED] text-[#202124] placeholder-[#5F6368] focus:border-[#1A73E8] focus:ring-[#1A73E8]'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className={`flex items-center gap-2 px-5 py-2 font-medium rounded-full transition-all duration-200 ${
                isDark
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-lg shadow-blue-500/20'
                  : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              <Plus size={20} aria-hidden="true" />
              إضافة صنف
            </button>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 border-l-4 rounded-lg flex items-start gap-3 ${isDark ? 'bg-red-900/30 border-red-400' : 'bg-red-50 border-red-500'}`} role="alert">
            <AlertCircle className={isDark ? 'text-red-400 flex-shrink-0 mt-0.5' : 'text-red-500 flex-shrink-0 mt-0.5'} size={20} aria-hidden="true" />
            <div>
              <p className={isDark ? 'text-red-400 font-medium' : 'text-red-800 font-medium'}>خطأ</p>
              <p className={isDark ? 'text-red-500 text-sm' : 'text-red-700 text-sm'}>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className={`mb-6 p-4 border-l-4 rounded-lg ${isDark ? 'bg-green-900/30 border-green-400' : 'bg-green-50 border-green-500'}`} role="status">
            <p className={isDark ? 'text-green-400 font-medium' : 'text-green-800 font-medium'}>{success}</p>
          </div>
        )}

        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-[#1E293B]' : 'bg-white'}`}>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px]" role="grid">
              <thead className={isDark ? 'bg-[#0F172A]' : 'bg-[#F1F3F5]'}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider w-full min-w-0 ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>الاسم</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>الاسم العام</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>الشكل الصيدلاني</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>سعر التكلفة</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>سعر البيع</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>الكمية</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider w-32 ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>الشركة</th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>الإجراءات</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#334155]' : 'divide-[#E8EAED]'}`}>
                {loading && drugs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />
                        جاري التحميل...
                      </div>
                    </td>
                  </tr>
                ) : drugs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-600 dark:text-slate-400">
                      {debouncedSearchTerm ? 'لا توجد نتائج' : 'لا توجد أدوية'}
                    </td>
                  </tr>
                ) : (
                  drugs.map(drug => (
                    <tr key={drug.id} className={`transition-colors ${isDark ? 'hover:bg-[#263248]' : 'hover:bg-[#F8F9FA]'}`}>
                      <td className="px-6 py-4 w-full min-w-0">
                        <div className="font-medium truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={drug.name}>{drug.name}</div>
                        {drug.arabicName && (
                          <div className="text-xs truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={drug.arabicName}>{drug.arabicName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm w-full min-w-0" dir="ltr"><span className="block truncate" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={drug.genericName}>{drug.genericName}</span></td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>{drug.dosageForm}</td>
                      {rowEditingId === drug.id ? (
                        <>
                          <td className="px-6 py-4">
                            <label htmlFor={`edit-cost-${drug.id}`} className="sr-only">سعر التكلفة</label>
                            <input
                              id={`edit-cost-${drug.id}`}
                              type="number"
                              step="0.01"
                              value={editValues.costPrice}
                              onChange={(e) => handleEditValueChange('costPrice', e.target.value)}
                              className={`w-24 px-2 py-1 text-sm border rounded text-center focus:outline-none focus:ring-2 ${
                                isDark
                                  ? 'border-[#3B82F6] bg-[#1E293B] text-[#F1F5F9] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                                  : 'border-[#1A73E8] bg-white text-[#202124] focus:border-[#1A73E8] focus:ring-[#1A73E8]'
                              }`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <label htmlFor={`edit-sell-${drug.id}`} className="sr-only">سعر البيع</label>
                            <input
                              id={`edit-sell-${drug.id}`}
                              type="number"
                              step="0.01"
                              value={editValues.sellPrice}
                              onChange={(e) => handleEditValueChange('sellPrice', e.target.value)}
                              className={`w-24 px-2 py-1 text-sm border rounded text-center focus:outline-none focus:ring-2 ${
                                isDark
                                  ? 'border-[#3B82F6] bg-[#1E293B] text-[#F1F5F9] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                                  : 'border-[#1A73E8] bg-white text-[#202124] focus:border-[#1A73E8] focus:ring-[#1A73E8]'
                              }`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <label htmlFor={`edit-stock-${drug.id}`} className="sr-only">الكمية</label>
                            <input
                              id={`edit-stock-${drug.id}`}
                              type="number"
                              min="0"
                              value={editValues.stock}
                              onChange={(e) => handleEditValueChange('stock', e.target.value)}
                              className={`w-20 px-2 py-1 text-sm border rounded text-center focus:outline-none focus:ring-2 ${
                                isDark
                                  ? 'border-[#3B82F6] bg-[#1E293B] text-[#F1F5F9] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                                  : 'border-[#1A73E8] bg-white text-[#202124] focus:border-[#1A73E8] focus:ring-[#1A73E8]'
                              }`}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                            {formatPrice(drug.costPrice)} ج.م
                          </td>
                          <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                            {formatPrice(drug.sellPrice)} ج.م
                          </td>
                          <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                            {drug.totalStock || 0}
                          </td>
                        </>
                      )}
                      <td className={`px-6 py-4 text-sm w-32 ${isDark ? 'text-[#64748B]' : 'text-[#5F6368]'}`}>{drug.manufacturer || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {rowEditingId === drug.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(drug.id)}
                                disabled={actionLoading === drug.id}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors disabled:opacity-50"
                                title="حفظ"
                                aria-label="حفظ التغييرات"
                              >
                                {actionLoading === drug.id ? (
                                  <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Check className="w-4 h-4" aria-hidden="true" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="إلغاء"
                                aria-label="إلغاء التعديل"
                              >
                                <x className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenBarcodeModal(drug)}
                                className={`p-2 rounded-full transition-colors ${isDark ? 'text-[#3B82F6] hover:bg-[#3B82F6]/10' : 'text-[#1A73E8] hover:bg-[#1A73E8]/10'}`}
                                title="تعديل الباركود"
                                aria-label={`تعديل الباركود ${drug.name}`}
                              >
                                <QrCode size={18} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(drug)}
                                className={`p-2 rounded-full transition-colors ${isDark ? 'text-[#3B82F6] hover:bg-[#3B82F6]/10' : 'text-[#1A73E8] hover:bg-[#1A73E8]/10'}`}
                                title="تعديل"
                                aria-label={`تعديل ${drug.name}`}
                              >
                                <Edit2 size={18} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDrug(drug.id)}
                                disabled={actionLoading === drug.id}
                                className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isDark ? 'text-[#F87171] hover:bg-[#F87171]/10' : 'text-[#EA4335] hover:bg-[#EA4335]/10'}`}
                                title="حذف"
                                aria-label={`حذف ${drug.name}`}
                              >
                                {actionLoading === drug.id ? (
                                  <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 size={18} aria-hidden="true" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white disabled:bg-[#1E293B] disabled:text-[#64748B]'
                  : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white disabled:bg-[#E8EAED] disabled:text-[#5F6368]'
              }`}
            >
              السابق
            </button>
            <span className={`text-sm font-medium ${isDark ? 'text-[#94A3B8]' : 'text-[#5F6368]'}`}>
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white disabled:bg-[#1E293B] disabled:text-[#64748B]'
                  : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white disabled:bg-[#E8EAED] disabled:text-[#5F6368]'
              }`}
            >
              التالي
            </button>
          </div>
        )}

        {showModal && (
          <div 
            className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4" 
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div 
              ref={modalRef}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 p-6 flex justify-between items-center">
                <h2 id="modal-title" className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'تعديل الدواء' : 'إضافة دواء جديد'}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={24} aria-hidden="true" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm" role="alert">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="drug-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      اسم الدواء *
                    </label>
                    <input
                      id="drug-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: باراسيتامول"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-arabic-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الاسم بالعربية
                    </label>
                    <input
                      id="drug-arabic-name"
                      type="text"
                      name="arabicName"
                      value={formData.arabicName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: باراسيتامول"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-barcode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الباركود
                    </label>
                    <input
                      id="drug-barcode"
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: 123456789"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-generic-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الاسم العام *
                    </label>
                    <input
                      id="drug-generic-name"
                      type="text"
                      name="genericName"
                      value={formData.genericName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: Paracetamol"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-strength" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      القوة *
                    </label>
                    <input
                      id="drug-strength"
                      type="text"
                      name="strength"
                      value={formData.strength}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: 500 mg"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-dosage-form" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الشكل الصيدلاني *
                    </label>
                    <select
                      id="drug-dosage-form"
                      name="dosageForm"
                      value={formData.dosageForm}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر شكلاً صيدلانياً</option>
                      <option value="Tablet">قرص (Tablet)</option>
                      <option value="Capsule">كبسولة (Capsule)</option>
                      <option value="Syrup">شراب (Syrup)</option>
                      <option value="Injection">حقن (Injection)</option>
                      <option value="Cream">كريم (Cream)</option>
                      <option value="Ointment">مرهم (Ointment)</option>
                      <option value="Solution">محلول (Solution)</option>
                      <option value="Suspension">معلق (Suspension)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="drug-manufacturer" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الشركة المصنعة *
                    </label>
                    <input
                      id="drug-manufacturer"
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-[var(--md-outline)] bg-transparent dark:bg-[var(--md-surface)] text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: Pfizer"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-stock" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الكمية
                    </label>
                    <input
                      id="drug-stock"
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-2 border border-[var(--md-outline)] bg-transparent dark:bg-[var(--md-surface)] text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="drug-expiry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      تاريخ الانتهاء
                    </label>
                    <input
                      id="drug-expiry"
                      type="text"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-[var(--md-outline)] bg-transparent dark:bg-[var(--md-surface)] text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="شهر/سنة (مثال: 0728)"
                      maxLength={7}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="drug-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      الوصف
                    </label>
                    <textarea
                      id="drug-description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-[var(--md-outline)] bg-transparent dark:bg-[var(--md-surface)] text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أضف وصفاً للدواء..."
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 p-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-full hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrug}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                      جاري الحفظ...
                    </span>
                  ) : (isEditing ? 'تحديث' : 'حفظ')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showLabelModal && selectedDrug && (
          <LabelPrintModal drug={selectedDrug} onClose={() => { setShowLabelModal(false); setSelectedDrug(null); }} />
        )}

        {showBarcodeModal && barcodeDrug && (
          <div 
            className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseBarcodeModal(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="barcode-modal-title"
          >
            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md ${isDark ? 'border border-[#334155]' : 'border border-[#E8EAED]'}`}>
              <div className={`p-6 border-b ${isDark ? 'border-[#334155]' : 'border-[#E8EAED]'}`}>
                <div className="flex justify-between items-center">
                  <h2 id="barcode-modal-title" className={`text-xl font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                    تعديل الباركود
                  </h2>
                  <button
                    type="button"
                    onClick={handleCloseBarcodeModal}
                    className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-[#334155] text-[#94A3B8]' : 'hover:bg-[#F1F3F5] text-[#5F6368]'}`}
                    aria-label="إغلاق"
                  >
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'}`}>
                    {error}
                  </div>
                )}
                {success && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
                    {success}
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="barcode-drug-name" className={`block text-sm font-medium mb-2 ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                    اسم الدواء
                  </label>
                  <p id="barcode-drug-name" className={`text-lg font-semibold ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                    {barcodeDrug.name}
                  </p>
                </div>

                <div>
                  <label htmlFor="barcode-input" className={`block text-sm font-medium mb-2 ${isDark ? 'text-[#F1F5F9]' : 'text-[#202124]'}`}>
                    الباركود
                  </label>
                  <input
                    id="barcode-input"
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-full focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'border-[#475569] bg-[#1E293B] text-[#F1F5F9] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                        : 'border-[#E8EAED] bg-white text-[#202124] focus:border-[#1A73E8] focus:ring-[#1A73E8]'
                    }`}
                    placeholder="أدخل الباركود الجديد"
                  />
                </div>
              </div>

              <div className={`p-6 border-t flex gap-3 justify-end ${isDark ? 'border-[#334155]' : 'border-[#E8EAED]'}`}>
                <button
                  type="button"
                  onClick={handleCloseBarcodeModal}
                  className={`px-5 py-2.5 font-medium rounded-full transition-colors ${
                    isDark
                      ? 'bg-[#334155] text-[#F1F5F9] hover:bg-[#475569]'
                      : 'bg-[#F1F3F5] text-[#202124] hover:bg-[#E8EAED]'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveBarcode}
                  disabled={actionLoading === 'barcode'}
                  className={`px-5 py-2.5 font-medium rounded-full text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark ? 'bg-[#3B82F6] hover:bg-[#2563EB]' : 'bg-[#1A73E8] hover:bg-[#1557B0]'
                  }`}
                >
                  {actionLoading === 'barcode' ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                      جاري الحفظ...
                    </span>
                  ) : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function LabelPrintModal({ drug, onClose }) {
  const pharmacyName = localStorage.getItem('pharmacyName') || 'الصيدلية';

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const barcodePattern = useMemo(() => {
    if (!drug.barcode) return [];
    return Array.from({ length: 40 }, (_, i) => {
      const patterns = ['w-[2px]', 'w-[3px]', 'w-[4px]'];
      return patterns[i % 3];
    });
  }, [drug.barcode]);

  return (
    <div 
      className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 id="label-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">طباعة لاصقة</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="border-2 border-slate-900 dark:border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs font-bold text-center text-slate-900 border-b border-slate-900 dark:border-slate-200 pb-2 mb-2">
              {pharmacyName}
            </p>
            
            <p className="text-sm font-bold text-slate-900 text-center mb-2">
              {drug.name}
            </p>
            {drug.arabicName && (
              <p className="text-xs text-slate-900 text-center mb-2" dir="rtl">
                {drug.arabicName}
              </p>
            )}
            
            <p className="text-xs text-slate-700 mb-2">
              {drug.strength} - {drug.dosageForm}
            </p>
            
            <div className="flex justify-center mb-2">
              <div className="bg-white px-2 py-1 border-2 border-slate-900 rounded">
                <div className="flex">
                  {barcodePattern.map((width, i) => (
                    <div key={i} className={`${width} bg-slate-900 h-8`} />
                  ))}
                </div>
                <p className="text-xs font-mono text-center mt-1 text-slate-900">
                  {drug.barcode || 'N/A'}
                </p>
              </div>
            </div>
            
            <p className="text-lg font-bold text-center text-slate-900">
              {formatPrice(drug.sellPrice)} جنيه
            </p>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
            الحجم الموصى به 58mm x 40mm
          </p>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPrice(price) {
  return (price || 0).toFixed(2);
}

export default DrugsManagement;