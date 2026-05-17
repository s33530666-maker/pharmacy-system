import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';

const DrugAlternativesModal = ({ isOpen, onClose, onAddToCart, drugId }) => {
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && drugId) {
      fetchAlternatives();
    }
  }, [isOpen, drugId]);

  const fetchAlternatives = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/alternatives/${drugId}`);
      if (response.data?.data) {
        setAlternatives(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAddToCart = (alternative) => {
    if (onAddToCart) {
      onAddToCart(alternative);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      {/* Modal Container */}
      <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-2)] max-w-2xl w-full max-h-[80vh] overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Available Alternatives
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-slate-400">Loading alternatives...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && alternatives.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-slate-400">No alternatives found for this drug</p>
            </div>
          )}

          {/* Desktop Table View */}
          {!loading && alternatives.length > 0 && (
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                      Drug Name
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                      Available Stock
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alternative) => (
                    <tr
                      key={alternative.id}
                      className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                    >
                      <td className="py-4 px-4">
                        <span className="text-gray-900 dark:text-slate-100 font-medium">{alternative.name}</span>
                        <span className="block text-sm text-gray-500 dark:text-slate-400">{alternative.genericName}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-200 ${
                            alternative.totalAvailableStock > 0
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {alternative.totalAvailableStock > 0
                            ? `${alternative.totalAvailableStock} units`
                            : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleAddToCart(alternative)}
                          disabled={alternative.totalAvailableStock === 0}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                            alternative.totalAvailableStock > 0
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
: 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600'
                          }`}
                        >
                          + Add to Cart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Card View */}
          {!loading && alternatives.length > 0 && (
            <div className="md:hidden space-y-4">
              {alternatives.map((alternative) => (
                <div
                  key={alternative.id}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600 transition-all duration-200 hover:shadow-md"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {alternative.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{alternative.genericName}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-slate-400">Stock:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          alternative.totalAvailableStock > 0
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {alternative.totalAvailableStock > 0
                          ? `${alternative.totalAvailableStock} units`
                          : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(alternative)}
                    disabled={alternative.totalAvailableStock === 0}
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                      alternative.totalAvailableStock > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-600'
                    }`}
                  >
                    + Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrugAlternativesModal;
