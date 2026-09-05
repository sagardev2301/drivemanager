import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CustomerSummary } from '../lib/supabase'
import AddCustomerModal from '../components/AddCustomerModal'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type FilterKey = 'all' | 'active' | 'pending' | 'completed'

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase
      .from('customer_summary')
      .select('*')
      .order('enrollment_date', { ascending: false })
    if (data) setCustomers(data)
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  const filtered = useMemo(() => {
    let list = customers
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone_number ?? '').toLowerCase().includes(q)
      )
    }
    if (filter === 'active') list = list.filter(c => c.course_status === 'active')
    if (filter === 'pending') list = list.filter(c => c.amount_pending > 0)
    if (filter === 'completed') list = list.filter(c => c.course_status === 'completed')
    return list
  }, [customers, search, filter])

  const counts = {
    all: customers.length,
    active: customers.filter(c => c.course_status === 'active').length,
    pending: customers.filter(c => c.amount_pending > 0).length,
    completed: customers.filter(c => c.course_status === 'completed').length,
  }

  function paymentBadge(c: CustomerSummary) {
    if (c.amount_pending <= 0) return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#6bff8f]/30 text-[#005321] text-[12px] font-semibold">Fully Paid</span>
    if (c.payment_status === 'partial') return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b5c4ff]/40 text-[#1a3f9c] text-[12px] font-semibold">₹{c.amount_pending.toLocaleString('en-IN')} Pending</span>
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold">₹{c.amount_pending.toLocaleString('en-IN')} Pending</span>
  }

  const progressBarColor: Record<string, string> = {
    active: 'bg-[#003fb1]',
    completed: 'bg-[#005623]',
    dropped: 'bg-[#ba1a1a]',
  }

  const progressLabelColor: Record<string, string> = {
    active: 'text-[#141b2b]',
    completed: 'text-[#005623]',
    dropped: 'text-[#ba1a1a]',
  }

  const pills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'active', label: `Active (${counts.active})` },
    { key: 'pending', label: `Pending Fee (${counts.pending})` },
    { key: 'completed', label: `Completed (${counts.completed})` },
  ]

  return (
    <div className="flex flex-col w-full space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#141b2b] tracking-tight">Enrolled Customers</h1>
          <p className="text-[11px] text-[#434654] mt-0.5">Manage training records &amp; fee dues</p>
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center gap-1 bg-[#003fb1] text-white px-4 py-2 rounded-2xl shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span className="text-[14px] font-semibold">+ Add</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737686]">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </div>
        <input
          className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white text-[#141b2b] placeholder:text-[#737686] text-[14px] shadow-sm focus:outline-none focus:bg-white transition-colors"
          placeholder="Search by name or phone..."
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#737686]"
            onClick={() => setSearch('')}
          >
            <span className="material-symbols-outlined text-[18px]">cancel</span>
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-none">
        {pills.map(p => (
          <button
            key={p.key}
            onClick={() => setFilter(p.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
              filter === p.key
                ? 'bg-[#003fb1] text-white shadow-sm'
                : 'bg-[#e9edff] text-[#434654]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Customer Cards */}
      <div className="flex flex-col space-y-3">
        {loading && [1, 2, 3].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm animate-pulse h-28" />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <span className="material-symbols-outlined text-[#737686] text-[32px]">person_search</span>
            <p className="text-[14px] text-[#434654] mt-2">No customers found</p>
          </div>
        )}

        {!loading && filtered.map(c => {
          const progress = c.package_classes > 0 ? (c.classes_completed / c.package_classes) * 100 : 0
          return (
            <div
              key={c.customer_id}
              onClick={() => navigate(`/customers/${c.customer_id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm active:bg-[#f1f3ff] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={c.course_status === 'completed' ? 'w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0 bg-[#e9edff] text-[#005623]' : 'w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0 bg-[#e9edff] text-[#003fb1]'}>
                    {getInitials(c.full_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h2 className="text-[16px] font-semibold text-[#141b2b]">{c.full_name}</h2>
                      {c.course_status === 'completed' && (
                        <span className="material-symbols-outlined text-[#005623] text-[16px]">check_circle</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[#434654] mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">phone</span>
                      <span className="text-[11px] tracking-wide">{c.phone_number}</span>
                    </div>
                  </div>
                </div>
                {paymentBadge(c)}
              </div>

              {/* Progress bar */}
              <div className="mt-4 pt-1 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-[#434654]">
                      {c.course_status === 'completed' ? 'Course Complete' : 'Training Progress'}
                    </span>
                    <span className={progressLabelColor[c.course_status] ?? 'text-[#141b2b]'} style={{fontSize:'14px', fontWeight:600}}>
                      {c.classes_completed} / {c.package_classes} classes
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#e9edff] rounded-full overflow-hidden">
                    <div className={progressBarColor[c.course_status] ?? 'bg-[#003fb1]'} style={{ width: `${progress}%`, height: '100%', borderRadius: '9999px' }} />
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#f1f3ff] flex items-center justify-center text-[#434654] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showAddCustomer && (
        <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSaved={fetchCustomers} />
      )}
    </div>
  )
}

