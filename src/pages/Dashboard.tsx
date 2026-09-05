import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CustomerSummary, Class } from '../lib/supabase'
import AddCustomerModal from '../components/AddCustomerModal'
import AddClassModal from '../components/AddClassModal'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CustomerSummary[]>([])
  const [todayClasses, setTodayClasses] = useState<(Class & { full_name: string; classes_completed: number; package_classes: number; amount_pending: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [markingDone, setMarkingDone] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  async function fetchData() {
    setLoading(true)
    const [{ data: sumData }, { data: classData }] = await Promise.all([
      supabase.from('customer_summary').select('*'),
      supabase
        .from('classes')
        .select('*, customers(full_name, phone_number, package_classes)')
        .eq('class_date', today)
        .in('status', ['scheduled', 'done', 'not_completed'])
        .order('start_time', { ascending: true }),
    ])

    if (sumData) setSummary(sumData)

    if (classData) {
      const enriched = classData.map((c: any) => ({
        ...c,
        full_name: c.customers?.full_name ?? 'Unknown',
        package_classes: c.customers?.package_classes ?? 0,
        classes_completed: sumData?.find((s: CustomerSummary) => s.customer_id === c.customer_id)?.classes_completed ?? 0,
        amount_pending: sumData?.find((s: CustomerSummary) => s.customer_id === c.customer_id)?.amount_pending ?? 0,
      }))
      setTodayClasses(enriched)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [today])

  // KPIs
  const totalEnrolled = summary.length
  const activeCount = summary.filter(s => s.course_status === 'active').length
  const classesLeftToday = todayClasses.filter(c => c.status === 'scheduled').length
  const totalFeePending = summary.reduce((acc, s) => acc + (s.amount_pending || 0), 0)
  const studentsWithPending = summary.filter(s => s.amount_pending > 0).length

  async function markDone(classId: string) {
    setMarkingDone(classId)
    await supabase.from('classes').update({ status: 'done' }).eq('id', classId)
    await fetchData()
    setMarkingDone(null)
  }

  const statusBadge = (status: string) => {
    if (status === 'done') return <span className="px-2 py-1 rounded-full bg-[#6bff8f]/40 text-[#005623] text-[12px] font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span>Done</span>
    return <span className="px-2 py-1 rounded-full bg-[#dbe1ff] text-[#00164d] text-[12px] font-semibold">Scheduled</span>
  }

  return (
    <div className="flex flex-col w-full pb-6 space-y-4 pt-4">
      {/* Greeting Banner */}
      <div className="flex flex-col bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#434654] uppercase tracking-wider">{todayDisplay}</span>
            <h1 className="text-[20px] font-semibold text-[#141b2b] mt-0.5">{getGreeting()}</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#e1e8fd] flex items-center justify-center text-[#003fb1]">
            <span className="material-symbols-outlined text-[24px]">wb_sunny</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 bg-[#f1f3ff] px-3 py-2 rounded-lg">
          <span className="material-symbols-outlined text-[#003fb1] text-[18px]">verified</span>
          <span className="text-[13px] text-[#434654]">{todayClasses.length} driving sessions scheduled for today</span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center justify-center gap-2 bg-[#003fb1] text-white py-3 px-4 rounded-lg shadow-sm active:scale-95 transition-transform duration-150"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span className="text-[14px] font-semibold">Enroll Learner</span>
        </button>
        <button
          onClick={() => setShowAddClass(true)}
          className="flex items-center justify-center gap-2 bg-[#dce2f7] text-[#003fb1] py-3 px-4 rounded-lg active:scale-95 transition-transform duration-150"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span className="text-[14px] font-semibold">Log a Class</span>
        </button>
      </div>

      {/* KPI Cards 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total Enrolled */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#434654]">
            <span className="text-[11px] uppercase tracking-wide">Total Enrolled</span>
            <span className="material-symbols-outlined text-[#003fb1] text-[18px]">groups</span>
          </div>
          <div className="mt-3">
            {loading ? <div className="h-8 bg-[#e9edff] rounded animate-pulse w-12" /> :
              <span className="text-[26px] font-bold text-[#141b2b] leading-[32px]">{totalEnrolled}</span>}
            <span className="block text-[11px] text-[#434654] mt-1">Cumulative total</span>
          </div>
        </div>

        {/* Active */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#434654]">
            <span className="text-[11px] uppercase tracking-wide">Active</span>
            <span className="material-symbols-outlined text-[#3858b6] text-[18px]">person_play</span>
          </div>
          <div className="mt-3">
            {loading ? <div className="h-8 bg-[#e9edff] rounded animate-pulse w-10" /> :
              <span className="text-[26px] font-bold text-[#141b2b] leading-[32px]">{activeCount}</span>}
            <span className="block text-[11px] text-[#434654] mt-1">Currently learning</span>
          </div>
        </div>

        {/* Classes Left Today */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#434654]">
            <span className="text-[11px] uppercase tracking-wide">Classes Today</span>
            <span className="material-symbols-outlined text-[#005623] text-[18px]">calendar_today</span>
          </div>
          <div className="mt-3">
            {loading ? <div className="h-8 bg-[#e9edff] rounded animate-pulse w-16" /> :
              <span className="text-[26px] font-bold text-[#141b2b] leading-[32px]">{classesLeftToday} Left</span>}
            <span className="block text-[11px] text-[#434654] mt-1">
              {todayClasses.filter(c => c.status === 'done').length} completed
            </span>
          </div>
        </div>

        {/* Fee Pending */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#434654]">
            <span className="text-[11px] uppercase tracking-wide">Fee Pending</span>
            <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">pending_actions</span>
          </div>
          <div className="mt-3">
            {loading ? <div className="h-8 bg-[#e9edff] rounded animate-pulse w-20" /> :
              <span className="text-[26px] font-bold text-[#ba1a1a] leading-[32px]">₹{totalFeePending.toLocaleString('en-IN')}</span>}
            <span className="block text-[11px] text-[#434654] mt-1">From {studentsWithPending} students</span>
          </div>
        </div>
      </div>

      {/* Today's Classes */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between pt-1 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[#141b2b]">Today's Classes</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#e1e8fd] text-[#003fb1] text-[12px] font-semibold">{todayClasses.length}</span>
          </div>
          <button
            onClick={() => navigate('/attendance')}
            className="text-[13px] text-[#003fb1] flex items-center gap-0.5 hover:underline"
          >
            <span>Attendance</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm animate-pulse h-24" />
            ))}
          </div>
        )}

        {!loading && todayClasses.length === 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <span className="material-symbols-outlined text-[#737686] text-[32px]">event_busy</span>
            <p className="text-[14px] text-[#434654] mt-2">No classes scheduled for today</p>
          </div>
        )}

        {!loading && todayClasses.map(cls => (
          <div key={cls.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e1e8fd] flex items-center justify-center text-[16px] font-semibold text-[#003fb1]">
                  {getInitials(cls.full_name)}
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[14px] font-semibold text-[#141b2b] cursor-pointer hover:text-[#003fb1]"
                    onClick={() => navigate(`/customers/${cls.customer_id}`)}
                  >
                    {cls.full_name}
                  </span>
                  <span className="text-[11px] text-[#434654] mt-0.5">
                    Class {cls.classes_completed + (cls.status === 'done' ? 0 : 1)} of {cls.package_classes}
                  </span>
                </div>
              </div>
              {statusBadge(cls.status)}
            </div>

            {/* Time row */}
            <div className="flex items-center justify-between bg-[#f1f3ff] px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 text-[#434654]">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                <span className="text-[13px] font-medium text-[#141b2b]">
                  {cls.start_time ? formatTime(cls.start_time) : 'Time TBD'}
                </span>
              </div>
              {cls.amount_pending > 0 && (
                <span className="text-[11px] text-[#ba1a1a] font-semibold">
                  Fee Pending: ₹{cls.amount_pending.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Mark Done button */}
            {cls.status === 'scheduled' && (
              <button
                onClick={() => markDone(cls.id)}
                disabled={markingDone === cls.id}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#003fb1] text-white rounded-lg text-[14px] font-semibold active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
              >
                {markingDone === cls.id ? (
                  <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">check</span>Mark Done</>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {showAddCustomer && (
        <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSaved={fetchData} />
      )}
      {showAddClass && (
        <AddClassModal onClose={() => setShowAddClass(false)} onSaved={fetchData} defaultDate={today} />
      )}
    </div>
  )
}

