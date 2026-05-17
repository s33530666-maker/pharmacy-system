import { useState, useEffect } from 'react';
import { Building2, DollarSign, Calendar, Plus, X, Search, Trash2, Edit, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const SupplierDebts = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
}, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [debtsRes, suppliersRes] = await Promise.all([
        api.get('/supplier-debts'),
        api.get('/suppliers'),
      ]);
      setSuppliers(debtsRes.data?.data || []);
      setAllSuppliers(suppliersRes.data?.suppliers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(fetchData, 20000);

  const addDebt = async (debtData) => {
    try {
      const response = await api.post('/supplier-debts', {
        supplierId: debtData.supplierId,
        invoiceAmount: debtData.invoiceAmount,
        dueDate: debtData.dueDate || null,
        notes: debtData.notes || null,
      });
      
      if (response.data?.success) {
        await fetchData();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error adding debt:', error);
      alert('فشل إضافة فاتورة');
    }
  };

  const updateDebt = async (debtData) => {
    try {
      const response = await api.put(`/supplier-debts/${editingDebt.id}`, {
        invoiceAmount: debtData.invoiceAmount,
        dueDate: debtData.dueDate || null,
        notes: debtData.notes || null,
      });
      
      if (response.data?.success) {
        await fetchData();
        setEditingDebt(null);
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating debt:', error);
      alert('فشل تعديل فاتورة');
    }
  };

  const deleteDebt = async (debtId) => {
    if (!window.confirm('حذف الفاتورة دي؟')) return;
    
    try {
      await api.delete(`/supplier-debts/${debtId}`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting debt:', error);
      alert('لا يمكن حذف فاتورة عليها مدفوعات');
    }
  };

  const recordPayment = async () => {
    if (!selectedDebt || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      alert('المبلغ غير صحيح');
      return;
    }

    try {
      await api.post(`/supplier-debts/${selectedDebt.id}/payments`, {
        amount,
        paymentDate: new Date().toISOString(),
      });
      await fetchData();
      setShowPaymentModal(false);
      setSelectedDebt(null);
      setPaymentAmount('');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('فشل تسجيل الدفع');
    }
  };

  const deletePayment = async (debtId, paymentId) => {
    if (!window.confirm('حذف هذا الدفع؟')) return;
    
    try {
      await api.delete(`/supplier-debts/${debtId}/payments/${paymentId}`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('فشل حذف الدفع');
    }
  };

  const filteredDebts = suppliers.filter(s => 
    s.supplier?.name?.toLowerCase().includes(searchInput.toLowerCase())
  );

  const totalInvoice = suppliers.reduce((sum, s) => sum + s.invoiceAmount, 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalDebt = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);
  const overdueCount = suppliers.filter(s => {
    if (!s.dueDate) return false;
    return new Date(s.dueDate) < new Date() && s.currentBalance > 0;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              حسابات الشركات
            </h1>
          </div>
          <button
            onClick={() => {
              setEditingDebt(null);
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-[var(--md-primary)] text-white rounded-full hover:bg-blue-700 transition font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة فاتورة
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-[var(--md-radius-md)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">إجمالي الفواتير</p>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-300">{totalInvoice.toFixed(2)} جنيه</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-[var(--md-radius-md)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">المدفوع</p>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-300">{totalPaid.toFixed(2)} جنيه</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-[var(--md-radius-md)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">المتبقي</p>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-300">{totalDebt.toFixed(2)} جنيه</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-[var(--md-radius-md)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">متأخر</p>
            </div>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-300">{overdueCount} فاتورة</p>
          </div>
        </div>

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="supplier-search"
              name="supplier-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث باسم الشركة..."
              className="w-full pe-10 ps-4 py-2.5 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
            />
          </div>
        </div>

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">جاري التحميل...</p>
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">مفيش فواتير شركات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <tr className="text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <th className="px-4 py-3">اسم الشركة</th>
                    <th className="px-4 py-3">قيمة الفاتورة</th>
                    <th className="px-4 py-3">المدفوع</th>
                    <th className="px-4 py-3">المتبقي</th>
                    <th className="px-4 py-3">تاريخ الاستحقاق</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredDebts.map((debt) => {
                    const remaining = debt.currentBalance;
                    const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && remaining > 0;
                    const isPaidOff = remaining <= 0;

                    return (
                      <tr key={debt.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900 dark:text-white">{debt.supplier?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-900 dark:text-white">{debt.invoiceAmount.toFixed(2)} جنيه</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-green-600 dark:text-green-400">{debt.paidAmount.toFixed(2)} جنيه</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {remaining.toFixed(2)} جنيه
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className={`${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                              {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('ar-EG') : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            isPaidOff
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50'
                              : isOverdue
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50'
                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50'
                          }`}>
                            {isPaidOff ? 'سداد كامل' : isOverdue ? 'متأخر' : 'مستحق'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            {remaining > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedDebt(debt);
                                  setShowPaymentModal(true);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                              >
                                تسجيل دفع
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingDebt(debt);
                                setShowModal(true);
                              }}
                              className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDebt(debt.id)}
                              className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <SupplierDebtModal
            debt={editingDebt}
            suppliers={allSuppliers}
            onSave={editingDebt ? updateDebt : addDebt}
            onClose={() => {
              setShowModal(false);
              setEditingDebt(null);
            }}
          />
        )}

        {showPaymentModal && selectedDebt && (
          <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">تسجيل دفع</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">الشركة</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedDebt.supplier?.name}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">قيمة الفاتورة</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedDebt.invoiceAmount.toFixed(2)} جنيه</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">المدفوع بالفعل</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">{selectedDebt.paidAmount.toFixed(2)} جنيه</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="payment-amount" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    المبلغ المدفوع
                  </label>
                  <input
                    id="payment-amount"
                    name="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="اكتب المبلغ"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xl font-bold"
                    autoFocus
                  />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    الحد الأقصى: {selectedDebt.currentBalance.toFixed(2)} جنيه
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
                >
                  إلغاء
                </button>
                <button
                  onClick={recordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  تأكيد الدفع
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function SupplierDebtModal({ debt, suppliers, onSave, onClose }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(debt?.supplierId || '');
  const [invoiceAmount, setInvoiceAmount] = useState(debt?.invoiceAmount?.toString() || '');
  const [dueDate, setDueDate] = useState(debt?.dueDate ? debt.dueDate.split('T')[0] : '');
  const [notes, setNotes] = useState(debt?.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!debt && !selectedSupplierId) {
      alert('اختر شركة');
      return;
    }
    if (!invoiceAmount) {
      alert('اكتب قيمة الفاتورة');
      return;
    }
    
    onSave({
      supplierId: debt?.supplierId || selectedSupplierId,
      invoiceAmount: parseFloat(invoiceAmount),
      dueDate: dueDate || null,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {debt ? 'تعديل فاتورة' : 'إضافة فاتورة جديدة'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!debt && (
            <div>
              <label htmlFor="new-supplier-select" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                الشركة
              </label>
              <select
                id="new-supplier-select"
                name="supplier-select"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                required
              >
                <option value="">اختر شركة</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="invoice-amount" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              قيمة الفاتورة (جنيه)
            </label>
            <input
              id="invoice-amount"
              name="invoice-amount"
              type="number"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="due-date" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              تاريخ الاستحقاق
            </label>
            <input
              id="due-date"
              name="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="debt-notes" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="debt-notes"
              name="debt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              {debt ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SupplierDebts;
