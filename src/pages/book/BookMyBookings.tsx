import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Booking, BookingStatus } from '../../lib/supabase'
import Toast from '../../components/Toast'
import { toLocalDateString } from '../../lib/dateUtils'
import { formatDateFull, formatPrice, formatTimeLabel } from '../../lib/bookingFormat'
import { IconCalendar, IconClock, IconTicket, IconUser } from '../../components/book/icons'

const STATUS: Record<BookingStatus, { label: string; chip: string }> = {
  pending: { label: 'Waiting on instructor', chip: 'rd-chip-wait' },
  confirmed: { label: 'Confirmed', chip: 'rd-chip-go' },
  declined: { label: 'Declined', chip: 'rd-chip-stop' },
  cancelled: { label: 'Cancelled', chip: 'rd-chip-mute' },
}

export default function BookMyBookings({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(prev => (prev === message ? null : prev)), 2600)
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
    if (!session) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function handleCancel(id: string) {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setConfirmingCancel(null)
    if (error) {
      showToast('Could not cancel — try again')
      return
    }
    showToast('Request cancelled')
    load()
  }

  const today = toLocalDateString(new Date())
  const { upcoming, rest } = useMemo(() => {
    const next =
      bookings
        .filter(b => b.status === 'confirmed' && b.requested_date >= today)
        .sort((a, b) => a.requested_date.localeCompare(b.requested_date))[0] ?? null
    return { upcoming: next, rest: bookings.filter(b => b.id !== next?.id) }
  }, [bookings, today])

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 pt-20 text-center">
        <span className="rd-ink3">
          <IconUser size={30} />
        </span>
        <h1 className="rd-display text-[21px] font-bold">Sign in to see your bookings</h1>
        <p className="rd-ink2 max-w-[30ch] text-[14px] leading-[21px]">
          Your requests, confirmations and class times all live here once you’re signed in.
        </p>
        <button
          onClick={() => navigate('/book/login', { state: { from: '/book/my-bookings' } })}
          className="rd-btn mt-2 h-12 px-6 text-[15px]"
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-4 pt-4">
      <Toast message={toastMessage} />
      <h1 className="rd-display text-[30px] font-extrabold leading-tight">Bookings</h1>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map(i => (
            <div key={i} className="rd-skeleton h-[104px] rounded-[18px]" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rd-card flex flex-col items-center gap-2 px-6 py-11 text-center">
          <span className="rd-ink3">
            <IconTicket size={28} />
          </span>
          <p className="text-[15px] font-semibold">No bookings yet</p>
          <p className="rd-ink2 max-w-[30ch] text-[13px] leading-[20px]">
            Once you request a class, you can track it here from request through to confirmation.
          </p>
          <Link to="/book/drivers" className="rd-btn mt-3 h-11 px-5 text-[14px]">
            Find an instructor
          </Link>
        </div>
      ) : (
        <>
          {/* The next confirmed class is what someone opens this screen for */}
          {upcoming && (
            <section>
              <h2 className="rd-ink2 mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em]">Next class</h2>
              <div className="overflow-hidden rounded-[20px] bg-[var(--ink)] p-5 text-white shadow-[0_18px_40px_-20px_rgba(11,15,26,0.7)]">
                <span className="rd-chip bg-white/15 text-white">Confirmed</span>
                <p className="rd-display mt-3 text-[26px] font-extrabold leading-tight">
                  {formatTimeLabel(upcoming.start_time)}
                </p>
                <p className="mt-1 text-[14px] text-white/80">{formatDateFull(upcoming.requested_date)}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{upcoming.drivers?.full_name}</p>
                    <p className="truncate text-[12px] text-white/65">{upcoming.course_packages?.name}</p>
                  </div>
                  <Link
                    to={`/book/drivers/${upcoming.driver_id}`}
                    className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-[12px] font-semibold"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              {upcoming && (
                <h2 className="rd-ink2 mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em]">
                  Everything else
                </h2>
              )}
              <div className="flex flex-col gap-3">
                {rest.map(booking => {
                  const status = STATUS[booking.status]
                  const isConfirming = confirmingCancel === booking.id
                  return (
                    <article key={booking.id} className="rd-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">
                            {booking.drivers?.full_name ?? 'Instructor'}
                          </p>
                          <p className="rd-ink2 mt-0.5 truncate text-[13px]">
                            {booking.course_packages?.name}
                            {booking.course_packages?.price !== undefined &&
                              ` · ${formatPrice(booking.course_packages.price)}`}
                          </p>
                        </div>
                        <span className={`rd-chip ${status.chip} shrink-0`}>{status.label}</span>
                      </div>

                      <div className="rd-ink2 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--line)] pt-3 text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <IconCalendar size={15} />
                          {formatDateFull(booking.requested_date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <IconClock size={15} />
                          {formatTimeLabel(booking.start_time)}
                        </span>
                      </div>

                      {booking.status === 'pending' && (
                        <div className="mt-3">
                          {isConfirming ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmingCancel(null)}
                                className="rd-btn-quiet h-10 flex-1 text-[13px]"
                              >
                                Keep it
                              </button>
                              <button
                                onClick={() => handleCancel(booking.id)}
                                className="h-10 flex-1 rounded-[14px] bg-[var(--stop-tint)] text-[13px] font-semibold text-[var(--stop)] transition-transform active:scale-[0.98]"
                              >
                                Yes, cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingCancel(booking.id)}
                              className="rd-btn-quiet h-10 w-full text-[13px]"
                            >
                              Cancel request
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
