import { Outlet, NavLink } from 'react-router-dom'

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
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Home</span>
        </NavLink>
        <NavLink
          to="/leads"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">person_search</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Leads</span>
        </NavLink>
        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-brand-600' : 'text-slate-500'
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
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">group</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Customers</span>
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 transition-colors duration-150 ${
              isActive ? 'text-brand-600' : 'text-slate-500'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">bar_chart</span>
          <span className="text-[10px] leading-[13px] mt-0.5 font-medium">Dashboard</span>
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
  return (
    <header
      className="fixed top-0 w-full z-40 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              aria-label="Go back"
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center text-slate-900 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-slate-900 tracking-tight leading-none">DriveManager</span>
            <span className="text-[11px] text-slate-500 leading-none mt-1">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export function Layout({ title }: { title: string }) {
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Header title={title} />
      <main className="flex flex-col w-full px-4 pt-14 pb-24 bg-canvas min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

