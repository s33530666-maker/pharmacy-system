import { useState } from 'react';
import { useLicense } from '../context/LicenseContext';
import api from '../utils/api';

export default function ActivationPage() {
  const { activateLicense } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!licenseKey.trim() || !pharmacyName.trim()) {
      setError('يرجى إدخال كود التفعيل واسم الصيدلية');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await activateLicense(licenseKey, pharmacyName);
      
      if (result.success) {
        alert('تم التفعيل بنجاح! جاري تحويلك لتسجيل الدخول...');
        // Use setTimeout to let React state updates settle before forcing navigation
        setTimeout(() => {
          window.location.replace('/login');
        }, 500);
        return; // Don't setIsSubmitting(false) — we're navigating away
      } else {
        setError(result.error || 'فشل التفعيل');
      }
    } catch (err) {
      console.error('Activation error:', err);
      setError('حدث خطأ أثناء التفعيل. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = '01027608911';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-red-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              انتهت الفترة التجريبية
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              يرجى تفعيل البرنامج للمتابعة
            </p>
          </div>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                كود التفعيل
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="MNT-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اسم الصيدلية
              </label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="أدخل اسم الصيدلية"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-red-600 dark:text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'جاري التفعيل...' : 'تفعيل'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
              للحصول على كود التفعيل:
            </p>
            <p className="text-center text-lg font-semibold text-red-600 dark:text-red-400 mt-2">
              {contactInfo}
            </p>
            <p className="text-center text-gray-500 dark:text-gray-500 text-xs mt-1">
              واتساب متاح
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}