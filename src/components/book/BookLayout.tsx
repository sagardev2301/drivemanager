import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface BookLayoutProps {
  session: Session | null
}

export function BookBottomNav({ session }: { session: Session | null }) {
  return (
    <nav
      className="fixed bottom-0 w-full z-40 bg-surface/90 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        <NavLink
          to="/book"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-all duration-150 active:scale-90 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">search</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Browse</span>
        </NavLink>
        <NavLink
          to="/book/my-bookings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-all duration-150 active:scale-90 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">event_note</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">My Bookings</span>
        </NavLink>
        <NavLink
          to={session ? '/book/my-bookings' : '/book/login'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-all duration-150 active:scale-90 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">account_circle</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">{session ? 'Account' : 'Sign in'}</span>
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
    <header
      className="fixed top-0 w-full z-40 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-14 px-4 flex items-center justify-between">
        <NavLink to="/book" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">directions_car</span>
          </div>
          <span className="text-[15px] font-semibold text-on-surface tracking-tight">DriveManager</span>
        </NavLink>
        <button
          onClick={handleAuthAction}
          className="h-9 px-3 rounded-full text-[12px] font-semibold text-on-surface-variant hover:bg-surface-container-high active:scale-95 transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">{session ? 'logout' : 'login'}</span>
          {session ? 'Sign out' : 'Sign in'}
        </button>
      </div>
    </header>
  )
}

export default function BookLayout({ session }: BookLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BookHeader session={session} />
      <main className="flex flex-col w-full px-4 pt-14 pb-24 bg-background min-h-screen">
        <Outlet />
      </main>
      <BookBottomNav session={session} />
    </div>
  )
}
