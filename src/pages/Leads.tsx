import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, LeadStatus } from '../lib/supabase'
import { formatRelativeTime } from '../lib/dateUtils'
import AddLeadModal from '../components/AddLeadModal'
import LeadDetailModal from '../components/LeadDetailModal'
import { FilterChip, FilterChipRow } from '../components/FilterChips'
import EntityListCard from '../components/EntityListCard'

type FilterKey = 'all' | LeadStatus

const FILTER_OPTIONS: { key: FilterKey; label: string; dot?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New', dot: 'bg-blue-600' },
  { key: 'contacted', label: 'Contacted', dot: 'bg-amber-500' },
  { key: 'booked', label: 'Booked', dot: 'bg-purple-600' },
  { key: 'converted', label: 'Converted', dot: 'bg-emerald-500' },
  { key: 'dropped', label: 'Dropped', dot: 'bg-rose-500' },
]

const STATUS_CONFIG: Record<
  LeadStatus,
  {
    label: string
    ring: string
    avatarBg: string
    avatarText: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
    dotColor: string
  }
> = {
  new: {
    label: 'New',
    ring: 'ring-blue-500',
    avatarBg: 'bg-blue-50',
    avatarText: 'text-blue-700',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-600',
  },
  contacted: {
    label: 'Contacted',
    ring: 'ring-amber-500',
    avatarBg: 'bg-amber-50',
    avatarText: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  booked: {
    label: 'Booked',
    ring: 'ring-purple-500',
    avatarBg: 'bg-purple-50',
    avatarText: 'text-purple-700',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-600',
  },
  converted: {
    label: 'Converted',
    ring: 'ring-emerald-500',
    avatarBg: 'bg-emerald-50',
    avatarText: 'text-emerald-700',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  dropped: {
    label: 'Dropped',
    ring: 'ring-rose-500',
    avatarBg: 'bg-rose-50',
    avatarText: 'text-rose-700',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    dotColor: 'bg-rose-500',
  },
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}

function getSourceIcon(source: string | null): string {
  if (!source) return 'sell'
  const s = source.toLowerCase()
  if (s.includes('instagram') || s.includes('ad') || s.includes('campaign')) return 'campaign'
  if (s.includes('referral') || s.includes('friend') || s.includes('word')) return 'group'
  if (s.includes('walk') || s.includes('store') || s.includes('visit')) return 'storefront'
  if (s.includes('map') || s.includes('google')) return 'location_on'
  if (s.includes('web') || s.includes('form') || s.includes('online') || s.includes('site')) return 'language'
  if (s.includes('phone') || s.includes('call') || s.includes('enquiry')) return 'call'
  return 'sell'
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev))
    }, 2500)
  }

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leads:', error)
    } else if (data) {
      setLeads(data as Lead[])
    }
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (ignore) return
        if (error) {
          console.error('Error fetching leads:', error)
        } else if (data) {
          setLeads(data as Lead[])
        }
        setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // Calculate counts for chips and active inquiries
  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      booked: 0,
      converted: 0,
      dropped: 0,
    }
    for (const lead of leads) {
      if (lead.status in result) {
        result[lead.status]++
      }
    }
    return result
  }, [leads])

  // Count leads NOT in 'converted' or 'dropped' status
  const activeInquiriesCount = useMemo(() => {
    return leads.filter(l => l.status !== 'converted' && l.status !== 'dropped').length
  }, [leads])

  // Filtered list
  const filteredLeads = useMemo(() => {
    if (activeFilter === 'all') return leads
    return leads.filter(l => l.status === activeFilter)
  }, [leads, activeFilter])

  return (
    <div className="flex flex-col space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Active Inquiries Badge Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-[12px] font-semibold text-blue-700 tracking-tight">
            {activeInquiriesCount} Active Inquiries
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">Track before they enroll</span>
      </div>

      {/* Status Filter Chips (Horizontal Scrollable) */}
      <FilterChipRow>
        {FILTER_OPTIONS.map(opt => {
          const isActive = activeFilter === opt.key
          const count = counts[opt.key]
          return (
            <FilterChip key={opt.key} active={isActive} onClick={() => setActiveFilter(opt.key)}>
              {opt.dot && !isActive && (
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
              )}
              <span>{opt.label}</span>
              <span className={isActive ? 'text-on-primary/80' : 'text-on-surface-variant/70'}>
                {count}
              </span>
            </FilterChip>
          )
        })}
      </FilterChipRow>

      {/* Stacked Lead Cards List */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton placeholders
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm animate-pulse flex items-center space-x-3.5"
              >
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[32px]">person_search</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-slate-800">
                {activeFilter === 'all'
                  ? 'No leads recorded yet'
                  : `No leads in "${FILTER_OPTIONS.find(f => f.key === activeFilter)?.label}"`}
              </p>
              <p className="text-[13px] text-slate-500 mt-1 max-w-xs mx-auto">
                {activeFilter === 'all'
                  ? 'Add student inquiries here to track their follow-up and seamlessly convert them to enrolled customers.'
                  : `Filter has no leads. Switch to "All" or tap + to record a new inquiry.`}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-on-surface hover:bg-on-surface/90 text-on-primary text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add First Lead</span>
            </button>
          </div>
        ) : (
          filteredLeads.map(lead => {
            const statusConfig = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new
            const initials = getInitials(lead.full_name)
            const sourceIcon = getSourceIcon(lead.source)
            const relativeTime = formatRelativeTime(lead.created_at)

            return (
              <EntityListCard
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                avatarClassName={`${statusConfig.avatarBg} ${statusConfig.avatarText} ring-2 ${statusConfig.ring} ring-offset-2`}
                avatarContent={initials}
                name={lead.full_name}
                phone={lead.phone_number}
                location={lead.location}
                topRight={
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusConfig.badgeBg} ${statusConfig.badgeText} border ${statusConfig.badgeBorder}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                    <span>{statusConfig.label}</span>
                  </div>
                }
              >
                {/* Divider & Meta Row */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
                  <div className="flex items-center gap-3">
                    {/* Source Tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      <span className="material-symbols-outlined text-[14px] text-slate-500">
                        {sourceIcon}
                      </span>
                      <span>{lead.source || 'Direct'}</span>
                    </span>

                    {/* Relative Time */}
                    {relativeTime && (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{relativeTime}</span>
                      </span>
                    )}
                  </div>

                  {/* Chevron Arrow */}
                  <span className="material-symbols-outlined text-[18px] text-slate-400 transition-all">
                    chevron_right
                  </span>
                </div>
              </EntityListCard>
            )
          })
        )}
      </div>

      {/* Floating Action Button (+ in Navy Blue Circle, Bottom-Right) */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed right-5 z-30 w-14 h-14 rounded-full bg-on-surface text-on-primary flex items-center justify-center shadow-xl hover:bg-on-surface/90 active:scale-95 transition-all focus:outline-none ring-4 ring-on-surface/10"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
        title="Add New Lead"
        aria-label="Add New Lead"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Add Lead Bottom Sheet */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSaved={name => {
            showToast(`Lead "${name}" added successfully!`)
            fetchLeads()
          }}
        />
      )}

      {/* Lead Detail & Edit Modal */}
      {selectedLead && (
        <LeadDetailModal
          key={selectedLead.id}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={msg => {
            showToast(msg)
            fetchLeads()
          }}
        />
      )}
    </div>
  )
}
