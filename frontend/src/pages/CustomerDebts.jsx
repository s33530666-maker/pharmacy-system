import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Receipt, Phone, User, Trash2, CheckCircle, Search, Calendar, MessageCircle, Loader, Eye, XCircle, X, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../utils/api.js';

const PAGE_SIZE = 50;

const CustomerDebts = () => {
  const [debts, setDebts] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pagination, setPagination] = useState({ offset: 0, total: 0, totalPages: 0 });

  const fetchDebts = useCallback(async (opts = {}) => {
    if (opts.forceRefetch) setRefreshing(true);
    else setLoading(true);

    try {
      setError('');
      const status = opts.tab ? (opts.tab === 'paid' ? 'paid' : 'unpaid') : (showPaidOnly ? 'paid' : 'unpaid');
      const res = await api.get('/pos/customer-debts/sales-with-deferred', {
        params: {
          status,
          search: opts.search !== undefined ? opts.search : searchInput,
          limit: PAGE_SIZE,
          offset: opts.paginationOffset !== undefined ? opts.paginationOffset : pagination.offset,
        },
      });
      if (res.data?.success) {
        setDebts(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      } else {
        setError(res.data?.message || res.data?.error || 'فشل تحميل الفواتير');
      }
    } catch (err) {
      setError('فشل تحميل الفواتير');
      console.error('[fetchDebts]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showPaidOnly, searchInput, pagination.offset]);

  useEffect(() => {
    setPagination(p => ({ ...p, offset: 0 }));
  }, [showPaidOnly, searchInput]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleTabChange = (paid) => {
    setShowPaidOnly(paid);
    setPagination(p => ({ ...p, offset: 0 }));
    setLoading(true);
  };

  const handlePageChange = (newOffset) => {
    setPagination(p => ({ ...p, offset: newOffset }));
    setLoading(true);
  };

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
    setPagination(p => ({ ...p, offset: 0 }));
    setLoading(true);
  };

  const markAsPaid = useCallback(async (debt) => {
    if (!window.confirm('هل تريد تسجيل هذا الدفع؟')) return;
    try {
      setMarkingPaid(debt.id);
      setError('');
      const res = await api.post(`/pos/customer-debts/mark-paid/${debt.id}`, { amount: undefined, method: 'CASH' });
      if (res.data?.success) await fetchDebts({ forceRefetch: true });
    } catch (error) {
      console.error('Error marking as paid:', error);
      setError('فشل تسجيل الدفع');
    } finally {
      setMarkingPaid(null);
    }
  }, [fetchDebts]);

  const viewInvoiceDetails = useCallback(async (debt) => {
    try {
      setSelectedInvoice(debt);
      setLoadingInvoice(true);
      const res = await api.get(`/pos/invoices/${debt.id}`);
      if (res.data?.data) setInvoiceDetails(res.data.data);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      setError('فشل تحميل تفاصيل الفاتورة');
    } finally {
      setLoadingInvoice(false);
    }
  }, []);

  const closeInvoiceDetails = useCallback(() => {
    setSelectedInvoice(null);
    setInvoiceDetails(null);
  }, []);

  const openPaymentModal = useCallback((debt) => {
    const customerId = debt.customer?.id || debt.customerId;
    setSelectedInvoice({ ...debt, customerId });
    setPaymentAmount(parseFloat(debt.grandTotal).toFixed(2));
    setShowPaymentModal(true);
  }, []);

  const handleRecordPayment = useCallback(async () => {
    const amount = parseFloat(paymentAmount);
    if (!selectedInvoice || !amount || amount <= 0) {
      setError('أدخل مبلغ صحيح');
      return;
    }
    const customerId = selectedInvoice.customer?.id || selectedInvoice.customerId;
    if (!customerId) {
      setError('لا يمكن تحديد العميل');
      return;
    }
    try {
      setProcessingPayment(true);
      setError('');
      const res = await api.post(`/pos/customer-debts/mark-paid/${selectedInvoice.id}`, {
        amount,
        method: 'CASH',
      });
      if (res.data?.success) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedInvoice(null);
        await fetchDebts({ forceRefetch: true });
      }
    } catch (error) {
      setError(error.response?.data?.error || 'فشل تسجيل الدفع');
    } finally {
      setProcessingPayment(false);
    }
  }, [selectedInvoice, paymentAmount, fetchDebts]);

  const sendViaWhatsApp = useCallback((debt) => {
    const pharmacyName = localStorage.getItem('pharmacyName') || 'الصيدلية';
    const phone = debt.customer?.phone?.replace(/[^0-9]/g, '') || debt.customerPhone?.replace(/[^0-9]/g, '') || '';
    if (!phone) {
      alert('لا يوجد رقم تليفون للعميل');
      return;
    }

    const message = [
      `*${pharmacyName} - تذكير بفواتير آجل*`,
      ``,
      `مرحباً ${debt.customer?.name || debt.customerName}`,
      `ده تذكير بفاتورة آجل:`,
      ``,
      `رقم الفاتورة: ${debt.receiptNumber || debt.id?.slice(0, 8)}`,
      `المبلغ: ${parseFloat(debt.grandTotal || 0).toFixed(2)} جنيه`,
      `التاريخ: ${new Date(debt.saleDate).toLocaleDateString('ar-EG')}`,
      ``,
      `من فضلك سدد المبلغ في أقرب وقت.`,
      ``,
      `شكراً ليك!`,
    ].join('\n');

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }, []);

  const filteredDebts = useMemo(() => debts, [debts]);

  const totalUnpaid = useMemo(() => debts.filter(d => d.status === 'unpaid').reduce((sum, d) => sum + parseFloat(d.grandTotal || 0), 0), [debts]);
  const totalPaid = useMemo(() => debts.filter(d => d.status === 'paid').reduce((sum, d) => sum + parseFloat(d.grandTotal || 0), 0), [debts]);
  const unpaidCount = useMemo(() => pagination.total || 0, [pagination]);
  const paidCount = useMemo(() => pagination.total || 0, [pagination]);

  const formatDate = (dateStr) => {
    try { return new Date(dateStr).toLocaleDateString('ar-EG'); } catch { return '-'; }
  };

  const formatReceiptNumber = (debt) => debt.receiptNumber || debt.id?.slice(0, 8) || '-';

  const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">حسابات العملاء (الآجل)</h1>
            </div>
          </div>
          <button
            onClick={() => fetchDebts({ forceRefetch: true })}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--md-primary-container)] dark:bg-[var(--md-primary-container)] hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-[var(--md-radius-md)] text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-[var(--md-radius-md)] p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">فواتير آجل</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-300">{formatCurrency(totalUnpaid)}</p>
            <p className="text-xs text-red-500">{pagination.total || 0} فاتورة</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-[var(--md-radius-md)] p-4">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">فواتير مدفوعة</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-300">{formatCurrency(totalPaid)}</p>
          </div>
        </div>

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearch}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchDebts({ search: searchInput }); }}
                  placeholder="ابحث بالاسم أو التليفون أو رقم الفاتورة..."
                  className="w-full pe-10 ps-4 py-2.5 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleTabChange(false)}
                className={`px-4 py-2 rounded-full font-semibold text-xs transition ${!showPaidOnly ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'}`}
              >
                آجل
              </button>
              <button
                onClick={() => handleTabChange(true)}
                className={`px-4 py-2 rounded-full font-semibold text-xs transition ${showPaidOnly ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'}`}
              >
                مدفوعة
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] overflow-hidden">
          {filteredDebts.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">مفيش فواتير</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--md-bg-gray-50)] dark:bg-[var(--md-surface)] border-b border-[var(--md-outline)]">
                    <tr className="text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <th className="px-4 py-3">رقم الفاتورة</th>
                      <th className="px-4 py-3">العميل</th>
                      <th className="px-4 py-3">التليفون</th>
                      <th className="px-4 py-3">المبلغ</th>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline)]">
                    {filteredDebts.map((debt) => (
                      <tr key={debt.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-900 dark:text-white">{formatReceiptNumber(debt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-900 dark:text-white">{debt.customer?.name || debt.customerName || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-900 dark:text-white">{debt.customer?.phone || debt.customerPhone || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(debt.grandTotal)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(debt.saleDate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => viewInvoiceDetails(debt)}
                              className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {debt.status === 'unpaid' && (debt.customer?.phone || debt.customerPhone) && (
                              <button
                                onClick={() => sendViaWhatsApp(debt)}
                                className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70 rounded-lg transition"
                                title="إرسال عبر واتساب"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openPaymentModal(debt)}
                              className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/70 rounded-lg transition"
                              title="تسجيل دفع"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => markAsPaid(debt)}
                              disabled={markingPaid === debt.id}
                              className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70 rounded-lg transition disabled:opacity-50"
                              title="تم الدفع"
                            >
                              {markingPaid === debt.id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => handlePageChange(Math.max(0, pagination.offset - PAGE_SIZE))}
                    disabled={pagination.offset === 0}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={16} /> السابق
                  </button>
                  <span className="text-sm text-slate-500">
                    {Math.floor(pagination.offset / PAGE_SIZE) + 1} من {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.offset + PAGE_SIZE)}
                    disabled={pagination.offset + PAGE_SIZE >= pagination.total}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    التالي <ChevronLeft size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedInvoice && invoiceDetails && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4" onClick={closeInvoiceDetails}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/30">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">تفاصيل فاتورة #{formatReceiptNumber(selectedInvoice)}</h2>
              </div>
              <button onClick={closeInvoiceDetails} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">العميل</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{invoiceDetails.customerName || '-'}</p>
                  {invoiceDetails.customerPhone && <p className="text-xs text-slate-500">{invoiceDetails.customerPhone}</p>}
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">التاريخ</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatDate(invoiceDetails.saleDate || invoiceDetails.createdAt)}</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-slate-100 dark:bg-slate-600">
                    <tr className="text-slate-600 dark:text-slate-300">
                      <th className="px-3 py-2 text-right w-[50%]">الصنف</th>
                      <th className="px-3 py-2 text-center w-[15%]">الكمية</th>
                      <th className="px-3 py-2 text-center w-[17%]">السعر</th>
                      <th className="px-3 py-2 text-left w-[18%]">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                    {invoiceDetails.items?.map((item, idx) => {
                      const unitPrice = parseFloat(item.unitPrice || item.price) || 0;
                      const qty = parseInt(item.quantity) || 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900 dark:text-white truncate max-w-[200px] block" dir="ltr" title={item.drugName}>{item.drugName}</p>
                            {item.genericName && <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px] block mt-0.5" dir="ltr" title={item.genericName}>{item.genericName}</p>}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">{qty}</td>
                          <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">{unitPrice.toFixed(2)} ج</td>
                          <td className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white">{(unitPrice * qty).toFixed(2)} ج</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">المجموع:</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(invoiceDetails.subtotal)}</span>
                </div>
                {(invoiceDetails.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">الخصم:</span>
                    <span className="text-green-600 dark:text-green-400">-{formatCurrency(invoiceDetails.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span className="text-slate-900 dark:text-white">الإجمالي:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(invoiceDetails.grandTotal)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={closeInvoiceDetails} className="w-full py-2 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">تسجيل دفع</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">العميل:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.customer?.name || selectedInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">المبلغ المطلوب:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(selectedInvoice.grandTotal)}</span>
                </div>
              </div>
              <div>
                <label htmlFor="payment-amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مبلغ الدفع</label>
                <input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="أدخل مبلغ الدفع"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={processingPayment || !paymentAmount}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingPayment ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {processingPayment ? 'جاري...' : 'تسجيل الدفع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDebts;
