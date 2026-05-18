import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Alert,
  AlertTitle,
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
  Pagination,
  Tooltip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PrintIcon from '@mui/icons-material/Print';
import api from '../utils/api.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const DrugsManagement = () => {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeDrug, setBarcodeDrug] = useState(null);
  const [newBarcode, setNewBarcode] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [rowEditingId, setRowEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ sellPrice: 0, costPrice: 0, stock: 0, externalId: '' });

  const [formData, setFormData] = useState({
    name: '',
    arabicName: '',
    barcode: '',
    genericName: '',
    description: '',
    strength: '',
    dosageForm: '',
    manufacturer: '',
    stock: 0,
    expiryDate: '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const fetchDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/drugs', {
        params: { page: currentPage, limit: 50, search: debouncedSearchTerm },
      });
      const drugsArray = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setDrugs(drugsArray);

      if (response.data?.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error fetching drugs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs]);

  useAutoRefresh(fetchDrugs, 15000);

  const resetForm = () => ({
    name: '',
    arabicName: '',
    barcode: '',
    genericName: '',
    description: '',
    strength: '',
    dosageForm: '',
    manufacturer: '',
    stock: 0,
    expiryDate: '',
  });

  const handleOpenModal = useCallback((drug = null) => {
    if (drug) {
      setIsEditing(true);
      setEditingId(drug.id);
      setFormData({
        name: drug.name || '',
        arabicName: drug.arabicName || '',
        barcode: drug.barcode || '',
        genericName: drug.genericName || '',
        description: drug.description || '',
        strength: drug.strength || '',
        dosageForm: drug.dosageForm || '',
        manufacturer: drug.manufacturer || '',
        stock: drug.totalStock || 0,
        expiryDate: drug.expiryDate || '',
      });
    } else {
      setIsEditing(false);
      setEditingId(null);
      setFormData(resetForm());
    }
    setShowModal(true);
    setError('');
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setIsEditing(false);
    setEditingId(null);
    setError('');
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'expiryDate') {
      let cleaned = value.replace(/\D/g, '').slice(0, 4);
      if (cleaned.length >= 2) {
        const month = cleaned.slice(0, 2);
        const year = cleaned.slice(2);
        setFormData(prev => ({ ...prev, [name]: `${month}/20${year}` }));
      } else {
        setFormData(prev => ({ ...prev, [name]: cleaned }));
      }
    } else if (name === 'stock') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) return setError('Drug name is required'), false;
    if (!formData.genericName.trim()) return setError('Generic name is required'), false;
    if (!formData.strength.trim()) return setError('Strength is required'), false;
    if (!formData.dosageForm.trim()) return setError('Dosage form is required'), false;
    if (!formData.manufacturer.trim()) return setError('Manufacturer is required'), false;
    return true;
  }, [formData]);

  const handleSaveDrug = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!validateForm()) return;
    setActionLoading(true);
    try {
      const payload = { ...formData, stock: parseInt(formData.stock) || 0 };
      const response = isEditing
        ? await api.put(`/drugs/${editingId}`, payload)
        : await api.post('/drugs', payload);

      if (response.status === 200 || response.status === 201) {
        setSuccess(isEditing ? 'Drug updated successfully!' : 'Drug created successfully!');
        handleCloseModal();
        fetchDrugs();
      } else {
        setError(response.data?.message || 'Failed to save drug');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Error saving drug');
    } finally {
      setActionLoading(false);
    }
  }, [formData, isEditing, editingId, validateForm, handleCloseModal, fetchDrugs]);

  const handleDeleteDrug = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this drug?')) return;
    setActionLoading(id);
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/drugs/${id}`);
      if (response.ok) {
        setSuccess('Drug deleted successfully!');
        fetchDrugs();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete drug');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Error deleting drug');
    } finally {
      setActionLoading(null);
    }
  }, [fetchDrugs]);

  const handleStartEdit = useCallback((drug) => {
    setRowEditingId(drug.id);
    setEditValues({
      sellPrice: drug.sellPrice ?? 0,
      costPrice: drug.costPrice ?? 0,
      stock: drug.totalStock ?? 0,
      externalId: drug.externalId ?? '',
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setRowEditingId(null);
    setEditValues({ sellPrice: 0, costPrice: 0, stock: 0, externalId: '' });
  }, []);

  const handleSaveEdit = useCallback(async (drugId) => {
    try {
      const payload = {
        stock: parseInt(editValues.stock, 10) || 0,
        sellPrice: parseFloat(editValues.sellPrice) || 0,
        costPrice: parseFloat(editValues.costPrice) || 0,
      };
      const response = await api.put(`/drugs/${drugId}`, payload);
      if (response.ok) {
        setSuccess('Drug updated successfully!');
        setRowEditingId(null);
        fetchDrugs();
      } else {
        setError(response.data?.message || 'Failed to update drug');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Error updating drug');
    }
  }, [editValues, fetchDrugs]);

  const handleEditValueChange = useCallback((field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleOpenBarcodeModal = useCallback((drug) => {
    setBarcodeDrug(drug);
    setNewBarcode(drug.barcode || '');
    setShowBarcodeModal(true);
    setError('');
    setSuccess('');
  }, []);

  const handleCloseBarcodeModal = useCallback(() => {
    setShowBarcodeModal(false);
    setBarcodeDrug(null);
    setNewBarcode('');
  }, []);

  const handleSaveBarcode = useCallback(async () => {
    if (!barcodeDrug) return;
    setActionLoading('barcode');
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/drugs/${barcodeDrug.id}`, { barcode: newBarcode });
      if (response.ok) {
        setSuccess('تم تحديث الباركود بنجاح');
        handleCloseBarcodeModal();
        fetchDrugs();
      } else {
        setError(response.data?.message || 'فشل تحديث الباركود');
      }
    } catch (err) {
      console.error('Barcode update error:', err);
      setError('خطأ في تحديث الباركود');
    } finally {
      setActionLoading(null);
    }
  }, [barcodeDrug, newBarcode, handleCloseBarcodeModal, fetchDrugs]);

  const formatPrice = useCallback((price) => (price || 0).toFixed(2), []);

  const dosageOptions = [
    { value: 'Tablet', label: 'قرص (Tablet)' },
    { value: 'Capsule', label: 'كبسولة (Capsule)' },
    { value: 'Syrup', label: 'شراب (Syrup)' },
    { value: 'Injection', label: 'حقن (Injection)' },
    { value: 'Cream', label: 'كريم (Cream)' },
    { value: 'Ointment', label: 'مرهم (Ointment)' },
    { value: 'Solution', label: 'محلول (Solution)' },
    { value: 'Suspension', label: 'معلق (Suspension)' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4, flexWrap: 'wrap' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              إدارة الأصناف
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              إضافة وتعديل وحذف الأدوية
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <TextField
              size="small"
              fullWidth={false}
              sx={{ width: { xs: '100%', sm: 280 } }}
              placeholder="بحث..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
              إضافة صنف
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorOutlineIcon />}>
            <AlertTitle>خطأ</AlertTitle>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الاسم العام</TableCell>
                  <TableCell>الشكل الصيدلاني</TableCell>
                  <TableCell>سعر التكلفة</TableCell>
                  <TableCell>سعر البيع</TableCell>
                  <TableCell>الكمية</TableCell>
                  <TableCell sx={{ width: 128 }}>الشركة</TableCell>
                  <TableCell sx={{ width: 160 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && drugs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">
                          جاري التحميل...
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : drugs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearchTerm ? 'لا توجد نتائج' : 'لا توجد أدوية'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  drugs.map(drug => {
                    const editing = rowEditingId === drug.id;
                    return (
                      <TableRow key={drug.id} hover>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="body2" fontWeight={500} dir="ltr" noWrap title={drug.name}>
                            {drug.name}
                          </Typography>
                          {drug.arabicName && (
                            <Typography variant="caption" color="text.secondary" dir="ltr" noWrap sx={{ display: 'block' }}>
                              {drug.arabicName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 150 }}>
                          <Typography variant="body2" dir="ltr" noWrap title={drug.genericName}>
                            {drug.genericName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{drug.dosageForm}</Typography>
                        </TableCell>
                        {editing ? (
                          <>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ step: '0.01' }}
                                value={editValues.costPrice}
                                onChange={e => handleEditValueChange('costPrice', e.target.value)}
                                sx={{ width: 100 }}
                                fullWidth={false}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ step: '0.01' }}
                                value={editValues.sellPrice}
                                onChange={e => handleEditValueChange('sellPrice', e.target.value)}
                                sx={{ width: 100 }}
                                fullWidth={false}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={editValues.stock}
                                onChange={e => handleEditValueChange('stock', e.target.value)}
                                sx={{ width: 90 }}
                                fullWidth={false}
                              />
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {formatPrice(drug.costPrice)} ج.م
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {formatPrice(drug.sellPrice)} ج.م
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {drug.totalStock || 0}
                              </Typography>
                            </TableCell>
                          </>
                        )}
                        <TableCell sx={{ width: 128 }}>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {drug.manufacturer || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {editing ? (
                              <>
                                <Tooltip title="حفظ">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleSaveEdit(drug.id)}
                                      disabled={actionLoading === drug.id}
                                    >
                                      {actionLoading === drug.id ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="إلغاء">
                                  <IconButton size="small" color="error" onClick={handleCancelEdit}>
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip title="تعديل الباركود">
                                  <IconButton size="small" color="primary" onClick={() => handleOpenBarcodeModal(drug)}>
                                    <QrCode2Icon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="تعديل">
                                  <IconButton size="small" color="primary" onClick={() => handleStartEdit(drug)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="حذف">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteDrug(drug.id)}
                                      disabled={actionLoading === drug.id}
                                    >
                                      {actionLoading === drug.id ? <CircularProgress size={16} /> : <DeleteOutlineIcon fontSize="small" />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {totalPages > 1 && (
          <Stack alignItems="center" sx={{ mt: 3, mb: 4 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              shape="rounded"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              صفحة {currentPage} من {totalPages} — إجمالي {totalItems}
            </Typography>
          </Stack>
        )}

        {/* Add / Edit Drug Dialog */}
        <Dialog open={showModal} onClose={handleCloseModal} fullWidth maxWidth="md">
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={700}>
                {isEditing ? 'تعديل الدواء' : 'إضافة دواء جديد'}
              </Typography>
              <IconButton size="small" onClick={handleCloseModal}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="اسم الدواء *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="مثال: باراسيتامول"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="الاسم بالعربية"
                  name="arabicName"
                  value={formData.arabicName}
                  onChange={handleInputChange}
                  placeholder="مثال: باراسيتامول"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="الباركود"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="مثال: 123456789"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="الاسم العام *"
                  name="genericName"
                  value={formData.genericName}
                  onChange={handleInputChange}
                  placeholder="مثال: Paracetamol"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="القوة *"
                  name="strength"
                  value={formData.strength}
                  onChange={handleInputChange}
                  placeholder="مثال: 500 mg"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl>
                  <InputLabel id="dosage-form-label">الشكل الصيدلاني *</InputLabel>
                  <Select
                    labelId="dosage-form-label"
                    label="الشكل الصيدلاني *"
                    name="dosageForm"
                    value={formData.dosageForm}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">
                      <em>اختر شكلاً صيدلانياً</em>
                    </MenuItem>
                    {dosageOptions.map(o => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="الشركة المصنعة *"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleInputChange}
                  placeholder="مثال: Pfizer"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="الكمية"
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  inputProps={{ min: 0 }}
                  placeholder="0"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="تاريخ الانتهاء"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="شهر/سنة (مثال: 0728)"
                  inputProps={{ maxLength: 7 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="الوصف"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="أضف وصفاً للدواء..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseModal} color="inherit">
              إلغاء
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveDrug}
              disabled={!!actionLoading}
              startIcon={actionLoading === true ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {actionLoading === true ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'حفظ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Label Print Dialog */}
        {showLabelModal && selectedDrug && (
          <LabelPrintModal
            drug={selectedDrug}
            onClose={() => {
              setShowLabelModal(false);
              setSelectedDrug(null);
            }}
          />
        )}

        {/* Barcode Dialog */}
        <Dialog
          open={showBarcodeModal && !!barcodeDrug}
          onClose={handleCloseBarcodeModal}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={700}>
                تعديل الباركود
              </Typography>
              <IconButton size="small" onClick={handleCloseBarcodeModal}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  اسم الدواء
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {barcodeDrug?.name}
                </Typography>
              </Box>
              <TextField
                label="الباركود"
                value={newBarcode}
                onChange={e => setNewBarcode(e.target.value)}
                placeholder="أدخل الباركود الجديد"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCode2Icon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseBarcodeModal} color="inherit">
              إلغاء
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveBarcode}
              disabled={actionLoading === 'barcode'}
              startIcon={actionLoading === 'barcode' ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {actionLoading === 'barcode' ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

function LabelPrintModal({ drug, onClose }) {
  const pharmacyName = localStorage.getItem('pharmacyName') || 'الصيدلية';

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const barcodePattern = useMemo(() => {
    if (!drug.barcode) return [];
    return Array.from({ length: 40 }, (_, i) => {
      const widths = [2, 3, 4];
      return widths[i % 3];
    });
  }, [drug.barcode]);

  const formatPrice = (price) => (price || 0).toFixed(2);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            طباعة لاصقة
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            border: '2px solid',
            borderColor: 'text.primary',
            bgcolor: '#fff',
            color: '#000',
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            display="block"
            textAlign="center"
            sx={{ borderBottom: '1px solid', borderColor: 'text.primary', pb: 1, mb: 1 }}
          >
            {pharmacyName}
          </Typography>
          <Typography variant="body2" fontWeight={700} textAlign="center" sx={{ mb: 1 }}>
            {drug.name}
          </Typography>
          {drug.arabicName && (
            <Typography variant="caption" textAlign="center" dir="rtl" sx={{ display: 'block', mb: 1 }}>
              {drug.arabicName}
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            {drug.strength} - {drug.dosageForm}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                border: '2px solid',
                borderColor: 'text.primary',
                borderRadius: 1,
                bgcolor: '#fff',
              }}
            >
              <Box sx={{ display: 'flex' }}>
                {barcodePattern.map((width, i) => (
                  <Box key={i} sx={{ width: `${width}px`, bgcolor: '#000', height: 32 }} />
                ))}
              </Box>
              <Typography
                variant="caption"
                fontFamily="monospace"
                textAlign="center"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {drug.barcode || 'N/A'}
              </Typography>
            </Box>
          </Box>
          <Typography variant="h6" fontWeight={700} textAlign="center">
            {formatPrice(drug.sellPrice)} جنيه
          </Typography>
        </Paper>
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: 'block', mt: 1 }}>
          الحجم الموصى به 58mm x 40mm
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button variant="contained" color="secondary" startIcon={<PrintIcon />} onClick={handlePrint}>
          طباعة
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DrugsManagement;
