import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Plus, X, DollarSign, RotateCcw, Loader, 
  TrendingUp, TrendingDown, Receipt, CreditCard, Banknote,
  Calculator, Printer, History, ArrowLeftRight, CheckCircle, AlertCircle, UserCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie.js';

const STORAGE_KEY = 'activeShift';

export default function ShiftManager() {
  const { user } = useAuth();
  
  // Local state
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [shiftId, setShiftId] = useState(null);
  const [shiftStartTime, setShiftStartTime] = useState(null);
  const [shiftOpeningCash, setShiftOpeningCash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  
  // Stepper state for Closing
  const [closeStep, setCloseStep] = useState(0); // 0: hidden, 1: review, 2: notes, 3: confirm
  const [closingCash, setClosingCash] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [openingCash, setOpeningCash] = useState('');

  // Other form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('OTHER');
  
  const [handoverAmount, setHandoverAmount] = useState('');
  const [handoverReceiver, setHandoverReceiver] = useState('');

  const [salesHistory, setSalesHistory] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');

  // Dexie live queries
  const activeShiftDetails = useLiveQuery(
    () => db.shifts.where('status').equals('OPEN').first()
  );

  const activities = useLiveQuery(
    () => shiftId ? db.shiftActivities.where('shiftId').equals(shiftId).reverse().limit(20).toArray() : []
  , [shiftId]);

  const expenses = useLiveQuery(
    () => shiftId ? db.shiftExpenses.where('shiftId').equals(shiftId).toArray() : []
  , [shiftId]);

  const handovers = useLiveQuery(
    () => shiftId ? db.shiftHandovers.where('shiftId').equals(shiftId).toArray() : []
  , [shiftId]);

  const pastShifts = useLiveQuery(
    () => db.shifts.where('status').equals('CLOSED').reverse().limit(7).toArray()
  );

  useEffect(() => {
    checkActiveShift();
    // Poll to keep last update timestamp fresh
    const timer = setInterval(() => setLastUpdate(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const checkActiveShift = async () => {
    try {
      const res = await api.get('/shifts/current');
      if (res.data.success && res.data.data) {
        const shift = res.data.data;
        setIsShiftOpen(true);
        setShiftId(shift.id);
        setShiftStartTime(new Date(shift.startTime));
        setShiftOpeningCash(shift.openingCash);
        
        // Sync to local DB if not present
        const localShift = await db.shifts.get(shift.id);
        if (!localShift) {
          await db.shifts.put({
            id: shift.id,
            openedAt: shift.startTime,
            cashierId: user?.id,
            openingCash: shift.openingCash,
            status: 'OPEN'
          });
        }
        
        fetchShiftSales();
      }
    } catch (err) {
      console.error('Error checking shift:', err);
    }
  };

  const fetchShiftSales = async () => {
    try {
      const res = await api.get('/shifts/sales');
      if (res.data.success) {
        setSalesHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching shift sales:', err);
    }
  };

  const logActivity = async (type, amount, reference) => {
    if (!shiftId) return;
    await db.shiftActivities.add({
      shiftId,
      type,
      amount,
      reference,
      timestamp: new Date().toISOString(),
      userId: user?.id
    });
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) {
      setError('اكتب مبلغ صحيح لفتح الشيفت');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/shifts/open', { openingCash: cash });
      if (res.data.success) {
        const shift = res.data.data;
        setIsShiftOpen(true);
        setShiftId(shift.id);
        setShiftStartTime(new Date(shift.startTime));
        setShiftOpeningCash(shift.openingCash);
        
        await db.shifts.put({
          id: shift.id,
          openedAt: shift.startTime,
          cashierId: user?.id,
          openingCash: shift.openingCash,
          status: 'OPEN'
        });

        await logActivity('OPEN', shift.openingCash, 'فتح شيفت جديد');
        
        setShowOpenModal(false);
        setOpeningCash('');
      } else {
        setError(res.data.message || 'فشل فتح الشيفت');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message;
      if (errMsg === 'An open shift already exists for this user') {
        // Auto-recover if the shift already exists but wasn't loaded
        await checkActiveShift();
        setShowOpenModal(false);
        setOpeningCash('');
      } else {
        setError(errMsg || 'فشل فتح الشيفت');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    const cash = parseFloat(closingCash);
    if (isNaN(cash) || cash < 0) {
      setError('اكتب مبلغ صحيح لتقفيل الشيفت');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/shifts/close', {
        shiftId,
        actualClosingCash: cash,
        notes: discrepancyNotes,
      });
      if (res.data.success) {
        // Sync close to local DB
        await db.shifts.update(shiftId, {
          closedAt: new Date().toISOString(),
          closingCash: cash,
          actualCash: cash,
          notes: discrepancyNotes,
          status: 'CLOSED'
        });
        
        await logActivity('CLOSE', cash, 'تقفيل شيفت');
        
        setIsShiftOpen(false);
        setShiftId(null);
        setShiftStartTime(null);
        setShiftOpeningCash(null);
        setSalesHistory([]);
        setCloseStep(0);
        setClosingCash('');
        setDiscrepancyNotes('');
      } else {
        setError(res.data.message || 'فشل تقفيل الشيفت');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تقفيل الشيفت');
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!expenseDescription || isNaN(amt) || amt <= 0) {
      setError('املا كل الخانات بشكل صحيح');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/pos/expense', {
        amount: amt,
        description: expenseDescription,
        category: expenseCategory,
        userId: user?.id,
      });
      if (res.data.success) {
        await db.shiftExpenses.add({
          shiftId,
          amount: amt,
          reason: expenseDescription,
          category: expenseCategory,
          timestamp: new Date().toISOString(),
          addedBy: user?.id
        });
        await logActivity('EXPENSE', amt, expenseDescription);
        
        setShowExpenseModal(false);
        setExpenseAmount('');
        setExpenseDescription('');
        setExpenseCategory('OTHER');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في إضافة المصروف');
    } finally {
      setLoading(false);
    }
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(handoverAmount);
    if (!handoverReceiver || isNaN(amt) || amt <= 0) {
      setError('املا كل الخانات بشكل صحيح');
      return;
    }
    setLoading(true);
    try {
      // Assuming no backend endpoint for handover yet, we just store it locally for now 
      // or we simulate if backend is not ready.
      await db.shiftHandovers.add({
        shiftId,
        amount: amt,
        receiver: handoverReceiver,
        timestamp: new Date().toISOString()
      });
      await logActivity('HANDOVER', amt, `تحويل إلى ${handoverReceiver}`);
      
      setShowHandoverModal(false);
      setHandoverAmount('');
      setHandoverReceiver('');
    } catch (err) {
      setError('خطأ في التحويل');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale || returnItems.length === 0) {
      setError('اختار أصناف للإرجاع');
      return;
    }
    const validItems = returnItems.filter(i => (i.returnQty || 0) > 0);
    if (validItems.length === 0) {
      setError('اختار كمية للإرجاع');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/pos/return', {
        saleId: selectedSale.id,
        items: validItems.map(i => ({ saleItemId: i.saleItemId, quantity: i.returnQty })),
        reason: returnReason,
        userId: user?.id,
      });
      if (res.data.success) {
        await logActivity('RETURN', res.data.refundAmount, returnReason || 'إرجاع أصناف');
        setShowReturnModal(false);
        setSelectedSale(null);
        setReturnItems([]);
        setReturnReason('');
        fetchShiftSales();
      } else {
        setError(res.data.error || 'فشل الإرجاع');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في الإرجاع');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSale = (sale) => {
    setSelectedSale(sale);
    setReturnItems(sale.items.map(item => ({
      saleItemId: item.id,
      drugName: item.drugName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      returnQty: 0,
    })));
  };

  const updateReturnQty = (index, qty) => {
    const newItems = [...returnItems];
    const max = newItems[index].quantity;
    newItems[index].returnQty = Math.min(Math.max(0, parseInt(qty) || 0), max);
    setReturnItems(newItems);
  };

  const formatTime = (date) => date ? new Date(date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' });

  // Calculate Metrics
  const totalSalesAll = salesHistory.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const cashSales = salesHistory.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const visaSales = salesHistory.filter(s => s.paymentMethod === 'VISA').reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const creditSales = salesHistory.filter(s => s.paymentMethod === 'CREDIT').reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  
  // Note: if API doesn't return paymentMethod, we will assume all are cash for now or default.
  // Actually, we use totalSalesAll if no payment method distinction.
  
  // Try to use local activities for returns if not in salesHistory
  const returnActivities = activities?.filter(a => a.type === 'RETURN') || [];
  const returnsTotal = returnActivities.reduce((sum, a) => sum + a.amount, 0);

  const expensesTotal = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const handoversTotal = handovers?.reduce((sum, h) => sum + h.amount, 0) || 0;

  // Expected in drawer = Opening + Cash Sales - Returns - Expenses - Handovers
  const netShift = cashSales - returnsTotal - expensesTotal;
  const expectedCash = (shiftOpeningCash || 0) + cashSales - returnsTotal - expensesTotal - handoversTotal;

  const handlePrint = () => {
    window.print();
  };

  // ----------------------------------------------------
  // Render Helpers
  // ----------------------------------------------------
  
  const StatCard = ({ title, value, count, icon: Icon, colorClass, bgColorClass }) => (
    <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] p-5 md-elevation-1 transition-transform hover:scale-[1.02] duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-3 rounded-[var(--md-radius-md)] ${bgColorClass}`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        {count !== undefined && (
          <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full">
            {count} عملية
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 mt-3">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value.toFixed(2)} <span className="text-sm font-normal text-gray-500">ج.م</span>
      </p>
    </div>
  );

  const ActivityIcon = ({ type }) => {
    switch(type) {
      case 'OPEN': return <Plus className="w-4 h-4 text-green-600" />;
      case 'CLOSE': return <X className="w-4 h-4 text-red-600" />;
      case 'RETURN': return <RotateCcw className="w-4 h-4 text-orange-600" />;
      case 'EXPENSE': return <TrendingDown className="w-4 h-4 text-purple-600" />;
      case 'HANDOVER': return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Print-Only Layout */}
      <div className="hidden shift-report-print">
        <div className="text-center mb-4 border-b pb-2">
          <h2 className="text-xl font-bold">تقرير الوردية</h2>
          <p className="text-sm">{formatDate(new Date())}</p>
        </div>
        <div className="mb-4">
          <p><strong>الكاشير:</strong> {user?.name}</p>
          <p><strong>وقت البدء:</strong> {formatTime(shiftStartTime)}</p>
          <p><strong>عهدة البدء:</strong> {shiftOpeningCash} ج.م</p>
        </div>
        <div className="border-b mb-4 pb-2 space-y-1">
          <p><strong>المبيعات النقدية:</strong> {cashSales?.toFixed(2)} ج.م</p>
          <p><strong>المبيعات بالآجل:</strong> {creditSales?.toFixed(2)} ج.م</p>
          <p><strong>المبيعات بالفيزا:</strong> {visaSales?.toFixed(2)} ج.م</p>
          <p><strong>المرتجعات:</strong> {returnsTotal?.toFixed(2)} ج.م</p>
          <p><strong>المصروفات:</strong> {expensesTotal?.toFixed(2)} ج.م</p>
          <p><strong>تحويل عهدة:</strong> {handoversTotal?.toFixed(2)} ج.م</p>
          <p className="font-bold mt-2 text-lg border-t pt-2"><strong>المتوقع في الدرج:</strong> {expectedCash?.toFixed(2)} ج.م</p>
        </div>
        <div className="text-center text-xs">
          <p>تم الطباعة بواسطة نظام الصيدلية</p>
        </div>
      </div>

      {/* Main UI */}
      <div className="shrink-0 p-6 border-b border-gray-200 dark:border-slate-700 bg-[var(--md-surface)] md-elevation-1 z-10 no-print flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--md-primary-container)] rounded-lg">
              <Clock className="w-6 h-6 text-[var(--md-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الشيفت</h1>
              <div className="flex items-center gap-2 mt-1">
                {isShiftOpen ? (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">الشيفت مفتوح</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500"></span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">الشيفت مغلق</span>
                  </div>
                )}
                {isShiftOpen && <span className="text-xs text-gray-500">| آخر تحديث: {formatTime(lastUpdate)}</span>}
              </div>
            </div>
          </div>
        </div>
        <div>
          {!isShiftOpen ? (
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-[var(--md-primary)] hover:opacity-90 text-white font-semibold py-2.5 px-6 rounded-[var(--md-radius-full)] flex items-center gap-2 md-elevation-2 transition-all"
            >
              <Plus className="w-5 h-5" /> افتح شيفت جديد
            </button>
          ) : (
            <button
              onClick={() => setCloseStep(1)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-[var(--md-radius-full)] flex items-center gap-2 md-elevation-2 transition-all"
            >
              <X className="w-5 h-5" /> تقفيل الشيفت
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-print">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {isShiftOpen ? (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard title="المبيعات النقدية" value={cashSales} count={salesHistory.filter(s => s.paymentMethod === 'CASH').length} icon={Banknote} colorClass="text-green-600 dark:text-green-400" bgColorClass="bg-green-100 dark:bg-green-900/40" />
              <StatCard title="المبيعات بالآجل" value={creditSales} count={salesHistory.filter(s => s.paymentMethod === 'CREDIT').length} icon={Clock} colorClass="text-orange-600 dark:text-orange-400" bgColorClass="bg-orange-100 dark:bg-orange-900/40" />
              <StatCard title="المبيعات بالفيزا" value={visaSales} count={salesHistory.filter(s => s.paymentMethod === 'VISA').length} icon={CreditCard} colorClass="text-blue-600 dark:text-blue-400" bgColorClass="bg-blue-100 dark:bg-blue-900/40" />
              <StatCard title="إجمالي المرتجعات" value={returnsTotal} count={returnActivities.length} icon={RotateCcw} colorClass="text-red-600 dark:text-red-400" bgColorClass="bg-red-100 dark:bg-red-900/40" />
              <StatCard title="إجمالي المصروفات" value={expensesTotal} count={expenses?.length} icon={TrendingDown} colorClass="text-purple-600 dark:text-purple-400" bgColorClass="bg-purple-100 dark:bg-purple-900/40" />
              
              {/* Extra MD3 Cards */}
              <div className="bg-gradient-to-br from-[var(--md-primary)] to-blue-600 rounded-[var(--md-radius-lg)] p-5 text-white md-elevation-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/20 rounded-[var(--md-radius-md)] backdrop-blur-sm">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-blue-100 mt-3">صافي الشيفت</h3>
                <p className="text-3xl font-bold mt-1">{netShift.toFixed(2)} <span className="text-sm font-normal text-blue-200">ج.م</span></p>
                <p className="text-xs text-blue-100 mt-2 opacity-80">المبيعات النقدية - المرتجعات - المصروفات</p>
              </div>

              <div className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-slate-800 dark:to-slate-900 rounded-[var(--md-radius-lg)] p-5 text-white md-elevation-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/10 rounded-[var(--md-radius-md)] backdrop-blur-sm">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-300 mt-3">المتوقع في الدرج</h3>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{expectedCash.toFixed(2)} <span className="text-sm font-normal text-gray-400">ج.م</span></p>
                <p className="text-xs text-gray-400 mt-2">بداية: {shiftOpeningCash} ج.م</p>
              </div>
            </div>

            {/* Quick Actions & Timeline Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Quick Actions */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">إجراءات سريعة</h2>
                
                <button onClick={() => setShowExpenseModal(true)} className="w-full flex items-center gap-4 p-4 bg-[var(--md-surface-variant)] hover:bg-gray-100 dark:hover:bg-slate-700 rounded-[var(--md-radius-md)] md-elevation-1 transition-colors text-right">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">إضافة مصروف</h3>
                    <p className="text-xs text-gray-500 mt-0.5">تسجيل مصروفات من الدرج</p>
                  </div>
                </button>

                <button onClick={() => setShowReturnModal(true)} className="w-full flex items-center gap-4 p-4 bg-[var(--md-surface-variant)] hover:bg-gray-100 dark:hover:bg-slate-700 rounded-[var(--md-radius-md)] md-elevation-1 transition-colors text-right">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                    <RotateCcw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">إرجاع أصناف</h3>
                    <p className="text-xs text-gray-500 mt-0.5">استرجاع منتجات للعميل</p>
                  </div>
                </button>

                <button onClick={() => setShowHandoverModal(true)} className="w-full flex items-center gap-4 p-4 bg-[var(--md-surface-variant)] hover:bg-gray-100 dark:hover:bg-slate-700 rounded-[var(--md-radius-md)] md-elevation-1 transition-colors text-right">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <ArrowLeftRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">تحويل عهدة</h3>
                    <p className="text-xs text-gray-500 mt-0.5">تسليم مبلغ للمدير</p>
                  </div>
                </button>

                <button onClick={handlePrint} className="w-full flex items-center gap-4 p-4 bg-[var(--md-surface-variant)] hover:bg-gray-100 dark:hover:bg-slate-700 rounded-[var(--md-radius-md)] md-elevation-1 transition-colors text-right">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                    <Printer className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">طباعة التقرير</h3>
                    <p className="text-xs text-gray-500 mt-0.5">طباعة تقرير الشيفت الحالي</p>
                  </div>
                </button>
              </div>

              {/* Activity Timeline */}
              <div className="lg:col-span-2">
                <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] p-6 md-elevation-1 h-full max-h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">سجل النشاط</h2>
                    <span className="text-xs font-medium px-3 py-1 bg-[var(--md-primary-container)] text-[var(--md-primary)] rounded-full">
                      مباشر
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto pe-2 space-y-4">
                    {activities && activities.length > 0 ? activities.map((activity, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-700 z-10`}>
                            <ActivityIcon type={activity.type} />
                          </div>
                          {idx !== activities.length - 1 && <div className="w-0.5 h-full bg-gray-200 dark:bg-slate-700 my-1"></div>}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{activity.reference}</p>
                              <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mt-1">
                              المبلغ: {activity.amount?.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-10">
                        <History className="w-12 h-12 mb-3 opacity-20" />
                        <p>لا يوجد نشاط مسجل حتى الآن</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Shift is Closed - Empty State / History */
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800 mb-6">
              <Clock className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">لا يوجد شيفت مفتوح حالياً</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
              للبدء في تسجيل المبيعات والعمليات، يجب فتح شيفت جديد وتحديد عهدة البداية.
            </p>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-[var(--md-primary)] hover:opacity-90 text-white font-bold py-3 px-8 rounded-[var(--md-radius-full)] inline-flex items-center gap-2 md-elevation-2 transition-all text-lg"
            >
              <Plus className="w-6 h-6" /> فتح شيفت جديد
            </button>
          </div>
        )}

        {/* Closed Shifts History List */}
        {!isShiftOpen && pastShifts && pastShifts.length > 0 && (
          <div className="max-w-5xl mx-auto mt-12">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <History className="text-gray-500" /> الشفتات السابقة
            </h3>
            <div className="bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] md-elevation-1 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">التاريخ</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">وقت الفتح</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">وقت القفل</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">عهدة البداية</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">المبلغ النهائي</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pastShifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                      <td className="p-4 text-sm text-gray-900 dark:text-white">{formatDate(shift.openedAt)}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-slate-400">{formatTime(shift.openedAt)}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-slate-400">{formatTime(shift.closedAt)}</td>
                      <td className="p-4 text-sm font-medium">{shift.openingCash?.toFixed(2)}</td>
                      <td className="p-4 text-sm font-medium text-blue-600 dark:text-blue-400">{shift.closingCash?.toFixed(2)}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs rounded-full font-medium">
                          مغلق
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      
      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--md-surface)] rounded-[var(--md-radius-xl)] md-elevation-3 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">فتح شيفت جديد</h2>
            </div>
            <form onSubmit={handleOpenShift} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-center">
                  المبلغ الفعلي في الدرج (عهدة البداية)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full text-center text-4xl font-bold px-4 py-4 border-2 border-[var(--md-primary)] rounded-xl bg-[var(--md-primary-container)]/30 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-[var(--md-primary)]/20"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">ج.م</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <UserCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">اسم الكاشير</p>
                  <p className="font-bold text-gray-900 dark:text-white">{user?.name || 'مستخدم النظام'}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOpenModal(false)} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-gray-700 dark:text-slate-200 transition-colors">
                  إلغاء
                </button>
                <button type="submit" disabled={loading || !openingCash} className="flex-[2] py-3.5 bg-[var(--md-primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md">
                  {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد وفتح الشيفت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Closing Stepper Modal */}
      {closeStep > 0 && (
        <div className="fixed inset-0 bg-[#0D1117]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--md-surface)] rounded-[var(--md-radius-xl)] md-elevation-3 w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">تقفيل الشيفت</h2>
              <button onClick={() => setCloseStep(0)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Stepper Header */}
              <div className="flex items-center justify-center mb-8 relative">
                <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-200 dark:bg-slate-700 -z-10 rounded-full"></div>
                <div className="absolute top-1/2 right-8 h-1 bg-[var(--md-primary)] -z-10 rounded-full transition-all duration-500" style={{ width: `${(closeStep - 1) * 50}%` }}></div>
                
                <div className="flex justify-between w-full px-4">
                  <div className={`flex flex-col items-center gap-2 ${closeStep >= 1 ? 'text-[var(--md-primary)]' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${closeStep >= 1 ? 'bg-[var(--md-surface)] border-[var(--md-primary)]' : 'bg-[var(--md-surface)] border-gray-300'}`}>1</div>
                    <span className="text-xs font-bold">المراجعة</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 ${closeStep >= 2 ? 'text-[var(--md-primary)]' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${closeStep >= 2 ? 'bg-[var(--md-surface)] border-[var(--md-primary)]' : 'bg-[var(--md-surface)] border-gray-300'}`}>2</div>
                    <span className="text-xs font-bold">الدرج والملاحظات</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2 ${closeStep >= 3 ? 'text-[var(--md-primary)]' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${closeStep >= 3 ? 'bg-[var(--md-surface)] border-[var(--md-primary)]' : 'bg-[var(--md-surface)] border-gray-300'}`}>3</div>
                    <span className="text-xs font-bold">التأكيد</span>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (closeStep < 3) setCloseStep(s => s + 1); else handleCloseShift(e); }}>
                
                {/* Step 1: Review */}
                {closeStep === 1 && (
                  <div className="space-y-4 animate-in slide-in-from-left">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">عهدة البداية</span>
                        <span className="font-bold text-gray-900 dark:text-white">{shiftOpeningCash?.toFixed(2)} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">إجمالي المبيعات</span>
                        <span className="font-bold text-green-600 dark:text-green-400">+{totalSalesAll?.toFixed(2)} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">المرتجعات والمصروفات</span>
                        <span className="font-bold text-red-600 dark:text-red-400">-{(returnsTotal + expensesTotal)?.toFixed(2)} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">تحويلات عهدة</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">-{handoversTotal?.toFixed(2)} ج.م</span>
                      </div>
                      <div className="border-t border-blue-200 dark:border-blue-800 pt-3 flex justify-between items-center">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">المتوقع في الدرج</span>
                        <span className="text-2xl font-bold text-[var(--md-primary)]">{expectedCash?.toFixed(2)} ج.م</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Input Actual Cash */}
                {closeStep === 2 && (
                  <div className="space-y-5 animate-in slide-in-from-left">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                        الرصيد الفعلي في الدرج (ج.م)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        className="w-full text-center text-3xl font-bold px-4 py-3 border-2 border-gray-300 focus:border-[var(--md-primary)] rounded-xl bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-[var(--md-primary)]/10"
                        placeholder="0.00"
                        autoFocus
                        required
                      />
                      {closingCash && (
                        <div className={`mt-3 p-3 rounded-lg flex items-center justify-center gap-2 font-bold ${
                          parseFloat(closingCash) === expectedCash ? 'bg-green-100 text-green-700' : 
                          parseFloat(closingCash) > expectedCash ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {parseFloat(closingCash) === expectedCash ? (
                            <><CheckCircle className="w-5 h-5"/> مطابق للمتوقع</>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5"/>
                              الفرق: {Math.abs(parseFloat(closingCash) - expectedCash).toFixed(2)} ج.م
                              {parseFloat(closingCash) > expectedCash ? ' (زيادة)' : ' (عجز)'}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                        ملاحظات الشيفت (اختياري)
                      </label>
                      <textarea
                        value={discrepancyNotes}
                        onChange={(e) => setDiscrepancyNotes(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-[var(--md-primary)]"
                        rows="3"
                        placeholder="أسباب العجز أو الزيادة أو أي ملاحظات أخرى..."
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Final Confirm */}
                {closeStep === 3 && (
                  <div className="space-y-4 text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 mx-auto rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">هل أنت متأكد من تقفيل الشيفت؟</h3>
                    <p className="text-gray-500 dark:text-slate-400 pb-4">
                      لا يمكن التراجع عن هذه الخطوة، سيتم إرسال التقرير النهائي وتسجيل الخروج من الشيفت.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-8">
                  {closeStep > 1 && (
                    <button type="button" onClick={() => setCloseStep(s => s - 1)} className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-gray-700 dark:text-slate-200 transition-colors">
                      السابق
                    </button>
                  )}
                  {closeStep < 3 ? (
                    <button type="submit" disabled={closeStep === 2 && !closingCash} className="flex-1 py-3.5 bg-[var(--md-primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md">
                      التالي
                    </button>
                  ) : (
                    <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2">
                      {loading ? <Loader className="w-5 h-5 animate-spin" /> : <><X className="w-5 h-5"/> تقفيل نهائي</>}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--md-surface)] rounded-[var(--md-radius-xl)] md-elevation-3 w-full max-w-md">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><DollarSign className="text-purple-600" /> إضافة مصروف</h2>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">المبلغ (ج.م)</label>
                <input type="number" step="0.01" min="0" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white text-xl font-bold" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">التصنيف</label>
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white">
                  <option value="SUPPLIES">مستلزمات</option>
                  <option value="MAINTENANCE">صيانة</option>
                  <option value="UTILITIES">فواتير وكهرباء</option>
                  <option value="CLEANING">نظافة</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">السبب / الوصف</label>
                <input type="text" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md mt-4">
                {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'حفظ المصروف'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--md-surface)] rounded-[var(--md-radius-xl)] md-elevation-3 w-full max-w-md">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><ArrowLeftRight className="text-blue-600" /> تحويل عهدة</h2>
              <button onClick={() => setShowHandoverModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleHandoverSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-500 mb-4">يستخدم لتسليم مبلغ من الدرج للمدير أو البنك أثناء الشيفت.</p>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">المبلغ المسلم (ج.م)</label>
                <input type="number" step="0.01" min="0" value={handoverAmount} onChange={(e) => setHandoverAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white text-xl font-bold" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">المستلم (اسم المدير)</label>
                <input type="text" value={handoverReceiver} onChange={(e) => setHandoverReceiver(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white" placeholder="مثال: د. محمد" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md mt-4">
                {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'تسجيل التحويل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal (Re-using some existing logic but styling with MD3) */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-[#0D1117]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--md-surface)] rounded-[var(--md-radius-xl)] md-elevation-3 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-[var(--md-surface)] z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><RotateCcw className="text-orange-600" /> إرجاع أصناف</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">بحث عن الفاتورة</label>
                <select
                  onChange={(e) => {
                    const sale = salesHistory.find(s => s.id === e.target.value);
                    if (sale) handleSelectSale(sale);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white"
                >
                  <option value="">اختار فاتورة...</option>
                  {salesHistory.map((sale) => (
                    <option key={sale.id} value={sale.id}>
                      {(sale.customer?.name || sale.customerName || 'عميل')} - {(sale.totalAmount || 0).toFixed(2)} جنيه - {formatTime(sale.saleDate)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSale && (
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">الأصناف المتاحة للإرجاع</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto pe-2">
                    {returnItems.map((item, index) => (
                      <div key={item.saleItemId} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 dark:text-white" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.drugName}>{item.drugName}</p>
                          <p className="text-xs text-gray-500 mt-1">المباع: {item.quantity} | السعر: {(item.unitPrice || 0).toFixed(2)} ج.م</p>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={item.returnQty || ''}
                            onChange={(e) => updateReturnQty(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-center font-bold"
                            placeholder="الكمية"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSale && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">سبب الإرجاع</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white"
                    placeholder="مثال: خطأ في الصرف، منتهي الصلاحية..."
                  />
                </div>
              )}

              {selectedSale && (
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md mt-4">
                  {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'إتمام الإرجاع'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
