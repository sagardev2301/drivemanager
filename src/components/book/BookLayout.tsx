import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { IconCar, IconSearch, IconTicket, IconUser, IconLogout } from './icons'

const TABS = [
  { to: '/book', label: 'Browse', Icon: IconSearch, end: true },
  { to: '/book/my-bookings', label: 'Bookings', Icon: IconTicket, end: false },
] as const

function TopBar({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/book')
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        scrolled ? 'border-b border-[var(--line)] bg-[rgba(243,245,249,0.88)] backdrop-blur-xl' : 'bg-transparent'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
        <NavLink to="/book" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[var(--brand)] text-white">
            <IconCar size={16} />
          </span>
          <span className="rd-display text-[15px] font-bold">DriveManager</span>
        </NavLink>

        {session ? (
          <button
            onClick={handleSignOut}
            className="rd-ink2 flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors active:bg-[#e7ebf3]"
          >
            <IconLogout size={17} />
            Sign out
          </button>
        ) : (
          <NavLink
            to="/book/login"
            className="rd-brand flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors active:bg-[var(--brand-tint)]"
          >
            Sign in
          </NavLink>
        )}
      </div>
    </header>
  )
}

function TabBar({ session }: { session: Session | null }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(255,255,255,0.92)] backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[60px] max-w-md items-stretch justify-around px-3">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-w-[76px] flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-[var(--brand)]' : 'text-[var(--ink-3)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-[2px] w-9 rounded-full transition-opacity ${
                    isActive ? 'bg-[var(--brand)] opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon size={21} />
                <span className="text-[11px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <NavLink
          to={session ? '/book/my-bookings' : '/book/login'}
          className={({ isActive }) =>
            `flex min-w-[76px] flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-[var(--brand)]' : 'text-[var(--ink-3)]'
            }`
          }
        >
          <IconUser size={21} />
          <span className="text-[11px] font-semibold">{session ? 'Account' : 'Sign in'}</span>
        </NavLink>
      </div>
    </nav>
  )
}

export default function BookLayout({ session }: { session: Session | null }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar session={session} />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <Outlet />
      </main>
      <TabBar session={session} />
    </div>
  )
}
