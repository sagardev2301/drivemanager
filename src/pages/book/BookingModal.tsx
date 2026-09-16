import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Booking, CoursePackage, Driver, DriverAvailability } from '../../lib/supabase'
import { parseTimeToMinutes, toLocalDateString } from '../../lib/dateUtils'
import { formatDateFull, formatPrice, formatTimeLabel, minutesToTime } from '../../lib/bookingFormat'
import { useModalBackButton } from '../../hooks/useModalBackButton'
import Sheet from '../../components/book/Sheet'
import DateStrip from '../../components/book/DateStrip'
import type { StripDay } from '../../components/book/DateStrip'
import { IconAlert, IconCheck } from '../../components/book/icons'

interface BookingModalProps {
  driver: Driver
  packages: CoursePackage[]
  initialPackage: CoursePackage | null
  session: Session
  onClose: () => void
  onBooked: () => void
}

type Step = 'package' | 'time' | 'confirm'

const DAYS_AHEAD = 21

export default function BookingModal({
  driver,
  packages,
  initialPackage,
  session,
  onClose,
  onBooked,
}: BookingModalProps) {
  // The sheet owns one history entry so a hardware/gesture back press closes it
  // rather than leaving the page. Dismissals go through requestClose; the
  // success path just unmounts and lets the hook retire its own entry.
  const { requestClose } = useModalBackButton(true, onClose)

  const firstPackage = initialPackage ?? (packages.length === 1 ? packages[0] : null)
  const [pkg, setPkg] = useState<CoursePackage | null>(firstPackage)
  const [step, setStep] = useState<Step>(firstPackage ? 'time' : 'package')

  const [availability, setAvailability] = useState<DriverAvailability[]>([])
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    supabase
      .from('driver_availability')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('is_active', true)
      .then(({ data }) => {
        if (ignore) return
        setAvailability((data as DriverAvailability[] | null) ?? [])
        setAvailabilityLoaded(true)
      })
    return () => {
      ignore = true
    }
  }, [driver.id])

  const days: StripDay[] = useMemo(() => {
    const openDays = new Set(availability.map(a => a.day_of_week))
    const today = new Date()
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      return { date: toLocalDateString(date), dow: date.getDay(), available: openDays.has(date.getDay()) }
    })
  }, [availability])

  useEffect(() => {
    if (!availabilityLoaded || selectedDate) return
    const firstOpen = days.find(d => d.available)
    if (firstOpen) setSelectedDate(firstOpen.date)
  }, [availabilityLoaded, days, selectedDate])

  useEffect(() => {
    if (!selectedDate || !pkg) return
    let ignore = false
    setLoadingSlots(true)
    setSelectedSlot(null)

    async function loadSlots() {
      const dow = new Date(`${selectedDate}T00:00:00`).getDay()
      const { data } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('driver_id', driver.id)
        .eq('requested_date', selectedDate)
        .in('status', ['pending', 'confirmed'])
      if (ignore || !pkg) return

      const taken = (data as Pick<Booking, 'start_time' | 'end_time'>[] | null) ?? []
      const duration = pkg.class_duration_minutes
      const isToday = selectedDate === toLocalDateString(new Date())
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      const open: string[] = []
      for (const window of availability.filter(a => a.day_of_week === dow)) {
        const start = parseTimeToMinutes(window.start_time) ?? 0
        const end = parseTimeToMinutes(window.end_time) ?? 0
        for (let t = start; t + duration <= end; t += duration) {
          // A slot that has already started today can't be requested
          if (isToday && t <= nowMinutes) continue
          const clashes = taken.some(b => {
            const bStart = parseTimeToMinutes(b.start_time) ?? 0
            const bEnd = parseTimeToMinutes(b.end_time) ?? 0
            return t < bEnd && t + duration > bStart
          })
          if (!clashes) open.push(minutesToTime(t))
        }
      }
      setSlots(open)
      setLoadingSlots(false)
    }

    loadSlots()
    return () => {
      ignore = true
    }
  }, [selectedDate, pkg, driver.id, availability])

  async function handleSubmit() {
    if (!pkg || !selectedSlot) return
    setSubmitting(true)
    setError('')
    const endMinutes = (parseTimeToMinutes(selectedSlot) ?? 0) + pkg.class_duration_minutes

    const { error: insertError } = await supabase.from('bookings').insert({
      learner_id: session.user.id,
      driver_id: driver.id,
      course_package_id: pkg.id,
      requested_date: selectedDate,
      start_time: selectedSlot,
      end_time: minutesToTime(endMinutes),
      status: 'pending',
    })
    setSubmitting(false)

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'Someone just took that slot. Pick another time.'
          : 'That didn’t go through. Check your connection and try again.'
      )
      if (insertError.code === '23505') {
        setSelectedSlot(null)
        setStep('time')
      }
      return
    }
    onBooked()
  }

  const stepOrder: Step[] = packages.length > 1 && !initialPackage ? ['package', 'time', 'confirm'] : ['time', 'confirm']
  const stepIndex = stepOrder.indexOf(step)

  const footer = (() => {
    if (step === 'package') return null
    if (step === 'time') {
      return (
        <button
          disabled={!selectedSlot}
          onClick={() => setStep('confirm')}
          className="rd-btn h-[52px] w-full text-[15px]"
        >
          Review request
        </button>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        <button disabled={submitting} onClick={handleSubmit} className="rd-btn h-[52px] w-full text-[15px]">
          {submitting ? 'Sending…' : 'Send booking request'}
        </button>
        <button onClick={() => setStep('time')} className="rd-ink2 h-10 text-[13px] font-semibold">
          Change time
        </button>
      </div>
    )
  })()

  return (
    <Sheet
      title="Book a class"
      subtitle={pkg ? `${driver.full_name} · ${pkg.name}` : driver.full_name}
      onDismiss={requestClose}
      footer={footer}
    >
      {/* Progress */}
      <div className="mb-5 flex gap-1.5" aria-hidden="true">
        {stepOrder.map((s, i) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= stepIndex ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'
            }`}
          />
        ))}
      </div>

      {step === 'package' && (
        <div className="flex flex-col gap-3 pb-5">
          <p className="rd-ink2 text-[14px]">Which package are you booking against?</p>
          {packages.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setPkg(item)
                setStep('time')
              }}
              className="rd-card rd-press flex items-center justify-between gap-3 p-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{item.name}</p>
                <p className="rd-ink2 mt-0.5 text-[13px]">
                  {item.class_count} {item.class_count === 1 ? 'class' : 'classes'} · {item.class_duration_minutes} min
                </p>
              </div>
              <p className="rd-display shrink-0 text-[18px] font-extrabold">{formatPrice(item.price)}</p>
            </button>
          ))}
        </div>
      )}

      {step === 'time' && (
        <div className="pb-5">
          {!availabilityLoaded ? (
            <div className="rd-skeleton h-[70px] rounded-[16px]" />
          ) : availability.length === 0 ? (
            <div className="rd-card flex items-start gap-2.5 p-4">
              <span className="rd-ink3 mt-0.5">
                <IconAlert size={18} />
              </span>
              <p className="rd-ink2 text-[14px] leading-[21px]">
                {driver.full_name} hasn’t published any working hours yet, so there’s nothing to book against. Try
                another instructor for now.
              </p>
            </div>
          ) : (
            <>
              <DateStrip days={days} selected={selectedDate} onSelect={setSelectedDate} />

              <h3 className="mb-3 mt-6 text-[14px] font-semibold">
                {selectedDate ? formatDateFull(selectedDate) : 'Pick a date'}
              </h3>

              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="rd-skeleton h-11 rounded-[12px]" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="rd-ink2 py-6 text-center text-[14px]">
                  Nothing open on this day. Try another date above.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(slot => {
                    const isSelected = slot === selectedSlot
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        aria-pressed={isSelected}
                        className={`h-11 rounded-[12px] border text-[13px] font-semibold transition-all active:scale-95 ${
                          isSelected
                            ? 'border-transparent bg-[var(--brand)] text-white shadow-[0_8px_18px_-10px_rgba(18,63,158,0.9)]'
                            : 'border-[var(--line)] bg-white'
                        }`}
                      >
                        {formatTimeLabel(slot)}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {error && (
            <p className="rd-chip rd-chip-stop mt-4 h-auto w-full justify-start px-3 py-2 text-[13px]">{error}</p>
          )}
        </div>
      )}

      {step === 'confirm' && pkg && selectedSlot && (
        <div className="flex flex-col gap-4 pb-5">
          <dl className="rd-card divide-y divide-[var(--line)]">
            {[
              ['Instructor', driver.full_name],
              ['Package', `${pkg.name} · ${pkg.class_count} ${pkg.class_count === 1 ? 'class' : 'classes'}`],
              ['Date', formatDateFull(selectedDate)],
              ['Time', `${formatTimeLabel(selectedSlot)} · ${pkg.class_duration_minutes} min`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="rd-ink2 shrink-0 text-[13px]">{label}</dt>
                <dd className="text-right text-[14px] font-semibold">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="rd-ink2 text-[13px]">Package price</dt>
              <dd className="rd-display text-[18px] font-extrabold">{formatPrice(pkg.price)}</dd>
            </div>
          </dl>

          <div className="flex items-start gap-2.5 rounded-[14px] bg-[var(--brand-tint)] p-3.5">
            <span className="mt-0.5 text-[var(--brand-deep)]">
              <IconCheck size={17} />
            </span>
            <p className="text-[13px] leading-[20px] text-[var(--brand-deep)]">
              This is a request, not a confirmed class. {driver.full_name.split(' ')[0]} has to accept it — you’ll see
              the status under Bookings. Nothing is charged now; you pay at the lesson.
            </p>
          </div>

          {error && (
            <p className="rd-chip rd-chip-stop h-auto w-full justify-start px-3 py-2 text-[13px]">{error}</p>
          )}
        </div>
      )}
    </Sheet>
  )
}
