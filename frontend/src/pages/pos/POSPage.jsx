import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, AlertCircle, Printer, Pause, RotateCcw, Pill, CheckCircle, X, LayoutGrid, Search, Package, CreditCard, ArrowLeftRight, Users, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useLocation } from 'react-router-dom';
import ReceiptPrint from '../../components/shared/ReceiptPrint';
import api from '../../utils/api.js';

const PHARMACEUTICAL_FORMS = [
  { value: 'All', arabic: 'الكل' },
  { value: 'tablet', arabic: 'أقراص / Tablet' },
  { value: 'syrup', arabic: 'شراب / Syrup' },
  { value: 'capsule', arabic: 'كبسول / Capsule' },
  { value: 'injection', arabic: 'حقن / Injection' },
  { value: 'drops', arabic: 'نقط / Drops' },
  { value: 'cream', arabic: 'كريم / Cream' },
  { value: 'ointment', arabic: 'مرهم / Ointment' },
  { value: 'suppository', arabic: 'لبوس / Suppository' },
  { value: 'suspension', arabic: 'معلق / Suspension' },
  { value: 'solution', arabic: 'محلول / Solution' },
  { value: 'inhaler', arabic: 'بخاخ / Inhaler' },
  { value: 'sachet', arabic: 'أكياس / Sachet' },
];

const DUMMY_ALTERNATIVES = {
  'PANADOL': [{ name: 'Panadol Extra', price: 25 }, { name: 'Panadol Migraine', price: 30 }],
  'PANADOL EXTRA': [{ name: 'Panadol', price: 15 }, { name: 'Panadol Migraine', price: 30 }],
  'NEUROBION': [{ name: 'Neurobion Forte', price: 45 }, { name: 'Vit B1 B6 B12', price: 35 }],
  'VOLTAREN': [{ name: 'Cataflam', price: 28 }, { name: 'Fastum Gel', price: 65 }],
  'MEFENAMIC ACID': [{ name: 'Diclofenac', price: 18 }, { name: 'Ibuprofen', price: 22 }],
  'AMOXICILLIN': [{ name: 'Augmentin', price: 85 }, { name: 'Azithromycin', price: 45 }],
  'CETIRIZINE': [{ name: 'Loratadine', price: 12 }, { name: 'Fexofenadine', price: 35 }],
  'OMEPRAZOLE': [{ name: 'Pantoprazole', price: 55 }, { name: 'Esomeprazole', price: 75 }],
};

const formatStock = (stock, stripsPerBox, remainingStrips = 0) => {
  const spb = parseInt(stripsPerBox) || 1;
  const boxes = parseInt(stock) || 0;
  const looseStrips = parseInt(remainingStrips) || 0;
  if (spb <= 1) return `متاح: ${boxes}`;
  const totalStrips = (boxes * spb) + looseStrips;
  const displayBoxes = Math.floor(totalStrips / spb);
  const displayStrips = totalStrips % spb;
  return `متاح: ${displayBoxes}:${displayStrips}`;
};

