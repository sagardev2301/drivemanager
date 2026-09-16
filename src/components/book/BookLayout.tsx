import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface BookLayoutProps {
  session: Session | null
}

const NAV_ITEMS = [
  { to: '/book', label: 'Browse', icon: 'search', end: true },
  { to: '/book/my-bookings', label: 'Bookings', icon: 'event_note', end: false },
] as const

export function BookBottomNav({ session }: { session: Session | null }) {
  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-40 flex justify-center px-4"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="sr-panel flex items-center gap-1 rounded-full px-2 py-2 shadow-[0_20px_40px_-16px_rgba(26,45,92,0.35)]">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 min-h-[44px] px-4 rounded-full text-[12px] font-semibold transition-all active:scale-90 ${
                isActive ? 'sr-btn-primary text-white' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to={session ? '/book/my-bookings' : '/book/login'}
          className={({ isActive }) =>
            `flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-90 ${
              isActive ? 'sr-btn-primary text-white' : 'text-on-surface-variant bg-white/60'
            }`
          }
          aria-label={session ? 'Account' : 'Sign in'}
        >
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
        </NavLink>
      </div>
    </nav>
  )
}

export function BookHeader({ session }: { session: Session | null }) {
  const navigate = useNavigate()

  async function handleAuthAction() {
    if (session) {
      await supabase.auth.signOut()
      navigate('/book')
    } else {
      navigate('/book/login')
    }
  }

  return (
    <header className="fixed top-0 w-full z-40 px-4 pt-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
      <div className="sr-panel h-12 rounded-full px-3 flex items-center justify-between">
        <NavLink to="/book" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_10px_-2px_rgba(0,63,177,0.5)]"
            style={{ background: 'linear-gradient(180deg,#2f6bef,#003fb1)' }}
          >
            <span className="material-symbols-outlined text-white text-[16px]">directions_car</span>
          </div>
          <span className="text-[14px] font-semibold text-on-surface tracking-tight">DriveManager</span>
        </NavLink>
        <button
          onClick={handleAuthAction}
          className="h-8 px-3 rounded-full text-[11px] font-semibold text-on-surface-variant hover:bg-white/70 active:scale-95 transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">{session ? 'logout' : 'login'}</span>
          {session ? 'Sign out' : 'Sign in'}
        </button>
      </div>
    </header>
  )
}

export default function BookLayout({ session }: BookLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen sr-stage">
      <BookHeader session={session} />
      <main className="flex flex-col w-full px-4 pt-[4.75rem] pb-28 min-h-screen">
        <Outlet />
      </main>
      <BookBottomNav session={session} />
    </div>
  )
}
