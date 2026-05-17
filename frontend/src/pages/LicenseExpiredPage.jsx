import { useState } from 'react';
import { useLicense } from '../context/LicenseContext';

const TYPE_LABELS = {
  TRIAL: 'تجريبي',
  MONTHLY: 'شهري',
  YEARLY: 'سنوي',
  LIFETIME: 'مدى الحياة',
};

export default function LicenseExpiredPage() {
  const { licenseStatus, activateLicense, isLoading } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expiredAt = licenseStatus?.expiredAt ? new Date(licenseStatus.expiredAt) : null;
  const daysSinceExpiry = expiredAt
    ? Math.floor((Date.now() - expiredAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    if (!licenseKey.trim() || !pharmacyName.trim()) {
      setError('يرجى إدخال كود التفعيل واسم الصيدلية');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await activateLicense(licenseKey.trim(), pharmacyName.trim());
      if (result.success) {
        setSuccess(true);
        setTimeout(() => window.location.replace('/'), 1500);
      } else {
        // Map backend Arabic error messages to our display
        const msg = result.error || 'فشل التفعيل';
        if (msg.includes('غير صحيح')) setError('كود التفعيل غير صحيح');
        else if (msg.includes('مستخدم')) setError('الكود مستخدم من قبل');
        else if (msg.includes('غير متطابق')) setError('اسم الصيدلية غير متطابق');
        else setError(msg);
      }
    } catch (err) {
      setError('حدث خطأ أثناء التفعيل. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>جاري التحقق من الترخيص...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a0a2e 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: '"Segoe UI", "Cairo", Arial, sans-serif',
      direction: 'rtl',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', left: '-10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '480px', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Card */}
        <div style={{
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(220,38,38,0.25)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,38,0.1)',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Icon + Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.25rem',
              background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(239,68,68,0.1))',
              border: '2px solid rgba(220,38,38,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '2.5rem' }}>🔒</span>
            </div>
            <h1 style={{ color: '#f87171', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
              انتهت صلاحية الترخيص
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              يرجى تفعيل ترخيص جديد للمتابعة
            </p>
          </div>

          {/* License Info */}
          {licenseStatus && (
            <div style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.15)',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>الصيدلية</p>
                <p style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                  {licenseStatus.pharmacyName || '—'}
                </p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>نوع الترخيص</p>
                <p style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                  {TYPE_LABELS[licenseStatus.type] || licenseStatus.type || '—'}
                </p>
              </div>
              {expiredAt && (
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>تاريخ الانتهاء</p>
                  <p style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                    {expiredAt.toLocaleDateString('ar-EG')}
                  </p>
                </div>
              )}
              {daysSinceExpiry !== null && (
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>أيام منذ الانتهاء</p>
                  <p style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                    {daysSinceExpiry} يوم
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success state */}
          {success ? (
            <div style={{
              textAlign: 'center', padding: '1.5rem',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '14px',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
                تم التفعيل بنجاح! جاري تحويلك...
              </p>
            </div>
          ) : (
            /* Activation Form */
            <form onSubmit={handleActivate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  كود التفعيل
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="PHARM-XXXX-XXXX-XXXX"
                  dir="ltr"
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#f1f5f9',
                    fontSize: '1rem', fontFamily: 'monospace',
                    textAlign: 'center', boxSizing: 'border-box',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  اسم الصيدلية
                </label>
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  placeholder="أدخل اسم الصيدلية كما هو مسجل"
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#f1f5f9',
                    fontSize: '0.95rem', boxSizing: 'border-box',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '0.75rem 1rem', marginBottom: '1rem',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '10px', color: '#f87171', fontSize: '0.88rem', textAlign: 'center',
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: isSubmitting
                    ? 'rgba(124,58,237,0.4)'
                    : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  border: 'none', borderRadius: '12px',
                  color: '#fff', fontSize: '1rem', fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
                }}
                onMouseOver={e => !isSubmitting && (e.target.style.transform = 'translateY(-1px)')}
                onMouseOut={e => (e.target.style.transform = 'translateY(0)')}
              >
                {isSubmitting ? 'جاري التفعيل...' : '🔑 تفعيل الترخيص'}
              </button>
            </form>
          )}

          {/* Contact */}
          <div style={{
            marginTop: '1.5rem', paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
              للحصول على كود التفعيل تواصل معنا:
            </p>
            <p style={{ color: '#7c3aed', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              📱 01027608911
            </p>
            <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              واتساب متاح
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
