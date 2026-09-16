import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Booking, BookingStatus } from '../../lib/supabase'
import Toast from '../../components/Toast'

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-800' },
  confirmed: { label: 'Confirmed', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  declined: { label: 'Declined', bg: 'bg-rose-50', text: 'text-rose-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-surface-container', text: 'text-on-surface-variant' },
}

export default function BookMyBookings({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 2500)
  }

  async function load() {
    if (!session) return
    const { data, error } = await supabase
      .from('bookings')
      .select('*, drivers(full_name, photo_url), course_packages(name, price)')
      .eq('learner_id', session.user.id)
      .order('requested_date', { ascending: false })
    if (!error && data) setBookings(data as Booking[])
    setLoading(false)
  }

  useEffect(() => {
    if (session === null) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function handleCancel(id: string) {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (error) {
      showToast('Could not cancel — try again')
      return
    }
    showToast('Booking cancelled')
    load()
  }

  if (!session) {
    return (
      <div className="pt-12 flex flex-col items-center text-center gap-3">
        <span className="material-symbols-outlined text-on-surface-variant text-[40px]">event_note</span>
        <p className="text-body-base font-semibold text-on-surface">Sign in to see your bookings</p>
        <button
          onClick={() => navigate('/book/login', { state: { from: '/book/my-bookings' } })}
          className="h-10 px-4 rounded-xl bg-primary text-on-primary text-body-sm font-semibold"
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <Toast message={toastMessage} />
      <h1 className="text-headline-md font-semibold text-on-surface">My bookings</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-outline-variant p-8 text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[36px]">event_available</span>
          <p className="text-body-base font-semibold text-on-surface">No bookings yet</p>
          <button
            onClick={() => navigate('/book/drivers')}
            className="h-10 px-4 rounded-xl bg-primary text-on-primary text-body-sm font-semibold"
          >
            Find an instructor
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const cfg = STATUS_CONFIG[b.status]
            return (
              <div key={b.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body-strong text-on-surface truncate">{b.drivers?.full_name ?? 'Instructor'}</p>
                    <p className="text-caption-xs text-on-surface-variant mt-0.5">{b.course_packages?.name}</p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-caption-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/40 text-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                    {new Date(b.requested_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">schedule</span>
                    {b.start_time}
                  </span>
                </div>
                {b.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    className="mt-3 w-full h-9 rounded-xl bg-surface-container-low text-on-surface-variant text-caption-xs font-semibold active:scale-95 transition-all"
                  >
                    Cancel request
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
