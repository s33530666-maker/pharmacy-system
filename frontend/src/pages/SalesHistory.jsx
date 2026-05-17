import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronDown, ChevronUp, Loader, MessageCircle, Search, Calendar, User, 
  CreditCard, FileText, Receipt, X, AlertCircle, RefreshCw, Download, 
  Settings2, Eye, EyeOff, Printer, ArrowLeftRight, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 20;

export default function SalesHistory() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [paymentFilter, setPaymentFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Drawer
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Column Visibility
  const [columns, setColumns] = useState({
    id: true,
    date: true,
    cashier: true,
    payment: true,
    discount: true,
    total: true,
    status: true,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  const fetchSalesHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setRetrying(true);
      const response = await api.get('/pos/history');

      if (!response.data) throw new Error('بيانات غير صالحة من الخادم');
      if (response.data.error) throw new Error(response.data.error);

      const salesArray = Array.isArray(response.data.data) ? response.data.data : 
                         Array.isArray(response.data) ? response.data : [];
      
      setSalesData(salesArray);
      setError('');
    } catch (err) {
      console.error('خطأ في تحميل السجل:', err);
      const errorMessage = err.response?.status === 401 
        ? 'انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.'
        : 'فشل تحميل السجل. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useAutoRefresh(fetchSalesHistory, 15000);

  // Helpers
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDateRange({ from: '', to: '' });
    setPaymentFilter('all');
    setCurrentPage(1);
  }, []);

  const handleQuickFilter = (days) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    let from = '';

    if (days === 0) {
      from = to;
    } else if (days === 1) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      from = yesterday.toISOString().split('T')[0];
    } else if (days === 7) {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      from = lastWeek.toISOString().split('T')[0];
    } else if (days === 30) {
      const lastMonth = new Date(today);
      lastMonth.setDate(lastMonth.getDate() - 30);
      from = lastMonth.toISOString().split('T')[0];
    }
    setDateRange({ from, to });
    setCurrentPage(1);
  };

  const formatDate = useCallback((date) => {
    try {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    } catch {
      return '-';
    }
  }, []);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }, []);

  const getPaymentBadgeClass = useCallback((method) => {
    switch (method) {
      case 'CASH': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'VISA': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'INSTAPAY': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'WALLET': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-600 dark:text-slate-300';
    }
  }, []);

  const getPaymentLabel = useCallback((method) => {
    switch (method) {
      case 'CASH': return 'كاش';
      case 'VISA': return 'فيزا';
      case 'INSTAPAY': return 'آجل';
      case 'WALLET': return 'محفظة';
      default: return method || 'كاش';
    }
  }, []);

  const getStatusBadge = useCallback((sale) => {
    if (sale.status === 'RETURNED') return { class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'مرتجعة' };
    if (sale.status === 'PARTIAL_RETURN') return { class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', label: 'جزئية' };
    return { class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'مكتملة' };
  }, []);

  // Filtering
  const filteredSales = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    
    const term = searchQuery.toLowerCase().trim();
    
    return salesData.filter(sale => {
      const matchesSearch = !term || 
        (sale.customerName && sale.customerName.toLowerCase().includes(term)) ||
        (sale.cashierName && sale.cashierName.toLowerCase().includes(term)) ||
        sale.id.toLowerCase().includes(term) ||
        (sale.items?.some(item => 
          (item.drugName && item.drugName.toLowerCase().includes(term)) ||
          (item.barcode && item.barcode.toLowerCase() === term)
        ));
      
      const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
      const matchesDateFrom = !dateRange.from || saleDate >= dateRange.from;
      const matchesDateTo = !dateRange.to || saleDate <= dateRange.to;
      
      const matchesPayment = paymentFilter === 'all' || sale.paymentMethod === paymentFilter;
      
      return matchesSearch && matchesDateFrom && matchesDateTo && matchesPayment;
    });
  }, [salesData, searchQuery, dateRange, paymentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, currentPage]);

  // Stats
  const stats = useMemo(() => {
    const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.grandTotal || sale.totalAmount || 0), 0);
    const count = filteredSales.length;
    const avg = count > 0 ? totalAmount / count : 0;
    const returns = filteredSales.filter(s => s.status === 'RETURNED' || s.status === 'PARTIAL_RETURN').length;
    return { totalAmount, count, avg, returns };
  }, [filteredSales]);

  // Actions
  const exportToExcel = () => {
    const exportData = filteredSales.map(sale => ({
      'رقم الفاتورة': sale.id,
      'التاريخ': formatDate(sale.createdAt),
      'الكاشير': sale.cashierName || 'غير محدد',
      'طريقة الدفع': getPaymentLabel(sale.paymentMethod),
      'الخصم': sale.discount || 0,
      'الإجمالي': sale.grandTotal || sale.totalAmount || 0,
      'الحالة': getStatusBadge(sale).label
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `Sales_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const sendReceiptViaWhatsApp = useCallback((sale) => {
    const pharmacyName = localStorage.getItem('pharmacyName') || 'الصيدلية';
    let message = `*${pharmacyName} - الفاتورة*%0A%0A`;
    message += `رقم الفاتورة: ${sale.id.substring(0, 8)}%0A`;
    message += `التاريخ: ${formatDate(sale.createdAt)}%0A%0A`;
    message += `الاصناف:%0A`;
    sale.items?.forEach((item, index) => {
      const itemName = item.drugName || item.name || 'صنف';
      const itemQty = item.quantity || 1;
      const itemPrice = item.totalPrice || (item.quantity * (item.unitPrice || item.price));
      message += `${index + 1}. ${itemName} ×${itemQty} = ${formatCurrency(itemPrice)}%0A`;
    });
    message += `%0A------------------%0A`;
    message += `الإجمالي: ${formatCurrency(sale.grandTotal || sale.totalAmount)}%0A`;
    message += `طريقة الدفع: ${getPaymentLabel(sale.paymentMethod)}%0A%0A`;
    message += `شكراً لتعاملكم معنا!`;
    
    const phone = sale.customerPhone?.replace(/[^0-9]/g, '') || '';
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      alert('لا يوجد رقم هاتف مسجل لهذا العميل');
    }
  }, [formatDate, formatCurrency, getPaymentLabel]);

  const toggleColumn = (key) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openDrawer = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedInvoice(null);
  };

  if (loading && !salesData.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <Loader className="animate-spin text-blue-600 dark:text-blue-400 mb-4" size={40} />
        <p className="text-slate-600 dark:text-slate-400 font-medium">جاري تحميل السجل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-[#F1F5F9] p-4 md:p-6" dir="rtl" role="main">
      <div className="max-w-[1400px] mx-auto space-y-4">
        
        {/* Header & Stats - Horizontal, Always Visible */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">سجل الفواتير</h1>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 w-full lg:w-auto scrollbar-hide">
            {/* Stat Chips - Max height 60px */}
            <div className="flex items-center gap-3 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl px-4 h-[60px] min-w-[180px] shadow-sm">
              <div className="p-2 bg-emerald-500/10 rounded-full">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">إجمالي المبيعات</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl px-4 h-[60px] min-w-[160px] shadow-sm">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">عدد الفواتير</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{stats.count}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl px-4 h-[60px] min-w-[160px] shadow-sm">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Receipt className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">متوسط الفاتورة</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(stats.avg)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl px-4 h-[60px] min-w-[160px] shadow-sm">
              <div className="p-2 bg-red-500/10 rounded-full">
                <ArrowLeftRight className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">المرتجعات</p>
                <p className="text-sm font-bold text-red-400">{stats.returns}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <p>{error}</p>
            </div>
            <button onClick={fetchSalesHistory} className="text-red-400 hover:text-red-300 flex items-center gap-1">
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} /> إعادة
            </button>
          </div>
        )}

        {/* Filters Row - Single Row */}
        <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl p-3 flex flex-wrap lg:flex-nowrap items-center gap-3 shadow-md">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالرقم، الاسم، الدواء..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-3 pr-9 py-2 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#7C3AED] text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl px-2">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => { setDateRange(p => ({ ...p, from: e.target.value })); setCurrentPage(1); }}
              className="py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none [color-scheme:dark]"
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => { setDateRange(p => ({ ...p, to: e.target.value })); setCurrentPage(1); }}
              className="py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none [color-scheme:dark]"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
            className="py-2 px-3 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#7C3AED] text-slate-900 dark:text-white"
          >
            <option value="all">كل طرق الدفع</option>
            <option value="CASH">كاش</option>
            <option value="VISA">فيزا</option>
            <option value="INSTAPAY">آجل</option>
          </select>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button onClick={() => handleQuickFilter(0)} className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg whitespace-nowrap">اليوم</button>
            <button onClick={() => handleQuickFilter(1)} className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg whitespace-nowrap">أمس</button>
            <button onClick={() => handleQuickFilter(7)} className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg whitespace-nowrap">أسبوع</button>
            <button onClick={() => handleQuickFilter(30)} className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg whitespace-nowrap">شهر</button>
          </div>

          <div className="flex items-center gap-2 mr-auto border-r border-slate-200 dark:border-white/10 pr-3">
            <button 
              onClick={exportToExcel}
              className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition tooltip-trigger"
              title="تصدير Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition"
                title="الأعمدة"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              
              {showColumnMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 py-2">
                  <p className="px-3 pb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5 mb-1">إظهار/إخفاء الأعمدة</p>
                  {Object.keys(columns).map(key => (
                    <button 
                      key={key} 
                      onClick={() => toggleColumn(key)}
                      className="w-full text-right px-3 py-1.5 text-sm flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <span>{
                        key === 'id' ? 'رقم الفاتورة' : 
                        key === 'date' ? 'التاريخ' : 
                        key === 'cashier' ? 'الكاشير' : 
                        key === 'payment' ? 'طريقة الدفع' : 
                        key === 'discount' ? 'الخصم' : 
                        key === 'total' ? 'الإجمالي' : 'الحالة'
                      }</span>
                      {columns[key] ? <Eye className="w-3.5 h-3.5 text-[#7C3AED]" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sales Table - Dense Rows */}
        <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto min-h-[calc(100vh-320px)]">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1B2A3B]/50 border-b border-slate-200 dark:border-white/5 text-[13px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                  {columns.id && <th className="px-4 py-3 font-medium">رقم الفاتورة</th>}
                  {columns.date && <th className="px-4 py-3 font-medium">التاريخ</th>}
                  {columns.cashier && <th className="px-4 py-3 font-medium">الكاشير</th>}
                  {columns.payment && <th className="px-4 py-3 font-medium">طريقة الدفع</th>}
                  {columns.discount && <th className="px-4 py-3 font-medium">الخصم</th>}
                  {columns.total && <th className="px-4 py-3 font-medium">الإجمالي</th>}
                  {columns.status && <th className="px-4 py-3 font-medium text-center">الحالة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale, idx) => (
                    <tr 
                      key={sale.id} 
                      onClick={() => openDrawer(sale)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors h-[48px]"
                    >
                      <td className="px-4 text-sm text-slate-500 text-center">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      {columns.id && (
                        <td className="px-4 text-sm font-semibold text-slate-900 dark:text-white">
                          #{sale.id.slice(-8).toUpperCase()}
                        </td>
                      )}
                      {columns.date && (
                        <td className="px-4 text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(sale.createdAt)}
                        </td>
                      )}
                      {columns.cashier && (
                        <td className="px-4 text-sm text-slate-600 dark:text-slate-300">
                          {sale.cashierName || '-'}
                        </td>
                      )}
                      {columns.payment && (
                        <td className="px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getPaymentBadgeClass(sale.paymentMethod)}`}>
                            {getPaymentLabel(sale.paymentMethod)}
                          </span>
                        </td>
                      )}
                      {columns.discount && (
                        <td className="px-4 text-sm text-amber-400">
                          {sale.discount ? formatCurrency(sale.discount) : '-'}
                        </td>
                      )}
                      {columns.total && (
                        <td className="px-4 text-sm font-bold text-emerald-400">
                          {formatCurrency(sale.grandTotal || sale.totalAmount)}
                        </td>
                      )}
                      {columns.status && (
                        <td className="px-4 text-center">
                           <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(sale).class}`}>
                            {getStatusBadge(sale).label}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                      لا توجد بيانات مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#0D1B2A]">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                عرض {(currentPage - 1) * PAGE_SIZE + 1} إلى {Math.min(currentPage * PAGE_SIZE, filteredSales.length)} من {filteredSales.length}
              </p>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium">{currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Drawer for Invoice Details */}
      {isDrawerOpen && selectedInvoice && (
        <>
          <div className="fixed inset-0 bg-[#F8FAFC] dark:bg-[#0D1117]/40 backdrop-blur-sm z-40 transition-opacity" onClick={closeDrawer}></div>
          <div className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-white dark:bg-[#0D1B2A] border-l border-slate-200 dark:border-white/10 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 translate-x-0">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#1B2A3B]/30">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  فاتورة #{selectedInvoice.id.slice(-8).toUpperCase()}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(selectedInvoice).class}`}>
                    {getStatusBadge(selectedInvoice).label}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatDate(selectedInvoice.createdAt)}</p>
              </div>
              <button onClick={closeDrawer} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              
              {/* Customer Info */}
              <div className="bg-slate-50 dark:bg-[#1B2A3B]/50 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">معلومات العميل</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedInvoice.customerName || 'عميل نقدي'}</p>
                    {selectedInvoice.customerPhone && <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{selectedInvoice.customerPhone}</p>}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">الأصناف ({selectedInvoice.items?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedInvoice.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-slate-50 dark:bg-[#1B2A3B]/30 rounded-xl border border-slate-200 dark:border-white/5">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.drugName || item.name || 'صنف'}>{item.drugName || item.name || 'صنف'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(item.unitPrice || item.price)} × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-400">
                        {formatCurrency(item.totalPrice || ((item.quantity || 1) * (item.unitPrice || item.price)))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Drawer Footer & Breakdown */}
            <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-[#F8FAFC] dark:bg-[#0D1117]">
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>المجموع الفرعي</span>
                  <span>{formatCurrency((selectedInvoice.grandTotal || selectedInvoice.totalAmount) + (selectedInvoice.discount || 0))}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>الخصم</span>
                  <span>{formatCurrency(selectedInvoice.discount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-white/5 text-slate-900 dark:text-white">
                  <span>الإجمالي</span>
                  <span className="text-emerald-400">{formatCurrency(selectedInvoice.grandTotal || selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">طريقة الدفع</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentBadgeClass(selectedInvoice.paymentMethod)}`}>
                    {getPaymentLabel(selectedInvoice.paymentMethod)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-[#1B2A3B] hover:bg-[#323254] text-slate-900 dark:text-white rounded-xl text-sm font-medium transition">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button 
                  onClick={() => sendReceiptViaWhatsApp(selectedInvoice)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-xl text-sm font-medium transition"
                >
                  <MessageCircle className="w-4 h-4" /> واتساب
                </button>
                <button className="col-span-2 flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition mt-1">
                  <ArrowLeftRight className="w-4 h-4" /> استرجاع الفاتورة
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}