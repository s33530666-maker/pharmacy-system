import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, AlertTriangle, Package,
  Calendar, RefreshCw, ShoppingCart, BarChart2, Clock,
  AlertCircle, CreditCard, Truck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';



const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [metrics, setMetrics] = useState({
    todaySales: 0, netProfit: 0, dailyExpenses: 0,
    lowStockCount: 0, expiringSoonCount: 0,
    expiredCount: 0, customerDebt: 0, supplierDebt: 0,
  });
  const [monthlyData, setMonthlyData] = useState({ monthlyRevenue: 0, totalSales: 0 });
  const [monthlyProfit, setMonthlyProfit] = useState({ monthlyProfit: 0 });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topDrugs, setTopDrugs] = useState([]);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [showAllExpiring, setShowAllExpiring] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, monthlyRes, monthlyProfitRes, expRes, weeklyRes, topRes, transRes, expCountRes, lowStockRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/monthly-revenue'),
        api.get('/reports/monthly-profit'),
        api.get('/reports/expiring-soon?days=90'),
        api.get('/reports/weekly-sales'),
        api.get('/reports/top-selling?limit=8'),
        api.get('/reports/recent-transactions'),
        api.get('/reports/expired-count'),
        api.get('/reports/low-stock'),
      ]);

      const dash = dashRes.data;
      const monthly = monthlyRes.data;
      const monthlyP = monthlyProfitRes.data;
      const exp = expRes.data;
      const weekly = weeklyRes.data;
      const top = topRes.data;
      const trans = transRes.data;
      const expCount = expCountRes.data;
      const lowStock = lowStockRes.data;

      if (dash.success) {
        setMetrics(prev => ({
          ...prev,
          todaySales: dash.data.todaySales || 0,
          netProfit: dash.data.netProfit || 0,
          lowStockCount: dash.data.lowStockCount || 0,
          expiringSoonCount: dash.data.expiringSoonCount || 0,
        }));
      }

      if (monthly.success) setMonthlyData(monthly.data);
      if (monthlyP.success) setMonthlyProfit(monthlyP.data);
      if (exp.success) setExpiringItems(exp.data);
      if (lowStock.success) setLowStockItems(lowStock.data);
      if (weekly.success) setChartData(weekly.data);
      if (top.success) setTopDrugs(top.data);
      if (trans.success) setRecentSales(trans.data.slice(0, 5));
      if (expCount.success) setMetrics(prev => ({ ...prev, expiredCount: expCount.data.count || 0 }));

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 300000); // 5 minutes
    const onFocus = () => fetchAll();
    window.addEventListener('focus', onFocus);
    window.addEventListener('settingsUpdated', fetchAll);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('settingsUpdated', fetchAll);
    };
  }, [fetchAll]);

  const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', {
    style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const dayName = (date) => {
    const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعه', 'سبت'];
    return days[new Date(date).getDay()] || date;
  };

  const chartDataAR = chartData.map(d => ({
    ...d, name: d.date ? dayName(d.date) : d.name,
    revenue: d.sales, label: formatCurrency(d.sales),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--md-bg-gray-50)] dark:bg-[var(--md-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-[var(--md-primary)] border-t-transparent rounded-full"></div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">جارٍ تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              لوحة الإحصائيات
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
              مرحباً يا {user?.name} — آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG')}
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--md-primary)] hover:bg-blue-700 text-white rounded-full shadow-sm text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'مبيعات اليوم', value: metrics.todaySales, sub: 'إيرادات اليوم', icon: <DollarSign />, color: 'blue' },
            { label: 'ربح اليوم', value: metrics.netProfit, sub: 'صافي الربح', icon: <TrendingUp />, color: 'green' },
            { label: 'دخل الشهر', value: monthlyData.monthlyRevenue, sub: `${monthlyData.totalSales} فاتورة`, icon: <BarChart2 />, color: 'purple' },
            { label: 'ربح الشهر', value: monthlyProfit.monthlyProfit, sub: `${monthlyProfit.totalSales} فاتورة`, icon: <TrendingUp />, color: 'indigo' },
            { label: 'نقص المخزون', value: metrics.lowStockCount, sub: 'أدوية تحتاج طلب', icon: <Package />, color: 'orange' },
            { label: 'قرب انتهاء', value: metrics.expiringSoonCount, sub: 'خلال 3 شهور', icon: <AlertTriangle />, color: 'red' },
            { label: 'منتهية الصلاحية', value: metrics.expiredCount, sub: 'كمية غير صالحة', icon: <AlertCircle />, color: 'red' },
          ].map((card, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-200/80 dark:border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{card.label}</span>
                {card.color === 'blue' && <div className="p-2 rounded-[var(--md-radius-sm)] bg-blue-100 dark:bg-blue-900/30"><DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>}
                {card.color === 'green' && <div className="p-2 rounded-[var(--md-radius-sm)] bg-green-100 dark:bg-green-900/30"><TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" /></div>}
                {card.color === 'purple' && <div className="p-2 rounded-[var(--md-radius-sm)] bg-purple-100 dark:bg-purple-900/30"><BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>}
                {card.color === 'indigo' && <div className="p-2 rounded-[var(--md-radius-sm)] bg-indigo-100 dark:bg-indigo-900/30"><TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>}
                {card.color === 'orange' && <div className="p-2 rounded-[var(--md-radius-sm)] bg-orange-100 dark:bg-orange-900/30"><Package className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>}
                {card.color === 'red' && card.icon.type === AlertCircle && <div className="p-2 rounded-[var(--md-radius-sm)] bg-red-100 dark:bg-red-900/30"><AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>}
                {card.color === 'red' && card.icon.type === AlertTriangle && <div className="p-2 rounded-[var(--md-radius-sm)] bg-red-100 dark:bg-red-900/30"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>}
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(card.value)}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-200/80 dark:border-slate-700/50 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">مبيعات الأسبوع</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">أداء آخر 7 أيام</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartDataAR}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-200/80 dark:border-slate-700/50 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">أعلى الأدوية مبيعاً</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">ترتيب حسب الإيرادات</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDrugs.slice(0, 8).map(d => ({ name: d.name?.slice(0, 12), revenue: d.totalRevenue, qty: d.totalQty }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={80} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-200/80 dark:border-slate-700/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <h2 className="text-sm font-bold text-orange-700 dark:text-orange-300">نقص المخزون</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">مفيش أدوية ناقصة</div>
              ) : (
                <div className="flex flex-col h-full">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 w-full min-w-0">الدواء</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">الكمية المتاحة</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">الحد الأدنى</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {(showAllLowStock ? lowStockItems : lowStockItems.slice(0, 20)).map(item => {
                        const pct = Math.min(100, Math.max(0, (item.totalQuantity / item.threshold) * 100));
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-150">
                            <td className="px-3 py-2 w-full min-w-0">
                              <p className="text-gray-900 dark:text-slate-100 text-xs font-medium truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>{item.name}</p>
                              {item.arabicName && <p className="text-gray-500 dark:text-slate-400 text-xs truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.arabicName}>{item.arabicName}</p>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${item.totalQuantity < item.threshold ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                {item.totalQuantity}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1 items-center">
                                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{item.threshold}</span>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 w-12">
                                  <div className={`h-1.5 rounded-full ${item.totalQuantity < item.threshold ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {lowStockItems.length > 20 && (
                    <button 
                      onClick={() => setShowAllLowStock(!showAllLowStock)}
                      className="w-full p-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors border-t border-gray-100 dark:border-slate-700"
                    >
                      {showAllLowStock ? 'عرض أقل' : `عرض الكل (${lowStockItems.length} دواء)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] overflow-hidden" style={{ borderRadius: 'var(--md-radius-lg)' }}>
            <div className="px-4 py-3 border-b border-[var(--md-outline)] bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h2 className="text-sm font-bold text-red-700 dark:text-red-300">قرب انتهاء</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {expiringItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">مفيش أدوية قريبة الانتهاء</div>
              ) : (
                <div className="flex flex-col h-full">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--md-bg-gray-50)] dark:bg-[var(--md-surface)] sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 w-full min-w-0">الدواء / التشغيلة</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">الكمية</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">التاريخ / متبقي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-outline)]">
                      {(showAllExpiring ? expiringItems : expiringItems.slice(0, 20)).map(item => {
                        const days = item.daysUntilExpiry;
                        let badgeColor = 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300';
                        if (days <= 30) badgeColor = 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
                        else if (days <= 60) badgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
                        else if (days <= 90) badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';

                        return (
                          <tr key={item.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                            <td className="px-3 py-2 w-full min-w-0">
                              <p className="text-gray-900 dark:text-white text-xs font-medium truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.drugName}>{item.drugName}</p>
                              <p className="text-gray-500 dark:text-slate-400 text-[10px] mt-0.5 truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.batchNumber}>#{item.batchNumber}</p>
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600 dark:text-slate-300 text-xs font-bold">{item.quantity}</td>
                            <td className="px-3 py-2 text-center flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-600 dark:text-slate-300">{formatDate(item.expiryDate)}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>{days} يوم</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {expiringItems.length > 20 && (
                    <button 
                      onClick={() => setShowAllExpiring(!showAllExpiring)}
                      className="w-full p-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors border-t border-[var(--md-outline)]"
                    >
                      {showAllExpiring ? 'عرض أقل' : `عرض الكل (${expiringItems.length} تشغيلة)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] overflow-hidden" style={{ borderRadius: 'var(--md-radius-lg)' }}>
            <div className="px-4 py-3 border-b border-[var(--md-outline)] bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h2 className="text-sm font-bold text-green-700 dark:text-green-300">آخر المبيعات</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {recentSales.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">مفيش مبيعات حديثه</div>
              ) : (
                <div className="divide-y divide-[var(--md-outline)]">
                  {recentSales.map(sale => (
                    <div key={sale.id} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {sale.customer?.name || 'عميل نقدي'}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(sale.saleDate)}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(sale.grandTotal)}</p>
                          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                            {sale.status === 'COMPLETED' ? 'مكتمل' : 'معلق'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;