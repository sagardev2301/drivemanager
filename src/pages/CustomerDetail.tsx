import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { CustomerSummary, Class, Payment } from '../lib/supabase'
import AddClassModal from '../components/AddClassModal'
import AddPaymentModal from '../components/AddPaymentModal'
import AddCustomerModal from '../components/AddCustomerModal'
import { Header, BottomNav } from '../components/Layout'
import { toLocalDateString } from '../lib/dateUtils'
import { invalidateCustomerCache } from '../lib/customerCache'
import { useModalBackButton } from '../hooks/useModalBackButton'
import { backdropVariants } from '../lib/motionPresets'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerSummary | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddClass, setShowAddClass] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showEditCustomer, setShowEditCustomer] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showCourseStatusConfirm, setShowCourseStatusConfirm] = useState(false)
  const { requestClose: requestCloseCourseStatusConfirm } = useModalBackButton(
    showCourseStatusConfirm,
    () => setShowCourseStatusConfirm(false)
  )

  async function fetchAll(showLoading = true) {
    if (!id) return
    if (showLoading) setLoading(true)
    const [{ data: sumData }, { data: classData }, { data: payData }, { data: custData }] = await Promise.all([
      supabase.from('customer_summary').select('*').eq('customer_id', id).single(),
      supabase.from('classes').select('*').eq('customer_id', id).order('class_date', { ascending: false }).order('start_time', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('customers').select('location').eq('id', id).single(),
    ])
    if (sumData) setCustomer({ ...sumData, location: custData?.location ?? null })
    if (classData) setClasses(classData)
    if (payData) setPayments(payData)
    setLoading(false)
  }

  async function handleToggleCourseStatus() {
    if (!id || !customer || updatingStatus) return
    const isCompleted = customer.course_status === 'completed'
    const targetStatus = isCompleted ? 'active' : 'completed'

    requestCloseCourseStatusConfirm()
    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('customers')
        .update({ course_status: targetStatus })
        .eq('id', id)

      if (error) {
        alert('Failed to update course status: ' + error.message)
      } else {
        invalidateCustomerCache()
        await fetchAll(false)
      }
    } catch {
      alert('Error updating course status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  useEffect(() => { fetchAll() }, [id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header title="Customer Profile" showBack onBack={() => navigate(-1)} />
        <div className="flex flex-col w-full px-4 pt-14 pb-24 space-y-3 pt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm animate-pulse h-24" />
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header title="Customer Profile" showBack onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center flex-1 px-4 pt-20">
          <span className="material-symbols-outlined text-outline text-[48px]">person_off</span>
          <p className="text-[14px] text-on-surface-variant mt-2">Customer not found</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const attendancePct = customer.package_classes > 0
    ? (customer.classes_completed / customer.package_classes) * 100
    : 0
  const feePct = customer.total_fee > 0
    ? (customer.amount_paid / customer.total_fee) * 100
    : 0

  const courseStatusBadgeClass: Record<string, string> = {
    active:    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed/50 text-[12px] font-semibold text-tertiary',
    completed: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed/50 text-[12px] font-semibold text-tertiary',
    dropped:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed/50 text-[12px] font-semibold text-error',
  }

  const classStatusBadge = (status: string) => {
    if (status === 'done') return <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary text-[12px] font-semibold">Done</span>
    if (status === 'cancelled') return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">Cancelled</span>
    if (status === 'not_completed') return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">Not Completed</span>
    return <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[12px]">Scheduled</span>
  }

  const payModeLabel: Record<string, string> = {
    cash: 'Cash', upi: 'UPI / GPay', card: 'Card', netbank: 'Net Banking', other: 'Other'
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Customer Profile" showBack onBack={() => navigate(-1)} />
      <main className="flex flex-col w-full px-4 pt-14 pb-24 bg-background min-h-screen">
        <div className="flex flex-col w-full pb-8">
          {/* Back + Status */}
          <div className="flex items-center justify-between py-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-primary text-[14px] font-semibold py-1 -ml-1 transition-opacity active:opacity-70"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              <span>Customers</span>
            </button>
            <span className={courseStatusBadgeClass[customer.course_status] ?? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed/50 text-[12px] font-semibold text-on-surface-variant'}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {customer.course_status.charAt(0).toUpperCase() + customer.course_status.slice(1)} • Class {customer.classes_completed}/{customer.package_classes}
            </span>
          </div>

          {/* Profile Card */}
          <div className="w-full bg-white rounded-xl shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center text-[16px] font-semibold shrink-0">
                  {getInitials(customer.full_name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[20px] font-semibold text-on-surface truncate">{customer.full_name}</h2>
                  <p className="text-[13px] text-on-surface-variant">Enrolled {formatDate(customer.enrollment_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditCustomer(true)}
                  aria-label={`Edit ${customer.full_name}`}
                  title="Edit customer details"
                  className="w-9 h-9 rounded-full bg-surface-container text-primary hover:bg-surface-container-high flex items-center justify-center active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <a
                  aria-label={`Call ${customer.full_name}`}
                  href={`tel:${customer.phone_number}`}
                  className="w-9 h-9 rounded-full bg-surface-container-high text-primary flex items-center justify-center active:scale-95 transition-transform"
                  title={`Call ${customer.full_name}`}
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between text-[13px] text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-outline">phone_iphone</span>
                <span className="font-semibold text-on-surface">{customer.phone_number}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-[11px] text-on-surface-variant">{customer.package_classes}-Class Package</span>
            </div>
            {customer.location && (
              <div className="flex items-center gap-1.5 mt-2 text-[13px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                <span className="text-on-surface-variant">{customer.location}</span>
              </div>
            )}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Attendance */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">Attendance</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[26px] font-bold text-on-surface leading-[32px]">{customer.classes_completed}</span>
                  <span className="text-[13px] text-on-surface-variant">/ {customer.package_classes} Done</span>
                </div>
              </div>
              <div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${attendancePct}%` }} />
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium">{customer.classes_remaining} Remaining</p>
              </div>
            </div>

            {/* Balance */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">Balance</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[26px] font-bold text-on-surface leading-[32px]">₹{customer.amount_pending.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-tertiary h-full rounded-full" style={{ width: `${feePct}%` }} />
                </div>
                <p className={customer.amount_pending > 0 ? 'text-[11px] font-semibold text-primary' : 'text-[11px] font-semibold text-tertiary'}>
                  {customer.amount_pending > 0 ? `₹${customer.amount_paid.toLocaleString('en-IN')} of ₹${customer.total_fee.toLocaleString('en-IN')} Paid` : 'Fully Paid'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons (50% / 50%) */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setShowAddClass(true)}
              className="h-11 bg-primary text-on-primary rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform px-2"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span className="truncate">Log Class for {customer.full_name.split(' ')[0]}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCourseStatusConfirm(true)}
              disabled={updatingStatus}
              title={customer.course_status === 'completed' ? 'Course marked as completed (click to reactivate)' : 'Mark course as completed'}
              className={`h-11 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform px-2 disabled:opacity-60 ${
                customer.course_status === 'completed'
                  ? 'bg-tertiary-fixed/30 text-tertiary border border-tertiary-fixed-dim'
                  : 'bg-tertiary text-on-tertiary hover:bg-tertiary-container'
              }`}
            >
              {updatingStatus ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              ) : customer.course_status === 'completed' ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="truncate">Completed</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span className="truncate">Complete Course</span>
                </>
              )}
            </button>
          </div>

          {/* Payment History (Above Class History) */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-semibold text-on-surface">Payment History</h3>
              <span className="text-[11px] text-on-surface-variant">Total: ₹{customer.total_fee.toLocaleString('en-IN')}</span>
            </div>
            {payments.length === 0 && customer.amount_pending <= 0 ? (
              <p className="text-[13px] text-on-surface-variant text-center py-2">No payments recorded</p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Remaining pending balance stays at TOP */}
                {customer.amount_pending > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container-highest">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-primary">₹{customer.amount_pending.toLocaleString('en-IN')} Remaining</p>
                        <p className="text-[11px] text-on-surface-variant">Pending balance</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="h-9 px-3.5 rounded-xl bg-primary text-on-primary text-[12px] font-semibold active:scale-95 shadow-sm flex items-center gap-1 hover:bg-primary-container transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      <span>Collect</span>
                    </button>
                  </div>
                )}

                {/* Collected payment transactions */}
                {payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-on-surface">₹{pay.amount.toLocaleString('en-IN')} Paid</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {formatDate(pay.created_at)} • {payModeLabel[pay.payment_mode] ?? pay.payment_mode}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class History */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-on-surface">Class History</h3>
              <span className="text-[11px] text-on-surface-variant">{customer.classes_completed} of {customer.package_classes} Completed</span>
            </div>
            {classes.length === 0 ? (
              <p className="text-[13px] text-on-surface-variant text-center py-2">No classes logged yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {classes.map((cls, i) => (
                  <div key={cls.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container">
                    <div className="flex items-center gap-3">
                      <div className={cls.status === 'done' ? 'w-8 h-8 rounded-full flex items-center justify-center bg-tertiary-fixed/30 text-tertiary' : 'w-8 h-8 rounded-full flex items-center justify-center bg-primary-fixed text-on-surface-variant'}>
                        <span className="material-symbols-outlined text-[18px]">{cls.status === 'done' ? 'check' : 'schedule'}</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-on-surface">Class {classes.length - i}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {formatDate(cls.class_date)}{cls.start_time ? ` • ${formatTime(cls.start_time)}` : ''}
                        </p>
                      </div>
                    </div>
                    {classStatusBadge(cls.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddClass && (
          <AddClassModal
            onClose={() => setShowAddClass(false)}
            onSaved={fetchAll}
            defaultCustomerId={id}
            defaultDate={toLocalDateString(new Date())}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddPayment && (
          <AddPaymentModal
            onClose={() => setShowAddPayment(false)}
            onSaved={fetchAll}
            customerId={id!}
            customerName={customer.full_name}
            amountPending={customer.amount_pending}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCourseStatusConfirm && customer && createPortal(
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={requestCloseCourseStatusConfirm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl bg-tertiary-fixed/30 text-tertiary flex items-center justify-center mb-4 mx-auto">
                <span className="material-symbols-outlined text-[26px]">
                  {customer.course_status === 'completed' ? 'restart_alt' : 'task_alt'}
                </span>
              </div>

              <h3 className="text-[18px] font-bold text-on-surface text-center mb-2">
                {customer.course_status === 'completed' ? 'Reactivate Course?' : 'Complete Course?'}
              </h3>

              <p className="text-[13px] text-on-surface-variant text-center mb-6 leading-relaxed">
                {customer.course_status === 'completed' ? (
                  <>Reactivate the course for <span className="font-semibold text-on-surface">{customer.full_name}</span>? They'll show as active again.</>
                ) : (
                  <>Mark the course as completed for <span className="font-semibold text-on-surface">{customer.full_name}</span>? This updates their status to Completed.</>
                )}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={requestCloseCourseStatusConfirm}
                  disabled={updatingStatus}
                  className="flex-1 h-11 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-[14px] hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleCourseStatus}
                  disabled={updatingStatus}
                  className="flex-1 h-11 rounded-xl bg-tertiary text-on-tertiary font-semibold text-[14px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
                >
                  {updatingStatus ? (
                    <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">check_circle</span>Confirm</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditCustomer && customer && (
          <AddCustomerModal
            customer={{
              id: customer.customer_id,
              full_name: customer.full_name,
              phone_number: customer.phone_number,
              package_classes: customer.package_classes,
              total_fee: customer.total_fee,
              enrollment_date: customer.enrollment_date,
              course_status: customer.course_status,
              location: customer.location,
              classes_completed: customer.classes_completed,
            }}
            onClose={() => setShowEditCustomer(false)}
            onSaved={fetchAll}
          />
        )}
      </AnimatePresence>
      <BottomNav />
    </div>
  )
}
