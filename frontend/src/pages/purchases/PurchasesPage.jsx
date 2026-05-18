import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Barcode from 'react-barcode';
import * as XLSX from 'xlsx';
import { Trash2, Plus, Save, AlertCircle, ScanBarcode, X, Tag, CheckSquare, Square, Printer, Upload } from 'lucide-react';
import { mapArabicToEnglishKeyboard } from '../../utils/keyboard';
import { useTheme } from '../../context/ThemeContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import api from '../../utils/api.js';

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page {
        size: 50mm 25mm;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const formatExpiry = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const [year, month] = dateStr.split('-');
  return month && year ? `${month}/${year.slice(-2)}` : '';
};

const StickerPanel = React.memo(({ purchaseCart, onPrint, isDark }) => {
  const [selected, setSelected] = useState(() => {
    const initial = {};
    purchaseCart.forEach(item => { initial[item.id] = true; });
    return initial;
  });
  const [copies, setCopies] = useState(() => {
    const initial = {};
    purchaseCart.forEach(item => { initial[item.id] = item.quantity || 1; });
    return initial;
  });
  const [pharmacyName, setPharmacyName] = useState(
    () => localStorage.getItem('pharmacyName') || 'الصيدلية'
  );

  useEffect(() => {
    setSelected(prev => {
      const n = {};
      purchaseCart.forEach(item => { n[item.id] = prev[item.id] !== undefined ? prev[item.id] : true; });
      return n;
    });
    setCopies(prev => {
      const n = {};
      purchaseCart.forEach(item => { n[item.id] = prev[item.id] || item.quantity || 1; });
      return n;
    });
  }, [purchaseCart]);

  useEffect(() => {
    localStorage.setItem('pharmacyName', pharmacyName);
  }, [pharmacyName]);

  const allSelected = purchaseCart.length > 0 && purchaseCart.every(item => selected[item.id]);
  const selectedCount = purchaseCart.filter(item => selected[item.id]).length;

  const toggleAll = useCallback(() => {
    const next = !allSelected;
    const n = {};
    purchaseCart.forEach(item => { n[item.id] = next; });
    setSelected(n);
  }, [allSelected, purchaseCart]);

  const toggleItem = useCallback((id) => {
    setSelected(p => ({ ...p, [id]: !p[id] }));
  }, []);

  const handlePrint = useCallback(() => {
    const items = purchaseCart.filter(i => selected[i.id]).map(i => ({ ...i, copies: parseInt(copies[i.id]) || 1 }));
    if (!items.length) return;

    const stickerStyle = `
      width: 189px;
      height: 94px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      page-break-after: always;
      font-family: Arial, sans-serif;
      overflow: hidden;
      padding: 0;
    `;

const generateBarcode = (value) => {
      const str = String(value);
      let x = 0;
      const rects = [];
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        const w = Math.max(1, (charCode % 3));
        rects.push(`<rect x="${x}" y="0" width="${w}" height="40" fill="#000" />`);
        x += w + 1;
        if (x > 188) break;
      }
      return `<div style="width:100%;display:flex;justify-content:center"><svg width="179" height="40" viewBox="0 0 179 40" style="width:95%!important;margin:0 auto;display:block">${rects.join('')}</svg></div>`;
    };

    const stickers = items.flatMap(item =>
      Array.from({ length: item.copies }).map(() => {
        const barcodeValue = item.barcode || item.externalId || item.id?.slice(0, 12) || '000000000000';
        return `
          <div style="${stickerStyle}">
            <div style="font-size: 10px; font-weight: bold; text-align: center;">${pharmacyName}</div>
            <div style="width: 100%; margin-top: 2px;">${generateBarcode(barcodeValue)}</div>
            <div style="font-size: 14px; font-weight: bold; text-align: center; width: 100%; margin-top: 4px; line-height: 1.2; max-height: 28px; overflow: hidden;">${item.name}</div>
            <div style="font-size: 13px; font-weight: 800; text-align: center;">${(item.sellingPrice || 0).toFixed(2)} ج.م</div>
          </div>
        `;
      })
    ).join('');

    const html = `<html dir="rtl"><head>
      <style>
        @page { size: 50mm 25mm; margin: 0; }
        body { margin: 0 !important; padding: 0 !important; }
      </style>
    </head><body style="margin:0;padding:0">${stickers}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1500); };
  }, [purchaseCart, selected, copies, pharmacyName]);

  const card = isDark ? "rounded-2xl border shadow-sm bg-gray-800/90 border-gray-700/50 backdrop-blur-sm" : "rounded-2xl border shadow-sm bg-white border-gray-200";
  const subText = isDark ? "text-gray-400" : "text-gray-500";
  const mainText = isDark ? "text-white" : "text-gray-900";
  const rowHover = isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-100";

  const handleCopyChange = useCallback((id, value) => {
    setCopies(p => ({ ...p, [id]: Math.max(1, parseInt(value) || 1) }));
  }, []);

  const handleCopyDecrease = useCallback((id) => {
    setCopies(p => ({ ...p, [id]: Math.max(1, (p[id] || 1) - 1) }));
  }, []);

  const handleCopyIncrease = useCallback((id) => {
    setCopies(p => ({ ...p, [id]: (p[id] || 1) + 1 }));
  }, []);

  return (
    <div className="w-60 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
      <div className={`${card} p-4`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-purple-900/50">
            <Tag size={15} className="text-purple-400" />
          </div>
          <div>
            <p className={`text-sm font-bold ${mainText}`}>طباعة استيكرات</p>
            <p className={`text-xs ${subText}`}>{selectedCount} من {purchaseCart.length} محدد</p>
          </div>
        </div>

        <label htmlFor="pharmacy-name" className={`block text-xs font-medium mb-1.5 ${subText}`}>اسم الصيدلية</label>
        <input
          id="pharmacy-name"
          name="pharmacyName"
          value={pharmacyName}
          onChange={(e) => setPharmacyName(e.target.value)}
          placeholder="اسم الصيدلية..."
          className={`w-full px-3 py-2 text-sm rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
        />

        <button 
          onClick={toggleAll}
          type="button"
          aria-label={allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
          {allSelected ? <CheckSquare size={15} className="text-purple-500" /> : <Square size={15} className={subText} />}
          {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
        </button>

        <button 
          onClick={handlePrint} 
          disabled={selectedCount === 0 || purchaseCart.length === 0}
          type="button"
          aria-label="طباعة الاستيكرات"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-500/20 transition-all">
          <Printer size={15} aria-hidden="true" />
          طباعة ({selectedCount})
        </button>
      </div>

      <div className={`${card} overflow-hidden flex-1`}>
        <div className={`px-4 py-2 text-xs font-semibold border-b ${subText} ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-slate-100 bg-slate-50'}`}>
          الأصناف
        </div>

        {purchaseCart.length === 0 ? (
          <div className="p-6 text-center">
            <Tag size={22} className={`mx-auto mb-2 opacity-20 ${subText}`} aria-hidden="true" />
            <p className={`text-xs ${subText}`}>السلة فارغة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-gray-700">
            {purchaseCart.map((item) => (
              <div key={item.id} className={`p-3 transition-colors ${rowHover} ${selected[item.id] ? (isDark ? 'bg-purple-900/10' : 'bg-purple-50/50') : ''}`}>
                <div className="flex items-start gap-2 mb-2">
                  <button 
                    onClick={() => toggleItem(item.id)}
                    type="button"
                    aria-label={`تحديد ${item.name}`}
                    aria-pressed={selected[item.id]}
                    className="mt-0.5 flex-shrink-0">
                    {selected[item.id]
                      ? <CheckSquare size={15} className="text-purple-500" aria-hidden="true" />
                      : <Square size={15} className={subText} aria-hidden="true" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold leading-snug truncate ${mainText}`}>{item.name}</p>
                    <p className={`text-xs ${subText}`}>{(item.sellingPrice || 0).toFixed(2)} ج.م</p>
                  </div>
                </div>

                {selected[item.id] && (
                  <div className="flex items-center gap-1.5 pr-6">
                    <span className={`text-xs whitespace-nowrap ${subText}`}>عدد:</span>
                    <div className={`flex items-center rounded-lg overflow-hidden border flex-1 ${isDark ? 'border-gray-600' : 'border-slate-200'}`}>
                      <button 
                        onClick={() => handleCopyDecrease(item.id)}
                        type="button"
                        aria-label="نقصان العدد"
                        className={`px-2 py-1 text-xs font-bold transition-colors flex-shrink-0 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>−</button>
                      <input 
                        type="number" 
                        min="1" 
                        max="999"
                        aria-label={`عدد نسخ ${item.name}`}
                        value={copies[item.id] || 1}
                        onChange={(e) => handleCopyChange(item.id, e.target.value)}
                        className={`w-full text-center text-xs py-1 border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0 ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-slate-900'}`}
                      />
                      <button 
                        onClick={() => handleCopyIncrease(item.id)}
                        type="button"
                        aria-label="زيادة العدد"
                        className={`px-2 py-1 text-xs font-bold transition-colors flex-shrink-0 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>+</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const PurchasesPage = () => {
  const { isDark } = useTheme();
  const [purchaseCart, setPurchaseCart] = useState(() => {
    try {
      const saved = localStorage.getItem('purchase_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [supplierId, setSupplierId] = useState(() => localStorage.getItem('purchase_supplier') || '');
  const [suppliers, setSuppliers] = useState([]);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', genericName: '', strength: '', dosageForm: '', manufacturer: '', sellPrice: '', bagNumber: '' });
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [drugToPrint, setDrugToPrint] = useState(null);

  // Barcode Modal States
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [pendingDrug, setPendingDrug] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const searchInputRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const importInputRef = useRef(null);
  const expiryInputRefs = useRef({});

  const parseImportedNumber = useCallback((value) => {
    if (value === null || value === undefined || value === '') return 0;
    const normalized = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const getImportCell = useCallback((row, columnNames, allowTrailingSpaces = false) => {
    for (const columnName of columnNames) {
      if (row[columnName] !== undefined && row[columnName] !== null && row[columnName] !== '') {
        return row[columnName];
      }
    }

    if (!allowTrailingSpaces) return '';

    const matchingKey = Object.keys(row).find((key) => columnNames.includes(key.trim()));
    return matchingKey ? row[matchingKey] : '';
  }, []);

    const handleExcelImport = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      console.log("=== بدء استيراد ملف الإكسيل ===");
      
      const importedItems = rows
        .map((row, index) => {
          // 1. استخراج الـ ID بدقة عالية مع معالجة المسافات وكل المسميات المحتملة
          const rawId = getImportCell(row, ['id', 'ID', 'Id', 'الكود', 'كود', 'كود الصنف', 'رقم الصنف', 'externalId'], true);
          const importedId = rawId !== undefined && rawId !== null && rawId !== '' ? String(rawId).trim() : '';
          
          // 2. استخراج التكلفة وسعر الجمهور
          const importedCost = getImportCell(row, ['سعر قديم', 'السعر القديم', 'old price', 'oldPrice', 'cost', 'التكلفة'], true);
          const costPrice = parseImportedNumber(importedCost);
          
          const sellingPriceStr = getImportCell(row, ['سعر الجمهور', 'سعر البيع', 'sellingPrice', 'sellPrice'], true);
          const sellingPrice = parseImportedNumber(sellingPriceStr);
          
          // 3. حساب نسبة الخصم
          const discount = sellingPrice > 0 && costPrice > 0
            ? parseFloat(((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2))
            : 0;

          const name = getImportCell(row, ['name', 'Name', 'الاسم', 'اسم الصنف', 'اسم الدواء'], true) || `صنف مستورد ${index + 1}`;

          console.log(`الصف ${index + 1} -> الكود المستخرج: [${importedId}] | الاسم: ${name}`);

          return {
            id: importedId || `temp-${Date.now()}-${index}`, // إعطاء id مؤقت لو الإكسيل مفيهوش كود عشان المكونات تترندر صح
            name: name,
            arabicName: getImportCell(row, ['arabicName', 'ArabicName', 'الاسم العربي'], true),
            genericName: getImportCell(row, ['genericName', 'GenericName', 'المادة الفعالة', 'الاسم العلمي'], true),
            barcode: getImportCell(row, ['barcode', 'Barcode', 'باركود', 'الباركود'], true),
            externalId: importedId, // هنا بيتم تسجيل الكود اللي هيظهر في خانة الـ ID في الجدول
            quantity: parseInt(parseImportedNumber(getImportCell(row, ['quantity', 'Quantity', 'الكمية', 'كمية'], true)), 10) || 1,
            costPrice,
            discount,
            oldPrice: importedCost > 0 ? importedCost : null,
            sellingPrice,
            expiryDate: getImportCell(row, ['expiryDate', 'ExpiryDate', 'تاريخ الانتهاء', 'انتهاء', 'الصلاحية'], true),
            batchNumber: getImportCell(row, ['batchNumber', 'BatchNumber', 'باتش', 'تشغيلة', 'التشغيلة'], true),
            bonusQty: parseInt(parseImportedNumber(getImportCell(row, ['bonusQty', 'BonusQty', 'بونص'], true)), 10) || 0,
          };
        })
        // تصفية الصفوف اللي مفهاش بيانات حقيقية
        .filter(item => item.externalId || (item.name && !item.name.startsWith('صنف مستورد')));

      console.table(importedItems);

      setPurchaseCart(importedItems);
      setError('');
      setSuccess(`تم استيراد ${importedItems.length} صنف بنجاح`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      console.error('Excel import error:', err);
      setError('فشل استيراد ملف Excel');
    } finally {
      event.target.value = '';
    }
  }, [getImportCell, parseImportedNumber]);

  const handleExpiryChange = useCallback((index, value) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length >= 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4);
    let stateValue = '';
    if (digits.length >= 4) { stateValue = `20${digits.slice(2, 4)}-${digits.slice(0, 2)}`; }
    setPurchaseCart(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expiryDate: stateValue };
      return updated;
    });
    const input = expiryInputRefs.current[index];
    if (input && value !== formatted) { input.value = formatted; }
  }, []);

const fetchSuppliers = useCallback(async () => {
    try {
      const r = await api.get('/suppliers');
      setSuppliers(r.data?.data || r.data || []);
    } catch { }
  }, []);

  const filteredSuppliers = useMemo(() => {
    const list = Array.isArray(suppliers) ? suppliers : [];
    const query = supplierFilter.trim().toLowerCase();
    if (!query) return list;
    return list.filter((supplier) =>
      supplier?.name?.toLowerCase().includes(query) ||
      supplier?.phone?.toLowerCase?.().includes(query)
    );
  }, [suppliers, supplierFilter]);

  const showAddSupplierOption = supplierFilter.trim() !== '' && !filteredSuppliers.some(
    (supplier) => supplier?.name?.trim().toLowerCase() === supplierFilter.trim().toLowerCase()
  );

  const handleQuickAddSupplier = useCallback(async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/suppliers', { name: trimmedName });
      const createdSupplier = response.data?.data || response.data;
      if (createdSupplier?.id) {
        setSuppliers(prev => [...prev, createdSupplier].sort((a, b) => a.name.localeCompare(b.name, 'ar')));
        setSupplierId(createdSupplier.id);
        localStorage.setItem('purchase_supplier', createdSupplier.id);
        setSupplierFilter('');
        setShowSupplierDropdown(false);
        setSuccess('تم إضافة المورد بنجاح');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في إضافة المورد');
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchSuppliers, 20000);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      const supplierInput = document.getElementById('supplier-select');
      if (supplierInput && !e.target.closest('.supplier-dropdown-container')) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('purchase_cart', JSON.stringify(purchaseCart));
      localStorage.setItem('purchase_supplier', supplierId);
      setAutoSaving(true);
      const timer = setTimeout(() => setAutoSaving(false), 800);
      return () => clearTimeout(timer);
    } catch (e) { }
  }, [purchaseCart, supplierId]);

  const isNumericOnly = (str) => /^\d+$/.test(str);

  const handleSearchDrugs = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
    const mq = mapArabicToEnglishKeyboard(query);
    const isNumbersOnly = isNumericOnly(query);
    setLoading(true);
    try {
      const r = await api.get(`/pos/search?query=${encodeURIComponent(mq !== query ? mq : query)}`);
      const drugsArray = r.data?.data || [];
      let filtered = drugsArray;
      if (isNumbersOnly) {
        filtered = drugsArray.filter(drug =>
          drug.id?.includes(query) || drug.barcode?.includes(query)
        );
      }
      console.log("Purchases fetch result:", filtered);
      setSearchResults(Array.isArray(filtered) ? filtered : []);
      setShowSearchResults(true);
    } catch { setError('Error searching'); } finally { setLoading(false); }
  }, []);

  const proceedToAddDrug = useCallback((drug, finalBarcode) => {
    const sp = drug.sell_price || drug.sellPrice || 0;
    const cp = drug.cost_price || drug.costPrice || 0;
    const oldPrice = drug.oldPrice ?? drug.alternatePrice ?? null;
    const disc = sp > 0 && cp > 0 ? ((sp - cp) / sp * 100) : 0;
    setPurchaseCart(p => [...p, {
      id: drug.id, name: drug.name, arabicName: drug.arabicName || '',
      genericName: drug.genericName, barcode: finalBarcode || '', 
      externalId: drug.externalId || drug.excelId || drug.id || '',
      quantity: 1, costPrice: cp, discount: parseFloat(disc.toFixed(2)), oldPrice,
      sellingPrice: sp,
      expiryDate: '', batchNumber: '', bonusQty: 0,
    }]);
    setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); setError('');
    setPendingDrug(null);
    setShowBarcodeModal(false);
    setScannedBarcode('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const addDrugToCart = useCallback((drug) => {
    if (purchaseCart.find(i => i.id === drug.id)) { setError('الدواء موجود بالفعل'); setTimeout(() => setError(''), 3000); return; }
    
    const barcodeVal = drug.barcode || drug.externalId || drug.excelId || '';
    const barcodeStr = String(barcodeVal).trim().toUpperCase();
    
    const isInvalidBarcode = !barcodeVal || 
                             barcodeStr === '' || 
                             barcodeStr === 'NULL' || 
                             barcodeStr === 'UNDEFINED' || 
                             barcodeStr === 'N/A' ||
                             barcodeStr.startsWith('RAND');

    if (isInvalidBarcode) {
      setPendingDrug(drug);
      setScannedBarcode('');
      setShowBarcodeModal(true);
      return;
    }
    
    proceedToAddDrug(drug, barcodeVal);
  }, [purchaseCart, proceedToAddDrug]);

  useEffect(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      const exact = searchResults.find(d => (d.barcode && d.barcode.toLowerCase() === searchQuery.toLowerCase().trim()));
      if (exact && !purchaseCart.find(i => i.id === exact.id)) {
        proceedToAddDrug(exact, exact.barcode);
      }
    }
  }, [searchResults, searchQuery, purchaseCart, proceedToAddDrug]);

  useEffect(() => {
    const onKey = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      if (e.key === 'F4') { e.preventDefault(); searchInputRef.current?.focus(); return; }
      if ((e.key === '+' || e.key === '=') && !isInput && purchaseCart.length > 0) {
        e.preventDefault(); const li = purchaseCart.length - 1;
        updateCartItem(li, 'quantity', ((parseInt(purchaseCart[li].quantity) || 0) + 1).toString());
      }
      if (e.key === '-' && !isInput && purchaseCart.length > 0) {
        e.preventDefault(); const li = purchaseCart.length - 1;
        const q = parseInt(purchaseCart[li].quantity) || 0;
        if (q > 1) updateCartItem(li, 'quantity', (q - 1).toString());
      }
      if (e.key === 'Escape' && purchaseCart.length > 0) {
        setPurchaseCart([]); setSearchQuery(''); setSearchResults([]); setShowSearchResults(false);
        localStorage.removeItem('purchase_cart');
        setTimeout(() => { setSuccess('تم تفريغ السلة'); setTimeout(() => setSuccess(''), 2000); }, 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [purchaseCart]);

  useEffect(() => {
    const handleDeleteKey = (e) => {
      const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField && hoveredItemId !== null) {
        e.preventDefault();
        removeFromCart(hoveredItemId);
        setHoveredItemId(null);
      }
    };
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [hoveredItemId]);

  useEffect(() => { setSelectedIndex(0); }, [searchResults]);

  useEffect(() => {
    const handleAfterPrint = () => setDrugToPrint(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const updateCartItem = useCallback((index, field, value) => {
    setPurchaseCart(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'costPrice') {
        item.costPrice = parseFloat(value) || 0;
        const sp = parseFloat(item.sellingPrice) || 0;
        item.discount = sp > 0 && item.costPrice > 0 ? parseFloat(((sp - item.costPrice) / sp * 100).toFixed(2)) : 0;
      } else if (field === 'discount') {
        item.discount = parseFloat(value) || 0;
        const sp = parseFloat(item.sellingPrice) || 0;
        if (sp > 0) item.costPrice = parseFloat((sp * (1 - item.discount / 100)).toFixed(2));
      } else if (field === 'sellingPrice') {
        item.sellingPrice = parseFloat(value) || 0;
        const cp = parseFloat(item.costPrice) || 0;
        item.discount = item.sellingPrice > 0 && cp > 0 ? parseFloat(((item.sellingPrice - cp) / item.sellingPrice * 100).toFixed(2)) : 0;
      } else if (field === 'quantity') {
        item.quantity = parseInt(value) || 0;
      } else if (field === 'bonusQty') {
        item.bonusQty = parseInt(value) || 0;
      } else if (field === 'externalId') {
        item.externalId = value;
      } else if (field === 'id') {
        item.id = value;
      } else if (field === 'batchNumber') {
        item.batchNumber = value;
      } else if (field === 'expiryDate') {
        item.expiryDate = value;
      } else if (field === 'oldPrice') {
        item.oldPrice = value === '' ? null : (parseFloat(value) || null);
      }
      updated[index] = item;
      return updated;
    });
  }, []);

  const handleKeyDown = useCallback((e, index, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const navSequence = ['quantity', 'discount', 'sellingPrice', 'expiry'];
    const ci = navSequence.indexOf(field);
    if (ci < navSequence.length - 1) {
      const nf = navSequence[ci + 1];
      const nid = nf === 'expiry' ? `expiry-${index}` : `row-${index}-${nf}`;
      setTimeout(() => { const el = document.getElementById(nid); if (el) { el.focus(); el.select(); } }, 10);
    } else if (index === purchaseCart.length - 1) {
      setTimeout(() => { searchInputRef.current?.focus(); }, 10);
    } else {
      setTimeout(() => { const el = document.getElementById(`row-${index + 1}-quantity`); if (el) { el.focus(); el.select(); } }, 10);
    }
  }, [purchaseCart.length]);

  const removeFromCart = useCallback((i) => setPurchaseCart(p => p.filter((_, idx) => idx !== i)), []);
  const getItemFinalCost = useCallback((item) => Number(item.costPrice || 0) * (1 - (Number(item.discount) || 0) / 100), []);
  const getItemLineTotal = useCallback((item) => Number(item.sellingPrice || 0) * (parseInt(item.quantity) || 0), []);
  const getProfit = useCallback((item) => ((Number(item.sellingPrice) || 0) - getItemFinalCost(item)) * (parseInt(item.quantity) || 0) + (parseInt(item.bonusQty) || 0) * (Number(item.sellingPrice) || 0), [getItemFinalCost]);
  const grandTotal = purchaseCart.reduce((sum, item) => {
    return sum + (Number(item.costPrice || 0) * (parseInt(item.quantity) || 0));
  }, 0);
  const totalItems = purchaseCart.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
  const totalCost = purchaseCart.reduce((s, i) => s + (Number(i.costPrice || 0) * (parseInt(i.quantity) || 0)), 0);
  const totalProfit = purchaseCart.reduce((s, i) => s + (getItemLineTotal(i) - (Number(i.costPrice) || 0) * (parseInt(i.quantity) || 0)), 0);

const handleSaveInvoice = useCallback(async () => {
    setError(''); setSuccess('');
    if (!purchaseCart.length) { setError('سلة المشتريات فارغة'); return; }
for (const item of purchaseCart) {
      if (!item.quantity || item.quantity <= 0) { setError('الكمية يجب أن تكون أكبر من صفر'); return; }
      if (!item.expiryDate) { setError('تاريخ الانتهاء مطلوب'); return; }
      
    }
    setLoading(true);
    try {
      const payload = {
        supplierId: supplierId || null,
        items: purchaseCart.map(i => ({
          drugId: i.id, quantity: parseInt(i.quantity), costPrice: parseFloat(i.costPrice),
          discount: parseFloat(i.discount) || 0, finalCost: getItemFinalCost(i),
          sellingPrice: parseFloat(i.sellingPrice),
          oldPrice: i.oldPrice === null || i.oldPrice === '' ? null : parseFloat(i.oldPrice),
          expiryDate: i.expiryDate, batchNumber: i.batchNumber,
        })),
      };
      console.log('=== FRONTEND PURCHASE PAYLOAD ===', JSON.stringify(payload, null, 2));
      const r = await api.post('/purchases', payload);
      setSuccess('تم حفظ الفاتورة بنجاح!');
      setPurchaseCart([]); setSupplierId('');
      localStorage.removeItem('purchase_cart'); localStorage.removeItem('purchase_supplier');
    } catch (err) {
      const d = err.response?.data;
      setError(d?.message || d?.errors?.map(e => `${e.field}: ${e.message}`).join(', ') || 'فشل في حفظ الفاتورة');
    } finally { setLoading(false); }
  }, [purchaseCart, supplierId, getItemFinalCost]);

  const handleCancelInvoice = useCallback(() => {
    if (!purchaseCart.length || !window.confirm('هل أنت متأكد من إلغاء الفاتورة؟')) return;
    setPurchaseCart([]); setSupplierId(''); setError(''); setSuccess('');
    localStorage.removeItem('purchase_cart'); localStorage.removeItem('purchase_supplier');
    setTimeout(() => { setSuccess('تم إلغاء الفاتورة'); setTimeout(() => setSuccess(''), 2000); }, 50);
  }, [purchaseCart.length]);

  const handleCreateNewProduct = useCallback(async () => {
    if (!newProduct.name || !newProduct.genericName || !newProduct.strength || !newProduct.dosageForm || !newProduct.manufacturer) { setError('البيانات المطلوبة'); return; }
    setLoading(true); setError('');
    try {
      const r = await api.post('/drugs', newProduct);
      setSuccess('تم إضافة المنتج'); setShowNewProductModal(false);
      addDrugToCart(r.data.data);
      setNewProduct({ name: '', genericName: '', strength: '', dosageForm: '', manufacturer: '', sellPrice: '', bagNumber: '' });
    } catch (err) { setError(err.response?.data?.message || err.message); } finally { setLoading(false); }
  }, [newProduct, addDrugToCart]);

  const handleExternalIdUpdate = useCallback((index, item, value) => {
    updateCartItem(index, 'externalId', value);
    if (value && value !== item.externalId && item.id) {
      api.put(`/drugs/${item.id}`, { externalId: value }).catch(() => {});
    }
  }, [updateCartItem]);

  const handlePrintSingleSticker = useCallback((item) => {
    setDrugToPrint(item);
    setTimeout(() => window.print(), 100);
  }, []);

  const handleAfterPrint = useCallback(() => {
    setDrugToPrint(null);
  }, []);

  const inputCls = `w-full px-3 py-2 text-sm rounded-[var(--md-radius-sm)] border focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all bg-transparent ${isDark ? 'border-[var(--md-outline)] text-white' : 'border-[var(--md-outline)] text-slate-900'}`;
  const sub = isDark ? 'text-gray-400' : 'text-slate-500';
  const mainText = isDark ? 'text-white' : 'text-slate-800';

  return (
    <div className="h-screen flex flex-col overflow-hidden print:hidden bg-[#F8F9FA] dark:bg-[#0F172A]">

      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1E293B] border-b border-[#DEE2E6] dark:border-[#334155] shadow-sm mb-1">
        <h1 className="text-lg font-bold whitespace-nowrap text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-700/30">المشتريات</h1>

        <div className="relative flex-1 max-w-xs" ref={searchWrapperRef}>
          <label htmlFor="drug-search" className="sr-only">بحث عن دواء</label>
          <ScanBarcode size={15} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`} aria-hidden="true" />
          <input 
            id="drug-search"
            ref={searchInputRef} 
            type="text" 
            placeholder="بحث أو باركود... (F4)" 
            value={searchQuery}
            aria-autocomplete="list"
            aria-expanded={showSearchResults}
            aria-controls="search-results-list"
            onChange={(e) => handleSearchDrugs(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, searchResults.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
              else if (e.key === 'Enter' && searchResults.length > 0) { e.preventDefault(); addDrugToCart(searchResults[selectedIndex]); }
            }}
            onFocus={(e) => { e.target.select(); setShowSearchResults(true); }}
            className="w-full pr-9 pl-7 py-2.5 text-sm rounded-full border-2 border-[var(--md-outline)] focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }} 
              type="button"
              aria-label="مسح البحث"
              className={`absolute left-2 top-1/2 -translate-y-1/2 ${sub}`}>
              <X size={14} aria-hidden="true" />
            </button>
          )}

          {showSearchResults && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-[var(--md-radius-lg)] border border-[var(--md-outline)] shadow-[var(--md-shadow-2)] overflow-y-auto bg-white dark:bg-slate-800" style={{ maxHeight: 200 }} role="listbox" id="search-results-list">
              {loading ? <div className="p-3 text-center text-xs text-gray-400">جاري البحث...</div>
                : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((drug, idx) => (
                      <li 
                        key={drug.id} 
                        id={`search-result-item-${idx}`}
                        role="option"
                        aria-selected={idx === selectedIndex}
                        onClick={() => addDrugToCart(drug)}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer border-b last:border-0 transition-colors ${idx === selectedIndex ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-100 dark:border-slate-700'}`}>
                        <div dir="ltr" className="min-w-0 text-right">
                          <p className="text-[12px] font-bold truncate text-gray-900 dark:text-white">{drug.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{drug.genericName}</p>
                        </div>
                        <Plus size={14} className="text-[var(--md-primary)] flex-shrink-0 mr-2" aria-hidden="true" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-xs text-gray-400">لا توجد نتائج</p>
                    <button 
                      onClick={() => { setNewProduct({ name: searchQuery, genericName: '', strength: '', dosageForm: 'tablet', manufacturer: '', sellPrice: '', bagNumber: searchQuery }); setShowNewProductModal(true); }}
                      type="button"
                      className="mt-2 px-4 py-2 bg-[var(--md-primary)] text-white text-xs rounded-full">+ منتج جديد</button>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="relative supplier-dropdown-container">
          <label htmlFor="supplier-select" className="sr-only">اختيار المورد</label>
          <input
            id="supplier-select"
            type="text"
            autoComplete="off"
            value={supplierFilter || (supplierId ? (suppliers.find(s => s.id === supplierId)?.name || '') : '')}
            onChange={(e) => { setSupplierFilter(e.target.value); setShowSupplierDropdown(true); }}
            onFocus={() => setShowSupplierDropdown(true)}
            placeholder="اختر المورد..."
            className="py-2.5 px-4 text-sm rounded-full border-2 border-[var(--md-outline)] focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 w-48"
          />
          {showSupplierDropdown && (
            <div className="absolute top-full mt-1 right-0 w-64 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-[var(--md-outline)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-2)] z-50">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSupplierId(s.id); localStorage.setItem('purchase_supplier', s.id); setSupplierFilter(''); setShowSupplierDropdown(false); }}
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${supplierId === s.id ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-slate-200'}`}
                  >
                    {s.name}
                  </div>
                ))
              ) : null}
              {showAddSupplierOption && (
                <div
                  onClick={() => handleQuickAddSupplier(supplierFilter)}
                  className="px-3 py-2 cursor-pointer bg-green-700/50 text-green-300 hover:bg-green-600/50 border-t border-[var(--md-outline)] flex items-center gap-2"
                >
                  <span>➕</span>
                  <span>إضافة &apos;{supplierFilter}&apos; كمورد جديد</span>
                </div>
              )}
              {supplierFilter.trim() === '' && (
                <div
                  onClick={() => { setSupplierId(''); localStorage.removeItem('purchase_supplier'); setSupplierFilter(''); setShowSupplierDropdown(false); }}
                  className="px-3 py-2 cursor-pointer hover:bg-[var(--md-primary-container)] text-gray-400 border-t border-[var(--md-outline)]"
                >
                  بدون مورد
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mr-auto">
          {[
            { label: 'أصناف', val: purchaseCart.length, cls: 'text-[#212529] dark:text-[#F1F5F9]' },
            { label: 'كمية', val: totalItems, cls: 'text-[#212529] dark:text-[#F1F5F9]' },
            { label: 'تكلفة', val: totalCost.toFixed(0), cls: 'text-[#F59F00] dark:text-[#FBBF24]' },
            { label: 'ربح', val: totalProfit.toFixed(0), cls: totalProfit >= 0 ? 'text-[#2F9E44] dark:text-[#4ADE80]' : 'text-[#FA5252] dark:text-[#F87171]' },
          ].map(s => (
            <div key={s.label} className="px-4 py-2 rounded-full text-xs bg-[#F1F3F5] dark:bg-[#334155] border border-[#DEE2E6] dark:border-[#475569]">
              <span className="text-[#868E96] dark:text-[#94A3B8]">{s.label}: </span><span className={s.cls}>{s.val}</span>
            </div>
          ))}
          {autoSaving && <span className="text-xs animate-pulse text-[#FAB005] dark:text-[#FBBF24]">حفظ...</span>}
        </div>

        <button 
          onClick={() => setShowStickerPanel(p => !p)}
          type="button"
          aria-pressed={showStickerPanel}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${showStickerPanel
            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
            : 'bg-transparent border-[var(--md-outline)] text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
          <Tag size={15} aria-hidden="true" /> استيكرات
        </button>

        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelImport}
          className="hidden"
          aria-label="استيراد Excel"
        />
        <button
          onClick={() => importInputRef.current?.click()}
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all bg-transparent border-[var(--md-outline)] text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50"
        >
          <Upload size={15} aria-hidden="true" /> استيراد Excel
        </button>
      </div>

      {(error || success) && (
        <div className={`flex-shrink-0 mx-4 mt-2 px-4 py-2 flex items-center gap-2 text-sm rounded-xl ${error ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`} role="alert">
          {error && <><AlertCircle className="text-red-500 w-4 h-4" aria-hidden="true" /><span className="text-red-400">{error}</span></>}
          {success && <span className="text-emerald-400">{success}</span>}
        </div>
      )}

      <div className="flex-1 flex gap-3 px-4 mt-2 mb-16 overflow-hidden min-h-0">

        <div className="flex-1 overflow-hidden rounded-2xl shadow-lg border bg-white dark:bg-[#1E293B] border-[#DEE2E6] dark:border-[#334155]">
          {purchaseCart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#868E96] dark:text-[#64748B]">
              <ScanBarcode size={48} className="mb-3 opacity-20" aria-hidden="true" />
              <p className="text-sm">امسح أو اكتب باركود للبدء</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse" role="grid">
                <thead className="sticky top-0 z-10 bg-[#F1F3F5] dark:bg-[#0F172A]">
                  <tr className="text-[12px] font-semibold uppercase tracking-wider text-[#495057] dark:text-[#94A3B8] border-b border-[#DEE2E6] dark:border-[#334155]">
                    <th scope="col" className="px-3 py-3 text-right rounded-tl-2xl flex-1 min-w-[200px]">الصنف</th>
                    <th scope="col" className="px-2 py-3 text-center w-[70px]">الكمية</th>
                    <th scope="col" className="px-2 py-3 text-center w-[80px]">التكلفة</th>
                    <th scope="col" className="px-2 py-3 text-center w-[70px]">خصم%</th>
                    <th scope="col" className="px-2 py-3 text-center w-[90px]">السعر القديم</th>
                    <th scope="col" className="px-2 py-3 text-center w-[90px]">سعر الجمهور</th>
                    <th scope="col" className="px-2 py-3 text-center w-[70px]">بونص</th>
                    <th scope="col" className="px-2 py-3 text-center w-[70px]">ربح</th>
                    <th scope="col" className="px-2 py-3 text-center w-[90px]">تاريخ الصلاحية</th>
                    <th scope="col" className="px-2 py-3 text-center w-[80px]">ID</th>
                    <th scope="col" className="px-2 py-3 text-center w-[80px]">إجمالي</th>
                    <th scope="col" className="w-[60px] rounded-tr-2xl"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseCart.map((item, index) => (
                    <tr
                      key={`${item.id}-${index}`}
                      onMouseEnter={() => setHoveredItemId(index)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      className={`h-[52px] border-b border-[#DEE2E6] dark:border-[#334155] transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-[#1E293B]' : 'bg-[#F8F9FA] dark:bg-[#263248]'} ${hoveredItemId === index ? 'bg-[#F8F9FA] dark:bg-[#263248]' : ''}`}
                    >
                      <td className="px-2 py-1 flex-1 min-w-[200px]">
                        <div className="text-right w-full">
                          <p className="text-[14px] font-bold text-[#212529] dark:text-[#F1F5F9] truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>{item.name}</p>
                          <p className="text-[11px] text-[#868E96] dark:text-[#64748B] truncate w-full min-w-0" dir="ltr" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.genericName}>{item.genericName}</p>
                        </div>
                      </td>
                      <td className="px-1 py-1 w-[70px]">
                        <label htmlFor={`row-${index}-quantity`} className="sr-only">كمية {item.name}</label>
                        <input 
                          id={`row-${index}-quantity`}
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={(e) => updateCartItem(index, 'quantity', e.target.value)} 
                          onKeyDown={(e) => handleKeyDown(e, index, 'quantity')} 
                          onFocus={e => e.target.select()} 
                          className="w-full bg-transparent border border-[#ADB5BD] dark:border-[#475569] rounded-full px-1 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#212529] dark:text-[#F1F5F9]" 
                        />
                      </td>
                      <td className="px-1 py-1 w-[80px]">
                        <label htmlFor={`row-${index}-costPrice`} className="sr-only">تكلفة {item.name}</label>
                        <input 
                          id={`row-${index}-costPrice`} 
                          type="number" 
                          step="0.01" 
                          value={item.costPrice} 
                          onChange={(e) => updateCartItem(index, 'costPrice', e.target.value)} 
                          onKeyDown={(e) => handleKeyDown(e, index, 'costPrice')} 
                          onFocus={e => e.target.select()} 
                          className="w-full bg-transparent border border-[#ADB5BD] dark:border-[#475569] rounded-full px-1 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#212529] dark:text-[#F1F5F9]" 
                        />
                      </td>
                      <td className="px-1 py-1 w-[70px]">
                        <label htmlFor={`row-${index}-discount`} className="sr-only">خصم {item.name}</label>
                        <input 
                          id={`row-${index}-discount`} 
                          type="number" 
                          step="0.01" 
                          value={item.discount} 
                          onChange={(e) => updateCartItem(index, 'discount', e.target.value)} 
                          onKeyDown={(e) => handleKeyDown(e, index, 'discount')} 
                          onFocus={e => e.target.select()} 
                          className="w-full bg-transparent border border-[#ADB5BD] dark:border-[#475569] rounded-full px-1 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#212529] dark:text-[#F1F5F9]" 
                        />
                      </td>
                      <td className="px-1 py-1 w-[90px]">
                        <label htmlFor={`row-${index}-oldPrice`} className="sr-only">السعر القديم لـ {item.name}</label>
                        <input 
                          id={`row-${index}-oldPrice`}
                          type="number" 
                          step="0.01"
                          value={item.oldPrice || ''}
                          onChange={(e) => updateCartItem(index, 'oldPrice', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'oldPrice')}
                          onFocus={e => e.target.select()}
                          placeholder="-"
                          className="w-full bg-transparent border border-[#ADB5BD] dark:border-[#475569] rounded-full px-1 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#868E96] dark:text-[#64748B]"
                        />
                      </td>
                      <td className="px-1 py-1 w-[90px]">
                        <label htmlFor={`row-${index}-sellingPrice`} className="sr-only">سعر البيع {item.name}</label>
                        <input 
                          id={`row-${index}-sellingPrice`} 
                          type="number" 
                          step="0.01" 
                          value={item.sellingPrice} 
                          onChange={(e) => updateCartItem(index, 'sellingPrice', e.target.value)} 
                          onKeyDown={(e) => handleKeyDown(e, index, 'sellingPrice')} 
                          onFocus={e => e.target.select()} 
                          className="w-full bg-transparent border-2 border-[#228BE6] dark:border-[#3B82F6] rounded-xl px-1 py-1 text-center text-[13px] font-mono font-bold text-[#228BE6] dark:text-[#60A5FA] focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] bg-[#E7F5FF] dark:bg-[rgba(59,130,246,0.1)]" 
                        />
                      </td>
                      <td className="px-1 py-1 w-[70px]">
                        <label htmlFor={`row-${index}-bonusQty`} className="sr-only">بونص {item.name}</label>
                        <input 
                          id={`row-${index}-bonusQty`} 
                          type="number" 
                          min="0" 
                          value={item.bonusQty || 0} 
                          onChange={(e) => updateCartItem(index, 'bonusQty', e.target.value)} 
                          onKeyDown={(e) => handleKeyDown(e, index, 'bonusQty')} 
                          onFocus={e => e.target.select()} 
                          className="w-full bg-transparent border border-[#ADB5BD] dark:border-[#475569] rounded-full px-1 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#212529] dark:text-[#F1F5F9]" 
                        />
                      </td>
                      <td className="px-1 py-1 w-[70px] text-center text-[13px] font-mono font-bold text-[#2F9E44] dark:text-[#4ADE80]">{getProfit(item).toFixed(0)}</td>
                      <td className="px-1 py-1 w-[90px]">
                        <label htmlFor={`expiry-${index}`} className="sr-only">تاريخ الصلاحية {item.name}</label>
                        <input 
                          id={`expiry-${index}`}
                          ref={(el) => { expiryInputRefs.current[index] = el; }}
                          type="text" 
                          placeholder="MM/YY" 
                          maxLength={5}
                          defaultValue={formatExpiry(item.expiryDate)} 
                          onChange={(e) => handleExpiryChange(index, e.target.value)} 
                          onKeyDown={(e) => handleKeyDown(e, index, 'expiry')} 
                          className="w-full bg-transparent border border-[#ADB5BD] dark:border-[#475569] rounded-full px-1 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#212529] dark:text-[#F1F5F9]" 
                        />
                        {item.expiryDate && <span className="text-[11px] font-bold text-[#228BE6] dark:text-[#3B82F6] mt-0.5 block text-center" dir="ltr">{item.expiryDate}</span>}
                      </td>
                      <td className="px-1 py-1 w-[80px]">
                        <label htmlFor={`row-${index}-drugId`} className="sr-only">كود {item.name}</label>
                        <div className="relative flex items-center">
                          <Tag size={12} className="absolute right-2 text-gray-400 dark:text-gray-500 opacity-60 pointer-events-none" aria-hidden="true" />
                          <input 
                            id={`row-${index}-drugId`} 
                            type="text" 
                            value={item.externalId || ''} 
                            onChange={(e) => handleExternalIdUpdate(index, item, e.target.value)} 
                            onKeyDown={(e) => handleKeyDown(e, index, 'drugId')} 
                            onFocus={e => e.target.select()} 
                            placeholder="كود" 
                            className="w-full bg-white dark:bg-[#0F172A] border border-[#ADB5BD] dark:border-[#475569] rounded-md pl-2 pr-6 py-1 text-center text-[13px] font-mono focus:border-[#228BE6] dark:focus:border-[#3B82F6] focus:ring-2 focus:ring-[#228BE6] dark:focus:ring-[#3B82F6] text-[#212529] dark:text-[#F1F5F9] shadow-inner transition-all" 
                          />
                        </div>
                      </td>
                      <td className="px-1 py-1 w-[80px] text-center text-[13px] font-mono font-bold text-[#212529] dark:text-[#F1F5F9]">{getItemLineTotal(item).toFixed(0)}</td>
                      <td className="px-1 py-1 w-[60px]">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handlePrintSingleSticker(item)}
                            type="button"
                            aria-label={`طباعة باركود ${item.name}`}
                            className="p-2 rounded-full text-[#228BE6] dark:text-[#60A5FA] hover:bg-[#E7F5FF] dark:hover:bg-[rgba(96,165,250,0.1)]"
                            title="طباعة باركود"
                          >
                            <Printer size={14} aria-hidden="true" />
                          </button>
                          <button 
                            onClick={() => removeFromCart(index)} 
                            type="button"
                            aria-label={`حذف ${item.name}`}
                            className="p-2 rounded-full text-[#FA5252] dark:text-[#F87171] hover:bg-[#FFF5F5] dark:hover:bg-[rgba(248,113,113,0.1)]">
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showStickerPanel && <StickerPanel purchaseCart={purchaseCart} isDark={isDark} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-white dark:bg-[#1E293B] border-t border-[#DEE2E6] dark:border-[#334155] shadow-lg shadow-black/10 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-[#868E96] dark:text-[#64748B]">إجمالي التكلفة</p>
            <p className="text-xl font-bold text-[#212529] dark:text-[#F1F5F9]">{Number(grandTotal).toFixed(2)} ج.م</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCancelInvoice} 
            disabled={!purchaseCart.length}
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-40 bg-transparent border border-[#DEE2E6] dark:border-[#475569] text-[#868E96] dark:text-[#64748B] hover:text-[#212529] dark:hover:text-[#F1F5F9]">
            <X size={15} aria-hidden="true" /> إلغاء
          </button>
          <button 
            onClick={handleSaveInvoice} 
            disabled={loading || !purchaseCart.length}
            type="button"
            className="px-6 py-2 bg-[#228BE6] dark:bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#1C7ED6] dark:hover:bg-[#2563EB] disabled:opacity-40 flex items-center gap-2 transition-all">
            <Save size={15} aria-hidden="true" /> حفظ
          </button>
        </div>
      </div>

      {showNewProductModal && (
        <div className="fixed inset-0 bg-[#0D1117]/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNewProductModal(false)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-md`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center p-5 border-b ${isDark ? 'border-gray-700' : 'border-slate-200'}`}>
              <h2 id="modal-title" className={`text-base font-bold ${mainText}`}>إضافة منتج جديد</h2>
              <button 
                onClick={() => setShowNewProductModal(false)} 
                type="button"
                aria-label="إغلاق"
                className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-gray-700' : 'hover:bg-slate-100'}`}>
                <X size={17} className={sub} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'اسم المنتج *', key: 'name', placeholder: 'Panadol' },
                { label: 'المادة الفعالة *', key: 'genericName', placeholder: 'Paracetamol' },
                { label: 'التركيز *', key: 'strength', placeholder: '500mg' },
                { label: 'الشركة المصنعة *', key: 'manufacturer', placeholder: 'GSK' },
                { label: 'سعر البيع', key: 'sellPrice', placeholder: '0.00', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label htmlFor={`new-product-${f.key}`} className={`block text-xs font-medium mb-1 ${sub}`}>{f.label}</label>
                  <input 
                    id={`new-product-${f.key}`}
                    type={f.type || 'text'} 
                    value={newProduct[f.key]} 
                    onChange={(e) => setNewProduct({ ...newProduct, [f.key]: e.target.value })} 
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2 text-sm rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                  />
                </div>
              ))}
              <div>
                <label htmlFor="new-product-dosageForm" className={`block text-xs font-medium mb-1 ${sub}`}>الشكل الدوائي *</label>
                <select 
                  id="new-product-dosageForm"
                  value={newProduct.dosageForm} 
                  onChange={(e) => setNewProduct({ ...newProduct, dosageForm: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                  {['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'solution', 'suspension', 'inhaler', 'suppository', 'sachet'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button 
                onClick={handleCreateNewProduct} 
                disabled={loading || !newProduct.name || !newProduct.genericName || !newProduct.strength || !newProduct.dosageForm || !newProduct.manufacturer}
                type="button"
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 shadow-md transition-all">
                {loading ? 'جاري الإضافة...' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBarcodeModal && pendingDrug && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0D1117]/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="barcode-modal-title">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 id="barcode-modal-title" className={`text-lg font-bold ${mainText}`}>مسح الباركود</h3>
              <button 
                onClick={() => { setShowBarcodeModal(false); setPendingDrug(null); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                <ScanBarcode size={32} />
              </div>
              <p className={`text-sm mb-6 ${sub}`}>
                الصنف <strong>{pendingDrug.name}</strong> لا يحتوي على باركود.<br/>الرجاء مسح الباركود الآن.
              </p>
              <form 
                onSubmit={(e) => { e.preventDefault(); }}
                className="w-full"
              >
                <input
                  ref={el => { if (el) { el.focus(); } }}
                  type="text"
                  value={scannedBarcode}
                  onChange={e => setScannedBarcode(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (scannedBarcode.trim()) {
                        try { await api.put(`/drugs/${pendingDrug.id}`, { barcode: scannedBarcode.trim() }); } catch (err) {}
                        proceedToAddDrug(pendingDrug, scannedBarcode.trim());
                      } else {
                        proceedToAddDrug(pendingDrug, '');
                      }
                    }
                  }}
                  placeholder="امسح الباركود هنا..."
                  className={`w-full px-4 py-3 text-center text-lg tracking-widest rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  autoFocus
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => proceedToAddDrug(pendingDrug, '')}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    تخطي
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (scannedBarcode.trim()) {
                        try { await api.put(`/drugs/${pendingDrug.id}`, { barcode: scannedBarcode.trim() }); } catch (err) {}
                        proceedToAddDrug(pendingDrug, scannedBarcode.trim());
                      } else {
                        proceedToAddDrug(pendingDrug, '');
                      }
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    حفظ ومتابعة
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div
        className="hidden print:flex print:flex-col print:items-center print:justify-center print:w-[50mm] print:h-[25mm] print:overflow-hidden print:p-0 print:m-0 print:absolute print:top-0 print:left-0 print:right-0 print:bottom-0 print:m-auto"
      >
        {drugToPrint && (
          <div className="flex flex-col items-center justify-between w-full h-full p-1">
            <div className="text-[10px] font-bold text-center leading-tight">
              {localStorage.getItem('pharmacyName') || 'الصيدلية'}
            </div>
            <Barcode 
              value={drugToPrint.barcode || drugToPrint.externalId || drugToPrint.id?.slice(0, 12) || '000000000000'} 
              width={1.2} 
              height={30} 
              fontSize={10} 
              margin={0} 
              displayValue={false}
            />
            <div className="text-[9px] text-center leading-tight w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {drugToPrint.name}
            </div>
            <div className="text-[9px] font-bold text-center leading-tight">
              {(drugToPrint.sellingPrice || 0).toFixed(2)} ج.م
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchasesPage;
