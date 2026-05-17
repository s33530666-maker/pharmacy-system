import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Database, FileJson, Download, Upload, Settings as SettingsIcon, Shield, 
  Building2, Check, Loader, AlertCircle, Phone, Key, Users, UploadCloud,
  Moon, Sun, MapPin, Image as ImageIcon, Receipt, Printer, CalendarDays,
  FileSpreadsheet, Package, TrendingUp, History, RefreshCcw, Save, ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLicense } from '../context/LicenseContext';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import ManageUsers from './ManageUsers';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { licenseStatus } = useLicense();
  const [activeTab, setActiveTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState(null);

  // General Settings State
  const [pharmacyName, setPharmacyName] = useState(() => localStorage.getItem('pharmacyName') || '');
  const [managerWhatsApp, setManagerWhatsApp] = useState(() => localStorage.getItem('managerWhatsApp') || '');
  const [pharmacyAddress, setPharmacyAddress] = useState(() => localStorage.getItem('pharmacyAddress') || '');
  const [logoPreview, setLogoPreview] = useState(() => localStorage.getItem('pharmacyLogo') || null);

  // System Settings State
  const [showPricesOnReceipt, setShowPricesOnReceipt] = useState(() => localStorage.getItem('showPricesOnReceipt') !== 'false');
  const [autoPrintAfterSale, setAutoPrintAfterSale] = useState(() => localStorage.getItem('autoPrintAfterSale') === 'true');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'EGP');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('dateFormat') || 'DD/MM/YYYY');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  useEffect(() => {
    const fetchSysSettings = async () => {
      try {
        const res = await api.get('/settings/system');
        if (res.data?.success && res.data?.data) {
          setLowStockThreshold(res.data.data.lowStockThreshold);
        }
      } catch (err) {
        console.error('Failed to load system settings', err);
      }
    };
    fetchSysSettings();
  }, []);

  // Import/Export State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Mock Import History
  const importHistory = [
    { id: 1, date: '2026-05-15 10:30', count: 150, status: 'نجاح' },
    { id: 2, date: '2026-05-10 14:20', count: 42, status: 'نجاح' },
  ];

  // --- Handlers ---

  const handleSaveGeneral = async () => {
    try {
      await api.put('/settings/system', { lowStockThreshold: Number(lowStockThreshold) });
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (err) {
      console.error('Failed to save backend settings', err);
    }

    localStorage.setItem('pharmacyName', pharmacyName);
    localStorage.setItem('managerWhatsApp', managerWhatsApp);
    localStorage.setItem('pharmacyAddress', pharmacyAddress);
    if (logoPreview) localStorage.setItem('pharmacyLogo', logoPreview);
    
    // Save System Settings
    localStorage.setItem('showPricesOnReceipt', showPricesOnReceipt);
    localStorage.setItem('autoPrintAfterSale', autoPrintAfterSale);
    localStorage.setItem('currency', currency);
    localStorage.setItem('dateFormat', dateFormat);

    setSaveStatus({ type: 'success', message: 'تم حفظ الإعدادات بنجاح!' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      setSaveStatus({ type: 'error', message: 'يرجى اختيار ملف Excel صحيح' });
      return;
    }
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/import/drugs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.status === 200 && !res.data.error) {
        setSaveStatus({ type: 'success', message: res.data.message || 'تم الاستيراد بنجاح' });
        setImportFile(null);
      } else {
        throw new Error(res.data.error || 'فشل الاستيراد');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'حدث خطأ أثناء الاستيراد';
      setSaveStatus({ type: 'error', message: errorMsg });
    } finally {
      setIsImporting(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleExportExcel = async (type) => {
    setIsExporting(type);
    try {
      const endpoints = {
        medicines: { url: '/drugs', name: 'الأدوية' },
        sales: { url: '/pos/history', name: 'المبيعات' },
        customers: { url: '/customers', name: 'العملاء' },
        purchases: { url: '/purchases', name: 'المشتريات' }
      };
      
      const config = endpoints[type];
      const res = await api.get(config.url);
      const data = res.data?.data || res.data || [];
      
      if (!data.length) throw new Error('لا توجد بيانات للتصدير');

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, config.name);
      XLSX.writeFile(wb, `${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setSaveStatus({ type: 'success', message: 'تم التصدير بنجاح' });
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'فشل التصدير' });
    } finally {
      setIsExporting(null);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleBackup = async (action) => {
    if (action === 'export') {
      setIsDownloading(true);
      try {
        const res = await api.get('/backup/db', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `pharmacy_backup_${new Date().toISOString().split('T')[0]}.db`;
        a.click();
        setSaveStatus({ type: 'success', message: 'تم تحميل النسخة الاحتياطية بنجاح' });
      } catch (err) {
        setSaveStatus({ type: 'error', message: 'فشل تحميل النسخة الاحتياطية' });
      } finally {
        setIsDownloading(false);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } else {
      // Import backup logic here
      alert('سيتم إضافة ميزة استعادة النسخة الاحتياطية قريباً');
    }
  };

  // Logic for License
  const daysRemaining = licenseStatus?.daysRemaining ?? 0;
  const isExpired = licenseStatus && licenseStatus.valid === false;
  let licenseColor = 'text-green-400 bg-green-500/10 border-green-500/20';
  if (isExpired || (daysRemaining !== null && daysRemaining < 30)) licenseColor = 'text-red-400 bg-red-500/10 border-red-500/20';
  else if (daysRemaining !== null && daysRemaining <= 60) licenseColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-[#F1F5F9] p-4 md:p-6" dir="rtl">
      <div className="max-w-[1400px] mx-auto flex flex-col h-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-[#7C3AED]/10 rounded-xl">
            <SettingsIcon size={28} className="text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">إعدادات النظام</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">إدارة تفضيلات الصيدلية، المستخدمين، وقواعد البيانات</p>
          </div>
        </div>

        {/* Global Toast */}
        {saveStatus && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
            saveStatus.type === 'success' ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {saveStatus.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium text-sm">{saveStatus.message}</span>
          </div>
        )}

        {/* Tabs - Minimal Design */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-px">
          {[
            { id: 'general', label: 'الإعدادات العامة', icon: Building2 },
            { id: 'users', label: 'المستخدمين', icon: Users },
            { id: 'import', label: 'استيراد / تصدير', icon: ArrowRightLeft }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5 rounded-t-xl' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-t-xl'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* --- TAB 1: GENERAL SETTINGS --- */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* Left Column: Pharmacy Info */}
            <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg flex flex-col">
              <div className="p-5 border-b border-slate-200 dark:border-white/5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 size={20} className="text-[#7C3AED]" /> معلومات الصيدلية
                </h2>
              </div>
              <div className="p-5 space-y-5 flex-1">
                
                {/* Logo Upload */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">شعار الصيدلية</label>
                    <label className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer transition text-sm">
                      <UploadCloud size={16} className="mr-2 ml-2" /> رفع صورة جديدة
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">اسم الصيدلية</label>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">رقم واتساب المدير</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm dir-ltr">+20</span>
                    <input
                      type="text"
                      value={managerWhatsApp}
                      onChange={(e) => setManagerWhatsApp(e.target.value)}
                      className="w-full pl-12 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED] dir-ltr text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">العنوان</label>
                  <div className="relative">
                    <MapPin className="absolute right-4 top-3 size-4 text-slate-500" />
                    <textarea
                      value={pharmacyAddress}
                      onChange={(e) => setPharmacyAddress(e.target.value)}
                      rows={2}
                      className="w-full pr-10 pl-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="p-5 border-t border-slate-200 dark:border-white/5 mt-auto">
                <button
                  onClick={handleSaveGeneral}
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-slate-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-[#7C3AED]/20"
                >
                  <Save size={18} /> حفظ الإعدادات
                </button>
              </div>
            </div>

            {/* Right Column: License & System Settings */}
            <div className="flex flex-col gap-6 h-full">
              
              {/* License Card */}
              <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key size={20} className="text-amber-400" /> معلومات الترخيص
                  </h2>
                  {isExpired ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> منتهي
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> مفعل
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#F8FAFC] dark:bg-[#0D1117] rounded-xl p-3 border border-slate-200 dark:border-white/5">
                    <p className="text-xs text-slate-500 mb-1">اسم الصيدلية</p>
                    <p className="font-bold text-slate-900 dark:text-white">{licenseStatus?.pharmacyName || 'غير محدد'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#F8FAFC] dark:bg-[#0D1117] rounded-xl p-3 border border-slate-200 dark:border-white/5">
                      <p className="text-xs text-slate-500 mb-1">نوع الترخيص</p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {licenseStatus?.type === 'LIFETIME' ? 'مدى الحياة' : 
                         licenseStatus?.type === 'YEARLY' ? 'سنوي' :
                         licenseStatus?.type === 'MONTHLY' ? 'شهري' :
                         licenseStatus?.type === 'TRIAL' ? 'تجريبي' : 'غير معروف'}
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] dark:bg-[#0D1117] rounded-xl p-3 border border-slate-200 dark:border-white/5">
                      <p className="text-xs text-slate-500 mb-1">تاريخ الانتهاء</p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {licenseStatus?.type === 'LIFETIME' || !licenseStatus?.expiresAt 
                          ? 'مدى الحياة' 
                          : new Date(licenseStatus.expiresAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>

                  {licenseStatus?.type === 'LIFETIME' ? (
                    <div className="p-3 rounded-xl border flex items-center justify-between text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                      <div>
                        <p className="font-bold text-sm">الأيام المتبقية: مدى الحياة ∞</p>
                        <p className="text-xs mt-0.5 opacity-80">ترخيص مستمر</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border flex flex-col justify-center gap-3 ${
                      isExpired || daysRemaining < 3 ? 'text-red-500 bg-red-500/10 border-red-500/20' : 
                      daysRemaining < 7 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                      'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">
                            {isExpired ? 'انتهى الترخيص' : `متبقي ${daysRemaining} يوم`}
                          </p>
                          <p className="text-xs mt-0.5 opacity-80">الأيام المتبقية</p>
                        </div>
                        {((daysRemaining !== null && daysRemaining < 7) || isExpired) && (
                          <button 
                            onClick={() => window.location.href = '/license-expired'}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-red-600 transition"
                          >
                            تفعيل ترخيص جديد
                          </button>
                        )}
                      </div>
                      {!isExpired && daysRemaining !== null && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${daysRemaining < 3 ? 'bg-red-500' : daysRemaining < 7 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, Math.max(0, (daysRemaining / (licenseStatus?.type === 'TRIAL' ? 14 : 365)) * 100))}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* System Settings Card */}
              <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg flex flex-col flex-1">
                <div className="p-5 border-b border-slate-200 dark:border-white/5">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <SettingsIcon size={20} className="text-blue-400" /> إعدادات النظام
                  </h2>
                </div>
                <div className="p-5 space-y-4 flex-1">
                  
                  {/* Toggles */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      {isDark ? <Moon size={18} className="text-slate-500 dark:text-slate-400" /> : <Sun size={18} className="text-amber-400" />}
                      <span className="text-sm font-medium text-slate-900 dark:text-white">الوضع الليلي</span>
                    </div>
                    <button 
                      onClick={toggleTheme}
                      className={`w-11 h-6 rounded-full transition-colors relative ${isDark ? 'bg-[#7C3AED]' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDark ? 'left-1' : 'right-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <Receipt size={18} className="text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">إظهار الأسعار على الفاتورة</span>
                    </div>
                    <button 
                      onClick={() => setShowPricesOnReceipt(!showPricesOnReceipt)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${showPricesOnReceipt ? 'bg-[#7C3AED]' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showPricesOnReceipt ? 'left-1' : 'right-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <Printer size={18} className="text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">طباعة تلقائية بعد البيع</span>
                    </div>
                    <button 
                      onClick={() => setAutoPrintAfterSale(!autoPrintAfterSale)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${autoPrintAfterSale ? 'bg-[#7C3AED]' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoPrintAfterSale ? 'left-1' : 'right-1'}`} />
                    </button>
                  </div>

                  {/* Dropdowns */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-b border-slate-200 dark:border-white/5 pb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">عملة النظام</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                      >
                        <option value="EGP">ج.م (EGP)</option>
                        <option value="USD">دولار (USD)</option>
                        <option value="SAR">ريال (SAR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">تنسيق التاريخ</label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1.5">حد نقص المخزون</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                    />
                    <p className="text-xs text-slate-500 mt-1">سيظهر تنبيه للأدوية التي تقل كميتها عن هذا الرقم</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: USERS --- */}
        {activeTab === 'users' && (
          <div className="h-full">
            <ManageUsers />
          </div>
        )}

        {/* --- TAB 3: IMPORT/EXPORT --- */}
        {activeTab === 'import' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* Export Section (Left natively, Right in RTL -> Wait, user said Export Left, Import Right. In RTL, Left is visual left) */}
            <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg flex flex-col order-2 lg:order-1">
              <div className="p-5 border-b border-slate-200 dark:border-white/5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download size={20} className="text-emerald-400" /> تصدير البيانات (Excel)
                </h2>
              </div>
              
              <div className="p-5 flex-1 flex items-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[
                    { id: 'medicines', label: 'تصدير الأدوية', icon: Package, count: '1,240 سجل' },
                    { id: 'sales', label: 'تصدير المبيعات', icon: TrendingUp, count: '342 فاتورة' },
                    { id: 'customers', label: 'تصدير العملاء', icon: Users, count: '89 عميل' },
                    { id: 'purchases', label: 'تصدير المشتريات', icon: FileSpreadsheet, count: '45 فاتورة' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => handleExportExcel(btn.id)}
                      disabled={isExporting !== null}
                      className="bg-[#F8FAFC] dark:bg-[#0D1117] hover:bg-emerald-500/10 border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all group"
                    >
                      {isExporting === btn.id ? (
                         <Loader className="w-8 h-8 animate-spin text-emerald-400" />
                      ) : (
                        <btn.icon className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      )}
                      <div className="text-center">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">{btn.label}</span>
                        <span className="block text-xs text-slate-500 mt-1">{btn.count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Backup Section */}
              <div className="p-5 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1B2A3B]/30 rounded-b-2xl">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Database size={16} className="text-[#7C3AED]" /> النسخ الاحتياطي للنظام
                </h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleBackup('export')}
                    className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-slate-900 dark:text-white rounded-xl text-sm font-medium transition shadow-lg flex justify-center items-center gap-2"
                  >
                    {isDownloading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                    نسخة احتياطية كاملة
                  </button>
                  <button 
                    onClick={() => handleBackup('import')}
                    className="flex-1 py-2.5 bg-[#F8FAFC] dark:bg-[#0D1117] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-medium transition flex justify-center items-center gap-2"
                  >
                    <Upload size={16} /> استعادة نسخة
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">آخر نسخة احتياطية: اليوم 10:00 صباحاً</p>
              </div>
            </div>

            {/* Import Section (Right natively, visual Right in RTL -> order-1 lg:order-2) */}
            <div className="bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg flex flex-col order-1 lg:order-2">
              <div className="p-5 border-b border-slate-200 dark:border-white/5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud size={20} className="text-blue-400" /> استيراد الأدوية (Excel)
                </h2>
              </div>
              
              <div className="p-5 space-y-6 flex-1">
                
                {/* Drag & Drop Zone */}
                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet size={48} className={`mb-4 ${dragActive ? 'text-blue-400' : 'text-slate-600'}`} />
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">اسحب وأفلت ملف Excel هنا</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">أو انقر لاختيار ملف من جهازك</p>
                  
                  <input type="file" id="file-upload" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                  <label htmlFor="file-upload" className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white rounded-xl text-sm font-medium cursor-pointer transition">
                    اختيار ملف
                  </label>
                  
                  {importFile && (
                    <div className="mt-4 p-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium w-full truncate">
                      {importFile.name}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-slate-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
                >
                  {isImporting ? <Loader size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  بدء الاستيراد
                </button>

                {/* Import History */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <History size={16} /> سجل الاستيراد
                  </h3>
                  <div className="space-y-2">
                    {importHistory.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] dark:bg-[#0D1117] border border-slate-200 dark:border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Check size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{log.date}</p>
                            <p className="text-[10px] text-slate-500">تم استيراد {log.count} سجل</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md">{log.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}