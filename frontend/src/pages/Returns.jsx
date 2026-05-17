import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, RotateCcw, X, Package, AlertCircle, Check, Loader } from 'lucide-react';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

export default function Returns() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/pos/history');
      if (response.data?.success) {
        const data = response.data.data || [];
        setSales(data);
        setFilteredSales(data);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setErrorMessage('فشل تحميل الفواتير');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchSales, 15000);

  const handleSearch = useCallback((e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredSales(sales);
      return;
    }

    const filtered = sales.filter(sale => 
      sale.receiptNumber?.toLowerCase().includes(query) ||
      sale.customerName?.toLowerCase().includes(query) ||
      sale.id?.toString().includes(query)
    );
    setFilteredSales(filtered);
  }, [sales]);

  const handleSelectSale = useCallback((sale) => {
    setSelectedSale(sale);
    setReturnItems(sale.items.map(item => ({
      ...item,
      returnQty: 0,
      maxQty: item.quantity
    })));
    setReturnReason('');
  }, []);

  const handleReturnQtyChange = useCallback((index, qty) => {
    setReturnItems(prev => {
      const newItems = [...prev];
      const maxQty = newItems[index].maxQty;
      const val = parseInt(qty) || 0;
      newItems[index].returnQty = Math.min(Math.max(0, val), maxQty);
      return newItems;
    });
  }, []);

  const getTotalReturnAmount = useCallback(() => {
    return returnItems.reduce((sum, item) => {
      return sum + (item.returnQty * (item.unitPrice || item.price || 0));
    }, 0);
  }, [returnItems]);

  const handleSubmitReturn = useCallback(async () => {
    const itemsToReturn = returnItems.filter(item => item.returnQty > 0);
    
    if (itemsToReturn.length === 0) {
      setErrorMessage('اختر أصناف للمرتجع');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!returnReason.trim()) {
      setErrorMessage('اكتب سبب الإرجاع');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.post('/pos/return', {
        saleId: selectedSale.id,
        items: itemsToReturn.map(item => ({
          saleItemId: item.id,
          drugId: item.drugId,
          drugName: item.drugName,
          quantity: item.returnQty,
          unitPrice: item.unitPrice || item.price
        })),
        reason: returnReason,
        userId: user.id || 1
      });

      const data = response.data;
      
      if (data.success) {
        const refundAmount = data.refundAmount || getTotalReturnAmount();
        setSuccessMessage(`تم الإرجاع بنجاح! مبلغ: ${refundAmount.toFixed(2)} جنيه`);
        setTimeout(() => setSuccessMessage(''), 5000);
        
        const activeShift = JSON.parse(localStorage.getItem('activeShift') || '{}');
        if (activeShift.currentCash !== undefined) {
          activeShift.currentCash -= getTotalReturnAmount();
          localStorage.setItem('activeShift', JSON.stringify(activeShift));
        }

        setShowConfirmModal(false);
        setSelectedSale(null);
        setReturnItems([]);
        setReturnReason('');
        fetchSales();
      } else {
        setErrorMessage(data.error || 'فشل الإرجاع');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('خطأ في الإرجاع: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  }, [returnItems, returnReason, selectedSale, getTotalReturnAmount, fetchSales]);

  const formatDate = useCallback((date) => {
    try {
      return new Date(date).toLocaleDateString('ar-EG', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  }, []);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const canSubmit = useMemo(() => getTotalReturnAmount() > 0, [getTotalReturnAmount]);
  const itemsToReturnCount = useMemo(() => returnItems.filter(i => i.returnQty > 0).length, [returnItems]);

  return (
    <div className="h-full flex flex-col p-4" role="main" aria-label="صفحة المرتجعات">
      {successMessage && (
        <div className="mb-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-[var(--md-radius-md)] p-3 flex items-center gap-2" role="status" aria-live="polite">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
          <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-[var(--md-radius-md)] p-3 flex items-center gap-2" role="alert" aria-live="assertive">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-2)]">
          <div className="p-4 border-b border-[var(--md-outline)]">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">بحث عن فاتورة</h2>
            </div>
            <div className="relative">
              <label htmlFor="sale-search" className="sr-only">البحث في الفواتير</label>
              <input
                id="sale-search"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                className="w-full px-4 py-2.5 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
                aria-describedby="search-description"
              />
              <p id="search-description" className="sr-only">ابحث باستخدام رقم الفاتورة أو اسم العميل</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && sales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 p-8">
                <Loader className="w-8 h-8 animate-spin mb-3" aria-hidden="true" />
                <p className="text-sm">جاري التحميل...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 p-8">
                <Package className="w-12 h-12 mb-3 opacity-50" aria-hidden="true" />
                <p className="text-sm">لا توجد فواتير</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700" role="list" aria-label="قائمة الفواتير">
                {filteredSales.slice(0, 20).map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSelectSale(sale); }}
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedSale?.id === sale.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {sale.customerName || 'عميل'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {formatDate(sale.saleDate)}
                        </p>
                      </div>
                      <div className="text-start">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          {(sale.totalAmount || 0).toFixed(2)} ج
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.items?.length || 0} صنف
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-96 flex flex-col overflow-hidden bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-slate-700">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">المرتجعات</h2>
            </div>
          </div>

          {!selectedSale ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-400 p-4">
              <p className="text-sm">اختر فاتورة من القائمة</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">الفاتورة</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSale.customerName || 'عميل'}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(selectedSale.saleDate)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">الأصناف</p>
                  <div className="space-y-2" role="group" aria-label="أصناف الفاتورة">
                    {returnItems.map((item, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.drugName}>
                              {item.drugName}
                            </p>
                            <p className="text-xs text-gray-500">
                              السعر: {item.unitPrice || item.price} ج | الكمية: {item.maxQty}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`return-qty-${index}`} className="text-xs text-gray-600 dark:text-slate-400">مرتجع:</label>
                          <input
                            id={`return-qty-${index}`}
                            type="number"
                            min="0"
                            max={item.maxQty}
                            value={item.returnQty || ''}
                            onChange={(e) => handleReturnQtyChange(index, e.target.value)}
                            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            aria-label={`كمية مرتجعة من ${item.drugName}`}
                          />
                          <span className="text-xs text-gray-500">
                            من {item.maxQty}
                          </span>
                        </div>
                        {item.returnQty > 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            = {(item.returnQty * (item.unitPrice || item.price)).toFixed(2)} ج
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="return-reason" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                    سبب الإرجاع
                  </label>
                  <textarea
                    id="return-reason"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="اكتب سبب الإرجاع..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    aria-describedby="return-reason-description"
                  />
                  <p id="return-reason-description" className="sr-only">أدخل سبب إرجاع المنتجات</p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-slate-700 shrink-0 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400">الإجمالي المرتجع</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {getTotalReturnAmount().toFixed(2)} ج
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!canSubmit || loading}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
                    !canSubmit || loading
                      ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                  aria-label="تأكيد عملية الإرجاع"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                      جاري...
                    </span>
                  ) : 'تأكيد الإرجاع'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div 
          className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeConfirmModal(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full mb-3">
                <RotateCcw className="w-6 h-6 text-orange-600 dark:text-orange-300" aria-hidden="true" />
              </div>
              <h3 id="confirm-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">تأكيد الإرجاع</h3>
            </div>
            
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-slate-400">عدد الأصناف</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {itemsToReturnCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">المبلغ المرتجع</span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {getTotalReturnAmount().toFixed(2)} ج
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={loading}
                className="flex-1 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-semibold text-sm disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={loading}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />}
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}