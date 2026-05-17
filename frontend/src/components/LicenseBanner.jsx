import { useLicense } from '../context/LicenseContext';

export default function LicenseBanner() {
  const { licenseStatus, isLoading } = useLicense();

  if (isLoading || !licenseStatus) {
    return null;
  }

  const isExpired = licenseStatus.valid === false;
  
  // Don't show if valid and NOT a trial (i.e. monthly/yearly/lifetime)
  if (!isExpired && licenseStatus.type !== 'TRIAL') {
    return null;
  }

  const remainingDays = licenseStatus.daysRemaining ?? 0;
  const isUrgent = remainingDays <= 2 && !isExpired;

  return (
    <div
      dir="rtl"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        width: '100%',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        color: '#fff',
        background: isExpired
          ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
          : isUrgent
            ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'
            : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Clock/Warning icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isExpired ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </>
        )}
      </svg>

      <span>
        {isExpired
          ? 'انتهت الفترة التجريبية، يرجى التفعيل'
          : `أنت في الفترة التجريبية، متبقي ${remainingDays} ${remainingDays === 1 ? 'يوم' : 'أيام'}`
        }
      </span>

      <a
        href="/license-expired"
        style={{
          marginRight: 'auto',
          padding: '5px 16px',
          background: 'rgba(255,255,255,0.95)',
          color: isExpired ? '#dc2626' : '#92400e',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          textDecoration: 'none',
          transition: 'background 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,1)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.95)'}
      >
        تفعيل البرنامج
      </a>
    </div>
  );
}