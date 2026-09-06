import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import { Layout } from './components/Layout'
import OfflinePage from './components/OfflinePage'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/attendance': 'Attendance',
  '/customers': 'Customers',
}

function AppRoutes() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'DriveManager'

  return (
    <Routes>
      <Route element={<Layout title={title} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/customers" element={<Customers />} />
      </Route>
      {/* Customer Detail has its own header (back button, no bottom nav inside Layout) */}
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  const isOnline = useOnlineStatus()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#003fb1] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[24px] animate-spin">refresh</span>
          </div>
          <span className="text-[13px] text-[#434654]">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <BrowserRouter>
        {!isOnline && <OfflinePage />}
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      {!isOnline && <OfflinePage />}
      <AppRoutes />
    </BrowserRouter>
  )
}
