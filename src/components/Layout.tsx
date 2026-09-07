import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { isDemoMode, setDemoMode, resetDemoData } from '../lib/demoStore'
import { invalidateCustomerCache } from '../lib/customerCache'
import { supabase } from '../lib/supabase'

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full z-40 bg-surface/90 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.04)]"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Home</span>
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">bar_chart</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Dashboard</span>
        </NavLink>
        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">event_available</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Attendance</span>
        </NavLink>
        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">group</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Customers</span>
        </NavLink>
      </div>
    </nav>
  )
}

interface LayoutProps {
  title: string
  showBack?: boolean
  onBack?: () => void
}

export function Header({ title, showBack, onBack }: LayoutProps) {
  const [isDemo, setIsDemo] = useState(isDemoMode)

  useEffect(() => {
    const handler = () => setIsDemo(isDemoMode())
    window.addEventListener('demo-mode-change', handler)
    return () => window.removeEventListener('demo-mode-change', handler)
  }, [])

  function handleReset() {
    if (window.confirm('Reset all demo data back to default records? Your test changes will be cleared.')) {
      resetDemoData()
      invalidateCustomerCache()
      window.location.reload()
    }
  }

  function handleSignOut() {
    const confirmMsg = isDemo ? 'Exit demo sandbox mode?' : 'Sign out of your account?'
    if (window.confirm(confirmMsg)) {
      if (isDemo) {
        setDemoMode(false)
      } else {
        supabase.auth.signOut()
      }
    }
  }

  return (
    <header
      className="fixed top-0 w-full z-40 bg-surface/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {isDemo && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 text-amber-900 px-4 py-1.5 flex items-center justify-between text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="truncate">Demo Sandbox • Max 20 records</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-semibold">
            <button
              onClick={handleReset}
              className="text-amber-900 hover:underline active:opacity-75"
              title="Reset sample data"
            >
              Reset Data
            </button>
            <span className="text-amber-400">•</span>
            <button
              onClick={handleSignOut}
              className="text-amber-900 hover:underline active:opacity-75"
              title="Exit demo mode"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              aria-label="Go back"
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center text-on-surface -ml-2 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-on-surface tracking-tight leading-none">DriveManager</span>
            <span className="text-[11px] text-on-surface-variant leading-none mt-1">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            title={isDemo ? 'Demo Mode (Click to Exit)' : 'Click to Sign Out'}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              {isDemo ? 'science' : 'person'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export function Layout({ title }: { title: string }) {
  const [isDemo, setIsDemo] = useState(isDemoMode)

  useEffect(() => {
    const handler = () => setIsDemo(isDemoMode())
    window.addEventListener('demo-mode-change', handler)
    return () => window.removeEventListener('demo-mode-change', handler)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title={title} />
      <main className={`flex flex-col w-full px-4 ${isDemo ? 'pt-20' : 'pt-14'} pb-24 bg-background min-h-screen`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

