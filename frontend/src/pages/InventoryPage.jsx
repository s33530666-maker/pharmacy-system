import React, { useState } from 'react';
import { Package, ClipboardList } from 'lucide-react';
import InventoryList from './InventoryList';
import InventoryAuditTab from './InventoryAuditTab';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Tabs Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 rtl:space-x-reverse h-14">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-[var(--md-primary)] text-[var(--md-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
              }`}
            >
              <Package className="w-5 h-5" />
              عرض المخزن
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'audit'
                  ? 'border-[var(--md-primary)] text-[var(--md-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              جرد المخزن
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
        {activeTab === 'list' && <InventoryList />}
        {activeTab === 'audit' && <InventoryAuditTab />}
      </div>
    </div>
  );
}
