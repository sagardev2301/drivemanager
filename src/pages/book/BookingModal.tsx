import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Driver, CoursePackage, DriverAvailability, Booking } from '../../lib/supabase'
import { toLocalDateString, parseTimeToMinutes } from '../../lib/dateUtils'
import { useModalBackButton } from '../../hooks/useModalBackButton'
import { backdropVariants, sheetVariants } from '../../lib/motionPresets'
import DatePickerModal from '../../components/DatePickerModal'

interface BookingModalProps {
  driver: Driver
  coursePackage: CoursePackage
  session: Session
  onClose: () => void
  onBooked: () => void
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export default function BookingModal({ driver, coursePackage, session, onClose, onBooked }: BookingModalProps) {
  const { requestClose, markHandled } = useModalBackButton(true, onClose)

  const [step, setStep] = useState<'date' | 'slot' | 'confirm'>('date')
  const [showDatePicker, setShowDatePicker] = useState(true)
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()))
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (step !== 'slot') return
    let ignore = false
    setLoadingSlots(true)
    setSelectedSlot(null)

    async function loadSlots() {
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
      const [availRes, bookingsRes] = await Promise.all([
        supabase
          .from('driver_availability')
          .select('*')
          .eq('driver_id', driver.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('driver_id', driver.id)
          .eq('requested_date', selectedDate)
          .in('status', ['pending', 'confirmed']),
      ])
      if (ignore) return

      const windows = (availRes.data as DriverAvailability[] | null) ?? []
      const taken = (bookingsRes.data as Pick<Booking, 'start_time' | 'end_time'>[] | null) ?? []
      const duration = coursePackage.class_duration_minutes

      const candidateSlots: string[] = []
      for (const w of windows) {
        const start = parseTimeToMinutes(w.start_time) ?? 0
        const end = parseTimeToMinutes(w.end_time) ?? 0
        for (let t = start; t + duration <= end; t += duration) {
          const overlaps = taken.some(b => {
            const bStart = parseTimeToMinutes(b.start_time) ?? 0
            const bEnd = parseTimeToMinutes(b.end_time) ?? 0
            return t < bEnd && t + duration > bStart
          })
          if (!overlaps) candidateSlots.push(minutesToTime(t))
        }
      }
      setSlots(candidateSlots)
      setLoadingSlots(false)
    }

    loadSlots()
    return () => {
      ignore = true
    }
  }, [step, selectedDate, driver.id, coursePackage.class_duration_minutes])

  function handleClose() {
    requestClose()
  }

  function handleDateSelected(date: string) {
    setSelectedDate(date)
    setShowDatePicker(false)
    setStep('slot')
  }

  async function handleConfirm() {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    const endMinutes = (parseTimeToMinutes(selectedSlot) ?? 0) + coursePackage.class_duration_minutes
    const { error } = await supabase.from('bookings').insert({
      learner_id: session.user.id,
      driver_id: driver.id,
      course_package_id: coursePackage.id,
      requested_date: selectedDate,
      start_time: selectedSlot,
      end_time: minutesToTime(endMinutes),
      status: 'pending',
    })
    setSubmitting(false)
    if (error) {
      setError(
        error.code === '23505'
          ? 'That slot was just taken by someone else — pick another.'
          : error.message
      )
      return
    }
    markHandled()
    onBooked()
  }

  return createPortal(
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-[90] flex items-end justify-center bg-on-surface/40 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          variants={sheetVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="sr-panel w-full max-w-sm rounded-t-3xl p-4 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-1 pb-1">
            <div className="w-10 h-1 rounded-full bg-outline-variant" />
          </div>

          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-headline-sm font-semibold text-on-surface">Book a class</h3>
              <p className="text-caption-xs text-on-surface-variant">
                {driver.full_name} · {coursePackage.name}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-white/70 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {step === 'slot' && (
            <>
              <button
                onClick={() => setShowDatePicker(true)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/70"
              >
                <span className="text-body-sm font-semibold text-on-surface">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="text-caption-xs text-primary font-semibold">Change date</span>
              </button>

              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-10 bg-white/60 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-4">
                  No open slots on this date — try another day.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`h-10 rounded-xl text-caption-xs font-semibold transition-all active:scale-95 ${
                        selectedSlot === slot
                          ? 'sr-btn-primary text-white'
                          : 'bg-white/70 text-on-surface'
                      }`}
                    >
                      {formatTimeLabel(slot)}
                    </button>
                  ))}
                </div>
              )}

              <button
                disabled={!selectedSlot}
                onClick={() => setStep('confirm')}
                className="sr-btn-primary w-full h-11 text-white rounded-xl font-semibold text-body-base disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                Continue
              </button>
            </>
          )}

          {step === 'confirm' && selectedSlot && (
            <>
              <div className="bg-white/70 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Instructor</span>
                  <span className="font-semibold text-on-surface">{driver.full_name}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Package</span>
                  <span className="font-semibold text-on-surface">{coursePackage.name}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Date</span>
                  <span className="font-semibold text-on-surface">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Time</span>
                  <span className="font-semibold text-on-surface">{formatTimeLabel(selectedSlot)}</span>
                </div>
                <div className="flex justify-between text-body-sm pt-2 border-t border-outline-variant/40">
                  <span className="text-on-surface-variant">Price</span>
                  <span className="font-semibold text-on-surface">₹{coursePackage.price}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-primary-fixed/40 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">info</span>
                <p className="text-caption-xs text-on-surface-variant">
                  This sends a request — your instructor still needs to confirm it. You'll pay at the location, same as always.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                disabled={submitting}
                onClick={handleConfirm}
                className="sr-btn-primary w-full h-11 text-white rounded-xl font-semibold text-body-base disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {submitting ? 'Sending request...' : 'Send booking request'}
              </button>
              <button onClick={() => setStep('slot')} className="text-body-sm text-on-surface-variant text-center">
                Back
              </button>
            </>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showDatePicker && (
          <DatePickerModal
            isOpen={showDatePicker}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelected}
            onClose={() => (step === 'date' ? handleClose() : setShowDatePicker(false))}
          />
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
