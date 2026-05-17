import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { useState, useEffect } from 'react';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/dashboard/Dashboard';
import POSPage from './pages/pos/POSPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import DrugsManagement from './pages/DrugsManagement';
import ShiftManager from './pages/shifts/ShiftManager';
import DamagedDrugsPage from './pages/damaged/DamagedDrugsPage';
import SalesHistory from './pages/SalesHistory';
import DrugImporter from './components/shared/DrugImporter';
import SettingsPage from './pages/SettingsPage';
import CustomerDebts from './pages/CustomerDebts';
import CustomersPage from './pages/customers/CustomersPage';
import InventoryPage from './pages/InventoryPage';
import SupplierDebts from './pages/SupplierDebts';
import SuppliersPage from './pages/SuppliersPage';
import Returns from './pages/Returns';
import LicenseExpiredPage from './pages/LicenseExpiredPage';
import LicenseBanner from './components/LicenseBanner';
import api from './utils/api';

/* ─── ProtectedRoute ─────────────────────────────────────────── */
function ProtectedRoute({ children, allowedRoles = [], requiredPermission = null }) {
  const { user, isLoading } = useAuth();
  const location = window.location;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('Redirecting to login...');
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  if (requiredPermission) {
    let userPermissions = [];
    try {
      if (Array.isArray(user.permissions)) {
        userPermissions = user.permissions;
      } else if (typeof user.permissions === 'string') {
        userPermissions = JSON.parse(user.permissions);
      }
    } catch (e) {
      console.error('Failed to parse user permissions in ProtectedRoute', e);
    }

    if (user.role !== 'ADMIN' && !userPermissions.includes(requiredPermission)) {
        return <Navigate to="/pos" replace />;
    }
  }

  return <>{children}</>;
}

/* ─── LicenseGuard ───────────────────────────────────────────── */
function LicenseGuard() {
  const { licenseStatus, isLoading } = useLicense();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-slate-400">جاري التحميل...</div>
      </div>
    );
  }

  // License invalid or expired → show expired page
  if (licenseStatus && licenseStatus.valid === false) {
    return <LicenseExpiredPage />;
  }

  return <Outlet />;
}

/* ─── SetupGuard ─────────────────────────────────────────────── */
/**
 * Checks /api/setup/status ONCE on app boot.
 * - If needsSetup=true  → render SetupPage instead of the whole app.
 * - If needsSetup=false → render children (normal app).
 * This must be the outermost layer so it beats all auth/license checks.
 */
function SetupGuard({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'needed' | 'done'

  useEffect(() => {
    let cancelled = false;
    api.get('/setup/status')
      .then((res) => {
        if (!cancelled) {
          setStatus(res.data.needsSetup ? 'needed' : 'done');
        }
      })
      .catch(() => {
        // On error (e.g. server down), show the normal app — don't block forever
        if (!cancelled) setStatus('done');
      });
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #f1f5f9)',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid #e2e8f0',
          borderTopColor: '#4f46e5',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'needed') {
    return <SetupPage />;
  }

  return children;
}

/* ─── AppRoutes ──────────────────────────────────────────────── */
function AppRoutes() {
  return (
    <>
      {/* Global banner — shows on ALL pages including /login */}
      <LicenseBanner />
      <Routes>
        {/* /setup — redirect to /login if setup is already done */}
        <Route path="/setup" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/license-expired" element={<LicenseExpiredPage />} />
        <Route path="/activate" element={<LicenseExpiredPage />} />
        <Route path="/users" element={<Navigate to="/settings" replace />} />
        <Route path="/manage-users" element={<Navigate to="/settings" replace />} />

        {/* Protected routes — blocked by LicenseGuard when trial expires */}
        <Route element={<LicenseGuard />}>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CASHIER', 'PHARMACIST', 'TECHNICIAN']}><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<ProtectedRoute requiredPermission="reports"><Dashboard /></ProtectedRoute>} />
            <Route path="/sales-history" element={<ProtectedRoute requiredPermission="sales"><SalesHistory /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute requiredPermission="purchases"><PurchasesPage /></ProtectedRoute>} />
            <Route path="/manage-drugs" element={<ProtectedRoute requiredPermission="drugs"><DrugsManagement /></ProtectedRoute>} />
            <Route path="/damaged" element={<ProtectedRoute requiredPermission="damaged"><DamagedDrugsPage /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute requiredPermission="drugs"><DrugImporter /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><SettingsPage /></ProtectedRoute>} />
            <Route path="/customer-debts" element={<Navigate to="/customers" replace />} />
            <Route path="/customers" element={<ProtectedRoute requiredPermission="customers"><CustomersPage /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute requiredPermission="customers"><CustomersPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute requiredPermission="inventory"><InventoryPage /></ProtectedRoute>} />
            <Route path="/supplier-debts" element={<ProtectedRoute requiredPermission="suppliers"><SupplierDebts /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute requiredPermission="suppliers"><SuppliersPage /></ProtectedRoute>} />

            <Route path="/pos" element={<POSPage />} />
            <Route path="/shifts" element={<ProtectedRoute requiredPermission="shift"><ShiftManager /></ProtectedRoute>} />
            <Route path="/returns" element={<Returns />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </>
  );
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  return (
    <LicenseProvider>
      <AuthProvider>
        <ThemeProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <SetupGuard>
              <AppRoutes />
            </SetupGuard>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </LicenseProvider>
  );
}
