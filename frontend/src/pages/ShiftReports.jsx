import { useState } from 'react'
import { Calendar, Clock, TrendingDown, TrendingUp, CheckCircle, Search, Filter } from 'lucide-react'

const shiftsData = [
  {
    id: 1,
    date: '2026-05-08',
    cashierName: 'Ahmed Mohamed',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 12450.50,
    actualCash: 12320.00,
  },
  {
    id: 2,
    date: '2026-05-07',
    cashierName: 'Sarah Ali',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 9820.00,
    actualCash: 9820.00,
  },
  {
    id: 3,
    date: '2026-05-07',
    cashierName: 'Mohamed Hassan',
    startTime: '04:00 PM',
    endTime: '12:00 AM',
    openingCash: 3000,
    expectedCash: 5670.00,
    actualCash: 5710.00,
  },
  {
    id: 4,
    date: '2026-05-06',
    cashierName: 'Fatima Ahmed',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 15340.75,
    actualCash: 15190.50,
  },
  {
    id: 5,
    date: '2026-05-06',
    cashierName: 'Youssef Ibrahim',
    startTime: '04:00 PM',
    endTime: '12:00 AM',
    openingCash: 3500,
    expectedCash: 7840.00,
    actualCash: 7840.00,
  },
  {
    id: 6,
    date: '2026-05-05',
    cashierName: 'Ahmed Mohamed',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 11200.00,
    actualCash: 11250.00,
  },
  {
    id: 7,
    date: '2026-05-05',
    cashierName: 'Layla Mohamed',
    startTime: '04:00 PM',
    endTime: '12:00 AM',
    openingCash: 4000,
    expectedCash: 6230.00,
    actualCash: 6180.00,
  },
  {
    id: 8,
    date: '2026-05-04',
    cashierName: 'Omar Sameh',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 18920.25,
    actualCash: 18920.25,
  },
  {
    id: 9,
    date: '2026-05-03',
    cashierName: 'Reham Kamal',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 14500.00,
    actualCash: 14380.00,
  },
  {
    id: 10,
    date: '2026-05-02',
    cashierName: 'Tarek Adel',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    openingCash: 5000,
    expectedCash: 9870.50,
    actualCash: 10020.00,
  },
]

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount)
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ShiftReports() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')

  const filteredShifts = shiftsData.filter((shift) => {
    const matchesSearch = shift.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.date.includes(searchQuery)
    
    if (dateFilter === 'all') return matchesSearch
    if (dateFilter === 'today') return shift.date === '2026-05-08' && matchesSearch
    if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(shift.date) >= weekAgo && matchesSearch
    }
    return matchesSearch
  })

  const calculateDiscrepancy = (expected, actual) => actual - expected
  const totalShortage = filteredShifts
    .filter(s => calculateDiscrepancy(s.expectedCash, s.actualCash) < 0)
    .reduce((sum, s) => sum + Math.abs(calculateDiscrepancy(s.expectedCash, s.actualCash)), 0)
  const totalOverage = filteredShifts
    .filter(s => calculateDiscrepancy(s.expectedCash, s.actualCash) > 0)
    .reduce((sum, s) => sum + calculateDiscrepancy(s.expectedCash, s.actualCash), 0)
  const perfectShifts = filteredShifts.filter(s => s.expectedCash === s.actualCash).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تقارير المناوبات</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">Shift Reports - Owner View</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-[var(--md-radius-md)]">
                <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Shifts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredShifts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-[var(--md-radius-md)]">
                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Perfect Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{perfectShifts}</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-[var(--md-radius-md)]">
                <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Shortage</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalShortage)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-[var(--md-radius-md)]">
                <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Overage</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalOverage)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--md-surface-variant)] dark:bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shift History</h2>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search cashier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--md-primary)] w-full sm:w-64"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-[var(--md-outline)] rounded-[var(--md-radius-sm)] bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--md-primary)] w-full sm:w-40"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Date</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Cashier</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Start Time</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">End Time</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Opening Cash</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Expected</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Actual</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-200">Discrepancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShifts.map((shift) => {
                  const discrepancy = calculateDiscrepancy(shift.expectedCash, shift.actualCash)
                  const isShortage = discrepancy < 0
                  const isOverage = discrepancy > 0
                  const isBalanced = discrepancy === 0

                  return (
                    <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(shift.date)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{shift.cashierName}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          {shift.startTime}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          {shift.endTime}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-slate-300">
                        {formatCurrency(shift.openingCash)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-slate-300">
                        {formatCurrency(shift.expectedCash)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(shift.actualCash)}
                      </td>
                      <td className="px-4 py-4">
                        {isBalanced ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400">
                            <CheckCircle size={12} />
                            Perfect
                          </span>
                        ) : isShortage ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            <TrendingDown size={12} />
                            {formatCurrency(Math.abs(discrepancy))} deficit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            <TrendingUp size={12} />
                            +{formatCurrency(discrepancy)} extra
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredShifts.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-slate-400 text-lg">No shifts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}