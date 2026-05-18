import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ButtonBase,
  alpha,
  useTheme,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const SuppliersPage = () => {
  const theme = useTheme();
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
    country: 'مصر',
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
      const filtered = suppliers.filter(
        s =>
          s.name?.toLowerCase().includes(query) ||
          s.phone?.toLowerCase()?.includes(query) ||
          s.company?.toLowerCase()?.includes(query),
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
        country: 'مصر',
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
        date: new Date().toISOString(),
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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);
  const activeSuppliersWithDebt = suppliers.filter(s => (s.totalDebt || 0) > 0).length;

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        square
        sx={{
          flexShrink: 0,
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar variant="rounded" sx={{ bgcolor: 'primary.main' }}>
            <BusinessIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              حسابات الموردين
            </Typography>
            <Typography variant="caption" color="text.secondary">
              كشف الحساب التفصيلي
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'action.hover',
              borderRadius: 999,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
              <Typography variant="caption" color="text.secondary">
                الموردين:
              </Typography>
              <Typography variant="caption" fontWeight={700}>
                {suppliers.length}
              </Typography>
            </Stack>
            <Divider orientation="vertical" flexItem />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
              <Typography variant="caption" color="text.secondary">
                ذمم:
              </Typography>
              <Typography variant="caption" fontWeight={700} color="warning.main">
                {activeSuppliersWithDebt}
              </Typography>
            </Stack>
            <Divider orientation="vertical" flexItem />
            <Stack direction="row" alignItems="center" spacing={1}>
              <AttachMoneyIcon sx={{ fontSize: 16, color: 'error.main' }} />
              <Typography variant="caption" color="text.secondary">
                الإجمالي:
              </Typography>
              <Typography variant="caption" fontWeight={700} color="error.main">
                {formatCurrency(totalDebt)}
              </Typography>
            </Stack>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddSupplierModal(true)}
          >
            إضافة مورد
          </Button>
        </Stack>
      </Paper>

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2, overflow: 'hidden', minHeight: 0 }}>
        {/* List */}
        <Paper
          variant="outlined"
          sx={{
            width: 400,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المورد..."
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 4 }} spacing={1.5}>
                <CircularProgress size={32} />
                <Typography variant="caption" color="text.secondary">
                  جاري التحميل...
                </Typography>
              </Stack>
            ) : filteredSuppliers.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 4 }} spacing={2}>
                <BusinessIcon sx={{ fontSize: 64, color: 'action.disabledBackground' }} />
                <Typography variant="body2" color="text.secondary">
                  لا يوجد موردين
                </Typography>
              </Stack>
            ) : (
              <Stack divider={<Divider />}>
                {filteredSuppliers.map(supplier => {
                  const debt = supplier.totalDebt || 0;
                  const hasDebt = debt > 0;
                  const isSelected = selectedSupplier?.id === supplier.id;

                  return (
                    <ButtonBase
                      key={supplier.id}
                      onClick={() => handleSelectSupplier(supplier)}
                      sx={{
                        width: '100%',
                        p: 2,
                        textAlign: 'right',
                        display: 'block',
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        borderRight: isSelected ? 4 : 0,
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 150ms',
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar
                            variant="rounded"
                            sx={{
                              bgcolor: alpha(hasDebt ? theme.palette.error.main : theme.palette.success.main, 0.15),
                              color: hasDebt ? 'error.main' : 'success.main',
                            }}
                          >
                            <BusinessIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {supplier.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {supplier.phone || '-'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          size="small"
                          label={formatCurrency(debt)}
                          color={hasDebt ? 'error' : 'success'}
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                      {supplier.city && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
                          <PlaceIcon sx={{ fontSize: 12 }} />
                          <Typography variant="caption">{supplier.city}</Typography>
                        </Stack>
                      )}
                    </ButtonBase>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>

        {/* Ledger */}
        <Paper
          variant="outlined"
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {!selectedSupplier ? (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, p: 4 }} spacing={2}>
              <Avatar sx={{ width: 96, height: 96, bgcolor: 'action.hover' }}>
                <CompareArrowsIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary">
                اختر مورداً لعرض كشف الحساب
              </Typography>
              <Typography variant="caption" color="text.disabled">
                ستظهر المعاملات المالية هنا
              </Typography>
            </Stack>
          ) : loadingLedger ? (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, p: 4 }} spacing={1.5}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                جاري تحميل الكشف...
              </Typography>
            </Stack>
          ) : (
            <>
              {/* Supplier header */}
              <Box
                sx={{
                  flexShrink: 0,
                  p: 3,
                  borderBottom: 1,
                  borderColor: 'divider',
                  background: `linear-gradient(to left, ${alpha(theme.palette.primary.main, 0.06)}, transparent)`,
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                      <BusinessIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight={700}>
                        {selectedSupplier.name}
                      </Typography>
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        {selectedSupplier.phone && (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                            <PhoneIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption">{selectedSupplier.phone}</Typography>
                          </Stack>
                        )}
                        {selectedSupplier.city && (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                            <PlaceIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption">{selectedSupplier.city}</Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Stack direction="row" spacing={1.5}>
                      <Paper
                        variant="outlined"
                        sx={{
                          px: 2.5,
                          py: 1.5,
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                          borderColor: alpha(theme.palette.error.main, 0.4),
                        }}
                      >
                        <Typography variant="caption" color="error.main" fontWeight={500}>
                          الرصيد المستحق
                        </Typography>
                        <Typography variant="h6" color="error.main" fontWeight={700}>
                          {formatCurrency(ledgerData?.supplier?.totalDebt || 0)}
                        </Typography>
                      </Paper>
                      <Paper
                        variant="outlined"
                        sx={{
                          px: 2.5,
                          py: 1.5,
                          bgcolor: alpha(theme.palette.success.main, 0.08),
                          borderColor: alpha(theme.palette.success.main, 0.4),
                        }}
                      >
                        <Typography variant="caption" color="success.main" fontWeight={500}>
                          إجمالي المدفوع
                        </Typography>
                        <Typography variant="h6" color="success.main" fontWeight={700}>
                          {formatCurrency(ledgerData?.summary?.totalPaid || 0)}
                        </Typography>
                      </Paper>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<ReceiptLongIcon />}
                        onClick={() => (window.location.href = '/purchases')}
                      >
                        إضافة فاتورة
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<AccountBalanceWalletIcon />}
                        onClick={() => setShowPaymentModal(true)}
                      >
                        دفع مبلغ
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>

              {/* Ledger table */}
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flex: 1 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 48 }}>#</TableCell>
                        <TableCell sx={{ width: 128 }}>التاريخ</TableCell>
                        <TableCell>البيان</TableCell>
                        <TableCell align="center" sx={{ width: 112 }}>المبلغ</TableCell>
                        <TableCell align="center" sx={{ width: 112 }}>الرصيد</TableCell>
                        <TableCell sx={{ width: 96 }}>الحالة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ledgerData?.ledger?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
                              <DescriptionIcon sx={{ fontSize: 64, color: 'action.disabledBackground' }} />
                              <Typography variant="body2" color="text.secondary">
                                لا توجد معاملات بعد
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ) : (
                        ledgerData?.ledger?.map((entry, index) => {
                          const isPurchase = entry.type === 'PURCHASE';
                          return (
                            <TableRow
                              key={entry.id}
                              hover
                              sx={{
                                bgcolor: isPurchase
                                  ? alpha(theme.palette.error.main, 0.04)
                                  : alpha(theme.palette.success.main, 0.04),
                              }}
                            >
                              <TableCell align="center">
                                <Avatar sx={{ width: 24, height: 24, bgcolor: 'action.hover', color: 'text.secondary', fontSize: 12 }}>
                                  {index + 1}
                                </Avatar>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <EventIcon sx={{ fontSize: 16, color: 'action.active' }} />
                                  <Typography variant="body2">{formatDate(entry.date)}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Avatar
                                    variant="rounded"
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      bgcolor: alpha(
                                        isPurchase ? theme.palette.error.main : theme.palette.success.main,
                                        0.12,
                                      ),
                                      color: isPurchase ? 'error.main' : 'success.main',
                                    }}
                                  >
                                    {isPurchase ? <ReceiptLongIcon fontSize="small" /> : <AccountBalanceWalletIcon fontSize="small" />}
                                  </Avatar>
                                  <Typography variant="body2" fontWeight={500}>
                                    {entry.description}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="center">
                                <Typography
                                  variant="body1"
                                  fontWeight={700}
                                  color={isPurchase ? 'error.main' : 'success.main'}
                                >
                                  {isPurchase ? '+' : ''}
                                  {formatCurrency(Math.abs(entry.amount))}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  color={entry.runningBalance > 0 ? 'error.main' : 'success.main'}
                                >
                                  {formatCurrency(entry.runningBalance)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={isPurchase ? 'مشتريات' : 'دفع'}
                                  color={isPurchase ? 'error' : 'success'}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Add Supplier Dialog */}
      <Dialog
        open={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>
              إضافة مورد جديد
            </Typography>
            <IconButton size="small" onClick={() => setShowAddSupplierModal(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Box component="form" onSubmit={handleAddSupplier}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="اسم المورد"
                value={newSupplier.name}
                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                required
                placeholder="أدخل اسم المورد"
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="رقم الهاتف"
                    type="tel"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="البريد الإلكتروني"
                    type="email"
                    value={newSupplier.email}
                    onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </Grid>
              </Grid>
              <TextField
                label="العنوان"
                value={newSupplier.address}
                onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                placeholder="أدخل العنوان"
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="المدينة"
                    value={newSupplier.city}
                    onChange={e => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    placeholder="القاهرة"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="المنطقة"
                    value={newSupplier.state}
                    onChange={e => setNewSupplier({ ...newSupplier, state: e.target.value })}
                    placeholder="مصر الجديدة"
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setShowAddSupplierModal(false)} color="inherit">
              إلغاء
            </Button>
            <Button type="submit" variant="contained">
              إضافة
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={showPaymentModal && !!selectedSupplier}
        onClose={() => setShowPaymentModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>
              تسجيل دفعة
            </Typography>
            <IconButton size="small" onClick={() => setShowPaymentModal(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Box component="form" onSubmit={handlePayment}>
          <DialogContent dividers>
            {selectedSupplier && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Avatar variant="rounded" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                    <BusinessIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedSupplier.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      المورد
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      المبلغ المستحق
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="error.main">
                      {formatCurrency(ledgerData?.supplier?.totalDebt || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي المدفوع
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {formatCurrency(ledgerData?.summary?.totalPaid || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Stack spacing={2}>
              <TextField
                label="المبلغ"
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText={`الحد الأقصى: ${formatCurrency(ledgerData?.supplier?.totalDebt || 0)} جنيه`}
              />
              <TextField
                label="ملاحظات"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="أي ملاحظات..."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setShowPaymentModal(false)} color="inherit">
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              تأكيد الدفع
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default SuppliersPage;
