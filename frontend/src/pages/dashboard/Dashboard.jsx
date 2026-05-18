import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Paper,
  Grid,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EventIcon from '@mui/icons-material/Event';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [metrics, setMetrics] = useState({
    todaySales: 0,
    netProfit: 0,
    dailyExpenses: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    customerDebt: 0,
    supplierDebt: 0,
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
      const [
        dashRes,
        monthlyRes,
        monthlyProfitRes,
        expRes,
        weeklyRes,
        topRes,
        transRes,
        expCountRes,
        lowStockRes,
      ] = await Promise.all([
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
    const interval = setInterval(fetchAll, 300000);
    const onFocus = () => fetchAll();
    window.addEventListener('focus', onFocus);
    window.addEventListener('settingsUpdated', fetchAll);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('settingsUpdated', fetchAll);
    };
  }, [fetchAll]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const dayName = (date) => {
    const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعه', 'سبت'];
    return days[new Date(date).getDay()] || date;
  };

  const chartDataAR = useMemo(
    () =>
      chartData.map(d => ({
        ...d,
        name: d.date ? dayName(d.date) : d.name,
        revenue: d.sales,
        label: formatCurrency(d.sales),
      })),
    [chartData],
  );

  const cards = useMemo(
    () => [
      { label: 'مبيعات اليوم', value: metrics.todaySales, sub: 'إيرادات اليوم', Icon: AttachMoneyIcon, color: theme.palette.primary.main },
      { label: 'ربح اليوم', value: metrics.netProfit, sub: 'صافي الربح', Icon: TrendingUpIcon, color: theme.palette.success.main },
      { label: 'دخل الشهر', value: monthlyData.monthlyRevenue, sub: `${monthlyData.totalSales} فاتورة`, Icon: BarChartIcon, color: theme.palette.secondary.main },
      { label: 'ربح الشهر', value: monthlyProfit.monthlyProfit, sub: `${monthlyProfit.totalSales || 0} فاتورة`, Icon: TrendingUpIcon, color: theme.palette.info.main },
      { label: 'نقص المخزون', value: metrics.lowStockCount, sub: 'أدوية تحتاج طلب', Icon: Inventory2Icon, color: theme.palette.warning.main, currency: false },
      { label: 'قرب انتهاء', value: metrics.expiringSoonCount, sub: 'خلال 3 شهور', Icon: WarningAmberIcon, color: theme.palette.error.main, currency: false },
      { label: 'منتهية الصلاحية', value: metrics.expiredCount, sub: 'كمية غير صالحة', Icon: ErrorOutlineIcon, color: theme.palette.error.dark, currency: false },
    ],
    [metrics, monthlyData, monthlyProfit, theme],
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            جارٍ تحميل البيانات...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              لوحة الإحصائيات
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              مرحباً يا {user?.name} — آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG')}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAll}>
            تحديث
          </Button>
        </Stack>

        {/* KPI cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {cards.map((card, i) => {
            const Icon = card.Icon;
            return (
              <Grid item xs={6} sm={4} lg={3} xl={12 / 7} key={i}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {card.label}
                    </Typography>
                    <Avatar
                      variant="rounded"
                      sx={{
                        bgcolor: alpha(card.color, 0.12),
                        color: card.color,
                        width: 36,
                        height: 36,
                      }}
                    >
                      <Icon fontSize="small" />
                    </Avatar>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>
                    {card.currency === false ? card.value : formatCurrency(card.value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.sub}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Charts row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} lg={6}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>
                مبيعات الأسبوع
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                أداء آخر 7 أيام
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartDataAR}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={v => formatCurrency(v)}
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>
                أعلى الأدوية مبيعاً
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ترتيب حسب الإيرادات
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={topDrugs.slice(0, 8).map(d => ({
                    name: d.name?.slice(0, 12),
                    revenue: d.totalRevenue,
                    qty: d.totalQty,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    width={80}
                  />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill={theme.palette.secondary.main} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Three lists */}
        <Grid container spacing={3}>
          {/* Low stock */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.warning.main, 0.08),
                }}
              >
                <Inventory2Icon fontSize="small" sx={{ color: 'warning.main' }} />
                <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                  نقص المخزون
                </Typography>
              </Stack>
              <Box sx={{ maxHeight: 384, overflowY: 'auto' }}>
                {lowStockItems.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">
                      مفيش أدوية ناقصة
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <TableContainer>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>الدواء</TableCell>
                            <TableCell align="center">المتاح</TableCell>
                            <TableCell align="center">الحد الأدنى</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(showAllLowStock ? lowStockItems : lowStockItems.slice(0, 20)).map(item => {
                            const pct = Math.min(100, Math.max(0, (item.totalQuantity / item.threshold) * 100));
                            const low = item.totalQuantity < item.threshold;
                            return (
                              <TableRow key={item.id} hover>
                                <TableCell sx={{ maxWidth: 200 }}>
                                  <Typography
                                    variant="caption"
                                    fontWeight={500}
                                    dir="ltr"
                                    noWrap
                                    title={item.name}
                                    sx={{ display: 'block' }}
                                  >
                                    {item.name}
                                  </Typography>
                                  {item.arabicName && (
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                      {item.arabicName}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    size="small"
                                    label={item.totalQuantity}
                                    color={low ? 'error' : 'default'}
                                    sx={{ fontWeight: 700 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Stack alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">
                                      {item.threshold}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={pct}
                                      color={low ? 'error' : 'primary'}
                                      sx={{ width: 48, height: 4, borderRadius: 2 }}
                                    />
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {lowStockItems.length > 20 && (
                      <>
                        <Divider />
                        <Button
                          fullWidth
                          size="small"
                          onClick={() => setShowAllLowStock(!showAllLowStock)}
                          sx={{ borderRadius: 0 }}
                        >
                          {showAllLowStock ? 'عرض أقل' : `عرض الكل (${lowStockItems.length} دواء)`}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Expiring */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                }}
              >
                <AccessTimeIcon fontSize="small" sx={{ color: 'error.main' }} />
                <Typography variant="subtitle2" fontWeight={700} color="error.main">
                  قرب انتهاء
                </Typography>
              </Stack>
              <Box sx={{ maxHeight: 384, overflowY: 'auto' }}>
                {expiringItems.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">
                      مفيش أدوية قريبة الانتهاء
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <TableContainer>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>الدواء / التشغيلة</TableCell>
                            <TableCell align="center">الكمية</TableCell>
                            <TableCell align="center">التاريخ / متبقي</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(showAllExpiring ? expiringItems : expiringItems.slice(0, 20)).map(item => {
                            const days = item.daysUntilExpiry;
                            let color = 'default';
                            if (days <= 30) color = 'error';
                            else if (days <= 60) color = 'warning';
                            else if (days <= 90) color = 'info';
                            return (
                              <TableRow key={item.id} hover>
                                <TableCell sx={{ maxWidth: 200 }}>
                                  <Typography
                                    variant="caption"
                                    fontWeight={500}
                                    dir="ltr"
                                    noWrap
                                    sx={{ display: 'block' }}
                                    title={item.drugName}
                                  >
                                    {item.drugName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" dir="ltr" noWrap sx={{ display: 'block' }}>
                                    #{item.batchNumber}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="caption" fontWeight={700}>
                                    {item.quantity}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Stack alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDate(item.expiryDate)}
                                    </Typography>
                                    <Chip size="small" color={color} label={`${days} يوم`} sx={{ fontWeight: 700 }} />
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {expiringItems.length > 20 && (
                      <>
                        <Divider />
                        <Button
                          fullWidth
                          size="small"
                          color="error"
                          onClick={() => setShowAllExpiring(!showAllExpiring)}
                          sx={{ borderRadius: 0 }}
                        >
                          {showAllExpiring ? 'عرض أقل' : `عرض الكل (${expiringItems.length} تشغيلة)`}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Recent sales */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                }}
              >
                <ShoppingCartIcon fontSize="small" sx={{ color: 'success.main' }} />
                <Typography variant="subtitle2" fontWeight={700} color="success.main">
                  آخر المبيعات
                </Typography>
              </Stack>
              <Box sx={{ maxHeight: 384, overflowY: 'auto' }}>
                {recentSales.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">
                      مفيش مبيعات حديثه
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {recentSales.map(sale => (
                      <Box
                        key={sale.id}
                        sx={{
                          px: 2,
                          py: 1.5,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {sale.customer?.name || 'عميل نقدي'}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                              <EventIcon sx={{ fontSize: 12 }} />
                              <Typography variant="caption">{formatDate(sale.saleDate)}</Typography>
                            </Stack>
                          </Box>
                          <Stack alignItems="flex-end" spacing={0.5}>
                            <Typography variant="body2" fontWeight={700}>
                              {formatCurrency(sale.grandTotal)}
                            </Typography>
                            <Chip
                              size="small"
                              label={sale.status === 'COMPLETED' ? 'مكتمل' : 'معلق'}
                              color={sale.status === 'COMPLETED' ? 'success' : 'warning'}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
