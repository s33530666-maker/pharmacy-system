import React, { forwardRef } from 'react';

const ReceiptPrint = forwardRef(({ saleData, shiftInfo }, ref) => {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatCurrency = (value) => (Number(value) || 0).toFixed(2);

  const getPaymentLabel = (method) => {
    switch (method) {
      case 'CASH': return 'كاش';
      case 'VISA': return 'فيزا';
      case 'CREDIT': return 'آجل';
      default: return method || 'كاش';
    }
  };

  return (
    <div ref={ref} style={receiptStyles.container}>
      <div style={receiptStyles.header}>
        <h2 style={receiptStyles.title}>صيدلية العناية</h2>
        <p style={receiptStyles.address}>القاهرة، مصر</p>
        <p style={receiptStyles.phone}>ت: 0123456789</p>
      </div>

      <div style={receiptStyles.divider}>================================</div>

      <div style={receiptStyles.info}>
        <p><strong>التاريخ:</strong> {formatDate(saleData?.saleDate || new Date())}</p>
        <p><strong>رقم الفاتورة:</strong> {saleData?.receiptNumber || saleData?.id?.slice(0, 8) || 'N/A'}</p>
        <p><strong>الكاشير:</strong> {saleData?.cashierName || shiftInfo?.userName || 'N/A'}</p>
      </div>

      <div style={receiptStyles.divider}>--------------------------------</div>

      <table style={receiptStyles.table}>
        <thead>
          <tr>
            <th style={receiptStyles.th}>الصنف</th>
            <th style={receiptStyles.th}>العدد</th>
            <th style={receiptStyles.thRight}>السعر</th>
            <th style={receiptStyles.thRight}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {saleData?.items?.map((item, index) => (
            <tr key={index}>
              <td style={receiptStyles.td}>
                {item.name || item.drugName}
                <br />
                <span style={receiptStyles.small}>
                  {item.unit === 'strip' ? 'شريط' : 'علبة'} x {formatCurrency(item.unitPrice || item.price)}
                  <br />
                  الصلاحية: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                </span>
              </td>
              <td style={receiptStyles.td}>{item.quantity}</td>
              <td style={receiptStyles.tdRight}>{formatCurrency(item.unitPrice || item.price)}</td>
              <td style={receiptStyles.tdRight}>{formatCurrency(item.totalPrice || (item.quantity * (item.unitPrice || item.price)))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={receiptStyles.divider}>--------------------------------</div>

      <div style={receiptStyles.totals}>
        <div style={receiptStyles.totalRow}>
          <span>المجموع:</span>
          <span>{formatCurrency(saleData?.subtotal || 0)} ج</span>
        </div>
        {saleData?.discount > 0 && (
          <div style={receiptStyles.totalRow}>
            <span>الخصم:</span>
            <span>-{formatCurrency(saleData.discount)} ج</span>
          </div>
        )}
        <div style={receiptStyles.totalRow}>
          <span style={receiptStyles.grandTotal}>الإجمالي:</span>
          <span style={receiptStyles.grandTotal}>{formatCurrency(saleData?.grandTotal || saleData?.totalAmount || 0)} ج</span>
        </div>
      </div>

      <div style={receiptStyles.divider}>--------------------------------</div>

      <div style={receiptStyles.payment}>
        <p><strong>طريقة الدفع:</strong> {getPaymentLabel(saleData?.paymentMethod)}</p>
        {saleData?.paymentMethod === 'CASH' && (
          <>
            <p>المدفوع: {formatCurrency(saleData?.cashPaid || 0)} ج</p>
            <p>الباقي: {formatCurrency(saleData?.changeReturn || 0)} ج</p>
          </>
        )}
        {saleData?.paymentMethod === 'CREDIT' && saleData?.customerName && (
          <p>العميل: {saleData.customerName} - {saleData.customerPhone}</p>
        )}
      </div>

      <div style={receiptStyles.divider}>================================</div>

      <div style={receiptStyles.footer}>
        <p>شكراً لتعاملكم معنا!</p>
        <p style={receiptStyles.small}>لا يتم إرجاع البضاعة إلا بوجود الفاتورة</p>
      </div>
    </div>
  );
});

const receiptStyles = {
  container: {
    width: '78mm',
    padding: '5px 8px',
    fontFamily: '"Courier New", "Segoe UI", Tahoma, sans-serif',
    fontSize: '12px',
    lineHeight: '1.35',
    color: '#000',
    backgroundColor: '#fff',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  address: {
    margin: '2px 0',
    fontSize: '10px',
  },
  phone: {
    margin: '2px 0',
    fontSize: '10px',
  },
  divider: {
    textAlign: 'center',
    margin: '6px 0',
    fontSize: '10px',
    whiteSpace: 'nowrap',
  },
  info: {
    fontSize: '10px',
    marginBottom: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  th: {
    textAlign: 'left',
    padding: '2px 0',
    fontWeight: 'bold',
  },
  thRight: {
    textAlign: 'right',
    padding: '2px 0',
    fontWeight: 'bold',
  },
  td: {
    padding: '2px 0',
    verticalAlign: 'top',
  },
  tdRight: {
    textAlign: 'right',
    padding: '2px 0',
  },
  small: {
    fontSize: '9px',
    color: '#666',
  },
  totals: {
    marginBottom: '8px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  grandTotal: {
    fontWeight: 'bold',
    fontSize: '13px',
  },
  payment: {
    fontSize: '10px',
    marginBottom: '8px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '10px',
    marginTop: '8px',
  },
};

ReceiptPrint.displayName = 'ReceiptPrint';

export default ReceiptPrint;