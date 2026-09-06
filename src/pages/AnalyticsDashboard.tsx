import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CustomerSummary } from '../lib/supabase'
import CustomerActionSheet from '../components/CustomerActionSheet'

function getInitials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-[#e1e8fd] rounded animate-pulse ${className}`} />
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CustomerSummary | null>(null)

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('customer_summary')
      .select('*')
    if (data) setSummary(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // Aggregates
  const totalEnrolled = summary.length
  const activeCount = summary.filter(s => s.course_status === 'active').length
  const completedCount = summary.filter(s => s.course_status === 'completed').length
  const droppedCount = summary.filter(s => s.course_status === 'dropped').length
  const totalFee = summary.reduce((acc, s) => acc + s.total_fee, 0)
  const totalCollected = summary.reduce((acc, s) => acc + s.amount_paid, 0)
  const totalPending = summary.reduce((acc, s) => acc + s.amount_pending, 0)
  const studentsWithPending = summary.filter(s => s.amount_pending > 0).length
  const totalClassesDone = summary.reduce((acc, s) => acc + s.classes_completed, 0)
  const collectionPct = totalFee > 0 ? Math.round((totalCollected / totalFee) * 100) : 0

  // Recent enrollments: sort by enrollment_date desc, take 5
  const recentEnrollments = [...summary]
    .sort((a, b) => new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime())
    .slice(0, 5)

  return (
    <div className="flex flex-col w-full pb-6 space-y-4 pt-4">

      {/* Page title */}
      <div className="flex items-center gap-2 px-0.5">
        <h1 className="text-[20px] font-bold text-[#141b2b]">School Overview</h1>
        <span className="material-symbols-outlined text-[#003fb1] text-[20px]">bar_chart</span>
      </div>
      <p className="text-[13px] text-[#434654] -mt-3 px-0.5">Lifetime performance at a glance.</p>

      {/* Total Enrolled card */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[#434654] uppercase tracking-wider">Total Enrolled</span>
          <span className="material-symbols-outlined text-[#003fb1] text-[20px]">groups</span>
        </div>
        {loading
          ? <Skeleton className="h-9 w-20 mt-2 mb-3" />
          : <p className="text-[34px] font-bold text-[#141b2b] leading-tight mt-1">{totalEnrolled}</p>
        }
        <p className="text-[12px] text-[#434654] mb-3">Cumulative learners</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#6bff8f]/20 text-[#005623] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            {loading ? '—' : activeCount} Active
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e9edff] text-[#434654] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#737686]" />
            {loading ? '—' : completedCount} Completed
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            {loading ? '—' : droppedCount} Dropped
          </span>
        </div>
      </div>

      {/* Fee Collection card */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[#434654] uppercase tracking-wider">Fee Collection</span>
          <span className="material-symbols-outlined text-[#005623] text-[20px]">account_balance_wallet</span>
        </div>
        {loading
          ? <Skeleton className="h-9 w-36 mt-2 mb-1" />
          : <p className="text-[28px] font-bold text-[#005623] leading-tight mt-1">
              ₹{totalCollected.toLocaleString('en-IN')}
            </p>
        }
        <p className="text-[12px] text-[#434654] mb-3">Total collected so far</p>

        {/* Progress bar */}
        <div className="flex items-center justify-between text-[11px] text-[#434654] mb-1">
          <span>Collection Ratio</span>
          <span className="font-semibold text-[#005623]">{loading ? '—' : `${collectionPct}% settled`}</span>
        </div>
        <div className="w-full bg-[#e1e8fd] h-2 rounded-full overflow-hidden mb-3">
          <div
            className="bg-[#005623] h-full rounded-full transition-all duration-700"
            style={{ width: `${collectionPct}%` }}
          />
        </div>

        {/* Pending alert */}
        {!loading && totalPending > 0 && (
          <div className="flex items-center gap-2 bg-[#fff1f0] px-3 py-2 rounded-xl">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[16px]">error</span>
            <p className="text-[12px] text-[#ba1a1a] font-semibold">
              ₹{totalPending.toLocaleString('en-IN')} still pending from {studentsWithPending} students
            </p>
          </div>
        )}
      </div>

      {/* 2x2 KPI grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#434654] uppercase tracking-wider">Completed</span>
            <span className="material-symbols-outlined text-[#005623] text-[18px]">school</span>
          </div>
          {loading ? <Skeleton className="h-8 w-12 mt-2" /> : (
            <p className="text-[26px] font-bold text-[#005623] mt-1">{completedCount}</p>
          )}
          <p className="text-[11px] text-[#434654] mt-1">Course finished</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#434654] uppercase tracking-wider">Active</span>
            <span className="material-symbols-outlined text-[#003fb1] text-[18px]">person_play</span>
          </div>
          {loading ? <Skeleton className="h-8 w-10 mt-2" /> : (
            <p className="text-[26px] font-bold text-[#003fb1] mt-1">{activeCount}</p>
          )}
          <p className="text-[11px] text-[#434654] mt-1">Currently learning</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#434654] uppercase tracking-wider">Classes Done</span>
            <span className="material-symbols-outlined text-[#005623] text-[18px]">task_alt</span>
          </div>
          {loading ? <Skeleton className="h-8 w-16 mt-2" /> : (
            <p className="text-[26px] font-bold text-[#141b2b] mt-1">{totalClassesDone.toLocaleString('en-IN')}</p>
          )}
          <p className="text-[11px] text-[#434654] mt-1">Total completed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#434654] uppercase tracking-wider">Fee Pending</span>
            <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">pending_actions</span>
          </div>
          {loading ? <Skeleton className="h-8 w-20 mt-2" /> : (
            <p className="text-[22px] font-bold text-[#ba1a1a] mt-1">
              ₹{(totalPending / 100000).toFixed(1)}L
            </p>
          )}
          <p className="text-[11px] text-[#434654] mt-1">From {studentsWithPending} students</p>
        </div>
      </div>

      {/* Recent Enrollments */}
      <div>
        <div className="flex items-center justify-between px-0.5 mb-3">
          <h2 className="text-[16px] font-semibold text-[#141b2b]">Recent Enrollments</h2>
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-0.5 text-[13px] text-[#003fb1] font-semibold hover:underline"
          >
            View All
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading
            ? [1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#f1f3ff]">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))
            : recentEnrollments.map((customer, idx) => (
                <button
                  key={customer.customer_id}
                  onClick={() => setSelected(customer)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#f1f3ff] transition-colors ${
                    idx < recentEnrollments.length - 1 ? 'border-b border-[#f1f3ff]' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#003fb1] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                    {getInitials(customer.full_name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#141b2b] truncate">{customer.full_name}</p>
                    <p className="text-[11px] text-[#434654]">{customer.phone_number}</p>
                    <p className="text-[11px] text-[#737686]">Enrolled {formatDate(customer.enrollment_date)}</p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {customer.amount_pending > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-semibold">
                        ₹{customer.amount_pending.toLocaleString('en-IN')} Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#6bff8f]/30 text-[#005623] text-[11px] font-semibold">
                        Paid
                      </span>
                    )}
                    <p className="text-[11px] text-[#434654]">
                      {customer.classes_completed} / {customer.package_classes} classes
                    </p>
                  </div>

                  <span className="material-symbols-outlined text-[18px] text-[#737686]">chevron_right</span>
                </button>
              ))
          }
        </div>
      </div>

      {/* Pending Payments banner */}
      <div>
        <div className="flex items-center justify-between px-0.5 mb-3">
          <h2 className="text-[16px] font-semibold text-[#141b2b]">Pending Payments</h2>
          {!loading && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#003fb1] text-white text-[12px] font-bold">
              {studentsWithPending}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fff1f0] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">warning</span>
          </div>
          <div className="flex-1 min-w-0">
            {loading
              ? <Skeleton className="h-4 w-40 mb-1" />
              : <p className="text-[14px] font-bold text-[#141b2b]">
                  ₹{totalPending.toLocaleString('en-IN')} total outstanding
                </p>
            }
            <p className="text-[11px] text-[#434654]">Pending from {loading ? '—' : studentsWithPending} students</p>
          </div>
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#003fb1] text-white text-[13px] font-semibold active:scale-95 transition-all shrink-0 shadow-sm"
          >
            Collect
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Customer action sheet */}
      {selected && (
        <CustomerActionSheet
          customer={selected}
          onClose={() => setSelected(null)}
          onPaymentSaved={fetchData}
        />
      )}
    </div>
  )
}
