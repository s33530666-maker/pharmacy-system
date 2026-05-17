import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  DollarSign, 
  Plus, 
  X, 
  Search, 
  Loader, 
  ArrowRightLeft, 
  Receipt, 
  Wallet,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'مصر'
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      const suppliersList = response.data?.data || [];
      setSuppliers(suppliersList);
      setFilteredSuppliers(suppliersList);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useAutoRefresh(fetchSuppliers, 30000);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = suppliers.filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.phone?.toLowerCase()?.includes(query) ||
        s.company?.toLowerCase()?.includes(query)
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchQuery, suppliers]);

  const fetchSupplierLedger = useCallback(async (supplierId) => {
    try {
      setLoadingLedger(true);
      const response = await api.get(`/suppliers/${supplierId}/ledger`);
      setLedgerData(response.data?.data);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    fetchSupplierLedger(supplier.id);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', newSupplier);
      await fetchSuppliers();
      setShowAddSupplierModal(false);
      setNewSupplier({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        country: 'مصر'
      });
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('فشل في إضافة المورد');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    try {
      await api.post(`/suppliers/${selectedSupplier.id}/pay`, {
        amount: parseFloat(paymentAmount),
        notes: paymentNotes || null,
        date: new Date().toISOString()
      });
      await fetchSupplierLedger(selectedSupplier.id);
      await fetchSuppliers();
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('فشل في تسجيل الدفع');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);
  const activeSuppliersWithDebt = suppliers.filter(s => (s.totalDebt || 0) > 0).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">حسابات الموردين</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">كشف الحساب التفصيلي</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-300">الموردين:</span>
              <span className="font-bold text-slate-900 dark:text-white">{suppliers.length}</span>
            </div>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-300">ذمم:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{activeSuppliersWithDebt}</span>
            </div>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">الإجمالي:</span>
              <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDebt)}</span>
            </div>
          </div>

          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مورد</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
        {/* Suppliers List Panel */}
        <div className="w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المورد..."
                className="w-full px-10 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Suppliers List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <Loader className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">جاري التحميل...</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <Building2 className="w-16 h-16 text-slate-200 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">لا يوجد موردين</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredSuppliers.map((supplier) => {
                  const debt = supplier.totalDebt || 0;
                  const hasDebt = debt > 0;
                  
                  return (
                    <button
                      key={supplier.id}
                      onClick={() => handleSelectSupplier(supplier)}
                      className={`w-full p-4 text-right transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                        selectedSupplier?.id === supplier.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            hasDebt ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <Building2 className={`w-5 h-5 ${hasDebt ? 'text-red-500' : 'text-green-500'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{supplier.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{supplier.phone || '-'}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                          hasDebt 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}>
                          {formatCurrency(debt)}
                        </div>
                      </div>
                      {supplier.city && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {supplier.city}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ledger Dashboard */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {!selectedSupplier ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                <ArrowRightLeft className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">اختر مورداً لعرض كشف الحساب</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ستظهر المعاملات المالية هنا</p>
            </div>
          ) : loadingLedger ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Loader className="w-10 h-10 animate-spin text-blue-500 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">جاري تحميل الكشف...</p>
            </div>
          ) : (
            <>
              {/* Supplier Info Header */}
              <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-l from-blue-50/50 to-transparent dark:from-blue-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSupplier.name}</h2>
                      <div className="flex items-center gap-4 mt-1">
                        {selectedSupplier.phone && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {selectedSupplier.phone}
                          </p>
                        )}
                        {selectedSupplier.city && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {selectedSupplier.city}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Summary Cards */}
                    <div className="flex gap-3">
                      <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">الرصيد المستحق</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(ledgerData?.supplier?.totalDebt || 0)}</p>
                      </div>
                      <div className="px-5 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl">
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">إجمالي المدفوع</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(ledgerData?.summary?.totalPaid || 0)}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.location.href = '/purchases'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 font-semibold text-sm"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>إضافة فاتورة</span>
                      </button>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/20 font-semibold text-sm"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>دفع مبلغ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-shrink-0 overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <th className="px-4 py-3 w-12">#</th>
                        <th className="px-4 py-3 w-32">التاريخ</th>
                        <th className="px-4 py-3">البيان</th>
                        <th className="px-4 py-3 w-28 text-center">المبلغ</th>
                        <th className="px-4 py-3 w-28 text-center">الرصيد</th>
                        <th className="px-4 py-3 w-24">الحالة</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {ledgerData?.ledger?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <FileText className="w-16 h-16 text-slate-200 dark:text-slate-600 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">لا توجد معاملات بعد</p>
                    </div>
                  ) : (
                    <table className="w-full min-w-[700px]">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {ledgerData?.ledger?.map((entry, index) => {
                          const isPurchase = entry.type === 'PURCHASE';
                          
                          return (
                            <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isPurchase ? 'bg-red-50/30 dark:bg-red-900/10' : 'bg-green-50/30 dark:bg-green-900/10'}`}>
                              <td className="px-4 py-3 w-12 text-center">
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 w-32">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.date)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isPurchase ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                                  }`}>
                                    {isPurchase ? (
                                      <Receipt className="w-4 h-4 text-red-500" />
                                    ) : (
                                      <Wallet className="w-4 h-4 text-green-500" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-slate-900 dark:text-white">{entry.description}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 w-28 text-center">
                                <span className={`font-bold text-lg ${isPurchase ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {isPurchase ? '+' : ''}{formatCurrency(Math.abs(entry.amount))}
                                </span>
                              </td>
                              <td className="px-4 py-3 w-28 text-center">
                                <span className={`font-bold ${entry.runningBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {formatCurrency(entry.runningBalance)}
                                </span>
                              </td>
                              <td className="px-4 py-3 w-24">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  isPurchase 
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                }`}>
                                  {isPurchase ? 'مشتريات' : 'دفع'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">إضافة مورد جديد</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddSupplier} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم المورد *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="أدخل اسم المورد"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">العنوان</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل العنوان"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المدينة</label>
                  <input
                    type="text"
                    value={newSupplier.city}
                    onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="القاهرة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المنطقة</label>
                  <input
                    type="text"
                    value={newSupplier.state}
                    onChange={(e) => setNewSupplier({...newSupplier, state: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="المصر الجديدة"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition font-semibold"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">تسجيل دفعة</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Supplier Info Card */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedSupplier.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">المورد</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">المبلغ المستحق</p>
                    <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(ledgerData?.supplier?.totalDebt || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي المدفوع</p>
                    <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(ledgerData?.summary?.totalPaid || 0)}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePayment}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المبلغ *</label>
                  <div className="relative">
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-10 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    الحد الأقصى: {formatCurrency(ledgerData?.supplier?.totalDebt || 0)} جنيه
                  </p>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ملاحظات</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="أي ملاحظات..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    تأكيد الدفع
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;