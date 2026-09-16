import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import type { Session } from '@supabase/supabase-js'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import Login from './pages/Login'
import Home from './pages/Home'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import Attendance from './pages/Attendance'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Leads from './pages/Leads'
import BookingRequests from './pages/BookingRequests'
import DriverProfile from './pages/DriverProfile'
import { Layout } from './components/Layout'
import BookLayout from './components/book/BookLayout'
import BookLanding from './pages/book/BookLanding'
import BookDriverList from './pages/book/BookDriverList'
import BookDriverDetail from './pages/book/BookDriverDetail'
import BookLogin from './pages/book/BookLogin'
import BookMyBookings from './pages/book/BookMyBookings'
import OfflinePage from './components/OfflinePage'
import NotFound from './pages/NotFound'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/leads': 'Leads & Bookings',
  '/attendance': 'Attendance',
  '/customers': 'Customers',
  '/requests': 'Booking Requests',
  '/driver-profile': 'My Driver Profile',
}

// Staff-only instructor routes, unchanged shell, gated so a learner session
// can never reach them (spec §4).
function StaffRoutes({ session }: { session: Session | null }) {
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
        <Route path="/requests" element={<BookingRequests />} />
        <Route path="/driver-profile" element={<DriverProfile session={session} />} />
      </Route>
      {/* Customer Detail has its own header (back button, no bottom nav inside Layout) */}
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="/book/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// Public/learner-facing routes — browsable without a session, own shell.
function BookRoutes({ session }: { session: Session | null }) {
  return (
    <Routes>
      <Route element={<BookLayout session={session} />}>
        <Route index element={<BookLanding />} />
        <Route path="drivers" element={<BookDriverList />} />
        <Route path="drivers/:driverId" element={<BookDriverDetail session={session} />} />
        <Route path="login" element={<BookLogin />} />
        <Route path="my-bookings" element={<BookMyBookings session={session} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const { session, role, loading } = useAuth()
  const isOnline = useOnlineStatus()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[24px] animate-spin">refresh</span>
          </div>
          <span className="text-[13px] text-on-surface-variant">Loading...</span>
        </div>
      </div>
    )
  }

  // A learner session (or no session at all) only ever sees the public /book
  // surface plus staff login — never the instructor routes (spec §4).
  if (!session || role === 'learner') {
    return (
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          {!isOnline && <OfflinePage />}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/book/*" element={<BookRoutes session={session} />} />
            <Route path="*" element={<Navigate to="/book" replace />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        {!isOnline && <OfflinePage />}
        <StaffRoutes session={session} />
        <Analytics />
      </BrowserRouter>
    </MotionConfig>
  )
}
