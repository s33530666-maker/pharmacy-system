import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, X, TrendingDown, Clock } from 'lucide-react';
import api from '../../utils/api.js';

const AlertBanner = () => {
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts/active');
      if (response.data?.data) {
        setAlerts(response.data.data || []);
        setAlertCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLowStockAlerts = () => alerts.filter((a) => a.alertType === 'LOW_STOCK');
  const getExpiryAlerts = () => alerts.filter((a) => a.alertType === 'EXPIRY_WARNING');

  const lowStockCount = getLowStockAlerts().length;
  const expiryCount = getExpiryAlerts().length;

  if (alertCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Alert Button */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full shadow-lg transition-all hover:scale-105 font-medium"
        >
          <Bell size={20} />
          <span>{alertCount}</span>
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 h-3 w-3 bg-yellow-300 rounded-full animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Alert Panel */}
      {isOpen && (
        <div className="fixed top-20 right-4 w-96 max-h-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">Active Alerts</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Alert Stats */}
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
            <div className="p-3 border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{lowStockCount}</p>
            </div>
            <div className="p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Expiry Warning</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{expiryCount}</p>
            </div>
          </div>

          {/* Alerts Content */}
          <div className="overflow-y-auto max-h-72">
            {loading ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p>Loading alerts...</p>
              </div>
            ) : alerts.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {/* Low Stock Alerts */}
                {lowStockCount > 0 && (
                  <div>
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-3 flex items-center gap-2 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20">
                      <TrendingDown size={16} className="text-orange-600 dark:text-orange-400" />
                      <span className="font-semibold text-orange-900 dark:text-orange-300 flex-1">
                        Low Stock ({lowStockCount})
                      </span>
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        {expandedIndex === 0 ? '−' : '+'}
                      </span>
                    </div>
                    {expandedIndex === 0 && (
                      <div className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                        {getLowStockAlerts().map((alert, idx) => (
                          <div key={idx} className="p-3 text-sm">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {alert.drugName}
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                              {alert.currentStock} units remaining
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Expiry Alerts */}
                {expiryCount > 0 && (
                  <div>
                    <div
                      onClick={() => setExpandedIndex(expandedIndex === 1 ? null : 1)}
                      className="bg-red-50 dark:bg-red-900/10 p-3 flex items-center gap-2 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Clock size={16} className="text-red-600 dark:text-red-400" />
                      <span className="font-semibold text-red-900 dark:text-red-300 flex-1">
                        Expiry Warning ({expiryCount})
                      </span>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {expandedIndex === 1 ? '−' : '+'}
                      </span>
                    </div>
                    {expandedIndex === 1 && (
                      <div className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                        {getExpiryAlerts().map((alert, idx) => (
                          <div key={idx} className="p-3 text-sm">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {alert.drugName}
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                              Batch {alert.batchNumber}
                            </p>
                            <p className="text-red-600 dark:text-red-400 text-xs font-medium mt-1">
                              Expires: {new Date(alert.expiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p>No active alerts</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700/30">
            <button
              onClick={fetchAlerts}
              className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AlertBanner;
