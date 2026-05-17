import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert, X } from 'lucide-react'

export default function MainLayout() {
  const { isTempAdmin, disableTempAdmin } = useAuth()
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      
      {/* Temp Admin Banner */}
      {isTempAdmin && (
        <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-md z-50 shrink-0" dir="rtl">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="animate-pulse" />
            <span className="font-bold text-sm">وضع المدير مفعل (صلاحيات مؤقتة)</span>
          </div>
          <button
            onClick={disableTempAdmin}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-medium transition-colors"
          >
            <X size={14} />
            <span>إنهاء الوضع</span>
          </button>
        </div>
      )}

      <Sidebar />
      <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-slate-900">
        <div className="h-full overflow-y-auto px-4 py-3">
          <Outlet />
        </div>
      </main>
    </div>
  )
}