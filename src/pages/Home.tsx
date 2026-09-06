import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Class } from '../lib/supabase'
import AddCustomerModal from '../components/AddCustomerModal'
import AddClassModal from '../components/AddClassModal'
import { toLocalDateString, canMarkClassDone } from '../lib/dateUtils'
import { invalidateCustomerCache } from '../lib/customerCache'

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

function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false
  const trimmed = phone.trim()
  if (trimmed.length < 5) return false
  if (trimmed.toLowerCase().includes('nophone')) return false
  return /\d{5,}/.test(trimmed)
}

function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const fullNumber = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${fullNumber}`
}

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.08C19.42 7.64 20.28 9.7 20.28 11.9C20.28 16.44 16.58 20.14 12.04 20.14C10.56 20.14 9.11 19.74 7.84 18.99L7.54 18.81L4.42 19.63L5.25 16.59L5.05 16.28C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67ZM8.52 7.08C8.33 7.08 8.1 7.15 7.88 7.39C7.66 7.64 7.02 8.23 7.02 9.44C7.02 10.65 7.9 11.82 8.02 11.98C8.15 12.15 9.72 14.65 12.2 15.66C12.79 15.9 13.25 16.05 13.61 16.16C14.21 16.35 14.75 16.32 15.18 16.26C15.66 16.19 16.65 15.66 16.86 15.08C17.07 14.5 17.07 14.01 17.01 13.9C16.95 13.8 16.79 13.73 16.55 13.61C16.31 13.49 15.08 12.88 14.86 12.8C14.63 12.72 14.46 12.67 14.29 12.93C14.12 13.18 13.63 13.74 13.48 13.91C13.33 14.08 13.18 14.1 12.94 13.98C12.69 13.86 11.9 13.6 10.95 12.76C10.22 12.11 9.72 11.3 9.58 11.05C9.43 10.8 9.56 10.67 9.68 10.55C9.79 10.44 9.93 10.26 10.05 10.12C10.17 9.97 10.22 9.87 10.3 9.7C10.38 9.53 10.34 9.39 10.28 9.27C10.22 9.14 9.71 7.89 9.49 7.38C9.28 6.89 9.07 6.95 8.91 6.94L8.52 7.08Z"
      />
    </svg>
  )
}

function isClassOngoing(cls: { start_time: string | null; end_time?: string | null; status: string }): boolean {
  if (cls.status !== 'scheduled' || !cls.start_time) return false
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [sH, sM] = cls.start_time.split(':').map(Number)
  const startMinutes = sH * 60 + (sM || 0)

  let endMinutes: number
  if (cls.end_time) {
    const [eH, eM] = cls.end_time.split(':').map(Number)
    endMinutes = eH * 60 + (eM || 0)
  } else {
    endMinutes = startMinutes + 50
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes + 15
}

export default function Home() {
  const navigate = useNavigate()
  const [todayClasses, setTodayClasses] = useState<(Class & { full_name: string; phone_number: string; location: string | null; classes_completed: number; package_classes: number; amount_pending: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [markingDone, setMarkingDone] = useState<string | null>(null)

  const today = toLocalDateString(new Date())
  const todayDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  async function fetchData() {
    setLoading(true)
    const { data: classData } = await supabase
      .from('classes')
      .select('*, customers(full_name, phone_number, package_classes, location, customer_summary(classes_completed, amount_pending))')
      .eq('class_date', today)
      .in('status', ['scheduled', 'done', 'not_completed'])
      .order('start_time', { ascending: true })

    if (classData) {
      const enriched = classData.map((c: any) => ({
        ...c,
        full_name: c.customers?.full_name ?? 'Unknown',
        phone_number: c.customers?.phone_number ?? '',
        location: c.customers?.location ?? null,
        package_classes: c.customers?.package_classes ?? 0,
        classes_completed: c.customers?.customer_summary?.classes_completed ?? 0,
        amount_pending: c.customers?.customer_summary?.amount_pending ?? 0,
      }))
      setTodayClasses(enriched)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [today])

  // Periodic ticker to refresh ongoing status and locked time buttons
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // All scheduled classes ordered by start_time
  const scheduledClasses = todayClasses
    .filter(c => c.status === 'scheduled')
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  // Ongoing classes currently in session
  const ongoingClasses = scheduledClasses.filter(isClassOngoing)

  // Upcoming scheduled classes not currently ongoing
  const upcomingClasses = scheduledClasses.filter(c => !isClassOngoing(c))

  // Completed classes ordered by start_time
  const completedClasses = todayClasses
    .filter(c => c.status === 'done')
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  // Identify UP NEXT class in upcoming classes:
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const nextFutureClass = upcomingClasses.find(c => {
    if (!c.start_time) return false
    const [h, m] = c.start_time.split(':').map(Number)
    return (h * 60 + (m || 0)) > currentMinutes
  })
  const upNextId = nextFutureClass ? nextFutureClass.id : (upcomingClasses[0]?.id ?? null)


  async function markDone(classId: string) {
    setMarkingDone(classId)
    await supabase.from('classes').update({ status: 'done' }).eq('id', classId)
    invalidateCustomerCache()
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


      {/* Ongoing / Current Class Section */}
      {!loading && ongoingClasses.length > 0 && (
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between pt-1 px-0.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-[16px] font-semibold text-[#141b2b]">Ongoing Class</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[11px] font-bold uppercase tracking-wide">
                Live Now
              </span>
            </div>
          </div>

          {ongoingClasses.map(cls => {
            const hasPhone = isValidPhone(cls.phone_number)
            return (
              <div key={cls.id} className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200/80 flex flex-col space-y-3">
                {/* Header Pill */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold tracking-wide uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>CURRENT • {cls.start_time ? formatTime(cls.start_time) : ''}{cls.end_time ? ` - ${formatTime(cls.end_time)}` : ''}</span>
                  </div>
                  {cls.amount_pending > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[12px] font-semibold">
                      Due ₹{cls.amount_pending.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#003fb1] flex items-center justify-center text-[16px] font-bold text-white shadow-sm">
                      {getInitials(cls.full_name)}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="text-[15px] font-bold text-[#141b2b] cursor-pointer hover:text-[#003fb1]"
                        onClick={() => navigate(`/customers/${cls.customer_id}`)}
                      >
                        {cls.full_name}
                      </span>
                      <span className="text-[12px] text-[#434654] mt-0.5">
                        Class {cls.classes_completed + 1} of {cls.package_classes}
                        {cls.notes ? ` • ${cls.notes}` : ' • Practical Drive'}
                      </span>
                    </div>
                  </div>
                  {cls.location && (
                    <div className="flex items-center gap-0.5 text-[#434654] bg-[#f1f3ff] px-2 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-[14px] text-[#003fb1]">location_on</span>
                      <span className="text-[11px] font-medium max-w-[120px] truncate">{cls.location}</span>
                    </div>
                  )}
                </div>

                {/* Mark Done row with Call & WhatsApp */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => markDone(cls.id)}
                    disabled={markingDone === cls.id}
                    className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-[#003fb1] text-white rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
                  >
                    {markingDone === cls.id ? (
                      <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[20px]">check</span>Mark Done</>
                    )}
                  </button>

                  {/* Call button */}
                  {hasPhone ? (
                    <a
                      href={`tel:${cls.phone_number}`}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e9edff] text-[#003fb1] hover:bg-[#dbe1ff] active:scale-95 transition-all shrink-0 shadow-sm"
                      title={`Call ${cls.full_name}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">call</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#f1f3ff] text-[#737686] opacity-40 cursor-not-allowed shrink-0"
                      title="Phone number not available"
                    >
                      <span className="material-symbols-outlined text-[20px]">call</span>
                    </button>
                  )}

                  {/* WhatsApp button */}
                  {hasPhone ? (
                    <a
                      href={getWhatsAppUrl(cls.phone_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:scale-95 transition-all shrink-0 shadow-sm"
                      title={`WhatsApp ${cls.full_name}`}
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#f1f3ff] text-[#737686] opacity-40 cursor-not-allowed shrink-0"
                      title="Phone number not available"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Today's Classes */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between pt-1 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[#141b2b]">Today's Classes</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#e1e8fd] text-[#003fb1] text-[12px] font-semibold">
              {upcomingClasses.length}
            </span>
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

        {!loading && upcomingClasses.length === 0 && (
          <>
            {ongoingClasses.length > 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <span className="material-symbols-outlined text-[#003fb1] text-[32px]">schedule</span>
                <p className="text-[15px] font-semibold text-[#141b2b] mt-2">No more upcoming classes</p>
                <p className="text-[12px] text-[#434654] mt-0.5">See ongoing class above or completed below</p>
              </div>
            ) : completedClasses.length > 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <span className="material-symbols-outlined text-[#005623] text-[32px]">task_alt</span>
                <p className="text-[15px] font-semibold text-[#141b2b] mt-2">All classes completed for today!</p>
                <p className="text-[12px] text-[#434654] mt-0.5">See completed classes below</p>
              </div>
            ) : (
              /* No classes at all today — illustrated empty state */
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-[#e8eeff] to-[#f1f3ff] px-6 pt-8 pb-6 flex flex-col items-center">
                  <svg viewBox="0 0 200 160" className="w-48 h-36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="100" cy="140" rx="90" ry="18" fill="#dbe1ff" opacity="0.5" />
                    <circle cx="160" cy="38" r="20" fill="#fbbf24" opacity="0.9" />
                    <circle cx="160" cy="38" r="14" fill="#fde68a" />
                    {[0,45,90,135,180,225,270,315].map((deg, i) => (
                      <line
                        key={i}
                        x1={160 + Math.cos(deg * Math.PI / 180) * 18}
                        y1={38 + Math.sin(deg * Math.PI / 180) * 18}
                        x2={160 + Math.cos(deg * Math.PI / 180) * 26}
                        y2={38 + Math.sin(deg * Math.PI / 180) * 26}
                        stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"
                      />
                    ))}
                    <ellipse cx="62" cy="48" rx="24" ry="14" fill="white" opacity="0.9" />
                    <ellipse cx="80" cy="44" rx="18" ry="12" fill="white" opacity="0.9" />
                    <ellipse cx="46" cy="52" rx="16" ry="10" fill="white" opacity="0.9" />
                    <rect x="34" y="96" width="132" height="38" rx="10" fill="#003fb1" />
                    <path d="M62 96 Q70 72 90 68 L124 68 Q144 72 148 96Z" fill="#1a56db" />
                    <path d="M74 96 Q80 78 92 74 L118 74 Q130 78 136 96Z" fill="#93c5fd" opacity="0.7" />
                    <rect x="74" y="74" width="22" height="18" rx="3" fill="#bfdbfe" opacity="0.8" />
                    <rect x="104" y="74" width="22" height="18" rx="3" fill="#bfdbfe" opacity="0.8" />
                    <circle cx="68" cy="134" r="16" fill="#1e293b" />
                    <circle cx="68" cy="134" r="9" fill="#475569" />
                    <circle cx="68" cy="134" r="4" fill="#94a3b8" />
                    <circle cx="138" cy="134" r="16" fill="#1e293b" />
                    <circle cx="138" cy="134" r="9" fill="#475569" />
                    <circle cx="138" cy="134" r="4" fill="#94a3b8" />
                    <ellipse cx="166" cy="108" rx="6" ry="5" fill="#fde68a" opacity="0.9" />
                    <rect x="0" y="148" width="200" height="12" fill="#cbd5e1" opacity="0.6" />
                    <rect x="15" y="152" width="20" height="4" rx="2" fill="white" opacity="0.7" />
                    <rect x="55" y="152" width="20" height="4" rx="2" fill="white" opacity="0.7" />
                    <rect x="95" y="152" width="20" height="4" rx="2" fill="white" opacity="0.7" />
                    <rect x="135" y="152" width="20" height="4" rx="2" fill="white" opacity="0.7" />
                    <rect x="168" y="152" width="20" height="4" rx="2" fill="white" opacity="0.7" />
                  </svg>
                </div>
                <div className="px-6 py-5 text-center">
                  <h3 className="text-[17px] font-bold text-[#141b2b]">A free day ahead! ☀️</h3>
                  <p className="text-[13px] text-[#434654] mt-1.5 leading-relaxed">
                    No classes scheduled for today. A great time to plan tomorrow's sessions or catch up on enrollments.
                  </p>
                  <button
                    onClick={() => setShowAddClass(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#003fb1] text-white text-[13px] font-semibold active:scale-95 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Log a Class
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && upcomingClasses.map(cls => {
          const isUpNext = cls.id === upNextId
          const hasPhone = isValidPhone(cls.phone_number)
          const canMark = canMarkClassDone(cls.start_time)

          if (isUpNext) {
            return (
              <div key={cls.id} className="bg-white p-4 rounded-2xl shadow-sm border border-[#dbe1ff] flex flex-col space-y-3">
                {/* UP NEXT Badge Header */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e1e8fd] text-[#003fb1] text-[11px] font-bold tracking-wide uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#003fb1]"></span>
                    <span>UP NEXT • {cls.start_time ? formatTime(cls.start_time) : ''}{cls.end_time ? ` - ${formatTime(cls.end_time)}` : ''}</span>
                  </div>
                  {cls.amount_pending > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[12px] font-semibold">
                      Due ₹{cls.amount_pending.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#003fb1] flex items-center justify-center text-[16px] font-bold text-white shadow-sm">
                      {getInitials(cls.full_name)}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="text-[15px] font-bold text-[#141b2b] cursor-pointer hover:text-[#003fb1]"
                        onClick={() => navigate(`/customers/${cls.customer_id}`)}
                      >
                        {cls.full_name}
                      </span>
                      <span className="text-[12px] text-[#434654] mt-0.5">
                        Class {cls.classes_completed + 1} of {cls.package_classes}
                        {cls.notes ? ` • ${cls.notes}` : ' • Practical Drive'}
                      </span>
                    </div>
                  </div>
                  {cls.location && (
                    <div className="flex items-center gap-0.5 text-[#434654] bg-[#f1f3ff] px-2 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-[14px] text-[#003fb1]">location_on</span>
                      <span className="text-[11px] font-medium max-w-[120px] truncate">{cls.location}</span>
                    </div>
                  )}
                </div>

                {/* Mark Done row with Call & WhatsApp */}
                <div className="flex items-center gap-2 pt-0.5">
                  {canMark ? (
                    <button
                      onClick={() => markDone(cls.id)}
                      disabled={markingDone === cls.id}
                      className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-[#003fb1] text-white rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
                    >
                      {markingDone === cls.id ? (
                        <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
                      ) : (
                        <><span className="material-symbols-outlined text-[20px]">check</span>Mark Done</>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-[#f1f3ff] text-[#737686] rounded-xl text-[13px] font-medium opacity-70 cursor-not-allowed"
                      title={`Cannot mark done before scheduled time (${cls.start_time ? formatTime(cls.start_time) : ''})`}
                    >
                      <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                      <span>Starts at {cls.start_time ? formatTime(cls.start_time) : 'TBD'}</span>
                    </button>
                  )}

                  {/* Call button */}
                  {hasPhone ? (
                    <a
                      href={`tel:${cls.phone_number}`}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e9edff] text-[#003fb1] hover:bg-[#dbe1ff] active:scale-95 transition-all shrink-0 shadow-sm"
                      title={`Call ${cls.full_name}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">call</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#f1f3ff] text-[#737686] opacity-40 cursor-not-allowed shrink-0"
                      title="Phone number not available"
                    >
                      <span className="material-symbols-outlined text-[20px]">call</span>
                    </button>
                  )}

                  {/* WhatsApp button */}
                  {hasPhone ? (
                    <a
                      href={getWhatsAppUrl(cls.phone_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:scale-95 transition-all shrink-0 shadow-sm"
                      title={`WhatsApp ${cls.full_name}`}
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#f1f3ff] text-[#737686] opacity-40 cursor-not-allowed shrink-0"
                      title="Phone number not available"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )
          }

          // Regular scheduled card
          return (
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
                      Class {cls.classes_completed + 1} of {cls.package_classes}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(cls.status)}
                  {cls.location && (
                    <div className="flex items-center gap-0.5 text-[#434654] mt-0.5">
                      <span className="material-symbols-outlined text-[13px] text-[#003fb1]">location_on</span>
                      <span className="text-[11px] font-medium max-w-[140px] truncate text-right">{cls.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Time row */}
              <div className="flex items-center justify-between bg-[#f1f3ff] px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-[#434654]">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span className="text-[13px] font-medium text-[#141b2b]">
                    {cls.start_time ? formatTime(cls.start_time) : 'Time TBD'}{cls.end_time ? ` - ${formatTime(cls.end_time)}` : ''}
                  </span>
                </div>
                {cls.amount_pending > 0 && (
                  <span className="text-[11px] text-[#ba1a1a] font-semibold">
                    Fee Pending: ₹{cls.amount_pending.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Mark Done row with Call & WhatsApp */}
              <div className="flex items-center gap-2 pt-0.5">
                {canMark ? (
                  <button
                    onClick={() => markDone(cls.id)}
                    disabled={markingDone === cls.id}
                    className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-[#003fb1] text-white rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
                  >
                    {markingDone === cls.id ? (
                      <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[20px]">check</span>Mark Done</>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 h-11 flex items-center justify-center gap-1.5 bg-[#f1f3ff] text-[#737686] rounded-xl text-[13px] font-medium opacity-70 cursor-not-allowed"
                    title={`Cannot mark done before scheduled time (${cls.start_time ? formatTime(cls.start_time) : ''})`}
                  >
                    <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                    <span>Starts at {cls.start_time ? formatTime(cls.start_time) : 'TBD'}</span>
                  </button>
                )}

                {/* Call button */}
                {hasPhone ? (
                  <a
                    href={`tel:${cls.phone_number}`}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e9edff] text-[#003fb1] hover:bg-[#dbe1ff] active:scale-95 transition-all shrink-0 shadow-sm"
                    title={`Call ${cls.full_name}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#f1f3ff] text-[#737686] opacity-40 cursor-not-allowed shrink-0"
                    title="Phone number not available"
                  >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </button>
                )}

                {/* WhatsApp button */}
                {hasPhone ? (
                  <a
                    href={getWhatsAppUrl(cls.phone_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:scale-95 transition-all shrink-0 shadow-sm"
                    title={`WhatsApp ${cls.full_name}`}
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#f1f3ff] text-[#737686] opacity-40 cursor-not-allowed shrink-0"
                    title="Phone number not available"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Completed Classes Section */}
      {!loading && completedClasses.length > 0 && (
        <div className="flex flex-col space-y-3 pt-2">
          <div className="flex items-center gap-2 pt-1 px-0.5">
            <h2 className="text-[16px] font-semibold text-[#141b2b]">Completed Classes</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#6bff8f]/30 text-[#005623] text-[12px] font-semibold">
              {completedClasses.length}
            </span>
          </div>

          {completedClasses.map(cls => {
            const hasPhone = isValidPhone(cls.phone_number)
            return (
              <div key={cls.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col space-y-3 opacity-90">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6bff8f]/30 flex items-center justify-center text-[16px] font-semibold text-[#005623]">
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
                        Class {cls.classes_completed} of {cls.package_classes}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge('done')}
                    {cls.location && (
                      <div className="flex items-center gap-0.5 text-[#434654] mt-0.5">
                        <span className="material-symbols-outlined text-[13px] text-[#003fb1]">location_on</span>
                        <span className="text-[11px] font-medium max-w-[140px] truncate text-right">{cls.location}</span>
                      </div>
                    )}
                  </div>
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

                {/* Contact actions for completed class */}
                {hasPhone && (
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5 text-[#005623] text-[13px] font-medium">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Class Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${cls.phone_number}`}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#e9edff] text-[#003fb1] hover:bg-[#dbe1ff] active:scale-95 transition-all shadow-sm"
                        title={`Call ${cls.full_name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                      </a>
                      <a
                        href={getWhatsAppUrl(cls.phone_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:scale-95 transition-all shadow-sm"
                        title={`WhatsApp ${cls.full_name}`}
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddCustomer && (
        <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSaved={fetchData} />
      )}
      {showAddClass && (
        <AddClassModal onClose={() => setShowAddClass(false)} onSaved={fetchData} defaultDate={today} />
      )}
    </div>
  )
}

