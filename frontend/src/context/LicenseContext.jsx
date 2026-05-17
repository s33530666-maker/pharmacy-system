import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const LicenseContext = createContext();

export function LicenseProvider({ children }) {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkLicense = useCallback(async () => {
    try {
      const res = await api.get('/license/status');
      const data = res.data;
      console.log('License status response:', data);
      setLicenseStatus(data);
    } catch (error) {
      console.error('Failed to check license:', error);
      if (error.response?.status === 402) {
        setLicenseStatus({ valid: false, reason: 'EXPIRED' });
      } else {
        setLicenseStatus(prev => prev || { valid: true, type: 'UNKNOWN', daysRemaining: 14 });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activateLicense = useCallback(async (licenseKey, pharmacyName) => {
    try {
      const res = await api.post('/license/activate', { licenseKey, pharmacyName });
      await checkLicense();
      return { success: true, data: res.data };
    } catch (error) {
      const errMsg = error.response?.data?.error || 'حدث خطأ أثناء التفعيل';
      return { success: false, error: errMsg };
    }
  }, [checkLicense]);

  useEffect(() => {
    checkLicense();
    const interval = setInterval(checkLicense, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkLicense]);

  return (
    <LicenseContext.Provider value={{ licenseStatus, isLoading, checkLicense, activateLicense }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}