const AlternativesModal = ({ drugName, alternatives, onClose, onSelect }) => {
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 w-80" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">بدائل لـ {drugName}</h3>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {alternatives.map((alt, idx) => (
            <div key={idx} onClick={() => onSelect(alt)} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30">
              <span className="text-xs font-medium text-gray-900 dark:text-white" dir="ltr" style={{textAlign: 'right'}}>{alt.name}</span>
              <span className="text-xs font-bold text-green-600">{alt.price} جنيه</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 w-full py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 rounded text-xs font-semibold">إغلاق</button>
      </div>
    </div>
  );
};

const SearchDropdown = memo(({ searchResults, onItemClick, onAlternativesClick, isSearching, selectedIndex, alternativesMode, onBackToResults }) => {
  const [hoveredDrugId, setHoveredDrugId] = useState(null);

  if (searchResults.length === 0) return null;

  const getAlternatives = (drug) => {
    if (!drug.genericName) return [];
    return searchResults
      .filter(d => d.genericName === drug.genericName && d.id !== drug.id)
      .slice(0, 5);
  };

  return (
    <div className="absolute top-full right-0 left-0 mt-2 w-full min-w-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 z-50 max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-slate-700/50">
      {alternativesMode && (
        <div
          onClick={onBackToResults}
          className="px-4 py-3 text-xs text-blue-500 dark:text-blue-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700/50"
        >
          ← رجوع للنتائج
        </div>
      )}
      {!alternativesMode && (
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700/50">
          {searchResults.length} نتيجة
        </div>
      )}
      <div className="flex flex-col" dir="rtl">
        {searchResults.map((drug, index) => {
          const drugStock = Number(drug.quantity ?? drug.totalStock ?? drug.stock ?? 0);
          const isOutOfStock = !drug.available || drugStock === 0;
          return (
          <div
            id={`pos-search-result-item-${index}`}
            key={drug.id}
            onMouseDown={(e) => { if (!isOutOfStock) { e.preventDefault(); onItemClick(drug); } }}
            className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors min-h-[56px] ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30 border-r-2 border-blue-500 dark:border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
          >
            {/* RIGHT side — Drug Info */}
            <div className="flex flex-col min-w-0 flex-1 text-right w-full">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={drug.name} dir="ltr" style={{textAlign: 'right'}}>{drug.name}</span>
              {drug.genericName && (
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate" title={drug.genericName} dir="ltr" style={{textAlign: 'right'}}>{drug.genericName}</span>
              )}
            </div>

            {/* LEFT side — Stock & Alternatives */}
            <div className="flex items-center gap-2 flex-shrink-0 mr-4">
              {drugStock <= 0 ? (
                <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2 py-0.5 rounded-full">
                  نفد
                </span>
              ) : (
                <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium">{formatStock(drugStock, drug.stripsPerBox || drug.stripCount || 1)}</span>
              )}
              
              {!alternativesMode && drug.genericName && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAlternativesClick(drug, e); }}
                  className="px-2 py-1 text-[10px] font-bold bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded hover:bg-purple-100 dark:hover:bg-purple-600/40 transition-colors"
                >
                  البدائل
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
});

SearchDropdown.displayName = 'SearchDropdown';

const POSPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchInput, setSearchInput] = useState('');
  const [selectedForm, setSelectedForm] = useState('All');
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allDrugs, setAllDrugs] = useState([]);
  const [drugsLoading, setDrugsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('pos_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [cashPaid, setCashPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSearching, setIsSearching] = useState(false);
  const [drugsCount, setDrugsCount] = useState(0);
  const [error, setError] = useState('');
  const [lastSaleData, setLastSaleData] = useState(null);
  const [showPrintSuccess, setShowPrintSuccess] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const [heldCarts, setHeldCarts] = useState([]);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [alternativesModal, setAlternativesModal] = useState(null);
  const [alternativesMode, setAlternativesMode] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState({ id: null, name: '', phone: '' });
  const [isDeferred, setIsDeferred] = useState(false);
  const [showCreditFields, setShowCreditFields] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomerDebt, setSelectedCustomerDebt] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [autoShowReceipt, setAutoShowReceipt] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [debtLimitError, setDebtLimitError] = useState(null);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [loadedInvoice, setLoadedInvoice] = useState(null);
  const [invoiceSearchResults, setInvoiceSearchResults] = useState([]);
  const [showReturnPanel, setShowReturnPanel] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [returnSales, setReturnSales] = useState([]);
  const [selectedReturnSale, setSelectedReturnSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState('');
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [hoveredAltDrugId, setHoveredAltDrugId] = useState(null);
  const [priceToggleTooltip, setPriceToggleTooltip] = useState(() => {
    return localStorage.getItem('pos_price_toggle_seen') === 'true';
  });
  // Customers panel state
  const [showCustomersPanel, setShowCustomersPanel] = useState(false);
  const [customersPanelTab, setCustomersPanelTab] = useState('list'); // 'list' | 'add'
  const [panelCustomerSearch, setPanelCustomerSearch] = useState('');
  const [panelCustomerResults, setPanelCustomerResults] = useState([]);
  const [panelCustomerLoading, setPanelCustomerLoading] = useState(false);
  const [panelNewCustomer, setPanelNewCustomer] = useState({ name: '', phone: '' });
  const [panelCreatingCustomer, setPanelCreatingCustomer] = useState(false);
  const [selectedPanelCustomer, setSelectedPanelCustomer] = useState(null);
  const [panelCustomerInvoices, setPanelCustomerInvoices] = useState([]);
  const [panelInvoicesLoading, setPanelInvoicesLoading] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [expandedPanelInvoiceId, setExpandedPanelInvoiceId] = useState(null);
  const [panelInvoiceItems, setPanelInvoiceItems] = useState({});
  const [loadingPanelInvoiceId, setLoadingPanelInvoiceId] = useState(null);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const receiptRef = useRef(null);

  const ARABIC_TO_ENGLISH_MAP = {
    'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
    'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ك': ';', 'ط': '\'',
    'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm', 'و': ',', 'ز': '.', 'ظ': '/',
    'ذ': '`', 'أ': 'h', 'إ': 'y', 'آ': 'n'
  };

  const mapArabicToEnglishKeyboard = (str) => {
    if (!str) return '';
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      result += ARABIC_TO_ENGLISH_MAP[char] || char;
    }
    return result;
  };

  const getUnitPrice = (item) => {
    let basePrice = Number(item.box_price) || 0;
    const oldPrice = Number(item.oldPrice) || 0;
    if (oldPrice > 0 && oldPrice !== basePrice && item.useOldPrice) {
      basePrice = oldPrice;
    }
    if (item.unit === 'strip' && item.strips_per_box > 0) {
      return (basePrice / item.strips_per_box);
    }
    return basePrice;
  };

  const getLineTotal = (item) => {
    return (getUnitPrice(item) * item.quantity).toFixed(2);
  };

  const togglePriceType = (id) => {
    const item = cartItems.find(i => i.id === id);
    const oldPrice = Number(item?.oldPrice) || 0;
    const publicPrice = Number(item?.box_price) || 0;
    if (!item || oldPrice <= 0 || oldPrice === publicPrice) return;
    setCartItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        return { ...item, useOldPrice: !item.useOldPrice };
      }
      return item;
    }));
  };

  const handlePriceDoubleClick = (id) => {
    const item = cartItems.find(i => i.id === id);
    const oldPrice = Number(item?.oldPrice) || 0;
    const publicPrice = Number(item?.box_price) || 0;
    if (!item || oldPrice <= 0 || oldPrice === publicPrice) return;
    togglePriceType(id);
    if (!priceToggleTooltip) {
      localStorage.setItem('pos_price_toggle_seen', 'true');
      setPriceToggleTooltip(true);
    }
  };

  const updateCartItemQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      setCartItems(cartItems.filter(item => item.id !== id));
      return;
    }
    setCartItems(
      cartItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = useCallback((id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (getUnitPrice(item) * item.quantity);
  }, 0);

  const discountValue = parseFloat(discount) || 0;
  const effectiveDiscountAmount = discountType === 'percentage'
    ? (subtotal * discountValue) / 100
    : discountValue;

  const effectiveDiscountPercent = subtotal > 0 ? (effectiveDiscountAmount / subtotal) * 100 : 0;
  const userMaxDiscount = user?.maxDiscountLimit || 0;
  const isDiscountExceeded = userMaxDiscount > 0 && effectiveDiscountPercent > userMaxDiscount;

  const grandTotal = parseFloat((subtotal - effectiveDiscountAmount).toFixed(2));
  const changeReturn = (cashPaid - grandTotal).toFixed(2);

  useEffect(() => {
    const fetchAllDrugs = async () => {
      try {
        setDrugsLoading(true);
        const response = await api.get('/drugs?limit=15000');
        const result = response.data;
        console.log('[DEBUG] Drugs API response:', result);
        const drugsArray = Array.isArray(result?.data) ? result.data : 
                          Array.isArray(result) ? result : [];
        console.log('[DEBUG] Drugs fetched:', drugsArray.length, 'First drug:', drugsArray[0]?.name);
        setAllDrugs(drugsArray);
        setDrugsCount(drugsArray.length);
      } catch (err) {
        console.error('Error fetching drugs:', err);
        setError('فشل تحميل قائمة الأدوية');
      } finally {
        setDrugsLoading(false);
      }
    };
    fetchAllDrugs();
  }, []);

  const fetchAllDrugs = useCallback(async () => {
    try {
      setDrugsLoading(true);
      const response = await api.get('/drugs?limit=15000');
      const result = response.data;
      const drugsArray = Array.isArray(result?.data) ? result.data : 
                        Array.isArray(result) ? result : [];
      setAllDrugs(drugsArray);
      setDrugsCount(drugsArray.length);
    } catch (err) {
      console.error('Error fetching drugs:', err);
      setError('فشل تحميل قائمة الأدوية');
    } finally {
      setDrugsLoading(false);
    }
  }, []);

  useAutoRefresh(fetchAllDrugs, 10000);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/pos/customer-ledger', {
          params: { t: Date.now() }
        });
        if (response.data?.success && response.data?.data) {
          setCustomersList(response.data.data);
        } else {
          console.error('API returned error:', response.data?.error);
        }
      } catch (err) {
        console.error('Error fetching customers:', err.response?.data || err.message);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  useEffect(() => {
    if (searchResults.length > 0 && selectedIndex >= 0) {
      setTimeout(() => {
        const el = document.getElementById(`pos-search-result-item-${selectedIndex}`);
        if (el) el.scrollIntoView({ block: 'nearest' });
      }, 10);
    }
  }, [selectedIndex, searchResults]);

  useEffect(() => {
    if (searchInput.trim()) {
      setSelectedIndex(0);
    }
  }, [selectedForm, allDrugs]);

  useEffect(() => {
    const term = searchInput.trim();
    if (!term || term.length < 3) return;

    const matchedDrug = allDrugs.find(drug =>
      drug.barcode && drug.barcode.trim() === term
    );

    if (matchedDrug) {
      handleDropdownItemClick({
        ...matchedDrug,
        sell_price: matchedDrug.sellPrice,
        oldPrice: matchedDrug.oldPrice ?? matchedDrug.alternatePrice ?? null,
        quantity: Number(matchedDrug.quantity ?? matchedDrug.totalStock ?? matchedDrug.stock ?? 0),
        available: (matchedDrug.totalStock ?? matchedDrug.stock ?? 0) > 0,
      });
    }
  }, [searchInput, allDrugs]);

  useEffect(() => {
    if (location.state?.forceStartShift) {
      const activeShift = localStorage.getItem('activeShift');
      if (!activeShift) {
        setShowStartShiftModal(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (user?.id) {
      fetchSuspendedSales();
    }
  }, [user]);

  const fetchSuspendedSales = async () => {
    if (!user?.id) return;
    try {
      const response = await api.get(`/pos/suspended?userId=${user.id}`);
      const result = response.data;
      setHeldCarts(result.data || []);
    } catch (err) {
      console.error('Error fetching suspended sales:', err);
    }
  };

  useAutoRefresh(fetchSuspendedSales, 15000);

  const searchInvoices = async (query) => {
    if (!query.trim() || query.length < 2) {
      setInvoiceSearchResults([]);
      return;
    }
    try {
      const response = await api.get(`/pos/invoices/search?q=${encodeURIComponent(query)}`);
      const result = response.data;
      setInvoiceSearchResults(result.data || []);
    } catch (err) {
      console.error('Error searching invoices:', err);
      setInvoiceSearchResults([]);
    }
  };

  const handleLoadInvoice = async (invoice) => {
    try {
      const response = await api.get(`/pos/invoices/${invoice.id}`);
      const result = response.data;
      const invoiceData = result.data;
      setLoadedInvoice(invoiceData);
      const cartItemsFromInvoice = invoiceData.items.map(item => ({
        id: item.id,
        drugId: item.drugId,
        name: item.drugName,
        genericName: item.genericName || '',
        barcode: item.barcode || 'N/A',
        quantity: item.quantity,
        unit: 'box',
        box_price: item.unitPrice || item.price,
        alternate_price: item.unitPrice || item.price,
        useAlternatePrice: false,
        strips_per_box: 1,
        isReturnItem: true,
      }));
      setCartItems(cartItemsFromInvoice);
      setSearchInput('');
      setInvoiceSearchResults([]);
      setError('');
      setTimeout(() => { setError('تم تحميل الفاتورة - يمكنك التعديل'); setTimeout(() => setError(''), 2000); }, 100);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(`فشل تحميل الفاتورة: ${err.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleReturnItem = async (item) => {
    if (!loadedInvoice) return;
    const confirmReturn = window.confirm(`هل أنت متأكد من إرجاع "${item.drugName}"؟`);
    if (!confirmReturn) return;
    try {
      const response = await api.post('/pos/return-item', {
        invoiceId: loadedInvoice.id,
        itemId: item.id,
        drugId: item.drugId,
        quantity: item.quantity
      });
      const result = response.data;
      setLoadedInvoice(result.data.updatedInvoice);
      fetchAllDrugs();
      setError('');
      setTimeout(() => { setError('تم إرجاع الصنف بنجاح!'); setTimeout(() => setError(''), 2000); }, 100);
    } catch (err) {
      console.error('Error returning item:', err);
      setError(`فشل إرجاع الصنف: ${err.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleExitReturnMode = () => {
    setIsReturnMode(false);
    setLoadedInvoice(null);
    setInvoiceSearchResults([]);
    setSearchInput('');
    setShowReturnPanel(false);
    setReturnSearchQuery('');
    setReturnSales([]);
    setSelectedReturnSale(null);
    setReturnItems([]);
  };

  const fetchReturnSales = async (query = '') => {
    try {
      const response = await api.get('/pos/history');
      const result = response.data;
      if (result.data) {
        let sales = result.data;
        if (query.trim()) {
          const q = query.toLowerCase();
          sales = sales.filter(sale =>
            sale.id?.toLowerCase().includes(q) ||
            sale.customerName?.toLowerCase().includes(q) ||
            sale.cashierName?.toLowerCase().includes(q) ||
            sale.items?.some(item => 
              item.drugName?.toLowerCase().includes(q) ||
              item.genericName?.toLowerCase().includes(q)
            )
          );
        }
        setReturnSales(sales.slice(0, 50));
      }
    } catch (err) {
      console.error('Error fetching return sales:', err);
    }
  };

  const handleSelectReturnSale = (sale) => {
    setSelectedReturnSale(sale);
    setReturnItems(sale.items.map(item => ({
      ...item,
      returnQty: 0,
      maxQty: item.quantity - (item.returnedQty || 0),
      included: false,
    })));
  };

  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      setCustomerSearchLoading(true);
      const response = await api.get(`/customers?search=${encodeURIComponent(query)}`);
      if (response.data?.data) {
        setCustomerSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerSearchResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, []);

  const createNewCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      setError('يجب إدخال اسم العميل');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      setIsCreatingCustomer(true);
      const response = await api.post('/customers', {
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim() || null
      });
      if (response.data?.data) {
        const newCustomer = response.data.data;
        selectCustomer(newCustomer);
        setNewCustomerData({ name: '', phone: '' });
        setShowNewCustomerForm(false);
        setCustomerSearchQuery('');
        setError('');
        setTimeout(() => { setError('تم إضافة العميل بنجاح!'); setTimeout(() => setError(''), 2000); }, 100);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      const errorMsg = error.response?.data?.error || 'فشل في إضافة العميل';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const debouncedCustomerSearch = useCallback((query) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      searchCustomers(query);
    }, 300);
  }, [searchCustomers]);

  const selectCustomer = useCallback((customer) => {
    setActiveCustomer({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || '',
    });
    setCustomerSearchResults([]);
    if (customer.id) {
      fetchCustomerDebt(customer.id);
    }
  }, []);

  const fetchCustomerDebt = async (customerId) => {
    try {
      const response = await api.get(`/pos/customer-ledger/${customerId}`);
      if (response.data?.data?.account) {
        setSelectedCustomerDebt(response.data.data.account.currentBalance);
      }
    } catch (error) {
      console.error('Error fetching customer debt:', error);
      setSelectedCustomerDebt(null);
    }
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchQuery(value);
    setActiveCustomer(prev => ({ ...prev, id: null, name: value, phone: '' }));
    if (value.length >= 2) {
      debouncedCustomerSearch(value);
    } else {
      setCustomerSearchResults([]);
    }
    setSelectedCustomerDebt(null);
  };

  const handleCreditNameChange = (e) => {
    const value = e.target.value;
    setActiveCustomer(prev => ({ ...prev, id: null, name: value }));
    debouncedCustomerSearch(value);
    setSelectedCustomerDebt(null);
  };

  const handleCreditPhoneChange = (e) => {
    const value = e.target.value;
    setActiveCustomer(prev => ({ ...prev, phone: value }));
    debouncedCustomerSearch(value);
    setSelectedCustomerDebt(null);
  };

  const clearCreditCustomer = () => {
    setActiveCustomer({ id: null, name: '', phone: '' });
    setCustomerSearchResults([]);
    setSelectedCustomerDebt(null);
    setCustomerSearchQuery('');
    setShowNewCustomerForm(false);
    setNewCustomerData({ name: '', phone: '' });
  };

  // === Customers Panel Functions ===
  const searchPanelCustomers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setPanelCustomerResults([]);
      return;
    }
    try {
      setPanelCustomerLoading(true);
      const response = await api.get(`/customers?search=${encodeURIComponent(query)}`);
      if (response.data?.data) {
        setPanelCustomerResults(response.data.data);
      }
    } catch (error) {
      console.error('Error searching panel customers:', error);
      setPanelCustomerResults([]);
    } finally {
      setPanelCustomerLoading(false);
    }
  }, []);

  const fetchPanelCustomerInvoices = useCallback(async (customerId) => {
    try {
      setPanelInvoicesLoading(true);
      const response = await api.get(`/customers/${customerId}/invoices`);
      if (response.data?.data) {
        setPanelCustomerInvoices(response.data.data);
      } else {
        setPanelCustomerInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      // Fallback: fetch from sales history filtered by customer
      try {
        const histResponse = await api.get('/pos/history');
        if (histResponse.data?.data) {
          const filtered = histResponse.data.data.filter(s => s.customerId === customerId);
          setPanelCustomerInvoices(filtered);
        }
      } catch (e2) {
        console.error('Fallback invoice fetch failed:', e2);
        setPanelCustomerInvoices([]);
      }
    } finally {
      setPanelInvoicesLoading(false);
    }
  }, []);

  const handleSelectPanelCustomer = useCallback((customer) => {
    setSelectedPanelCustomer(customer);
    setActiveCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
    setExpandedInvoiceId(null);
    fetchPanelCustomerInvoices(customer.id);
  }, [fetchPanelCustomerInvoices]);

  const createPanelCustomer = async () => {
    if (!panelNewCustomer.name.trim()) {
      setError('يجب إدخال اسم العميل');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      setPanelCreatingCustomer(true);
      const response = await api.post('/customers', {
        name: panelNewCustomer.name.trim(),
        phone: panelNewCustomer.phone.trim() || null
      });
      if (response.data?.data) {
        setPanelNewCustomer({ name: '', phone: '' });
        setCustomersPanelTab('list');
        setPanelCustomerSearch('');
        setPanelCustomerResults([]);
        setError('');
        setTimeout(() => { setError('تم إضافة العميل بنجاح!'); setTimeout(() => setError(''), 2000); }, 100);
      }
    } catch (error) {
      console.error('Error creating panel customer:', error);
      const errorMsg = error.response?.data?.error || 'فشل في إضافة العميل';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    } finally {
      setPanelCreatingCustomer(false);
    }
  };

  const fetchPanelInvoiceItems = async (invoiceId) => {
    if (panelInvoiceItems[invoiceId]) return;
    try {
      setLoadingPanelInvoiceId(invoiceId);
      const res = await api.get(`/pos/invoices/${invoiceId}`);
      if (res.data?.data?.items) {
        setPanelInvoiceItems(prev => ({
          ...prev,
          [invoiceId]: res.data.data.items
        }));
      }
    } catch (err) {
      console.error('Error fetching invoice items:', err);
    } finally {
      setLoadingPanelInvoiceId(null);
    }
  };

  const togglePanelInvoice = (invoiceId) => {
    if (expandedPanelInvoiceId === invoiceId) {
      setExpandedPanelInvoiceId(null);
    } else {
      setExpandedPanelInvoiceId(invoiceId);
      fetchPanelInvoiceItems(invoiceId);
    }
  };

  // === Loyalty Points Calculation ===
  const earnedPoints = Math.floor(grandTotal / 100) * 10;

  const toggleReturnItem = (index) => {
    const newItems = [...returnItems];
    newItems[index].included = !newItems[index].included;
    if (newItems[index].included && newItems[index].returnQty === 0) {
      newItems[index].returnQty = 1;
    }
    setReturnItems(newItems);
  };

  const updateReturnQty = (index, qty) => {
    const newItems = [...returnItems];
    const val = parseInt(qty) || 0;
    newItems[index].returnQty = Math.min(Math.max(0, val), newItems[index].maxQty);
    if (newItems[index].returnQty > 0) {
      newItems[index].included = true;
    }
    setReturnItems(newItems);
  };

  const getReturnTotal = () => {
    return returnItems.reduce((sum, item) => {
      if (item.included && item.returnQty > 0) {
        return sum + (item.returnQty * parseFloat(item.unitPrice || item.price));
      }
      return sum;
    }, 0);
  };

  const handleConfirmReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.included && item.returnQty > 0);
    if (itemsToReturn.length === 0) {
      setError('اختر أصناف لإرجاعها');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const response = await api.post('/pos/return', {
        saleId: selectedReturnSale.id,
        items: itemsToReturn.map(item => ({
          saleItemId: item.id,
          quantity: item.returnQty,
        })),
        userId: user?.id,
      });

      const result = response.data;
      if (result.success) {
        setReturnSuccessMsg(`تم تسجيل المرتجع بنجاح - مبلغ الاسترجاع: ${result.refundAmount?.toFixed(2) || getReturnTotal().toFixed(2)} ج`);
        setTimeout(() => setReturnSuccessMsg(''), 5000);
        setShowReturnPanel(false);
        setSelectedReturnSale(null);
        setReturnItems([]);
        fetchAllDrugs();
      } else {
        setError(result.error || 'فشل تسجيل المرتجع');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError(`خطأ: ${err.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  useEffect(() => {
    if (showReturnPanel) {
      fetchReturnSales();
    }
  }, [showReturnPanel]);

  const handleStartShift = (e) => {
    e.preventDefault();
    if (!openingCash || parseFloat(openingCash) < 0) {
      alert('اكتب مبلغ صحيح لفتح الشيفت');
      return;
    }
    const shiftData = {
      startTime: new Date().toISOString(),
      openingCash: parseFloat(openingCash),
      currentCash: parseFloat(openingCash),
    };
    localStorage.setItem('activeShift', JSON.stringify(shiftData));
    setShowStartShiftModal(false);
    setOpeningCash('');
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4' || (e.key === 'Control' && e.key === 'Control')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const isInputField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      if ((e.key === '+' || e.key === '=') && !isInputField) {
        e.preventDefault();
        if (cartItems.length > 0) {
          const lastItem = cartItems[cartItems.length - 1];
          updateCartItemQuantity(lastItem.id, lastItem.quantity + 1);
        }
        return;
      }

      if (e.key === '-' && !isInputField) {
        e.preventDefault();
        if (cartItems.length > 0) {
          const lastItem = cartItems[cartItems.length - 1];
          updateCartItemQuantity(lastItem.id, lastItem.quantity - 1);
        }
        return;
      }

      if (e.key === 'Tab' && !isInputField) {
        e.preventDefault();
        const expressTotal = parseFloat((subtotal - effectiveDiscountAmount).toFixed(2));
        setCashPaid(expressTotal);
        handleCompleteSale(expressTotal);
        return;
      }

      if (e.key === 'Control') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((e.key === 'F2' || (e.key === 'Enter' && !isInputField)) && cartItems.length > 0) {
        e.preventDefault();
        handleCompleteSale();
        return;
      }

      if (e.key === 'Escape') {
        if (cartItems.length > 0) {
          setCartItems([]);
          setDiscount(0);
          setCashPaid(0);
          setPaymentMethod('CASH');
          setSearchInput('');
          searchInputRef.current?.focus();
          setError('');
          setTimeout(() => { setError('تم تفريغ العربة (Esc)'); setTimeout(() => setError(''), 2000); }, 100);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, grandTotal]);

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
  }, [hoveredItemId, removeFromCart]);

  const isNumericOnly = (str) => /^\d+$/.test(str);

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchInput(query);
    if (alternativesMode) {
      setAlternativesMode(false);
    }

    if (isReturnMode) {
      searchInvoices(query);
      return;
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const mappedSearchTerm = mapArabicToEnglishKeyboard(searchTerm).toLowerCase().trim();
    const formFilter = selectedForm !== 'All' ? selectedForm.toLowerCase() : null;
    const isNumbersOnly = isNumericOnly(query);

    const filtered = allDrugs
      .filter(drug => {
        let matchesSearch;

        if (isNumbersOnly) {
          const idMatch = drug.id?.toString() === searchTerm;
          const barcodeMatch = drug.barcode === query || drug.barcode === mappedSearchTerm;
          const excelIdMatch = drug.externalId === query || drug.externalId === mappedSearchTerm;
          matchesSearch = idMatch || barcodeMatch || excelIdMatch;
        } else {
          const nameMatch = drug.name?.toLowerCase().includes(searchTerm) || drug.name?.toLowerCase().includes(mappedSearchTerm);
          const genericMatch = drug.genericName?.toLowerCase().includes(searchTerm) || drug.genericName?.toLowerCase().includes(mappedSearchTerm);
          const arabicMatch = drug.arabicName?.includes(searchTerm) || drug.arabicName?.includes(mappedSearchTerm);
          matchesSearch = nameMatch || genericMatch || arabicMatch;
        }

        if (formFilter) {
          const formMatch = drug.dosageForm?.toLowerCase().includes(formFilter);
          return matchesSearch && formMatch;
        }

        return matchesSearch;
      })
      .slice(0, 50)
      .map(drug => {
        const baseStock = Number(drug.quantity ?? drug.totalStock ?? drug.stock ?? 0);
        const cartQty = cartItems.filter(ci => ci.id === drug.id).reduce((sum, ci) => sum + ci.quantity, 0);
        const remainingStock = Math.max(0, baseStock - cartQty);
        return {
          ...drug,
          sell_price: drug.sellPrice,
          oldPrice: drug.oldPrice ?? drug.alternatePrice ?? null,
          quantity: remainingStock,
          available: remainingStock > 0
        };
      });

    setSearchResults(filtered);
  };

  useEffect(() => {
    if (!searchInput.trim() || alternativesMode) return;

    const searchTerm = searchInput.toLowerCase().trim();
    const mappedSearchTerm = mapArabicToEnglishKeyboard(searchTerm).toLowerCase().trim();
    const formFilter = selectedForm !== 'All' ? selectedForm.toLowerCase() : null;
    const isNumbersOnly = isNumericOnly(searchInput);

    const filtered = allDrugs
      .filter(drug => {
        let matchesSearch;

        if (isNumbersOnly) {
          const idMatch = drug.id?.toString() === searchTerm;
          const barcodeMatch = drug.barcode === searchInput || drug.barcode === mappedSearchTerm;
          const excelIdMatch = drug.externalId === searchInput || drug.externalId === mappedSearchTerm;
          matchesSearch = idMatch || barcodeMatch || excelIdMatch;
        } else {
          const nameMatch = drug.name?.toLowerCase().includes(searchTerm) || drug.name?.toLowerCase().includes(mappedSearchTerm);
          const genericMatch = drug.genericName?.toLowerCase().includes(searchTerm) || drug.genericName?.toLowerCase().includes(mappedSearchTerm);
          const arabicMatch = drug.arabicName?.includes(searchTerm) || drug.arabicName?.includes(mappedSearchTerm);
          matchesSearch = nameMatch || genericMatch || arabicMatch;
        }

        if (formFilter) {
          const formMatch = drug.dosageForm?.toLowerCase().includes(formFilter);
          return matchesSearch && formMatch;
        }

        return matchesSearch;
      })
      .slice(0, 50)
      .map(drug => {
        const baseStock = Number(drug.quantity ?? drug.totalStock ?? drug.stock ?? 0);
        const cartQty = cartItems.filter(ci => ci.id === drug.id).reduce((sum, ci) => sum + ci.quantity, 0);
        const remainingStock = Math.max(0, baseStock - cartQty);
        return {
          ...drug,
          sell_price: drug.sellPrice,
          oldPrice: drug.oldPrice ?? drug.alternatePrice ?? null,
          quantity: remainingStock,
          available: remainingStock > 0
        };
      });

    setSearchResults(filtered);
  }, [selectedForm, allDrugs, searchInput, cartItems]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.toLowerCase().trim();
      const mappedQuery = mapArabicToEnglishKeyboard(query);

      if (!query) return;

      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        handleDropdownItemClick(searchResults[selectedIndex]);
        return;
      }

      const formFilter = selectedForm !== 'All' ? selectedForm.toLowerCase() : null;

      const exactBarcodeMatch = allDrugs.find(drug =>
        (drug.barcode === query || drug.barcode === mappedQuery ||
         drug.externalId === query || drug.externalId === mappedQuery) &&
        (!formFilter || drug.dosageForm?.toLowerCase().includes(formFilter))
      );

      if (exactBarcodeMatch) {
        handleDropdownItemClick({
          ...exactBarcodeMatch,
          sell_price: exactBarcodeMatch.sellPrice,
          oldPrice: exactBarcodeMatch.oldPrice ?? exactBarcodeMatch.alternatePrice ?? null,
          quantity: Number(exactBarcodeMatch.quantity ?? exactBarcodeMatch.totalStock ?? exactBarcodeMatch.stock ?? 0),
          available: (exactBarcodeMatch.totalStock ?? exactBarcodeMatch.stock ?? 0) > 0
        });
        return;
      }

      const filtered = allDrugs
        .filter(drug => {
          const nameMatch = drug.name?.toLowerCase().includes(query) || drug.name?.toLowerCase().includes(mappedQuery);
          const barcodeMatch = drug.barcode?.toLowerCase().includes(query) || drug.barcode?.toLowerCase().includes(mappedQuery);
          const excelIdMatch = drug.externalId?.toLowerCase().includes(query) || drug.externalId?.toLowerCase().includes(mappedQuery);
          const genericMatch = drug.genericName?.toLowerCase().includes(query) || drug.genericName?.toLowerCase().includes(mappedQuery);
          const arabicMatch = drug.arabicName?.includes(query) || drug.arabicName?.includes(mappedQuery);

          const matchesSearch = nameMatch || barcodeMatch || excelIdMatch || genericMatch || arabicMatch;

          if (formFilter) {
            const formMatch = drug.dosageForm?.toLowerCase().includes(formFilter);
            return matchesSearch && formMatch;
          }

          return matchesSearch;
        })
        .slice(0, 50)
        .map(drug => ({
          ...drug,
          sell_price: drug.sellPrice,
          oldPrice: drug.oldPrice ?? drug.alternatePrice ?? null,
          quantity: Number(drug.quantity ?? drug.totalStock ?? drug.stock ?? 0),
          available: (drug.totalStock ?? drug.stock ?? 0) > 0
        }));

      if (filtered.length > 0) {
        handleDropdownItemClick(filtered[0]);
      } else {
        setError(`الدواء غير موجود: ${query}`);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleDropdownItemClick = (drug) => {
    const existingItem = cartItems.find(item => item.id === drug.id);

    if (existingItem) {
      updateCartItemQuantity(drug.id, existingItem.quantity + 1);
    } else {
      addToCart(drug);
    }

    setSearchInput('');
    setSearchResults([]);
    setAlternativesMode(false);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const addToCart = (drug) => {
    const savedStrips = localStorage.getItem(`strips_per_box_${drug.name.toUpperCase()}`);
    const dbStripsPerBox = drug.stripsPerBox || 1;
    const publicPrice = Number(drug.sell_price ?? drug.sellPrice ?? drug.publicPrice ?? 0) || 0;
    const oldPrice = Number(drug.oldPrice ?? drug.alternatePrice ?? 0) || null;
    const originalDrug = allDrugs.find(d => d.id === drug.id) || drug;
    const availableQuantity = Number(originalDrug.totalStock ?? originalDrug.stock ?? 0) || 0;
    // Get expiry date from batch or drug data
    const rawExpiry = drug.expiryDate || drug.nearestExpiry || drug.batches?.[0]?.expiryDate || null;
    const newItem = {
      id: drug.id,
      name: drug.name,
      genericName: drug.genericName || '',
      barcode: drug.barcode || 'N/A',
      excelId: drug.excelId || drug.excel_id || '',
      quantity: 1,
      unit: 'box',
      box_price: publicPrice,
      oldPrice: oldPrice && oldPrice !== publicPrice ? oldPrice : null,
      useOldPrice: false,
      strips_per_box: savedStrips ? parseInt(savedStrips) : dbStripsPerBox,
      stripCount: dbStripsPerBox,
      stock: availableQuantity,
      expiryDate: rawExpiry || null,
    };
    // Add and sort by expiry date (closest first)
    const updatedCart = [...cartItems, newItem].sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
    setCartItems(updatedCart);
  };

  const toggleUnit = (id) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const newUnit = item.unit === 'box' ? 'strip' : 'box';
        return { ...item, unit: newUnit };
      }
      return item;
    }));
  };

  const handleUpdateStripsPerBox = async (id, newStrips) => {
    const strips = parseInt(newStrips) || 1;
    const item = cartItems.find(i => i.id === id);
    
    setCartItems(cartItems.map(cartItem => {
      if (cartItem.id === id) {
        return { ...cartItem, strips_per_box: strips };
      }
      return cartItem;
    }));

    if (item) {
      try {
        await api.put(`/drugs/${item.id}`, { stripsPerBox: strips });
      } catch (err) {
        console.error('Failed to save stripsPerBox:', err);
      }
      localStorage.setItem(`strips_per_box_${item.name.toUpperCase()}`, strips.toString());
    }
  };

  const handleHoldCart = async () => {
    if (cartItems.length === 0) return;
    if (!user || !user.id) {
      setError('لم يتم تسجيل الدخول. من فضلك ادخل أولاً.');
      return;
    }

    const itemsPayload = cartItems.map(item => ({
      drugId: item.id,
      drugName: item.name,
      quantity: item.quantity,
      unitPrice: item.box_price,
      totalPrice: (item.box_price * item.quantity)
    }));

    try {
      await api.post('/pos/suspend', {
        userId: user.id,
        items: itemsPayload,
        totalAmount: grandTotal,
        note: `فاتورة معلقة #${heldCarts.length + 1}`
      });

      await fetchSuspendedSales();
      fetchAllDrugs();

      setCartItems([]);
      setDiscount(0);
      setSearchInput('');
      setError('');
      setTimeout(() => {
        setError('تم تعليق الفاتورة!');
        setTimeout(() => setError(''), 2000);
      }, 100);
    } catch (err) {
      console.error('Error suspending sale:', err);
      setError(`فشل تعليق الفاتورة: ${err.response?.data?.error || err.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRetrieveCart = async (heldCart) => {
    if (cartItems.length > 0) {
      const confirmReplace = window.confirm('العربة فيها أصناف. تريد استبدالها؟');
      if (!confirmReplace) return;
    }

    const items = heldCart.items.map(item => ({
      id: item.drugId,
      name: item.drugName,
      barcode: item.barcode || 'N/A',
      genericName: item.genericName || '',
      quantity: item.quantity,
      unit: 'box',
      box_price: item.unitPrice,
      strips_per_box: 1
    }));

    setCartItems([...items]);
    setDiscount(0);
    setShowSuspendedModal(false);
    setShowHeldCarts(false);
    setSearchInput('');

    try {
      await api.delete(`/pos/suspended/${heldCart.id}`);
      await fetchSuspendedSales();
    } catch (err) {
      console.error('Error deleting suspended sale:', err);
    }
  };

  const handleShowAlternatives = async (drug, e) => {
    e.stopPropagation();
    if (!drug.genericName) return;
    setIsSearching(true);
    try {
      const res = await api.get(`/drugs?genericName=${encodeURIComponent(drug.genericName)}`);
      const results = res.data?.data || [];
      const alternatives = results.filter(d => d.id !== drug.id).map(d => ({
        ...d,
        sell_price: d.sellPrice || d.sell_price,
        oldPrice: d.oldPrice ?? d.alternatePrice ?? null,
        stock: Number(d.totalStock ?? d.stock ?? 0),
        totalStock: Number(d.totalStock ?? d.stock ?? 0),
        quantity: Number(d.quantity ?? d.totalStock ?? d.stock ?? 0),
        available: (d.totalStock || d.stock || 0) > 0
      }));
      setSearchResults(alternatives);
      setAlternativesMode(true);
    } catch (err) {
      console.error('Alternatives fetch error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBackToResults = () => {
    setAlternativesMode(false);
    const searchTerm = searchInput.toLowerCase().trim();
    const mappedSearchTerm = mapArabicToEnglishKeyboard(searchTerm).toLowerCase().trim();
    const formFilter = selectedForm !== 'All' ? selectedForm.toLowerCase() : null;
    const isNumbersOnly = isNumericOnly(searchInput);

    const filtered = allDrugs
      .filter(drug => {
        let matchesSearch;

        if (isNumbersOnly) {
          const idMatch = drug.id?.toString() === searchTerm;
          const barcodeMatch = drug.barcode === searchInput || drug.barcode === mappedSearchTerm;
          const excelIdMatch = drug.externalId === searchInput || drug.externalId === mappedSearchTerm;
          matchesSearch = idMatch || barcodeMatch || excelIdMatch;
        } else {
          const nameMatch = drug.name?.toLowerCase().includes(searchTerm) || drug.name?.toLowerCase().includes(mappedSearchTerm);
          const genericMatch = drug.genericName?.toLowerCase().includes(searchTerm) || drug.genericName?.toLowerCase().includes(mappedSearchTerm);
          const arabicMatch = drug.arabicName?.includes(searchTerm) || drug.arabicName?.includes(mappedSearchTerm);
          matchesSearch = nameMatch || genericMatch || arabicMatch;
        }

        if (formFilter) {
          const formMatch = drug.dosageForm?.toLowerCase().includes(formFilter);
          return matchesSearch && formMatch;
        }

        return matchesSearch;
      })
      .slice(0, 50)
      .map(drug => ({
        ...drug,
        sell_price: drug.sellPrice,
        oldPrice: drug.oldPrice ?? drug.alternatePrice ?? null,
        quantity: Number(drug.quantity ?? drug.totalStock ?? drug.stock ?? 0),
        available: (drug.totalStock ?? drug.stock ?? 0) > 0
      }));

    setSearchResults(filtered);
  };

  const handleAddAlternative = (alt) => {
    const newItem = { id: Date.now(), name: alt.name, barcode: 'N/A', genericName: '', quantity: 1, unit: 'box', box_price: alt.price, strips_per_box: 1 };
    setCartItems([...cartItems, newItem]);
    setAlternativesModal(null);
    setSearchInput('');
  };

const handleCompleteSale = async (overrideAmount = null) => {
    if (isCompletingSale) return;
    if (cartItems.length === 0) {
      alert('العربة فاضية. أضف أصناف أولاً.');
      return;
    }

    if (!user || !user.id) {
      setError('لم يتم تسجيل الدخول. من فضلك ادخل أولاً.');
      return;
    }

    const parsedDiscountValue = parseFloat(discount) || 0;
    const parsedCashPaid = overrideAmount !== null ? overrideAmount : parseFloat(cashPaid) || 0;
    const parsedSubtotal = subtotal;
    const parsedGrandTotal = parseFloat((parsedSubtotal - effectiveDiscountAmount).toFixed(2));
    const parsedChangeReturn = parseFloat((parsedCashPaid - parsedGrandTotal).toFixed(2));

    if (isDeferred && !activeCustomer.id) {
      alert('يجب اختيار عميل للفاتورة الآجل');
      return;
    }

    if (!isDeferred && paymentMethod === 'cash' && parsedCashPaid < parsedGrandTotal) {
      alert(`المبلغ غير كافي! المبلغ المدفوع (${parsedCashPaid} جنيه) أقل من الإجمالي (${parsedGrandTotal} جنيه)`);
      return;
    }

    const finalPaymentStatus = isDeferred ? 'DEFERRED' : 'PAID';
    
    let effectiveCashPaid = parsedCashPaid;
    let change = 0;

    if (isDeferred) {
      // In deferred, cash paid is whatever they entered (can be 0 or partial). Change is 0.
      change = 0;
    } else if (paymentMethod === 'VISA') {
      effectiveCashPaid = parsedGrandTotal;
      change = 0;
    } else {
      effectiveCashPaid = Math.max(parsedCashPaid, parsedGrandTotal);
      change = Math.max(0, effectiveCashPaid - parsedGrandTotal).toFixed(2);
    }

    // Send correct payment method: credit for deferred, otherwise cash/VISA
    const finalPaymentMethod = isDeferred ? 'credit' : (paymentMethod === 'credit' ? 'cash' : paymentMethod);

    const saleData = {
      userId: String(user.id),
      customerId: activeCustomer?.id || null,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      earnedPoints: earnedPoints,
      items: cartItems.map(item => ({
        drugId: item.id,
        quantity: Number(item.quantity),
        price: Number(getUnitPrice(item))
      })),
      subtotal: Number(parsedSubtotal),
      discount: Number(effectiveDiscountAmount),
      grandTotal: Number(parsedGrandTotal),
      cashPaid: Number(effectiveCashPaid),
      changeReturn: Number(change)
    };

    console.log('Sending sale payload:', JSON.stringify(saleData, null, 2));

    try {
      setIsCompletingSale(true);
      // 1. تنظيف البيانات من أي null أو NaN وتحويلها لصفر
    saleData.cashPaid = Number(saleData.cashPaid) || 0;
    saleData.changeReturn = Number(saleData.changeReturn) || 0;

    // 2. إرسال الفاتورة
    const response = await api.post('/pos/sale', saleData);

      if (response.status !== 201) {
        throw new Error(response.data?.error || `Sale creation failed: ${response.statusText}`);
      }

      fetchAllDrugs();

      const result = response.data;
      console.log('Sale Completed:', result);
      
      const saleDataResult = {
        ...result.data,
        cashierName: user?.name,
        paymentMethod,
        cashPaid: parsedCashPaid,
        changeReturn: parsedChangeReturn,
        grandTotal: parsedGrandTotal,
        subtotal: parsedSubtotal,
        discount: parsedDiscountValue,
        items: cartItems,
        saleDate: new Date(),
      };

      if (autoShowReceipt) {
        setLastSaleData(saleDataResult);
        setShowSuccessScreen(true);
        setTimeout(() => triggerPrint(), 300);
      } else {
        setLastSaleData(saleDataResult);
        setError('');
        setCartItems([]);
        setDiscount(0);
        setCashPaid(0);
        setPaymentMethod('cash');
        setIsDeferred(false);
        setActiveCustomer({ id: null, name: '', phone: '' });
        setCustomerSearchResults([]);
        setSelectedCustomerDebt(null);
        setCustomerSearchQuery('');
        setShowNewCustomerForm(false);
        setNewCustomerData({ name: '', phone: '' });
        setSearchInput('');
        setTimeout(() => {
          setError('تم إنشاء الفاتورة بنجاح!');
          setTimeout(() => setError(''), 2000);
        }, 100);
        setTimeout(() => searchInputRef.current?.focus(), 150);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      console.error('Response data:', error.response?.data);
      
      // Handle DEBT_LIMIT_EXCEEDED error specifically
      if (error.response?.data?.error === 'DEBT_LIMIT_EXCEEDED') {
        const { currentDebt, debtLimit, saleAmount, availableCredit, message } = error.response.data;
        setDebtLimitError({
          customerName: activeCustomer?.name || 'العميل',
          currentDebt,
          debtLimit,
          saleAmount,
          availableCredit,
          message
        });
        return;
      }
      
      setError(`فشل في إنشاء الفاتورة: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsCompletingSale(false);
    }
  };

  const triggerPrint = () => {
    setTimeout(() => {
      const printContent = receiptRef.current;
      if (!printContent) return;

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        alert('اسمح بالنوافذ المنبثقة لطباعة الفاتورة');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة رقم ${lastSaleData?.receiptNumber || lastSaleData?.id?.slice(-8) || ''}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', 'Segoe UI', Tahoma, sans-serif;
              background: white;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setShowPrintSuccess(true);
        setTimeout(() => setShowPrintSuccess(false), 3000);
      }, 300);
    }, 100);
  };

  const handleNewSale = () => {
    setCartItems([]);
    localStorage.removeItem('pos_cart');
    setDiscount(0);
    setCashPaid(0);
    setPaymentMethod('CASH');
    setIsDeferred(false);
    setActiveCustomer({ id: null, name: '', phone: '' });
    setCustomerSearchResults([]);
    setSelectedCustomerDebt(null);
    setCustomerSearchQuery('');
    setShowNewCustomerForm(false);
    setNewCustomerData({ name: '', phone: '' });
    setSearchInput('');
    setLastSaleData(null);
    setShowSuccessScreen(false);
    searchInputRef.current?.focus();
  };

  const handlePrintReceipt = () => {
    triggerPrint();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  return (
    <>
    <div className="h-full flex flex-col p-4">
      {error && (
        <div className="mb-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-[var(--md-radius-md)] p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/50 rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-2)]">
          <div className="p-4 border-b border-[var(--md-outline)]">
            {isReturnMode && (
              <div className="mb-3 flex items-center justify-between bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-[var(--md-radius-md)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">وضع المرتجع - ابحث برقم الفاتورة أو التليفون أو اسم الدواء</span>
                </div>
                <button
                  onClick={handleExitReturnMode}
                  className="px-3 py-1.5 text-xs bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-full hover:bg-orange-300 dark:hover:bg-orange-700"
                >
                  خروج
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  id="pos-search"
                  name="search"
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="ابحث باسم الدواء أو الباركود..."
                  className="w-full px-4 py-2.5 border border-[var(--md-outline)] rounded-xl focus:outline-none focus:border-[var(--md-primary)] focus:ring-2 focus:ring-[var(--md-primary)]/20 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm transition-all"
                />
                {drugsLoading && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                )}
                {isSearching && !drugsLoading && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                )}
                {isReturnMode && invoiceSearchResults.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                    <div className="flex flex-col">
                      {invoiceSearchResults.map((inv, index) => (
                        <div
                          key={inv.id}
                          onClick={() => handleLoadInvoice(inv)}
                          className="p-3 cursor-pointer border-b border-gray-200 dark:border-slate-600 last:border-b-0 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">فاتورة #{inv.id?.slice(-8) || inv.id}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">{inv.customerName || 'عادي'} - {inv.customerPhone || '-'}</span>
                            </div>
                            <div className="text-left">
                              <span className="font-bold text-sm text-orange-600 dark:text-orange-400">{parseFloat(inv.grandTotal).toFixed(2)} ج</span>
                              <span className="block text-xs text-gray-500 dark:text-slate-400">{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!isReturnMode && (
                  <SearchDropdown
                    searchResults={searchResults}
                    onItemClick={handleDropdownItemClick}
                    onAlternativesClick={handleShowAlternatives}
                    isSearching={isSearching}
                    selectedIndex={selectedIndex}
                    alternativesMode={alternativesMode}
                    onBackToResults={handleBackToResults}
                  />
                )}
              </div>
              <div className="relative w-44 shrink-0">
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <LayoutGrid className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                </div>
                <select
                  id="pos-form-filter"
                  name="formFilter"
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 pr-8 border border-[var(--md-outline)] rounded-xl focus:outline-none focus:border-[var(--md-primary)] focus:ring-2 focus:ring-[var(--md-primary)]/20 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm cursor-pointer transition-all"
                >
                  {PHARMACEUTICAL_FORMS.map((form) => (
                    <option key={form.value} value={form.value}>
                      {form.arabic}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
            {isReturnMode && loadedInvoice ? (
              <table className="w-full">
                <thead className="bg-orange-50 dark:bg-orange-900/30 sticky top-0">
                  <tr className="text-right text-xs font-semibold text-orange-800 dark:text-orange-200">
                    <th className="px-3 py-2">الصنف</th>
                    <th className="px-3 py-2 text-center">السعر</th>
                    <th className="px-3 py-2 text-center">الكمية</th>
                    <th className="px-3 py-2 text-start">الإجمالي</th>
                    <th className="px-3 py-2 text-center">إرجاع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {loadedInvoice.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-orange-50 dark:hover:bg-orange-900/20">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <div className="font-medium text-sm text-gray-900 dark:text-white" dir="ltr" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }} title={item.drugName}>
                            {item.drugName}
                          </div>
                          {item.genericName && (
                            <p className="text-xs text-gray-500 dark:text-slate-400" dir="ltr" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }} title={item.genericName}>{item.genericName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{parseFloat(item.unitPrice || item.price).toFixed(2)} ج</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-sm text-gray-900 dark:text-white">{item.quantity}</span>
                      </td>
                      <td className="px-3 py-2 text-start">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{parseFloat((item.unitPrice || item.price) * item.quantity).toFixed(2)} ج</p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleReturnItem(item)}
                          className="p-1.5 rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                          title="إرجاع هذا الصنف"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 p-8">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">{isReturnMode ? 'ابحث عن فاتورة' : 'السلة فاضية'}</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-700/50 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/50">
                  <tr className="text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">
                    <th className="w-[28%] px-2 py-2.5">الصنف</th>
                    <th className="w-[9%] px-2 py-2.5 text-center">الصلاحية</th>
                    <th className="w-[9%] px-2 py-2.5 text-center">السعر</th>
                    <th className="w-[7%] px-2 py-2.5 text-center">الوحدة</th>
                    <th className="w-[10%] px-2 py-2.5 text-center">عدد الأشرطة</th>
                    <th className="w-[13%] px-2 py-2.5 text-center">الكمية</th>
                    <th className="w-[10%] px-2 py-2.5 text-start">الإجمالي</th>
                    <th className="w-[6%] px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
                  {cartItems.map((item) => {
                    const originalStock = Number(item.stock ?? item.totalStock ?? 0);
                    const spb = parseInt(item.strips_per_box || item.stripCount || 1);
                    
                    const totalStripsInStock = originalStock * spb;
                    const cartQty = item.quantity;
                    const cartUnit = item.unit;
                    const cartQtyInStrips = cartUnit === 'strip' ? cartQty : cartQty * spb;
                    const remainingTotalStrips = Math.max(0, totalStripsInStock - cartQtyInStrips);
                    const remainingBoxes = Math.floor(remainingTotalStrips / spb);
                    const remainingLooseStrips = remainingTotalStrips % spb;

                    const oldPrice = Number(item.oldPrice) || 0;
                    const sellingPrice = Number(item.box_price) || 0;
                    const hasOldPrice = oldPrice > 0 && oldPrice !== sellingPrice;
                    const activePrice = Number(getUnitPrice(item)) || 0;

                    return (
                    <tr
                      key={item.id}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors duration-150 min-h-[52px]"
                    >
                      <td className="px-2 py-2 w-[28%] max-w-0 overflow-hidden">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <span className="flex-shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap border border-emerald-200 dark:border-emerald-500/20">
                              {formatStock(remainingBoxes, spb, remainingLooseStrips)}
                            </span>
                            <span 
                              className="text-gray-900 dark:text-white font-semibold text-sm truncate block min-w-0 flex-1"
                              dir="ltr"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                          </div>
                          {item.genericName && (
                            <span 
                              className="text-gray-400 dark:text-slate-500 text-[11px] truncate block min-w-0 mt-0.5"
                              dir="ltr"
                              title={item.genericName}
                              style={{ maxWidth: '100%' }}
                            >
                              {item.genericName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center w-[9%] overflow-hidden">
                        {item.expiryDate ? (() => {
                          const exp = new Date(item.expiryDate);
                          const now = new Date();
                          const diffMs = exp - now;
                          const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
                          const isNearExpiry = diffMonths <= 3;
                          const isExpired = diffMs < 0;
                          return (
                            <span className={`text-[13px] font-bold text-gray-400 dark:text-slate-500px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                              isExpired
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                : isNearExpiry
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {exp.toLocaleDateString('ar-EG', { year: '2-digit', month: 'numeric' })}
                            </span>
                          );
                        })() : (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td 
                          className="px-2 py-2 text-center relative w-[9%] overflow-hidden"
                          onDoubleClick={() => handlePriceDoubleClick(item.id)}
                        >
                          {hasOldPrice && !priceToggleTooltip && hoveredItemId === item.id && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                              انقر مرتين لتغيير السعر
                            </div>
                          )}
                          {hasOldPrice ? (
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className={`min-w-[62px] px-2 py-1 rounded-lg text-xs font-bold border relative ${
                                  item.useOldPrice
                                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50'
                                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50'
                                }`}
                              >
                                {item.useOldPrice && (
                                  <span className="absolute -top-1.5 -right-1 bg-orange-500 text-white text-[8px] px-1 rounded">سعر قديم</span>
                                )}
                                {item.useOldPrice ? 'قديم' : 'جديد'}
                                <span className="block text-[10px] opacity-75">
                                  {activePrice.toFixed(2)}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePriceType(item.id)}
                                className="p-1 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                title="تبديل السعر"
                              >
                                <ArrowLeftRight size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                              {sellingPrice.toFixed(2)}
                            </span>
                          )}
                        </td>
                      <td className="px-2 py-2 text-center w-[7%] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleUnit(item.id)}
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            item.unit === 'box'
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                          }`}
                        >
                          {item.unit === 'box' ? 'علبة' : 'شريط'}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-center w-[10%] overflow-hidden">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateStripsPerBox(item.id, (item.strips_per_box || 1) - 1)}
                              disabled={item.strips_per_box <= 1}
                              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-50"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              id={`strips-${item.id}`}
                              name={`strips_${item.id}`}
                              type="number"
                              min="1"
                              value={item.strips_per_box || 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                handleUpdateStripsPerBox(item.id, val);
                              }}
                              onBlur={(e) => handleUpdateStripsPerBox(item.id, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                              className="w-8 text-xs text-center bg-transparent text-gray-900 dark:text-white border-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateStripsPerBox(item.id, (item.strips_per_box || 1) + 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 flex items-center justify-center"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {item.stripCount && item.stripCount > 1 && (
                            <span className="text-[9px] text-gray-400 dark:text-slate-500">افتراضي: {item.stripCount}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 w-[13%] overflow-hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                            className="rounded-lg p-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            id={`qty-${item.id}`}
                            name={`qty_${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
                            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-center rounded-lg w-10 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            className="rounded-lg p-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center justify-center"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-start w-[10%] overflow-hidden">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-300">{getLineTotal(item)} ج</p>
                      </td>
                      <td className="px-2 py-2 text-center w-[6%] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400/70 dark:text-red-400/70 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 flex flex-col overflow-hidden bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-2)]">
          {isReturnMode && loadedInvoice ? (
            <div className="p-4 space-y-3">
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-orange-800 dark:text-orange-200 mb-2">فاتورة المرتجع</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">رقم الفاتورة:</span>
                    <span className="font-medium text-gray-900 dark:text-white">#{loadedInvoice.id?.slice(-8) || loadedInvoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">التاريخ:</span>
                    <span className="text-gray-900 dark:text-white">{new Date(loadedInvoice.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">عدد الأصناف:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{loadedInvoice.items?.length || 0}</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 shadow-md flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">الإجمالي الأصلي</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{parseFloat(loadedInvoice.grandTotal).toFixed(2)} ج</span>
              </div>
              <button
                onClick={handleExitReturnMode}
                className="w-full py-2.5 px-4 rounded-full font-bold text-white text-sm bg-gray-500 hover:bg-gray-600 transition"
              >
                إلغاء / إغلاق
              </button>
            </div>
          ) : (
          <div className="shrink-0">
            {activeCustomer.id && (
              <div className="p-3 border-b border-amber-200 dark:border-amber-700/30 bg-amber-50 dark:bg-amber-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-300">
                        {activeCustomer.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-200">{activeCustomer.name}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">العميل الحالي</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveCustomer({ id: null, name: '', phone: '' }); setIsDeferred(false); }}
                    className="p-1.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-600 dark:text-amber-300 transition-colors"
                    title="إزالة العميل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="p-3 border-b border-gray-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-slate-400">المجموع</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{subtotal.toFixed(2)} ج</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex rounded-full overflow-hidden border border-[var(--md-outline)]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 py-2 text-xs font-medium transition ${
                      discountType === 'fixed'
                        ? 'bg-[var(--md-primary)] text-white'
                        : 'bg-transparent text-gray-600 dark:text-slate-300 hover:bg-[var(--md-primary-container)]'
                    }`}
                  >
                    مبلغ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-2 text-xs font-medium transition ${
                      discountType === 'percentage'
                        ? 'bg-[var(--md-primary)] text-white'
                        : 'bg-transparent text-gray-600 dark:text-slate-300 hover:bg-[var(--md-primary-container)]'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div>
                <input
                  id="pos-discount"
                  name="discount"
                  type="number"
                  min="0"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder={discountType === 'percentage' ? 'نسبة الخصم %' : 'مبلغ الخصم'}
                  className={`w-full px-3 py-2 border rounded-[var(--md-radius-sm)] bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none ${
                    isDiscountExceeded ? 'border-red-500 dark:border-red-400' : 'border-[var(--md-outline)] focus:border-[var(--md-primary)]'
                  }`}
                />
              </div>
              {userMaxDiscount > 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  أقصى خصم مسموح: <span className="font-medium">{userMaxDiscount}%</span>
                </p>
              )}
              {effectiveDiscountPercent > 0 && (
                <p className={`text-xs ${isDiscountExceeded ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}`}>
                  {discountType === 'percentage' ? '' : `يعادل ${effectiveDiscountPercent.toFixed(1)}%`}
                  {isDiscountExceeded && ' - تجاوزت الحد المسموح!'}
                </p>
              )}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 shadow-md flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">الإجمالي</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{grandTotal} ج</span>
              </div>

            </div>

<div className="p-3 border-b border-gray-200 dark:border-slate-700 space-y-2">
              <span id="payment-method-label" className="block text-xs font-medium text-gray-600 dark:text-slate-400">طريقة الدفع</span>
              <div className="flex gap-2">
<button
                    onClick={() => { setPaymentMethod('cash'); setShowCreditFields(false); setIsDeferred(false); setCashPaid(grandTotal); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                    }`}
                  >كاش</button>

                  <button
                    onClick={() => { setPaymentMethod('VISA'); setShowCreditFields(false); setIsDeferred(false); setCashPaid(grandTotal); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    paymentMethod === 'VISA'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <CreditCard size={14} className="inline ml-1" />
                  فيزا
                </button>

                <button
                  onClick={() => { setPaymentMethod('credit'); setShowCreditFields(true); setIsDeferred(true); setCashPaid(0); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    paymentMethod === 'credit'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                  }`}
                >آجل</button>
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div className="p-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    اختر عميل للدفع الآجل *
                  </p>
                  
                  {/* Customer search input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={activeCustomer.name}
                      onChange={handleCreditNameChange}
                      placeholder="ابحث باسم العميل أو التليفون..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    {activeCustomer.id && (
                      <button
                        onClick={clearCreditCustomer}
                        className="absolute left-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Customer search results dropdown */}
                  {customerSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                      {customerSearchResults.map(customer => (
                        <div
                          key={customer.id}
                          className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 text-sm border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {customer.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {customer.phone}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/customers/${customer.id}`, '_blank');
                            }}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg whitespace-nowrap"
                          >
                            عرض الملف ←
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected customer info */}
                  {activeCustomer.id && (
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                        ✓ {activeCustomer.name}
                      </p>
                      {selectedCustomerDebt > 0 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          دين سابق: {selectedCustomerDebt.toFixed(2)} ج
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="p-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCashPaid(50)}
                    className="flex-1 px-3 py-2 border border-[var(--md-outline)] text-gray-700 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-[var(--md-primary-container)] hover:border-[var(--md-primary)] transition"
                  >
                    50 ج
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashPaid(100)}
                    className="flex-1 px-3 py-2 border border-[var(--md-outline)] text-gray-700 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-[var(--md-primary-container)] hover:border-[var(--md-primary)] transition"
                  >
                    100 ج
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashPaid(200)}
                    className="flex-1 px-3 py-2 border border-[var(--md-outline)] text-gray-700 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-[var(--md-primary-container)] hover:border-[var(--md-primary)] transition"
                  >
                    200 ج
                  </button>
                </div>
                <div>
                  <input
                    id="pos-cash-paid"
                    name="cashPaid"
                    type="number"
                    min="0"
                    value={cashPaid === 0 ? '' : cashPaid}
                    onChange={(e) => setCashPaid(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="المدفوع"
                    className="w-full px-3 py-2 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--md-primary)]"
                  />
                </div>
                {paymentMethod === 'cash' && cashPaid > 0 && (
                  <div className={`mt-1.5 p-1.5 rounded-xl flex justify-between items-center ${
                    cashPaid >= grandTotal ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
                  }`}>
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-400">الباقي للعميل:</span>
                    <span className={`text-xs font-bold ${cashPaid >= grandTotal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(cashPaid - grandTotal).toFixed(2)} ج
                    </span>
                  </div>
                )}
                {isDeferred && (
                  <div className="mt-1.5 p-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400">المدفوع:</span>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">0.00 ج</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400">الصافي:</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{grandTotal.toFixed(2)} ج</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 space-y-1.5">
              {isDiscountExceeded && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                    تجاوزت نسبة الخصم المسموحة ({userMaxDiscount}%)
                  </p>
                </div>
              )}
<button
                onClick={handleCompleteSale}
                disabled={cartItems.length === 0 || isDiscountExceeded || (paymentMethod === 'credit' && !activeCustomer.id) || isCompletingSale}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm transition shadow-lg ${
                  cartItems.length === 0 || isDiscountExceeded || (paymentMethod === 'credit' && !activeCustomer.id) || isCompletingSale
                    ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/20'
                }`}
              >
                {isCompletingSale ? 'جاري التنفيذ...' : (paymentMethod === 'credit' && !activeCustomer.id ? 'يجب اختيار عميل أو إضافة عميل جديد' : 'حاسب / بيع')}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleHoldCart}
                  disabled={cartItems.length === 0}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-md ${
                    cartItems.length === 0
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-amber-100 dark:bg-amber-900/20 hover:bg-amber-200 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}
                  title="تعليق الفاتورة"
                >
                  <span className={`p-1.5 rounded-full ${cartItems.length === 0 ? '' : 'bg-amber-200 dark:bg-amber-800/40'}`}>
                    <Pause size={14} className={cartItems.length === 0 ? '' : 'text-amber-600 dark:text-amber-400'} />
                  </span>
                  تعليق
                </button>
                <button
                  onClick={() => setShowSuspendedModal(true)}
                  disabled={heldCarts.length === 0}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-md ${
                    heldCarts.length === 0
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-100 dark:bg-emerald-900/20 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  }`}
                  title="استرجاع فاتورة معلقة"
                >
                  <span className={`p-1.5 rounded-full ${heldCarts.length === 0 ? '' : 'bg-emerald-200 dark:bg-emerald-800/40'}`}>
                    <RotateCcw size={14} className={heldCarts.length === 0 ? '' : 'text-emerald-600 dark:text-emerald-400'} />
                  </span>
                  استرجاع
                </button>
                <button
                  onClick={() => { setCartItems([]); setDiscount(0); setCashPaid(0); }}
                  disabled={cartItems.length === 0}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-md ${
                    cartItems.length === 0
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                  title="تفريغ السلة"
                >
                  <span className={`p-1.5 rounded-full ${cartItems.length === 0 ? '' : 'bg-red-200 dark:bg-red-800/40'}`}>
                    <Trash2 size={14} className={cartItems.length === 0 ? '' : 'text-red-600 dark:text-red-400'} />
                  </span>
                  تفريغ
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReturnPanel(true)}
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition bg-red-600 hover:bg-red-700"
                  title="مرتجع / Return"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>مرتجع</span>
                </button>
                <button
                  onClick={() => {
                    setShowCustomersPanel(true);
                    setCustomersPanelTab('list');
                    setPanelCustomerSearch('');
                    setPanelCustomerResults([]);
                    setSelectedPanelCustomer(null);
                    setPanelCustomerInvoices([]);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition bg-purple-600 hover:bg-purple-700"
                  title="عملاء / Customers"
                >
                  <Users className="w-4 h-4" />
                  <span>العملاء</span>
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition border border-gray-200 dark:border-slate-600">
                <button
                  onClick={() => setAutoShowReceipt(p => !p)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoShowReceipt ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    autoShowReceipt ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-gray-300">عرض الفاتورة</span>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {returnSuccessMsg && (
        <div className="mb-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">{returnSuccessMsg}</p>
        </div>
      )}

      {showReturnPanel && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReturnPanel(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shrink-0 bg-orange-50 dark:bg-orange-900/30">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">المرتجعات - البحث عن فاتورة</h2>
              </div>
              <button onClick={() => setShowReturnPanel(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="return-search"
                  name="returnSearch"
                  type="text"
                  value={returnSearchQuery}
                  onChange={(e) => {
                    setReturnSearchQuery(e.target.value);
                    fetchReturnSales(e.target.value);
                  }}
                  placeholder="ابحث برقم الفاتورة أو اسم العميل أو اسم الدواء..."
                  className="w-full pr-10 pl-4 py-3 border border-[var(--md-outline)] rounded-xl focus:outline-none focus:border-orange-500 bg-transparent dark:bg-[var(--md-surface)] text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
              <div className="w-1/2 border-l border-gray-200 dark:border-slate-700 overflow-y-auto">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">الفواتير ({returnSales.length})</h3>
                  {returnSales.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد فواتير</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {returnSales.map(sale => (
                        <div
                          key={sale.id}
                          onClick={() => handleSelectReturnSale(sale)}
                          className={`p-3 rounded-xl cursor-pointer border transition ${
                            selectedReturnSale?.id === sale.id
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                              : 'border-gray-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-600'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">
                                #{sale.id?.slice(-8) || sale.id}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                {sale.customerName || 'عميل'} | {new Date(sale.saleDate || sale.createdAt).toLocaleDateString('ar-EG')}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">
                                {sale.cashierName || 'كاشير'} | {sale.items?.length || 0} صنف
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-green-600 dark:text-green-400">
                                {parseFloat(sale.totalAmount || sale.grandTotal || 0).toFixed(2)} ج
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-1/2 overflow-y-auto p-4">
                {!selectedReturnSale ? (
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-slate-400">
                    <p className="text-sm">اختر فاتورة من القائمة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          الفاتورة #{selectedReturnSale.id?.slice(-8)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(selectedReturnSale.saleDate || selectedReturnSale.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300">
                        {selectedReturnSale.customerName || 'عميل'} | {selectedReturnSale.cashierName || 'كاشير'}
                      </p>
                    </div>

                    <div className="bg-[var(--md-surface)] dark:bg-[var(--md-surface)] rounded-xl overflow-hidden border border-[var(--md-outline-variant)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)]">
                          <tr className="text-gray-600 dark:text-slate-300">
                            <th className="px-2 py-2 text-right">الصنف</th>
                            <th className="px-2 py-2 text-center">الكمية</th>
                            <th className="px-2 py-2 text-center">السعر</th>
                            <th className="px-2 py-2 text-center">المرتجع</th>
                            <th className="px-2 py-2 text-center">إرجاع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--md-outline-variant)]">
                          {returnItems.map((item, idx) => {
                            const drugName = item.drugName || item.batch?.drug?.name || 'غير معروف';
                            const genericName = item.genericName || item.batch?.drug?.genericName || '';
                            return (
                              <tr key={item.id} className={`hover:bg-orange-50 dark:hover:bg-orange-900/20 ${item.included ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
                                <td className="px-2 py-2">
                                  <div className="font-medium text-gray-900 dark:text-white">{drugName}</div>
                                  {genericName && <div className="text-gray-500 text-[10px]" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={genericName}>{genericName}</div>}
                                </td>
                                <td className="px-2 py-2 text-center text-gray-700 dark:text-slate-300">
                                  {item.quantity}
                                  {item.returnedQty > 0 && <span className="text-green-600 text-[10px] block">(راجع {item.returnedQty})</span>}
                                </td>
                                <td className="px-2 py-2 text-center font-bold text-gray-900 dark:text-white">
                                  {parseFloat(item.unitPrice || item.price || item.batch?.drug?.sellPrice || 0).toFixed(2)} ج
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input
                                    id={`return-qty-${item.id}`}
                                    name={`returnQty_${idx}`}
                                    type="number"
                                    min="0"
                                    max={item.maxQty}
                                    value={item.returnQty || ''}
                                    onChange={(e) => updateReturnQty(idx, e.target.value)}
                                    className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                  />
                                  <div className="text-[10px] text-gray-400 mt-0.5">الأقصى: {item.maxQty}</div>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleReturnItem(idx)}
                                    disabled={item.maxQty <= 0}
                                    className={`p-2 rounded-lg transition ${
                                      item.included
                                        ? 'bg-orange-500 text-white'
                                        : item.maxQty > 0
                                          ? 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300 hover:bg-orange-200 dark:hover:bg-orange-800'
                                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">المبلغ المرتجع:</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {getReturnTotal().toFixed(2)} ج
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmReturn}
                        disabled={getReturnTotal() <= 0}
                        className={`flex-1 py-3 rounded-full font-bold text-sm transition ${
                          getReturnTotal() <= 0
                            ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}
                      >
                        تأكيد المرتجع
                      </button>
                      <button
                        onClick={() => setSelectedReturnSale(null)}
                        className="px-6 py-3 rounded-xl font-semibold text-sm bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === CUSTOMERS PANEL - DRAWER STYLE === */}
      <div 
        className="fixed top-0 right-0 h-full w-[380px] bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300"
        style={{ transform: showCustomersPanel ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Overlay */}
        {showCustomersPanel && (
          <div 
            className="fixed inset-0 bg-black/50 z-[-1]"
            onClick={() => setShowCustomersPanel(false)}
          />
        )}

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shrink-0 bg-purple-50 dark:bg-purple-900/30">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedPanelCustomer ? selectedPanelCustomer.name : 'العملاء'}
            </h2>
          </div>
          <button onClick={() => setShowCustomersPanel(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedPanelCustomer ? (
            /* === STATE 1: CUSTOMER LIST === */
            <>
              {/* Search */}
              <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="panel-customer-search"
                    type="text"
                    value={panelCustomerSearch}
                    onChange={(e) => {
                      setPanelCustomerSearch(e.target.value);
                      searchPanelCustomers(e.target.value);
                    }}
                    placeholder="ابحث باسم العميل أو رقم الهاتف..."
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-purple-500 bg-transparent text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                  {panelCustomerLoading && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>

              {/* Customer List */}
              <div className="p-3">
                {panelCustomerResults.length === 0 && panelCustomerSearch.length >= 2 && !panelCustomerLoading ? (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا يوجد عملاء بهذا الاسم</p>
                  </div>
                ) : panelCustomerSearch.length < 2 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">ابحث عن عميل (حرفين على الأقل)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {panelCustomerResults.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectPanelCustomer(customer)}
                        className="p-3 rounded-xl cursor-pointer border border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 transition bg-white dark:bg-slate-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
                              {customer.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-gray-500 dark:text-slate-400">{customer.phone}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {(() => {
                              const balance = customer.account?.currentBalance ?? customer.balance ?? 0;
                              const isPaid = balance <= 0;
                              return isPaid ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                  ✓ مسدد
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                                  مديون: {Math.abs(balance).toFixed(2)} ج
                                </span>
                              );
                            })()}
                            {(customer.totalPoints || 0) > 0 && (
                              <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                {customer.totalPoints} نقطة
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Customer Button */}
              <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setPanelNewCustomer({ name: '', phone: '' });
                    setCustomersPanelTab('add');
                  }}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة عميل جديد
                </button>
              </div>
            </>
          ) : (
            /* === STATE 2: CUSTOMER PROFILE === */
            <>
              {/* Profile Card */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-purple-600 dark:text-purple-300">
                      {selectedPanelCustomer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{selectedPanelCustomer.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{selectedPanelCustomer.phone || 'بدون رقم'}</p>
                  </div>
                  {(() => {
                    const balance = selectedPanelCustomer.account?.currentBalance ?? selectedPanelCustomer.balance ?? 0;
                    const isPaid = balance <= 0;
                    return isPaid ? (
                      <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        ✓ مسدد
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                        مديون: {Math.abs(balance).toFixed(2)} ج
                      </span>
                    );
                  })()}
                </div>

                {/* Info Pills */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-center border border-gray-200 dark:border-slate-600">
                    <span className="text-xs text-gray-500 dark:text-slate-400 block">حد الدين</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedPanelCustomer.debtLimit?.toFixed(2) || '0.00'} ج
                    </span>
                  </div>
                  <div className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-center border border-gray-200 dark:border-slate-600">
                    <span className="text-xs text-gray-500 dark:text-slate-400 block">النقاط</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      {selectedPanelCustomer.totalPoints || 0} <Star className="w-3 h-3 fill-amber-400" />
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveCustomer({ 
                        id: selectedPanelCustomer.id, 
                        name: selectedPanelCustomer.name, 
                        phone: selectedPanelCustomer.phone 
                      });
                      setShowCustomersPanel(false);
                      setError('');
                      setTimeout(() => { setError(`تم اختيار ${selectedPanelCustomer.name}`); setTimeout(() => setError(''), 2000); }, 100);
                      searchInputRef.current?.focus();
                    }}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    تم ✓
                  </button>
                  <button
                    onClick={() => setSelectedPanelCustomer(null)}
                    className="px-4 py-2.5 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    ← رجوع
                  </button>
                </div>
              </div>

              {/* Last 5 Invoices */}
              <div className="p-3">
                <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">آخر 5 فواتير</h4>
                {panelInvoicesLoading ? (
                  <div className="text-center py-6">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : panelCustomerInvoices.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 dark:text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">لا توجد فواتير</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {panelCustomerInvoices.slice(0, 5).map(invoice => {
                      const invPaymentMethod = invoice.paymentMethod?.toLowerCase() || '';
                      const remainingAmount = parseFloat(invoice.remainingAmount ?? 0);
                      const isDeferred = remainingAmount > 0 || 
                                         invPaymentMethod === 'credit' || 
                                         invPaymentMethod === 'deferred' ||
                                         invoice.paymentStatus === 'DEFERRED' ||
                                         invoice.status === 'unpaid';
                      const paymentMethodLabel = 
                        invPaymentMethod === 'visa' ? 'فيزا' : 
                        (invPaymentMethod === 'credit' || invPaymentMethod === 'deferred') ? 'آجل' : 
                        'كاش';
                      const isExpanded = expandedPanelInvoiceId === invoice.id;
                      const isLoadingItems = loadingPanelInvoiceId === invoice.id;
                      const items = panelInvoiceItems[invoice.id] || [];

                      return (
                        <div key={invoice.id} 
                             className="rounded-xl border border-gray-200 dark:border-slate-600 
                                        bg-white dark:bg-slate-700/50 overflow-hidden 
                                        transition-all duration-200">
                          
                          <div 
                            className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 
                                       transition-colors"
                            onClick={() => togglePanelInvoice(invoice.id)}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                                  #{(invoice.receiptNumber || invoice.id)?.slice(-8)}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                  {new Date(invoice.saleDate || invoice.createdAt)
                                    .toLocaleDateString('ar-EG')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900 dark:text-white">
                                  {parseFloat(invoice.grandTotal || invoice.totalAmount || 0)
                                    .toFixed(2)} ج
                                </span>
                                <span className={`text-gray-400 transition-transform duration-200 
                                                 text-xs ${isExpanded ? 'rotate-180' : ''}`}>
                                  ▼
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex gap-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isDeferred
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {isDeferred ? '● غير مسدد' : '✓ مسدد'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  invPaymentMethod === 'visa' 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : (invPaymentMethod === 'credit' || invPaymentMethod === 'deferred')
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                      : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-slate-300'
                                }`}>
                                  {paymentMethodLabel}
                                </span>
                              </div>
                              {isDeferred && remainingAmount > 0 && (
                                <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">
                                  الباقي: {remainingAmount.toFixed(2)} ج
                                </span>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-gray-100 dark:border-slate-600 
                                            bg-gray-50/80 dark:bg-slate-800/50">
                              {isLoadingItems ? (
                                <div className="flex justify-center items-center py-4">
                                  <div className="w-5 h-5 border-2 border-purple-500 
                                                 border-t-transparent rounded-full animate-spin"/>
                                </div>
                              ) : items.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-3">
                                  لا توجد أصناف
                                </p>
                              ) : (
                                <div className="p-2">
                                  <table className="w-full table-fixed text-xs">
                                    <thead>
                                      <tr className="text-gray-400 dark:text-slate-500 
                                                     border-b border-gray-100 dark:border-slate-700">
                                        <th className="text-right pb-1.5 w-[50%] font-medium">
                                          الصنف
                                        </th>
                                        <th className="text-center pb-1.5 w-[15%] font-medium">
                                          الكمية
                                        </th>
                                        <th className="text-center pb-1.5 w-[17%] font-medium">
                                          السعر
                                        </th>
                                        <th className="text-left pb-1.5 w-[18%] font-medium">
                                          الإجمالي
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                      {items.map((item, idx) => {
                                        const drugName = item.drugName || item.batch?.drug?.name || 'غير معروف';
                                        const genericName = item.genericName || item.batch?.drug?.genericName || '';
                                        const unitPrice = parseFloat(item.unitPrice || item.price || item.batch?.drug?.sellPrice || 0);
                                        const qty = parseInt(item.quantity) || 0;
                                        return (
                                          <tr key={idx} 
                                              className="hover:bg-white dark:hover:bg-slate-700/30 
                                                         transition-colors">
                                            <td className="py-1.5 pr-1 max-w-0">
                                              <p className="font-semibold text-gray-900 
                                                            dark:text-white truncate"
                                                 dir="ltr" 
                                                 title={drugName}>
                                                {drugName}
                                              </p>
                                              {genericName && (
                                                <p className="text-gray-400 dark:text-slate-500 
                                                              truncate text-[10px]"
                                                   dir="ltr"
                                                   title={genericName}>
                                                  {genericName}
                                                </p>
                                              )}
                                            </td>
                                            <td className="py-1.5 text-center text-gray-600 
                                                            dark:text-slate-300">
                                              {qty}
                                            </td>
                                            <td className="py-1.5 text-center text-gray-600 
                                                            dark:text-slate-300">
                                              {unitPrice.toFixed(2)}
                                            </td>
                                            <td className="py-1.5 text-left font-bold 
                                                            text-gray-900 dark:text-white">
                                              {(unitPrice * qty).toFixed(2)} ج
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t border-gray-200 dark:border-slate-600">
                                        <td colSpan={3} 
                                            className="pt-2 text-left text-xs font-bold 
                                                       text-gray-500 dark:text-slate-400">
                                          الإجمالي
                                        </td>
                                        <td className="pt-2 text-left font-bold text-sm 
                                                       text-purple-600 dark:text-purple-400">
                                          {parseFloat(invoice.grandTotal || 0).toFixed(2)} ج
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Customer Tab (when active) */}
        {customersPanelTab === 'add' && !selectedPanelCustomer && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 z-10 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">إضافة عميل جديد</h3>
              <button onClick={() => setCustomersPanelTab('list')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">اسم العميل *</label>
                <input
                  id="panel-new-customer-name"
                  type="text"
                  value={panelNewCustomer.name}
                  onChange={(e) => setPanelNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم العميل"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  dir="rtl"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">رقم الهاتف</label>
                <input
                  id="panel-new-customer-phone"
                  type="tel"
                  value={panelNewCustomer.phone}
                  onChange={(e) => setPanelNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="رقم الهاتف (اختياري)"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  dir="rtl"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={createPanelCustomer}
                  disabled={panelCreatingCustomer || !panelNewCustomer.name.trim()}
                  className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {panelCreatingCustomer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      حفظ العميل
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPanelNewCustomer({ name: '', phone: '' });
                    setCustomersPanelTab('list');
                  }}
                  className="px-6 py-3 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPrintSuccess && (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <Printer className="w-5 h-5" />
          <span>جارٍ طباعة الفاتورة...</span>
        </div>
      )}

      {showStartShiftModal && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">افتح شيفت</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">يجب فتح الشيفت قبل البيع</p>
            </div>
            <form onSubmit={handleStartShift}>
              <div className="mb-4">
                <label htmlFor="opening-cash" className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                  فلوس الدرج اول الشيفت (جنيه)
                </label>
                <input
                  id="opening-cash"
                  name="openingCash"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--md-outline)] rounded-xl bg-transparent dark:bg-[var(--md-surface)] text-gray-900 dark:text-white"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[var(--md-primary)] hover:bg-[var(--md-primary-container)] text-[var(--md-on-primary)] font-semibold py-3 rounded-full"
              >
                افتح شيفت
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>
        <div ref={receiptRef}>
          <ReceiptPrint saleData={lastSaleData} shiftInfo={{ userName: user?.name }} />
        </div>
      </div>

      {showSuspendedModal && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50" onClick={() => setShowSuspendedModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">الفواتير المعلقة</h2>
              <button onClick={() => setShowSuspendedModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700/50">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {heldCarts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                  <Pause className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد فواتير معلقة</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {heldCarts.map((held) => (
                    <div key={held.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{held.note || `فاتورة معلقة #${held.id.slice(-6)}`}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {new Date(held.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} - {held.items?.length || 0} أصناف
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm text-blue-600 dark:text-blue-400">{parseFloat(held.totalAmount || 0).toFixed(2)} ج</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {held.items?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 dark:bg-slate-600 px-2 py-0.5 rounded text-gray-700 dark:text-slate-300">
                            {item.drugName || item.name} ×{item.quantity}
                          </span>
                        ))}
                        {(held.items?.length || 0) > 3 && (
                          <span className="text-xs text-gray-500 dark:text-slate-400">+{(held.items?.length || 0) - 3}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRetrieveCart(held)}
                        className="w-full py-1.5 bg-[var(--md-primary)] hover:bg-[var(--md-primary-container)] text-[var(--md-on-primary)] rounded-full text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        استرجاع الفاتورة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {debtLimitError && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-red-500 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-3">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">تم تجاوز حد الدين!</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">العميل:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{debtLimitError.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">الدين الحالي:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{debtLimitError.currentDebt?.toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">الحد الأقصى:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{debtLimitError.debtLimit?.toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">قيمة الفاتورة:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{debtLimitError.saleAmount?.toFixed(2)} ج</span>
                  </div>
                  <div className="border-t border-red-200 dark:border-red-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">الائتمان المتاح:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{debtLimitError.availableCredit?.toFixed(2)} ج</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDebtLimitError(null)}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    setDebtLimitError(null);
                    setIsDeferred(false);
                    setPaymentMethod('cash');
                    setShowCreditFields(false);
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  تحويل لكاش
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessScreen && lastSaleData && (
        <div className="fixed inset-0 bg-[#0D1117]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="bg-green-500 p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-3">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">تم البيع بنجاح!</h2>
              <p className="text-green-100 mt-1">Invoice #{lastSaleData.id?.slice(-8) || lastSaleData.receiptNumber}</p>
            </div>

            <div className="p-4 overflow-y-auto max-h-60">
              <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-xl p-3 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">تفاصيل الفاتورة</h3>
                <div className="space-y-1.5">
                  {lastSaleData.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-300">
                        {item.name} × {item.quantity} {item.unit === 'strip' ? 'شريط' : 'علبة'}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.quantity * (item.unitPrice || item.price))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">المجموع:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(lastSaleData.subtotal)}</span>
                </div>
                {lastSaleData.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">الخصم:</span>
                    <span className="text-red-600 dark:text-red-400">-{formatCurrency(lastSaleData.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span className="text-gray-900 dark:text-white">الإجمالي:</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(lastSaleData.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">طريقة الدفع:</span>
                  <span className="text-gray-900 dark:text-white">
                    {lastSaleData.paymentMethod === 'CASH' ? 'كاش' : lastSaleData.paymentMethod === 'VISA' ? 'فيزا' : 'آجل'}
                  </span>
                </div>
                {lastSaleData.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">المدفوع:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(lastSaleData.cashPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">الباقي:</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatCurrency(lastSaleData.changeReturn)}</span>
                    </div>
                  </>
                )}
                {lastSaleData.paymentMethod === 'CREDIT' && lastSaleData.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">العميل:</span>
                    <span className="text-gray-900 dark:text-white">{lastSaleData.customerName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--md-primary)] hover:bg-[var(--md-primary-container)] text-[var(--md-on-primary)] rounded-full font-semibold transition"
              >
                <Printer className="w-5 h-5" />
                طباعة الفاتورة
              </button>
              <button
                onClick={handleNewSale}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold transition"
              >
                <ShoppingCart className="w-5 h-5" />
                عملية جديدة
              </button>
            </div>
          </div>
        </div>
      )}

      {alternativesModal && (
        <AlternativesModal
          drugName={alternativesModal.drugName}
          alternatives={alternativesModal.alternatives}
          onClose={() => setAlternativesModal(null)}
          onSelect={handleAddAlternative}
        />
      )}
    </div>
    </>
  );
};

export default POSPage;
