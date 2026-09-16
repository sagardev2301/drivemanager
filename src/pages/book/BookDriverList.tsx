import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Driver, DriverRatingSummary, CoursePackage } from '../../lib/supabase'
import StarRating from '../../components/book/StarRating'
import { FilterChip, FilterChipRow } from '../../components/FilterChips'

interface DriverCardData extends Driver {
  average_rating: number
  review_count: number
  starting_price: number | null
}

export default function BookDriverList() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState<DriverCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all')

  useEffect(() => {
    let ignore = false

    async function load() {
      const [driversRes, summaryRes, packagesRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true),
        supabase.from('driver_rating_summary').select('*'),
        supabase.from('course_packages').select('*').eq('is_active', true),
      ])
      if (ignore) return

      const summaries = (summaryRes.data as DriverRatingSummary[] | null) ?? []
      const summaryMap = new Map(summaries.map(s => [s.driver_id, s]))
      const packages = (packagesRes.data as CoursePackage[] | null) ?? []
      const priceByDriver = new Map<string, number>()
      for (const p of packages) {
        const current = priceByDriver.get(p.driver_id)
        if (current === undefined || p.price < current) priceByDriver.set(p.driver_id, p.price)
      }

      const list = ((driversRes.data as Driver[] | null) ?? []).map(d => ({
        ...d,
        average_rating: summaryMap.get(d.id)?.average_rating ?? 0,
        review_count: summaryMap.get(d.id)?.review_count ?? 0,
        starting_price: priceByDriver.get(d.id) ?? null,
      }))
      list.sort((a, b) => b.average_rating - a.average_rating)
      setDrivers(list)
      setLoading(false)
    }

    load()
    return () => {
      ignore = true
    }
  }, [])

  const specialties = useMemo(() => {
    const set = new Set<string>()
    drivers.forEach(d => d.specialties.forEach(s => set.add(s)))
    return Array.from(set)
  }, [drivers])

  const filtered = useMemo(() => {
    if (specialtyFilter === 'all') return drivers
    return drivers.filter(d => d.specialties.includes(specialtyFilter))
  }, [drivers, specialtyFilter])

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <div>
        <h1 className="text-headline-md font-semibold text-on-surface">Find your instructor</h1>
        <p className="text-body-sm text-on-surface-variant mt-0.5">{filtered.length} instructors available</p>
      </div>

      {specialties.length > 0 && (
        <FilterChipRow>
          <FilterChip active={specialtyFilter === 'all'} onClick={() => setSpecialtyFilter('all')}>
            All
          </FilterChip>
          {specialties.map(s => (
            <FilterChip key={s} active={specialtyFilter === s} onClick={() => setSpecialtyFilter(s)}>
              {s}
            </FilterChip>
          ))}
        </FilterChipRow>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="sr-panel rounded-2xl p-8 text-center">
          <p className="text-body-base font-semibold text-on-surface">No instructors match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <button
              key={d.id}
              onClick={() => navigate(`/book/drivers/${d.id}`)}
              className="sr-panel sr-tilt w-full rounded-2xl p-4 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-white/70 flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_1px_2px_rgba(20,27,43,0.06)]">
                  {d.photo_url ? (
                    <img src={d.photo_url} alt={d.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">person</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-strong text-on-surface truncate">{d.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarRating rating={d.average_rating} size={13} />
                    <span className="text-caption-xs text-on-surface-variant">
                      {d.average_rating > 0 ? d.average_rating.toFixed(1) : 'New'} ({d.review_count})
                    </span>
                  </div>
                  {d.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.specialties.slice(0, 3).map(s => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-full bg-white/70 text-caption-xs text-on-surface-variant font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {d.starting_price !== null && (
                    <>
                      <p className="text-caption-xs text-on-surface-variant">From</p>
                      <p className="text-body-strong text-on-surface">₹{d.starting_price}</p>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
