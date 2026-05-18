import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Box,
  Container,
  Stack,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Badge,
  List,
  ListItemButton,
  ListItemText,
  Popper,
  ClickAwayListener,
  Paper as MuiPaper,
} from '@mui/material'
import {
  ErrorOutlineRounded,
  DeleteOutlineRounded,
  SearchRounded,
  RefreshRounded,
  WarningAmberRounded,
  RestoreRounded,
  CloseRounded,
  CheckRounded,
  CalendarMonthRounded,
  DownloadRounded,
  CloudUploadOutlined,
} from '@mui/icons-material'
import api from '../../utils/api'
import * as XLSX from 'xlsx'
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

const PAGE_SIZE = 20

const REASONS = [
  { value: 'EXPIRED', label: 'منتهي الصلاحية' },
  { value: 'DAMAGED', label: 'تالف/مكسور' },
  { value: 'STOLEN', label: 'سرقة/مفقود' },
  { value: 'OTHER', label: 'أخرى' },
]

const REASON_COLOR = {
  EXPIRED: 'error',
  DAMAGED: 'warning',
  STOLEN: 'secondary',
  OTHER: 'default',
}

const COLORS = ['#EF4444', '#F59E0B', '#8B5CF6', '#64748B']

export default function DamagedDrugsPage() {
  const [activeTab, setActiveTab] = useState('damaged')

  // Damaged tab
  const [damagedHistory, setDamagedHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [pagination, setPagination] = useState({ offset: 0, total: 0, totalPages: 0 })
  const [restoringId, setRestoringId] = useState(null)

  // Expired tab
  const [expiredDrugs, setExpiredDrugs] = useState([])
  const [loadingExpired, setLoadingExpired] = useState(false)
  const [selectedExpired, setSelectedExpired] = useState([])

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [drugSearchResults, setDrugSearchResults] = useState([])
  const [drugSearchLoading, setDrugSearchLoading] = useState(false)
  const [formData, setFormData] = useState({ quantity: '', reason: 'DAMAGED', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const searchAnchorRef = useRef(null)

  // Stats
  const totalDamagedQty = damagedHistory.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const totalLoss = damagedHistory.reduce((sum, item) => sum + (item.costLoss || 0), 0)

  // ----- Data fetching (logic preserved) -----
  const fetchDamaged = useCallback(
    async (opts = {}) => {
      const { forceRefetch = false } = opts
      if (forceRefetch) setRefreshing(true)
      else setLoading(true)

      try {
        setError('')
        const search = opts.search ?? historySearch
        const res = await api.get(
          `/damaged?limit=${PAGE_SIZE}&offset=${pagination.offset}&search=${encodeURIComponent(search)}`,
        )
        if (res.data?.success) {
          setDamagedHistory(res.data.data || [])
          setPagination(res.data.pagination || { offset: 0, total: 0, totalPages: 0 })
        }
      } catch (err) {
        console.error('[fetchDamaged]', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [pagination.offset, historySearch],
  )

  const fetchExpiredDrugs = useCallback(async () => {
    setLoadingExpired(true)
    try {
      const res = await api.get('/drugs')
      const allDrugs = res.data?.data || res.data || []
      const today = new Date()
      const ninetyDaysFromNow = new Date()
      ninetyDaysFromNow.setDate(today.getDate() + 90)

      const expiring = allDrugs.filter((d) => {
        if (!d.expiryDate || d.stock <= 0) return false
        const expDate = new Date(d.expiryDate)
        return expDate <= ninetyDaysFromNow
      })
      expiring.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
      setExpiredDrugs(expiring)
    } catch (err) {
      console.error('[fetchExpiredDrugs]', err)
    } finally {
      setLoadingExpired(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'damaged' || activeTab === 'report') {
      fetchDamaged({ search: historySearch })
    }
    if (activeTab === 'expired' || activeTab === 'report') {
      fetchExpiredDrugs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pagination.offset])

  const searchDrugs = useCallback(async (query) => {
    if (!query.trim() || query.trim().length < 2) {
      setDrugSearchResults([])
      return
    }
    setDrugSearchLoading(true)
    try {
      const res = await api.get(`/drugs/search?q=${encodeURIComponent(query.trim())}`)
      const drugsData = res.data?.data || []
      setDrugSearchResults(drugsData.slice(0, 10))
    } catch (err) {
      console.error('[searchDrugs]', err)
      setDrugSearchResults([])
    } finally {
      setDrugSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchDrugs(searchQuery)
      else setDrugSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchDrugs])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'damaged' || activeTab === 'report') {
        fetchDamaged({ search: historySearch, forceRefetch: true })
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySearch, activeTab])

  // ----- Handlers (logic preserved) -----
  const handleOpenModal = (drug) => {
    setSelectedDrug(drug)
    setFormData({ quantity: '', reason: 'DAMAGED', notes: '' })
    setSearchQuery('')
    setDrugSearchResults([])
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedDrug(null)
    setFormData({ quantity: '', reason: '', notes: '' })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.quantity || !formData.reason) {
      setError('يرجى استكمال جميع الحقول المطلوبة')
      return
    }
    const qty = parseInt(formData.quantity, 10)
    if (isNaN(qty) || qty <= 0 || qty > selectedDrug.stock) {
      setError(`الكمية يجب أن تكون بين 1 و${selectedDrug.stock}`)
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const res = await api.post('/damaged', {
        drugId: selectedDrug.id,
        quantity: Number(qty),
        reason: formData.reason,
        notes: formData.notes || undefined,
      })
      if (res.data?.success) {
        setSuccess('تم تسجيل التالف بنجاح!')
        handleCloseModal()
        await fetchDamaged({ forceRefetch: true })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(res.data?.error || 'فشل تسجيل التالف')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'فشل تسجيل التالف')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestore = async (damagedId) => {
    if (!window.confirm('هل أنت متأكد من استعادة هذا العنصر؟ سيتم إضافة الكمية مرة أخرى للمخزون.')) return
    try {
      setRestoringId(damagedId)
      const res = await api.delete(`/damaged/${damagedId}`)
      if (res.data?.success) {
        setSuccess('تم استعادة العنصر بنجاح!')
        await fetchDamaged({ forceRefetch: true })
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'فشل استعادة العنصر')
    } finally {
      setRestoringId(null)
    }
  }

  const moveToDamagedBulk = async () => {
    if (selectedExpired.length === 0) return
    if (!window.confirm(`هل أنت متأكد من نقل ${selectedExpired.length} صنف إلى التالف؟`)) return
    setLoadingExpired(true)
    let successCount = 0
    try {
      for (const id of selectedExpired) {
        const drug = expiredDrugs.find((d) => d.id === id)
        if (drug) {
          await api.post('/damaged', {
            drugId: drug.id,
            quantity: drug.stock,
            reason: 'EXPIRED',
            notes: 'نقل تلقائي من قائمة المنتهي',
          })
          successCount++
        }
      }
      setSuccess(`تم نقل ${successCount} صنف إلى التالف بنجاح`)
      setSelectedExpired([])
      fetchExpiredDrugs()
      fetchDamaged()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('حدث خطأ أثناء نقل بعض الأصناف')
    } finally {
      setLoadingExpired(false)
    }
  }

  const exportLossReport = () => {
    const data = damagedHistory.map((item) => ({
      'اسم الدواء': item.drug?.name || '-',
      الباركود: item.drug?.barcode || '-',
      الكمية: item.quantity,
      السبب: REASONS.find((r) => r.value === item.reason)?.label || item.reason,
      'قيمة الخسارة': item.costLoss || 0,
      التاريخ: new Date(item.createdAt).toLocaleDateString('ar-EG'),
      ملاحظات: item.notes || '-',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير التوالف')
    XLSX.writeFile(wb, `Loss_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // ----- Helpers -----
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)

  const getReasonChip = (reason) => {
    const r = REASONS.find((x) => x.value === reason)
    return (
      <Chip
        size="small"
        variant="outlined"
        color={REASON_COLOR[reason] || 'default'}
        label={r?.label || reason}
      />
    )
  }

  const getExpiryStatus = (date) => {
    if (!date) return null
    const today = new Date()
    const expDate = new Date(date)
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return { color: 'error', text: 'منتهي الصلاحية' }
    if (diffDays <= 30) return { color: 'warning', text: `ينتهي خلال ${diffDays} يوم` }
    return { color: 'warning', text: `ينتهي خلال ${diffDays} يوم` }
  }

  const pieData = useMemo(() => {
    const counts = {}
    damagedHistory.forEach((item) => {
      counts[item.reason] = (counts[item.reason] || 0) + 1
    })
    return Object.keys(counts).map((key) => ({
      name: REASONS.find((r) => r.value === key)?.label || key,
      value: counts[key],
    }))
  }, [damagedHistory])

  if (loading && activeTab === 'damaged' && damagedHistory.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    )
  }

  const showSearchPopper = searchQuery.trim().length >= 2

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'error.main', color: 'error.contrastText', width: 48, height: 48 }}
              >
                <ErrorOutlineRounded />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  إدارة التالف والمنتهي
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  تتبع الخسائر، الأدوية التالفة، ومنتهية الصلاحية
                </Typography>
              </Box>
            </Stack>
          </Stack>

          {/* Stat cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'error.light' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{ bgcolor: 'error.main', color: 'error.contrastText', width: 48, height: 48 }}
                >
                  <WarningAmberRounded />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                    إجمالي التالف (وحدات)
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {totalDamagedQty}
                    </Typography>
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                      {formatCurrency(totalLoss)} خسارة
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'warning.light' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', width: 48, height: 48 }}
                >
                  <CalendarMonthRounded />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                    منتهي الصلاحية (قريباً)
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {expiredDrugs.length}{' '}
                    <Typography component="span" variant="body2" color="warning.main">
                      صنف بحاجة لمراجعة
                    </Typography>
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" icon={<CheckRounded fontSize="small" />}>
              {success}
            </Alert>
          )}

          {/* Tabs */}
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
            >
              <Tab value="damaged" label="سجل التالف" />
              <Tab
                value="expired"
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>منتهي الصلاحية</span>
                    {expiredDrugs.length > 0 && (
                      <Badge badgeContent={expiredDrugs.length} color="warning" sx={{ ml: 1 }} />
                    )}
                  </Stack>
                }
              />
              <Tab value="report" label="تقرير الخسائر" />
            </Tabs>

            {/* TAB 1: DAMAGED */}
            {activeTab === 'damaged' && (
              <Box sx={{ p: 2.5 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  sx={{ mb: 2.5, justifyContent: 'space-between', alignItems: { md: 'center' } }}
                >
                  <Box sx={{ position: 'relative', width: { xs: '100%', md: 384 } }} ref={searchAnchorRef}>
                    <TextField
                      placeholder="ابحث لإضافة تالف (الاسم أو الباركود)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Popper
                      open={showSearchPopper}
                      anchorEl={searchAnchorRef.current}
                      placement="bottom-start"
                      style={{ zIndex: 1300, width: searchAnchorRef.current?.clientWidth }}
                    >
                      <ClickAwayListener onClickAway={() => setSearchQuery('')}>
                        <MuiPaper elevation={6} sx={{ mt: 1, maxHeight: 280, overflow: 'auto', borderRadius: 2 }}>
                          {drugSearchLoading ? (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                              <CircularProgress size={20} />
                            </Box>
                          ) : drugSearchResults.length > 0 ? (
                            <List disablePadding>
                              {drugSearchResults.map((drug) => (
                                <ListItemButton key={drug.id} onClick={() => handleOpenModal(drug)}>
                                  <ListItemText
                                    primary={drug.name}
                                    secondary={drug.barcode || 'لا يوجد باركود'}
                                  />
                                  <Chip
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    label={`المتاح: ${drug.stock}`}
                                  />
                                </ListItemButton>
                              ))}
                            </List>
                          ) : (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                لا توجد نتائج
                              </Typography>
                            </Box>
                          )}
                        </MuiPaper>
                      </ClickAwayListener>
                    </Popper>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <TextField
                      placeholder="تصفية السجل..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      size="small"
                      sx={{ minWidth: { md: 240 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <IconButton
                      onClick={() => fetchDamaged({ forceRefetch: true })}
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }}
                    >
                      <RefreshRounded
                        sx={{
                          animation: refreshing ? 'spin 1s linear infinite' : 'none',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          },
                        }}
                      />
                    </IconButton>
                  </Stack>
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>اسم الدواء</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>الباركود</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          الكمية
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          السبب
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          الخسارة
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          التاريخ
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          الإجراء
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {damagedHistory.length > 0 ? (
                        damagedHistory.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell sx={{ maxWidth: 200 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={item.drug?.name}>
                                {item.drug?.name || 'غير متاح'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                              {item.drug?.barcode || '-'}
                            </TableCell>
                            <TableCell align="center">
                              <Chip size="small" color="error" variant="outlined" label={item.quantity} />
                            </TableCell>
                            <TableCell align="center">{getReasonChip(item.reason)}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'error.main' }}>
                              {formatCurrency(item.costLoss || 0)}
                            </TableCell>
                            <TableCell align="center" sx={{ color: 'text.secondary', fontSize: 12 }}>
                              {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                disabled={restoringId === item.id}
                                onClick={() => handleRestore(item.id)}
                                startIcon={
                                  restoringId === item.id ? (
                                    <CircularProgress size={12} color="inherit" />
                                  ) : (
                                    <RestoreRounded sx={{ fontSize: 16 }} />
                                  )
                                }
                              >
                                استعادة
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Typography color="text.secondary">
                              {historySearch ? 'لا توجد نتائج' : 'لا توجد سجلات تالف'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 2: EXPIRED */}
            {activeTab === 'expired' && (
              <Box sx={{ p: 2.5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                >
                  <Typography variant="body2" color="text.secondary">
                    الأدوية المنتهية الصلاحية أو التي ستنتهي خلال 90 يوماً
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      onClick={fetchExpiredDrugs}
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }}
                      title="تحديث"
                    >
                      <RefreshRounded
                        sx={{
                          animation: loadingExpired ? 'spin 1s linear infinite' : 'none',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          },
                        }}
                      />
                    </IconButton>
                    {selectedExpired.length > 0 && (
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteOutlineRounded />}
                        onClick={moveToDamagedBulk}
                      >
                        نقل المحدد للتالف ({selectedExpired.length})
                      </Button>
                    )}
                  </Stack>
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={selectedExpired.length === expiredDrugs.length && expiredDrugs.length > 0}
                            indeterminate={
                              selectedExpired.length > 0 && selectedExpired.length < expiredDrugs.length
                            }
                            onChange={(e) =>
                              setSelectedExpired(e.target.checked ? expiredDrugs.map((d) => d.id) : [])
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>اسم الدواء</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          الكمية المتاحة
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          تاريخ الانتهاء
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          الحالة
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          الإجراء
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingExpired ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            <CircularProgress size={28} color="warning" />
                          </TableCell>
                        </TableRow>
                      ) : expiredDrugs.length > 0 ? (
                        expiredDrugs.map((drug) => {
                          const status = getExpiryStatus(drug.expiryDate)
                          const checked = selectedExpired.includes(drug.id)
                          return (
                            <TableRow key={drug.id} hover selected={checked}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  color="primary"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedExpired([...selectedExpired, drug.id])
                                    else setSelectedExpired(selectedExpired.filter((id) => id !== drug.id))
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 200 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={drug.name}>
                                  {drug.name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip size="small" variant="outlined" label={drug.stock} />
                              </TableCell>
                              <TableCell align="center" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                {new Date(drug.expiryDate).toLocaleDateString('ar-EG')}
                              </TableCell>
                              <TableCell align="center">
                                {status && (
                                  <Chip size="small" color={status.color} variant="outlined" label={status.text} />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<DeleteOutlineRounded sx={{ fontSize: 16 }} />}
                                  onClick={() => {
                                    setSelectedDrug(drug)
                                    setFormData({
                                      quantity: drug.stock,
                                      reason: 'EXPIRED',
                                      notes: 'نقل من قائمة المنتهي',
                                    })
                                    setShowModal(true)
                                  }}
                                >
                                  للتالف
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            <Typography color="text.secondary">
                              لا توجد أدوية منتهية أو قريبة الانتهاء
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 3: REPORT */}
            {activeTab === 'report' && (
              <Box sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    إحصائيات وتقارير الخسائر
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<DownloadRounded />}
                    onClick={exportLossReport}
                  >
                    تصدير Excel
                  </Button>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                    gap: 3,
                  }}
                >
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 320 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
                      توزيع التوالف حسب السبب
                    </Typography>
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        إجمالي الخسائر المادية
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {formatCurrency(totalLoss)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        إجمالي الوحدات التالفة
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {totalDamagedQty} وحدة
                      </Typography>
                    </Box>
                    <Divider />
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      يعتمد التقرير على السجلات المسجلة في نظام التوالف. تأكد من جرد الأدوية المنتهية بشكل دوري ونقلها للتالف لحساب الخسائر بدقة.
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>

      {/* Add Damaged Modal */}
      <Dialog open={showModal && !!selectedDrug} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <DeleteOutlineRounded color="error" />
            <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
              إضافة للتالف
            </Typography>
          </Stack>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedDrug && (
            <Stack spacing={2.5} component="form" id="damaged-form" onSubmit={handleSubmit}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedDrug.name}
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {selectedDrug.barcode || '-'}
                  </Typography>
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={`المتاح: ${selectedDrug.stock}`}
                  />
                </Stack>
              </Paper>

              <TextField
                label="الكمية التالفة"
                type="number"
                inputProps={{ min: 1, max: selectedDrug.stock }}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="أدخل الكمية"
                required
                helperText={
                  formData.quantity
                    ? `قيمة الخسارة المتوقعة: ${formatCurrency(
                        (selectedDrug.costPrice || 0) * parseInt(formData.quantity || 0),
                      )}`
                    : ' '
                }
                FormHelperTextProps={{ sx: { color: formData.quantity ? 'error.main' : 'text.secondary' } }}
              />

              <FormControl required>
                <InputLabel>السبب</InputLabel>
                <Select
                  value={formData.reason}
                  label="السبب"
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                >
                  {REASONS.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="ملاحظات (اختياري)"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="سبب التلف أو ملاحظات أخرى..."
              />

              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  صورة التالف (اختياري)
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderStyle: 'dashed',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <CloudUploadOutlined color="action" />
                  <Typography variant="caption" color="text.secondary">
                    انقر لرفع صورة
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={handleCloseModal} sx={{ flex: 1 }}>
            إلغاء
          </Button>
          <Button
            type="submit"
            form="damaged-form"
            variant="contained"
            color="error"
            disabled={submitting}
            startIcon={
              submitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteOutlineRounded />
              )
            }
            sx={{ flex: 1 }}
          >
            نقل للتالف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
