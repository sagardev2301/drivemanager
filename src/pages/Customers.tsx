import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CustomerSummary } from '../lib/supabase'
import AddCustomerModal from '../components/AddCustomerModal'

const PAGE_SIZE = 25

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type FilterKey = 'all' | 'active' | 'pending' | 'completed'

interface Counts { all: number; active: number; pending: number; completed: number }

export default function Customers() {
  const navigate = useNavigate()

  // Paginated list state
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingPage, setLoadingPage] = useState(true)

  // Filter / search state
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  // Pill counts (fetched once, independently)
  const [counts, setCounts] = useState<Counts>({ all: 0, active: 0, pending: 0, completed: 0 })

  const [showAddCustomer, setShowAddCustomer] = useState(false)

  // Debounce search input 300ms
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(val: string) {
    setSearch(val)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  // ── Fetch pill counts (4 lightweight HEAD queries, no data rows) ──────────
  async function fetchCounts() {
    const [allRes, activeRes, pendingRes, completedRes] = await Promise.all([
      supabase.from('customer_summary').select('*', { count: 'exact', head: true }),
      supabase.from('customer_summary').select('*', { count: 'exact', head: true }).eq('course_status', 'active'),
      supabase.from('customer_summary').select('*', { count: 'exact', head: true }).gt('amount_pending', 0),
      supabase.from('customer_summary').select('*', { count: 'exact', head: true }).eq('course_status', 'completed'),
    ])
    setCounts({
      all:       allRes.count       ?? 0,
      active:    activeRes.count    ?? 0,
      pending:   pendingRes.count   ?? 0,
      completed: completedRes.count ?? 0,
    })
  }

  // ── Build a filtered+searched Supabase query ──────────────────────────────
  function buildQuery(q: string, fil: FilterKey) {
    let query = supabase.from('customer_summary').select('*', { count: 'exact' })
    if (fil === 'active')    query = query.eq('course_status', 'active')
    if (fil === 'pending')   query = query.gt('amount_pending', 0)
    if (fil === 'completed') query = query.eq('course_status', 'completed')
    if (q.trim()) {
      const safe = q.trim().replace(/[%_]/g, '\\$&')
      query = query.or(`full_name.ilike.%${safe}%,phone_number.ilike.%${safe}%`)
    }
    return query.order('enrollment_date', { ascending: false })
  }

  // ── Fetch a page and REPLACE the list (not append) ───────────────────────
  async function fetchPage(pageNum: number, q: string, fil: FilterKey) {
    setLoadingPage(true)

    const from = pageNum * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    const { data: summaryData, count } = await buildQuery(q, fil).range(from, to)

    if (summaryData && summaryData.length > 0) {
      const ids = summaryData.map((c: CustomerSummary) => c.customer_id)
      const { data: locationData } = await supabase.from('customers').select('id, location').in('id', ids)
      const locationMap = new Map((locationData ?? []).map((c: { id: string; location: string | null }) => [c.id, c.location]))
      const enriched = summaryData.map((c: CustomerSummary) => ({ ...c, location: locationMap.get(c.customer_id) ?? null }))
      setCustomers(enriched)
    } else {
      setCustomers([])
    }

    setTotalCount(count ?? 0)
    setLoadingPage(false)
  }

  // ── On mount: initial data + counts ──────────────────────────────────────
  useEffect(() => {
    fetchCounts()
  }, [])

  // ── Refetch when search or filter changes (reset to page 0) ───────────────
  useEffect(() => {
    setPage(0)
    fetchPage(0, debouncedSearch, filter)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [debouncedSearch, filter])

  // ── Refetch counts when a new customer is added ───────────────────────────
  function handleSaved() {
    fetchCounts()
    setPage(0)
    fetchPage(0, debouncedSearch, filter)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const listRef = useRef<HTMLDivElement>(null)

  // ── Navigate to a specific page ───────────────────────────────────────────
  function goToPage(pageNum: number) {
    setPage(pageNum)
    fetchPage(pageNum, debouncedSearch, filter)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function paymentBadge(c: CustomerSummary) {
    if (c.amount_pending <= 0) return <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full bg-tertiary-fixed/30 text-on-tertiary-fixed-variant text-[12px] font-semibold">Fully Paid</span>
    if (c.payment_status === 'partial') return <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full bg-primary-fixed-dim/40 text-on-secondary-fixed-variant text-[12px] font-semibold">₹{c.amount_pending.toLocaleString('en-IN')} Pending</span>
    return <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-[12px] font-semibold">₹{c.amount_pending.toLocaleString('en-IN')} Pending</span>
  }

  const progressBarColor: Record<string, string> = {
    active: 'bg-primary', completed: 'bg-tertiary', dropped: 'bg-error',
  }
  const progressLabelColor: Record<string, string> = {
    active: 'text-on-surface', completed: 'text-tertiary', dropped: 'text-error',
  }

  const pills: { key: FilterKey; label: string }[] = [
    { key: 'all',       label: `All (${counts.all})` },
    { key: 'active',    label: `Active (${counts.active})` },
    { key: 'pending',   label: `Pending Fee (${counts.pending})` },
    { key: 'completed', label: `Completed (${counts.completed})` },
  ]

  return (
    <div
      className="fixed inset-x-0 flex flex-col bg-background z-10 overflow-hidden"
      style={{
        top: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col w-full max-w-lg mx-auto h-full px-4 pt-3 relative">
        {/* Top Fixed Section */}
        <div className="shrink-0 space-y-3 pb-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-on-surface tracking-tight">Enrolled Customers</h1>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Manage training records &amp; fee dues</p>
            </div>
            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center gap-1 h-11 bg-primary text-on-primary px-4 rounded-xl shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span className="text-[14px] font-semibold">+ Add</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-white text-on-surface placeholder:text-outline text-[14px] shadow-sm focus:outline-none focus:bg-white transition-colors"
              placeholder="Search by name or phone..."
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline"
                onClick={() => { setSearch(''); setDebouncedSearch('') }}
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
                  filter === p.key ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Result summary */}
          {!loadingPage && (
            <p className="text-[11px] text-outline -mt-1">
              {debouncedSearch
                ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${debouncedSearch}"`
                : `Showing ${customers.length} of ${totalCount} customers`}
            </p>
          )}
        </div>

        {/* Scrollable Customer Cards List */}
        <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pb-6 min-h-0 -mx-1 px-1">
          {loadingPage && [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm animate-pulse h-28" />
          ))}

          {!loadingPage && customers.length === 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <span className="material-symbols-outlined text-outline text-[32px]">person_search</span>
              <p className="text-[14px] text-on-surface-variant mt-2">No customers found</p>
            </div>
          )}

          {!loadingPage && customers.map(c => {
            const progress = c.package_classes > 0 ? (c.classes_completed / c.package_classes) * 100 : 0
            return (
              <div
                key={c.customer_id}
                onClick={() => navigate(`/customers/${c.customer_id}`)}
                className="bg-white rounded-xl p-4 shadow-sm active:bg-surface-container-low transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={c.course_status === 'completed' ? 'w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0 bg-surface-container text-tertiary' : 'w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0 bg-surface-container text-primary'}>
                      {getInitials(c.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <h2 className="text-[16px] font-semibold text-on-surface truncate" title={c.full_name}>{c.full_name}</h2>
                        {c.course_status === 'completed' && (
                          <span className="material-symbols-outlined text-tertiary text-[16px] shrink-0">check_circle</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-on-surface-variant mt-0.5 min-w-0">
                        <span className="material-symbols-outlined text-[14px] shrink-0">phone</span>
                        <span className="text-[11px] tracking-wide truncate">{c.phone_number}</span>
                      </div>
                      {c.location && (
                        <div className="flex items-center gap-1 text-on-surface-variant mt-0.5 min-w-0">
                          <span className="material-symbols-outlined text-[14px] text-primary shrink-0">location_on</span>
                          <span className="text-[11px] tracking-wide truncate">{c.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {paymentBadge(c)}
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-1 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-on-surface-variant">
                        {c.course_status === 'completed' ? 'Course Complete' : 'Training Progress'}
                      </span>
                      <span className={progressLabelColor[c.course_status] ?? 'text-on-surface'} style={{ fontSize: '14px', fontWeight: 600 }}>
                        {c.classes_completed} / {c.package_classes} classes
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={progressBarColor[c.course_status] ?? 'bg-primary'} style={{ width: `${progress}%`, height: '100%', borderRadius: '9999px' }} />
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Inline Pagination Bar — sits at end of list, visible only when scrolled to bottom */}
          {!loadingPage && totalPages > 1 && (() => {
            // Show up to 5 page buttons centered on current page
            const maxButtons = 5
            let startPage = Math.max(0, page - Math.floor(maxButtons / 2))
            let endPage   = Math.min(totalPages - 1, startPage + maxButtons - 1)
            if (endPage - startPage + 1 < maxButtons) {
              startPage = Math.max(0, endPage - maxButtons + 1)
            }
            const pageButtons = []
            for (let i = startPage; i <= endPage; i++) pageButtons.push(i)

            return (
              <div className="pt-2 pb-2 flex justify-center">
                <div
                  className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl shadow-[0_-2px_16px_rgba(0,0,0,0.10)] rounded-2xl px-3 py-2 w-full max-w-[480px]"
                >
                  {/* Prev */}
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low text-primary disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>

                  {/* First page + ellipsis */}
                  {startPage > 0 && (
                    <>
                      <button onClick={() => goToPage(0)} className="w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-semibold bg-surface-container-low text-on-surface-variant active:scale-95 transition-all">1</button>
                      {startPage > 1 && <span className="text-outline text-[13px] px-0.5">…</span>}
                    </>
                  )}

                  {/* Page number buttons */}
                  {pageButtons.map(p => (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
                        p === page
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {p + 1}
                    </button>
                  ))}

                  {/* Ellipsis + last page */}
                  {endPage < totalPages - 1 && (
                    <>
                      {endPage < totalPages - 2 && <span className="text-outline text-[13px] px-0.5">…</span>}
                      <button onClick={() => goToPage(totalPages - 1)} className="w-9 h-9 flex items-center justify-center rounded-xl text-[13px] font-semibold bg-surface-container-low text-on-surface-variant active:scale-95 transition-all">{totalPages}</button>
                    </>
                  )}

                  {/* Next */}
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low text-primary disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>

                  {/* Page label */}
                  <span className="ml-auto text-[11px] text-outline whitespace-nowrap pl-1">
                    {page + 1} / {totalPages}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {showAddCustomer && (
        <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSaved={handleSaved} />
      )}
    </div>
  )
}
