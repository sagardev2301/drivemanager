import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CustomerSummary, Class, Payment } from '../lib/supabase'
import AddClassModal from '../components/AddClassModal'
import AddPaymentModal from '../components/AddPaymentModal'
import { Header } from '../components/Layout'

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

  async function fetchAll() {
    if (!id) return
    setLoading(true)
    const [{ data: sumData }, { data: classData }, { data: payData }] = await Promise.all([
      supabase.from('customer_summary').select('*').eq('customer_id', id).single(),
      supabase.from('classes').select('*').eq('customer_id', id).order('class_date', { ascending: false }).order('start_time', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ])
    if (sumData) setCustomer(sumData)
    if (classData) setClasses(classData)
    if (payData) setPayments(payData)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f9f9ff]">
        <Header title="Customer Profile" showBack onBack={() => navigate(-1)} />
        <div className="flex flex-col w-full px-4 pt-14 pb-24 space-y-3 pt-6">
          {[1,2,3].map(i => <div key={i} className="bg-white p-4 rounded-2xl shadow-sm animate-pulse h-24" />)}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f9f9ff]">
        <Header title="Customer Profile" showBack onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center flex-1 px-4 pt-20">
          <span className="material-symbols-outlined text-[#737686] text-[48px]">person_off</span>
          <p className="text-[14px] text-[#434654] mt-2">Customer not found</p>
        </div>
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
    active:    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e9edff]/50 text-[12px] font-semibold text-[#005623]',
    completed: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e9edff]/50 text-[12px] font-semibold text-[#005623]',
    dropped:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e9edff]/50 text-[12px] font-semibold text-[#ba1a1a]',
  }

  const classStatusBadge = (status: string) => {
    if (status === 'done') return <span className="px-2 py-0.5 rounded-full bg-[#6bff8f]/30 text-[#005623] text-[12px] font-semibold">Done</span>
    if (status === 'cancelled') return <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold">Cancelled</span>
    if (status === 'not_completed') return <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold">Not Done</span>
    return <span className="px-2 py-0.5 rounded-full bg-[#e1e8fd] text-[#434654] text-[12px]">Scheduled</span>
  }

  const payModeLabel: Record<string, string> = {
    cash: 'Cash', upi: 'UPI / GPay', card: 'Card', netbank: 'Net Banking', other: 'Other'
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9ff]">
      <Header title="Customer Profile" showBack onBack={() => navigate(-1)} />
      <main className="flex flex-col w-full px-4 pt-14 pb-24 bg-[#f9f9ff] min-h-screen">
        <div className="flex flex-col w-full pb-8">
          {/* Back + Status */}
          <div className="flex items-center justify-between py-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-[#003fb1] text-[14px] font-semibold py-1 -ml-1 transition-opacity active:opacity-70"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              <span>Customers</span>
            </button>
            <span className={courseStatusBadgeClass[customer.course_status] ?? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e9edff]/50 text-[12px] font-semibold text-[#434654]'}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {customer.course_status.charAt(0).toUpperCase() + customer.course_status.slice(1)} • Class {customer.classes_completed}/{customer.package_classes}
            </span>
          </div>

          {/* Profile Card */}
          <div className="w-full bg-white rounded-2xl shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#1a56db] text-white flex items-center justify-center text-[16px] font-semibold shrink-0">
                  {getInitials(customer.full_name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[20px] font-semibold text-[#141b2b] truncate">{customer.full_name}</h2>
                  <p className="text-[13px] text-[#434654]">Enrolled {formatDate(customer.enrollment_date)}</p>
                </div>
              </div>
              <a
                aria-label={`Call ${customer.full_name}`}
                href={`tel:${customer.phone_number}`}
                className="w-10 h-10 rounded-full bg-[#e1e8fd] text-[#003fb1] flex items-center justify-center active:scale-95 transition-transform shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
              </a>
            </div>
            <div className="flex items-center justify-between text-[13px] text-[#434654]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#737686]">phone_iphone</span>
                <span className="font-semibold text-[#141b2b]">{customer.phone_number}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#e9edff] text-[11px] text-[#434654]">{customer.package_classes}-Class Package</span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Attendance */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#434654] uppercase tracking-wider">Attendance</span>
                  <span className="material-symbols-outlined text-[18px] text-[#003fb1]">schedule</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[26px] font-bold text-[#141b2b] leading-[32px]">{customer.classes_completed}</span>
                  <span className="text-[13px] text-[#434654]">/ {customer.package_classes} Done</span>
                </div>
              </div>
              <div>
                <div className="w-full bg-[#e1e8fd] h-2 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-[#003fb1] h-full rounded-full transition-all duration-500" style={{ width: `${attendancePct}%` }} />
                </div>
                <p className="text-[11px] text-[#434654] font-medium">{customer.classes_remaining} Remaining</p>
              </div>
            </div>

            {/* Balance */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#434654] uppercase tracking-wider">Balance</span>
                  <span className="material-symbols-outlined text-[18px] text-[#3858b6]">payments</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[26px] font-bold text-[#141b2b] leading-[32px]">₹{customer.amount_paid.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div>
                <div className="w-full bg-[#e1e8fd] h-2 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-[#007130] h-full rounded-full" style={{ width: `${feePct}%` }} />
                </div>
                <p className={customer.amount_pending > 0 ? 'text-[11px] font-semibold text-[#1a3f9c]' : 'text-[11px] font-semibold text-[#005623]'}>
                  {customer.amount_pending > 0 ? `₹${customer.amount_pending.toLocaleString('en-IN')} Pending` : 'Fully Paid'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mb-4">
            <button
              onClick={() => setShowAddClass(true)}
              className="w-full h-12 bg-[#003fb1] text-white rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Log Class for {customer.full_name.split(' ')[0]}</span>
            </button>
            <button
              onClick={() => setShowAddPayment(true)}
              className="w-full h-11 bg-white text-[#003fb1] rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm active:bg-[#f1f3ff] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
              <span>Record Payment</span>
            </button>
          </div>

          {/* Class History */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[#141b2b]">Class History</h3>
              <span className="text-[11px] text-[#434654]">{customer.classes_completed} of {customer.package_classes} Completed</span>
            </div>
            {classes.length === 0 ? (
              <p className="text-[13px] text-[#434654] text-center py-2">No classes logged yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {classes.map((cls, i) => (
                  <div key={cls.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#f1f3ff]">
                    <div className="flex items-center gap-3">
                      <div className={cls.status === 'done' ? 'w-8 h-8 rounded-full flex items-center justify-center bg-[#6bff8f]/20 text-[#005623]' : 'w-8 h-8 rounded-full flex items-center justify-center bg-[#e9edff] text-[#434654]'}>
                        <span className="material-symbols-outlined text-[18px]">{cls.status === 'done' ? 'check' : 'schedule'}</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#141b2b]">Class {classes.length - i}</p>
                        <p className="text-[11px] text-[#434654]">
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

          {/* Payment History */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[#141b2b]">Payment History</h3>
              <span className="text-[11px] text-[#434654]">Total: ₹{customer.total_fee.toLocaleString('en-IN')}</span>
            </div>
            {payments.length === 0 && customer.amount_pending <= 0 ? (
              <p className="text-[13px] text-[#434654] text-center py-2">No payments recorded</p>
            ) : (
              <div className="flex flex-col gap-2">
                {payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#f1f3ff]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#dbe1ff] text-[#003fb1] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#141b2b]">₹{pay.amount.toLocaleString('en-IN')} Paid</p>
                        <p className="text-[11px] text-[#434654]">
                          {formatDate(pay.created_at)} • {payModeLabel[pay.payment_mode] ?? pay.payment_mode}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {customer.amount_pending > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#b5c4ff]/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#b5c4ff]/30 text-[#1a3f9c] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#1a3f9c]">₹{customer.amount_pending.toLocaleString('en-IN')} Remaining</p>
                        <p className="text-[11px] text-[#434654]">Pending balance</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="px-2.5 py-1 rounded-md bg-white text-[#003fb1] text-[12px] font-semibold active:scale-95 shadow-sm"
                    >
                      Pay Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onSaved={fetchAll}
          defaultCustomerId={id}
          defaultDate={new Date().toISOString().split('T')[0]}
        />
      )}
      {showAddPayment && (
        <AddPaymentModal
          onClose={() => setShowAddPayment(false)}
          onSaved={fetchAll}
          customerId={id!}
          customerName={customer.full_name}
          amountPending={customer.amount_pending}
        />
      )}
    </div>
  )
}

