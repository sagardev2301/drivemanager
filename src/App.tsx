import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import Login from './pages/Login'
import Home from './pages/Home'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import Attendance from './pages/Attendance'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Leads from './pages/Leads'
import { Layout } from './components/Layout'
import OfflinePage from './components/OfflinePage'
import NotFound from './pages/NotFound'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/leads': 'Leads & Bookings',
  '/attendance': 'Attendance',
  '/customers': 'Customers',
}

function AppRoutes() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'DriveManager'

  return (
    <Routes>
      <Route element={<Layout title={title} />}>
        <Route path="/" element={<Home />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/dashboard" element={<AnalyticsDashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/customers" element={<Customers />} />
      </Route>
      {/* Customer Detail has its own header (back button, no bottom nav inside Layout) */}
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  const isOnline = useOnlineStatus()

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[24px] animate-spin">refresh</span>
          </div>
          <span className="text-[13px] text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <BrowserRouter>
        {!isOnline && <OfflinePage />}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Analytics />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      {!isOnline && <OfflinePage />}
      <AppRoutes />
      <Analytics />
    </BrowserRouter>
  )
}
