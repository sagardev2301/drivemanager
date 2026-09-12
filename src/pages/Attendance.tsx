import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Class } from '../lib/supabase'
import AddClassModal from '../components/AddClassModal'
import DatePickerModal from '../components/DatePickerModal'
import MarkDoneConfirmModal from '../components/MarkDoneConfirmModal'
import AddPaymentModal from '../components/AddPaymentModal'
import Toast from '../components/Toast'
import { toLocalDateString, canMarkClassDone } from '../lib/dateUtils'
import { backdropVariants, listItemVariants } from '../lib/motionPresets'
import { invalidateCustomerCache } from '../lib/customerCache'

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
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [classToDelete, setClassToDelete] = useState<EnrichedClass | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [classToEdit, setClassToEdit] = useState<EnrichedClass | null>(null)
  const [classToMarkDone, setClassToMarkDone] = useState<EnrichedClass | null>(null)
  const [classToCollectPayment, setClassToCollectPayment] = useState<EnrichedClass | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev))
    }, 2500)
  }

  const dateContext = getDateContext(selectedDate)
  const tomorrowObj = new Date()
  tomorrowObj.setDate(tomorrowObj.getDate() + 1)
  const tomorrowStr = toLocalDateString(tomorrowObj)
  const isTomorrow = selectedDate === tomorrowStr

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
        setCopyMessage(isTomorrow ? "No classes found on today's schedule to copy." : "No classes found on previous day to copy.")
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

  async function confirmMarkDone(classId: string) {
    setMarkingDone(classId)
    try {
      await supabase.from('classes').update({ status: 'done' }).eq('id', classId)
      invalidateCustomerCache()
      await fetchClasses(selectedDate)
      setClassToMarkDone(null)
      showToast('Class marked done')
    } finally {
      setMarkingDone(null)
    }
  }

  async function handleDeleteClass(classId: string) {
    setDeletingId(classId)
    try {
      const { data: linkedPayments, error: paymentCheckErr } = await supabase
        .from('payments')
        .select('id')
        .eq('class_id', classId)
        .limit(1)
      if (paymentCheckErr) throw paymentCheckErr
      if (linkedPayments && linkedPayments.length > 0) {
        alert('This class has a payment recorded against it — remove the payment first before deleting the class.')
        return
      }

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
  const totalCount = classes.length

  const statusBadge = (status: string) => {
    if (status === 'done') return <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed/40 text-tertiary text-[12px] font-semibold">Done</span>
    if (status === 'cancelled') return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">Cancelled</span>
    if (status === 'not_completed') return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">Not Completed</span>
    return <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[12px]">Scheduled</span>
  }

  return (
    <div
      className="fixed inset-x-0 flex flex-col bg-background z-10 overflow-hidden"
      style={{
        top: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col w-full max-w-lg mx-auto h-full px-4 pt-3 relative">
        <Toast message={toastMessage} />

        {/* Pinned Date Navigator & Progress Pill */}
        <div className="shrink-0 space-y-3 pb-3 bg-background z-20">
          {/* Date Navigator */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
            <button
              aria-label="Previous day"
              onClick={() => changeDate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="flex flex-col items-center px-3 py-1 -my-1 rounded-xl hover:bg-surface-container-low transition-colors active:scale-95 cursor-pointer"
              aria-label="Select date"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                <span className="text-[16px] font-semibold text-on-surface">{formatDate(selectedDate)}</span>
                <span className="material-symbols-outlined text-outline text-[16px]">expand_more</span>
              </div>
              <span className="text-[11px] text-on-surface-variant">Instructor Log</span>
            </button>
            <button
              aria-label="Next day"
              onClick={() => changeDate(1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Progress Pill */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between bg-primary-fixed/60 px-4 py-2 rounded-full">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[12px] font-semibold text-on-primary-fixed">Daily Progress</span>
              </div>
              <span className="text-[12px] font-bold text-primary">{doneCount} of {totalCount} Completed</span>
            </div>
          )}
        </div>

        {/* Scrollable Class Cards & Action Buttons */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-20 pt-1 -mx-1 px-1">
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

        <AnimatePresence initial={false}>
        {!loading && classes.map(cls => {
          const isDone = cls.status === 'done'
          const isSaving = markingDone === cls.id
          const canEdit = dateContext === 'today'
          const canDelete = true
          const showMarkDone = dateContext === 'today' && (cls.status === 'scheduled' || cls.status === 'not_completed')
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
            <motion.div key={cls.id} layout variants={listItemVariants} initial="hidden" animate="visible" exit="exit" className={cardClass}>
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
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={cls.status}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                  >
                    {statusBadge(cls.status)}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-1 mb-2 text-[11px] text-on-surface-variant">
                <span>Class {cls.classes_completed + (cls.status !== 'done' ? 1 : 0)} of {cls.package_classes}</span>
                {cls.amount_pending > 0 ? (
                  <span className="text-error font-semibold">₹{cls.amount_pending.toLocaleString('en-IN')} Pending</span>
                ) : (
                  <span className="text-tertiary font-semibold">Fully Paid</span>
                )}
              </div>

              {(() => {
                const canMark = canMarkClassDone(cls.start_time)
                const editButtonClass = showMarkDone
                  ? "w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[14px] font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  : "flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[14px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                const deleteButtonClass = showMarkDone
                  ? "w-11 h-11 flex items-center justify-center rounded-xl bg-error-container/50 hover:bg-error-container text-error text-[14px] font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  : canEdit
                    ? "h-11 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-error-container/50 hover:bg-error-container text-error text-[14px] font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    : "flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-error-container/50 hover:bg-error-container text-error text-[14px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                const iconSizeClass = showMarkDone ? "material-symbols-outlined text-[20px]" : "material-symbols-outlined text-[18px]"

                return (
                  <div className="flex items-center gap-2 mt-1">
                    {showMarkDone && (
                      canMark ? (
                        <button
                          onClick={() => setClassToMarkDone(cls)}
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
                    {canEdit && (
                      <button
                        onClick={() => {
                          setClassToEdit(cls)
                          setShowAddClass(true)
                        }}
                        disabled={isSaving || deletingId === cls.id}
                        className={editButtonClass}
                        title="Edit class"
                        aria-label="Edit class"
                      >
                        <span className={iconSizeClass}>edit</span>
                        {!showMarkDone && <span>Edit Class</span>}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setClassToDelete(cls)}
                        disabled={isSaving || deletingId === cls.id}
                        className={deleteButtonClass}
                        title="Delete class"
                        aria-label="Delete class"
                      >
                        <span className={iconSizeClass}>delete</span>
                        {!showMarkDone && <span>Delete</span>}
                      </button>
                    )}
                  </div>
                )
              })()}
            </motion.div>
          )
        })}
        </AnimatePresence>
      </div>

      {/* Action Buttons — only show for today and future */}
      {!loading && dateContext !== 'past' && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {/* Today: Add Unscheduled Class */}
          {dateContext === 'today' && (
            <button
              onClick={() => {
                setClassToEdit(null)
                setShowAddClass(true)
              }}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-container-high text-on-surface text-[14px] font-semibold shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
              <span>Add Unscheduled Class</span>
            </button>
          )}
          {/* Future: Copy Schedule (when no classes) + Schedule Class button */}
          {dateContext === 'future' && classes.length === 0 && (
            <button
              onClick={copyPreviousDaySchedule}
              disabled={copying}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-container hover:bg-primary-fixed text-primary text-[14px] font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">{copying ? 'refresh' : 'content_copy'}</span>
              <span>{copying ? 'Copying Schedule...' : (isTomorrow ? "Copy Today's Schedule" : "Copy Previous Day Schedule")}</span>
            </button>
          )}
          {dateContext === 'future' && (
            <button
              onClick={() => {
                setClassToEdit(null)
                setShowAddClass(true)
              }}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-surface-container-high text-on-surface text-[14px] font-semibold shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">calendar_add_on</span>
              <span>Schedule Class</span>
            </button>
          )}
        </div>
      )}

      {copyMessage && (
        <div className="mt-3 p-3 rounded-xl bg-error-container text-on-error-container text-[13px] text-center">
          {copyMessage}
        </div>
      )}
        </div>
      </div>

      <AnimatePresence>
      {showDatePicker && (
        <DatePickerModal
          isOpen={showDatePicker}
          selectedDate={selectedDate}
          onSelectDate={(newDate) => setSelectedDate(newDate)}
          onClose={() => setShowDatePicker(false)}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showAddClass && (
        <AddClassModal
          key={classToEdit ? classToEdit.id : 'new'}
          onClose={() => {
            setShowAddClass(false)
            setClassToEdit(null)
          }}
          onSaved={() => fetchClasses(selectedDate)}
          defaultDate={selectedDate}
          mode={dateContext === 'future' ? 'schedule' : 'log'}
          classToEdit={classToEdit}
        />
      )}
      </AnimatePresence>

      {/* Delete Scheduled Class Confirmation Popup */}
      <AnimatePresence>
      {classToDelete && createPortal(
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => !deletingId && setClassToDelete(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-[26px]">delete_forever</span>
            </div>

            <h3 className="text-[18px] font-bold text-on-surface text-center mb-2">
              Delete Class?
            </h3>

            <p className="text-[13px] text-on-surface-variant text-center mb-6 leading-relaxed">
              Are you sure you want to delete this class for{' '}
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
          </motion.div>
        </motion.div>,
        document.body
      )}
      </AnimatePresence>

      <AnimatePresence>
      {classToMarkDone && (
        <MarkDoneConfirmModal
          onClose={() => setClassToMarkDone(null)}
          onConfirm={() => confirmMarkDone(classToMarkDone.id)}
          onCollectPayment={() => {
            setClassToCollectPayment(classToMarkDone)
            setClassToMarkDone(null)
          }}
          confirming={markingDone === classToMarkDone.id}
          studentName={classToMarkDone.full_name}
          classLabel={`Class ${classToMarkDone.classes_completed + 1} of ${classToMarkDone.package_classes}`}
          timeLabel={classToMarkDone.start_time ? `${formatTime(classToMarkDone.start_time)} – ${formatTime(classToMarkDone.end_time)}` : ''}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {classToCollectPayment && (
        <AddPaymentModal
          onClose={() => setClassToCollectPayment(null)}
          onSaved={async () => {
            invalidateCustomerCache()
            await fetchClasses(selectedDate)
            showToast('Payment collected & class marked done')
          }}
          customerId={classToCollectPayment.customer_id}
          customerName={classToCollectPayment.full_name}
          amountPending={classToCollectPayment.amount_pending}
          classId={classToCollectPayment.id}
        />
      )}
      </AnimatePresence>
    </div>
  )
}
