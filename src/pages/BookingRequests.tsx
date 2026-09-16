import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Booking } from '../lib/supabase'
import Toast from '../components/Toast'
import { listItemVariants } from '../lib/motionPresets'
import { FilterChip, FilterChipRow } from '../components/FilterChips'

type FilterKey = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'all'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'declined', label: 'Declined' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

export default function BookingRequests() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 2500)
  }

  async function load() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, drivers(full_name, photo_url), course_packages(name, price)')
      .order('created_at', { ascending: false })
    if (!error && data) setBookings(data as Booking[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleConfirm(id: string) {
    setActingOn(id)
    const { error } = await supabase.rpc('confirm_booking', { p_booking_id: id })
    setActingOn(null)
    if (error) {
      showToast(`Could not confirm: ${error.message}`)
      return
    }
    showToast('Booking confirmed — class scheduled')
    load()
  }

  async function handleDecline(id: string) {
    setActingOn(id)
    const { error } = await supabase.rpc('decline_booking', { p_booking_id: id })
    setActingOn(null)
    if (error) {
      showToast(`Could not decline: ${error.message}`)
      return
    }
    showToast('Booking declined')
    load()
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div className="flex flex-col space-y-4 pb-12">
      <Toast message={toastMessage} />

      <FilterChipRow>
        {FILTERS.map(f => (
          <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </FilterChip>
        ))}
      </FilterChipRow>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-container-low rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-outline-variant p-8 text-center">
          <p className="text-body-base font-semibold text-on-surface">No {filter !== 'all' ? filter : ''} booking requests</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {filtered.map(b => (
            <motion.div key={b.id} layout variants={listItemVariants} initial="hidden" animate="visible" exit="exit">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-on-surface truncate">{b.drivers?.full_name ?? 'Instructor'}</p>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">{b.course_packages?.name} · ₹{b.course_packages?.price}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 capitalize">
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-[12px] text-on-surface-variant">
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
                  <div className="flex gap-2 mt-3">
                    <button
                      disabled={actingOn === b.id}
                      onClick={() => handleDecline(b.id)}
                      className="flex-1 h-9 rounded-xl bg-surface-container-low text-on-surface-variant text-[12px] font-semibold active:scale-95 transition-all disabled:opacity-60"
                    >
                      Decline
                    </button>
                    <button
                      disabled={actingOn === b.id}
                      onClick={() => handleConfirm(b.id)}
                      className="flex-1 h-9 rounded-xl bg-primary text-on-primary text-[12px] font-semibold active:scale-95 transition-all disabled:opacity-60"
                    >
                      {actingOn === b.id ? 'Confirming...' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
