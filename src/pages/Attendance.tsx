import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import type { Class } from '../lib/supabase'
import AddClassModal from '../components/AddClassModal'
import { toLocalDateString, canMarkClassDone } from '../lib/dateUtils'
import { invalidateCustomerCache } from '../lib/customerCache'

function formatDate(dateStr: string) {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day, 12, 0, 0)
  const todayStr = toLocalDateString(new Date())

  if (dateStr === todayStr) {
    return `Today, ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
  }

  const yDate = new Date()
  yDate.setDate(yDate.getDate() - 1)
  if (dateStr === toLocalDateString(yDate)) {
    return `Yesterday, ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
  }

  const tDate = new Date()
  tDate.setDate(tDate.getDate() + 1)
  if (dateStr === toLocalDateString(tDate)) {
    return `Tomorrow, ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
  }

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

function getDateContext(dateStr: string): 'past' | 'today' | 'future' {
  const today = toLocalDateString(new Date())
  if (dateStr < today) return 'past'
  if (dateStr === today) return 'today'
  return 'future'
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()))
  const [classes, setClasses] = useState<EnrichedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [showAddClass, setShowAddClass] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [classToDelete, setClassToDelete] = useState<EnrichedClass | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const dateContext = getDateContext(selectedDate)

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
    } else {
      setClasses([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClasses(selectedDate)
    setCopyMessage(null)
  }, [selectedDate])

  function changeDate(delta: number) {
    const [y, m, day] = selectedDate.split('-').map(Number)
    const d = new Date(y, m - 1, day + delta, 12, 0, 0)
    setSelectedDate(toLocalDateString(d))
  }

  async function copyPreviousDaySchedule() {
    setCopying(true)
    setCopyMessage(null)
    try {
      const [y, m, day] = selectedDate.split('-').map(Number)
      const prevDateObj = new Date(y, m - 1, day - 1)
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

      invalidateCustomerCache()
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
      invalidateCustomerCache()
      await fetchClasses(selectedDate)
    } finally {
      setMarkingDone(null)
    }
  }

  async function handleDeleteClass(classId: string) {
    setDeletingId(classId)
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (error) throw error
      invalidateCustomerCache()
      await fetchClasses(selectedDate)
      setClassToDelete(null)
    } catch (err) {
      console.error('Failed to delete class:', err)
      alert('Failed to delete class. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const doneCount = classes.filter(c => c.status === 'done').length
  const scheduledCount = classes.filter(c => c.status === 'scheduled').length
  const totalCount = classes.length
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const statusBadge = (status: string) => {
    if (status === 'done') return <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed/40 text-tertiary text-[12px] font-semibold">Done</span>
    if (status === 'cancelled') return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">Cancelled</span>
    if (status === 'not_completed') return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">Not Done</span>
    return <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[12px]">Scheduled</span>
  }

  return (
    <div className="flex flex-col w-full pb-12 pt-1">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm mb-3">
        <button
          aria-label="Previous day"
          onClick={() => changeDate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-90 transition-all cursor-pointer shrink-0"
          title="Previous day"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
        </button>

        <div className="relative flex flex-col items-center flex-1 min-w-0 px-1">
          <div className="relative flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group max-w-full">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">calendar_today</span>
            <span className="text-[15px] sm:text-[16px] font-semibold text-on-surface truncate select-none">
              {formatDate(selectedDate)}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] opacity-60 group-hover:opacity-100 shrink-0">
              arrow_drop_down
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              title="Click to pick a date"
            />
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-on-surface-variant">Instructor Log</span>
            {selectedDate !== toLocalDateString(new Date()) && (
              <button
                onClick={() => setSelectedDate(toLocalDateString(new Date()))}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all cursor-pointer"
              >
                Jump to Today
              </button>
            )}
          </div>
        </div>

        <button
          aria-label="Next day"
          onClick={() => changeDate(1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-90 transition-all cursor-pointer shrink-0"
          title="Next day"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_right</span>
        </button>
      </div>

      {/* Daily Progress Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                totalCount > 0 && doneCount === totalCount ? 'bg-tertiary' : 'bg-primary'
              } ${loading ? 'animate-pulse' : ''}`}
            />
            <span className="text-[13px] font-semibold text-on-surface">Daily Progress</span>
          </div>
          <span
            className={`text-[13px] font-bold ${
              totalCount > 0 && doneCount === totalCount ? 'text-tertiary' : 'text-primary'
            }`}
          >
            {loading ? (
              <span className="text-on-surface-variant font-normal">Loading...</span>
            ) : totalCount === 0 ? (
              'No classes scheduled'
            ) : dateContext === 'future' && doneCount === 0 ? (
              `${totalCount} ${totalCount === 1 ? 'Class' : 'Classes'} Scheduled`
            ) : (
              `${doneCount} of ${totalCount} Completed (${progressPercent}%)`
            )}
          </span>
        </div>

        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalCount > 0 && doneCount === totalCount ? 'bg-tertiary' : 'bg-primary'
            }`}
            style={{ width: `${totalCount > 0 ? progressPercent : 0}%` }}
          />
        </div>

        {!loading && totalCount > 0 && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-surface-container/60 text-[11px]">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary inline-block" />
              Done: <strong className="text-on-surface">{doneCount}</strong>
            </span>
            <span className="text-outline/40">•</span>
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              Scheduled: <strong className="text-on-surface">{scheduledCount}</strong>
            </span>
            {totalCount - doneCount - scheduledCount > 0 && (
              <>
                <span className="text-outline/40">•</span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-error inline-block" />
                  Other: <strong className="text-on-surface">{totalCount - doneCount - scheduledCount}</strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons — moved to top of the list */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        {dateContext === 'today' && classes.length === 0 && !loading && (
          <button
            onClick={copyPreviousDaySchedule}
            disabled={copying}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-container hover:bg-primary-fixed text-primary text-[14px] font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">{copying ? 'refresh' : 'content_copy'}</span>
            <span>{copying ? 'Copying Schedule...' : "Copy Yesterday's Schedule"}</span>
          </button>
        )}

        <button
          onClick={() => setShowAddClass(true)}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[14px] font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-primary text-[20px]">
            {dateContext === 'future' ? 'calendar_add_on' : 'add_circle'}
          </span>
          <span>
            {dateContext === 'future'
              ? 'Schedule Class'
              : dateContext === 'today'
              ? 'Add Unscheduled Class'
              : 'Add Class Record'}
          </span>
        </button>
      </div>

      {copyMessage && (
        <div className="mb-3 p-3 rounded-xl bg-error-container text-on-error-container text-[13px] text-center">
          {copyMessage}
        </div>
      )}

      {/* Class Cards */}
      <div className="flex flex-col gap-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm animate-pulse h-28" />
        ))}

        {!loading && classes.length === 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <span className="material-symbols-outlined text-outline text-[32px]">event_busy</span>
            <p className="text-[14px] text-on-surface-variant mt-2">No classes for this date</p>
          </div>
        )}

        {!loading && classes.map(cls => {
          const isDone = cls.status === 'done'
          const isSaving = markingDone === cls.id
          const cardClass = isDone
            ? "flex flex-col bg-white p-4 rounded-xl shadow-sm opacity-80"
            : "flex flex-col bg-white p-4 rounded-xl shadow-sm"
          const avatarClass = isDone
            ? "w-8 h-8 rounded-full flex items-center justify-center bg-tertiary-fixed/30 text-tertiary"
            : "w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant"
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
                    <span className="text-[11px] text-on-surface-variant">
                      {cls.start_time ? `${formatTime(cls.start_time)} – ${formatTime(cls.end_time)}` : 'Time TBD'}
                    </span>
                    <h3 className="text-[16px] font-semibold text-on-surface">{cls.full_name}</h3>
                  </div>
                </div>
                {statusBadge(cls.status)}
              </div>

              <div className="flex items-center justify-between mt-1 mb-2 text-[11px] text-on-surface-variant">
                <span>Class {cls.classes_completed + (cls.status !== 'done' ? 1 : 0)} of {cls.package_classes}</span>
                {cls.amount_pending > 0 ? (
                  <span className="text-error font-semibold">₹{cls.amount_pending.toLocaleString('en-IN')} Pending</span>
                ) : (
                  <span className="text-tertiary font-semibold">Fully Paid</span>
                )}
              </div>

              {cls.status === 'scheduled' && dateContext !== 'past' && (() => {
                const canMark = canMarkClassDone(cls.start_time)
                return (
                  <div className="flex items-center gap-2 mt-1">
                    {dateContext === 'today' && (
                      canMark ? (
                        <button
                          onClick={() => markDone(cls.id)}
                          disabled={isSaving}
                          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-[14px] font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
                        >
                          <span className={buttonIconClass}>{buttonIcon}</span>{buttonLabel}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-surface-container-low text-outline text-[13px] font-medium opacity-70 cursor-not-allowed"
                          title={`Cannot mark done before scheduled time (${cls.start_time ? formatTime(cls.start_time) : ''})`}
                        >
                          <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                          <span>Starts at {cls.start_time ? formatTime(cls.start_time) : 'TBD'}</span>
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setClassToDelete(cls)}
                      disabled={isSaving || deletingId === cls.id}
                      className={`${dateContext === 'today' ? 'w-11 h-11' : 'w-full h-11'} flex items-center justify-center gap-1.5 rounded-xl bg-error-container/50 hover:bg-error-container text-error text-[14px] font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0`}
                      title="Delete scheduled class"
                      aria-label="Delete scheduled class"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                      {dateContext !== 'today' && <span>Delete Class</span>}
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onSaved={() => fetchClasses(selectedDate)}
          defaultDate={selectedDate}
          mode={dateContext === 'future' ? 'schedule' : 'log'}
        />
      )}

      {/* Delete Scheduled Class Confirmation Popup */}
      {classToDelete && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => !deletingId && setClassToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-[26px]">delete_forever</span>
            </div>

            <h3 className="text-[18px] font-bold text-on-surface text-center mb-2">
              Delete Scheduled Class?
            </h3>

            <p className="text-[13px] text-on-surface-variant text-center mb-6 leading-relaxed">
              Are you sure you want to delete the scheduled class for{' '}
              <span className="font-semibold text-on-surface">{classToDelete.full_name}</span>? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                disabled={deletingId === classToDelete.id}
                className="flex-1 h-11 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-[14px] hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClass(classToDelete.id)}
                disabled={deletingId === classToDelete.id}
                className="flex-1 h-11 rounded-xl bg-error text-on-error font-semibold text-[14px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
              >
                {deletingId === classToDelete.id ? (
                  <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Deleting...</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">delete</span>Delete</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
