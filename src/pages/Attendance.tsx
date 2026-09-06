import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Class } from '../lib/supabase'
import AddClassModal from '../components/AddClassModal'
import { toLocalDateString } from '../lib/dateUtils'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return `Today, ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
  if (diff === -1) return `Yesterday, ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
  if (diff === 1) return `Tomorrow, ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

type EnrichedClass = Class & { full_name: string; package_classes: number; classes_completed: number; payment_status: string; amount_pending: number }

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()))
  const [classes, setClasses] = useState<EnrichedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [showAddClass, setShowAddClass] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  async function fetchClasses(date: string) {
    setLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*, customers(full_name, phone_number, package_classes), customer_summary(classes_completed, payment_status, amount_pending)')
      .eq('class_date', date)
      .order('start_time', { ascending: true })

    if (data) {
      setClasses(data.map((c: any) => ({
        ...c,
        full_name: c.customers?.full_name ?? 'Unknown',
        package_classes: c.customers?.package_classes ?? 0,
        classes_completed: c.customer_summary?.classes_completed ?? 0,
        payment_status: c.customer_summary?.payment_status ?? 'unknown',
        amount_pending: c.customer_summary?.amount_pending ?? 0,
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClasses(selectedDate)
    setCopyMessage(null)
  }, [selectedDate])

  function changeDate(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(toLocalDateString(d))
  }

  async function copyPreviousDaySchedule() {
    setCopying(true)
    setCopyMessage(null)
    try {
      const prevDateObj = new Date(selectedDate + 'T00:00:00')
      prevDateObj.setDate(prevDateObj.getDate() - 1)
      const prevDate = toLocalDateString(prevDateObj)

      const { data: prevClasses, error: fetchErr } = await supabase
        .from('classes')
        .select('customer_id, start_time, end_time')
        .eq('class_date', prevDate)
        .order('start_time', { ascending: true })

      if (fetchErr) throw fetchErr

      if (!prevClasses || prevClasses.length === 0) {
        setCopyMessage("No classes found on previous day to copy.")
        setCopying(false)
        return
      }

      const rowsToInsert = prevClasses.map(c => ({
        customer_id: c.customer_id,
        class_date: selectedDate,
        start_time: c.start_time,
        end_time: c.end_time,
        status: 'scheduled',
      }))

      const { error: insertErr } = await supabase
        .from('classes')
        .insert(rowsToInsert)

      if (insertErr) throw insertErr

      await fetchClasses(selectedDate)
    } catch {
      setCopyMessage('Something went wrong copying the schedule. Please try again.')
    } finally {
      setCopying(false)
    }
  }

  async function markDone(classId: string) {
    setMarkingDone(classId)
    try {
      await supabase.from('classes').update({ status: 'done' }).eq('id', classId)
      await fetchClasses(selectedDate)
    } finally {
      setMarkingDone(null)
    }
  }

  const doneCount = classes.filter(c => c.status === 'done').length
  const totalCount = classes.length

  const statusBadge = (status: string) => {
    if (status === 'done') return <span className="px-2 py-0.5 rounded-full bg-[#6bff8f]/40 text-[#005623] text-[12px] font-semibold">Done</span>
    if (status === 'cancelled') return <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold">Cancelled</span>
    if (status === 'not_completed') return <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold">Not Done</span>
    return <span className="px-2 py-0.5 rounded-full bg-[#e1e8fd] text-[#434654] text-[12px]">Scheduled</span>
  }

  return (
    <div className="flex flex-col w-full pb-12 pt-4">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm mb-3">
        <button
          aria-label="Previous day"
          onClick={() => changeDate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#f1f3ff] text-[#141b2b] hover:bg-[#e9edff] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[#003fb1] text-[18px]">calendar_today</span>
            <span className="text-[16px] font-semibold text-[#141b2b]">{formatDate(selectedDate)}</span>
          </div>
          <span className="text-[11px] text-[#434654]">Instructor Log</span>
        </div>
        <button
          aria-label="Next day"
          onClick={() => changeDate(1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#f1f3ff] text-[#141b2b] hover:bg-[#e9edff] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Progress Pill */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between bg-[#dbe1ff]/60 px-4 py-2 rounded-full mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#003fb1] animate-pulse" />
            <span className="text-[12px] font-semibold text-[#00174d]">Daily Progress</span>
          </div>
          <span className="text-[12px] font-bold text-[#003fb1]">{doneCount} of {totalCount} Completed</span>
        </div>
      )}

      {/* Class Cards */}
      <div className="flex flex-col gap-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm animate-pulse h-28" />
        ))}

        {!loading && classes.length === 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <span className="material-symbols-outlined text-[#737686] text-[32px]">event_busy</span>
            <p className="text-[14px] text-[#434654] mt-2">No classes for this date</p>
          </div>
        )}

        {!loading && classes.map(cls => {
          const isDone = cls.status === 'done'
          const isSaving = markingDone === cls.id
          const cardClass = isDone
            ? "flex flex-col bg-white p-4 rounded-2xl shadow-sm opacity-80"
            : "flex flex-col bg-white p-4 rounded-2xl shadow-sm"
          const avatarClass = isDone
            ? "w-8 h-8 rounded-full flex items-center justify-center bg-[#6bff8f]/30 text-[#005623]"
            : "w-8 h-8 rounded-full flex items-center justify-center bg-[#e9edff] text-[#434654]"
          const avatarIcon = isDone ? 'check' : 'schedule'
          const buttonIconClass = isSaving
            ? "material-symbols-outlined text-[18px] animate-spin"
            : "material-symbols-outlined text-[18px]"
          const buttonIcon = isSaving ? 'refresh' : 'check_circle'
          const buttonLabel = isSaving ? 'Saving...' : 'Mark Done'

          return (
            <div key={cls.id} className={cardClass}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={avatarClass}>
                    <span className="material-symbols-outlined text-[18px]">{avatarIcon}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#434654]">
                      {cls.start_time ? `${formatTime(cls.start_time)} – ${formatTime(cls.end_time)}` : 'Time TBD'}
                    </span>
                    <h3 className="text-[16px] font-semibold text-[#141b2b]">{cls.full_name}</h3>
                  </div>
                </div>
                {statusBadge(cls.status)}
              </div>

              <div className="flex items-center justify-between mt-1 mb-2 text-[11px] text-[#434654]">
                <span>Class {cls.classes_completed + (cls.status !== 'done' ? 1 : 0)} of {cls.package_classes}</span>
                {cls.amount_pending > 0 ? (
                  <span className="text-[#ba1a1a] font-semibold">₹{cls.amount_pending.toLocaleString('en-IN')} Pending</span>
                ) : (
                  <span className="text-[#005623] font-semibold">Fully Paid</span>
                )}
              </div>

              {cls.status === 'scheduled' && (
                <button
                  onClick={() => markDone(cls.id)}
                  disabled={isSaving}
                  className="w-full h-11 mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#f1f3ff] hover:bg-[#e9edff] text-[#141b2b] text-[14px] font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  <span className={buttonIconClass}>{buttonIcon}</span>{buttonLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {!loading && classes.length === 0 && (
          <button
            onClick={copyPreviousDaySchedule}
            disabled={copying}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-[#e9edff] hover:bg-[#dbe1ff] text-[#003fb1] text-[14px] font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">{copying ? 'refresh' : 'content_copy'}</span>
            <span>{copying ? 'Copying Schedule...' : "Copy Yesterday's Schedule"}</span>
          </button>
        )}
        <button
          onClick={() => setShowAddClass(true)}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-[#e1e8fd] text-[#141b2b] text-[14px] font-semibold shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[#003fb1] text-[20px]">add_circle</span>
          <span>Add Unscheduled Class</span>
        </button>
      </div>

      {copyMessage && (
        <div className="mt-3 p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-[13px] text-center">
          {copyMessage}
        </div>
      )}

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onSaved={() => fetchClasses(selectedDate)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  )
}
