import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Driver, DriverRatingSummary, CoursePackage } from '../../lib/supabase'
import StarRating from '../../components/book/StarRating'
import { IconSearch } from '../../components/book/icons'
import { formatPrice } from '../../lib/bookingFormat'

interface DriverCardData extends Driver {
  average_rating: number
  review_count: number
  starting_price: number | null
}

type SortKey = 'rating' | 'price'

// Two chips only fit beside each other when the labels are short; past that
// the row truncates both into unreadable stubs, so drop to one plus a count.
function SpecialtyRow({ specialties }: { specialties: string[] }) {
  if (specialties.length === 0) return null
  const pair = specialties.slice(0, 2)
  const visible = pair.join('').length <= 24 ? pair : specialties.slice(0, 1)
  const hidden = specialties.length - visible.length

  return (
    <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-2.5">
      {visible.map(s => (
        <span key={s} className="rd-chip rd-chip-mute min-w-0">
          <span className="truncate">{s}</span>
        </span>
      ))}
      {hidden > 0 && <span className="rd-ink3 shrink-0 text-[12px] font-medium">+{hidden}</span>}
    </div>
  )
}

export default function BookDriverList() {
  const [drivers, setDrivers] = useState<DriverCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [specialty, setSpecialty] = useState('all')
  const [sort, setSort] = useState<SortKey>('rating')

  useEffect(() => {
    let ignore = false

    async function load() {
      const [driversRes, summaryRes, packagesRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true),
        supabase.from('driver_rating_summary').select('*'),
        supabase.from('course_packages').select('*').eq('is_active', true),
      ])
      if (ignore) return

      const summaryMap = new Map(
        ((summaryRes.data as DriverRatingSummary[] | null) ?? []).map(s => [s.driver_id, s])
      )
      const priceByDriver = new Map<string, number>()
      for (const p of (packagesRes.data as CoursePackage[] | null) ?? []) {
        const current = priceByDriver.get(p.driver_id)
        if (current === undefined || p.price < current) priceByDriver.set(p.driver_id, p.price)
      }

      setDrivers(
        ((driversRes.data as Driver[] | null) ?? []).map(d => ({
          ...d,
          average_rating: summaryMap.get(d.id)?.average_rating ?? 0,
          review_count: summaryMap.get(d.id)?.review_count ?? 0,
          starting_price: priceByDriver.get(d.id) ?? null,
        }))
      )
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
    return Array.from(set).sort()
  }, [drivers])

  const visible = useMemo(() => {
    const filtered = specialty === 'all' ? drivers : drivers.filter(d => d.specialties.includes(specialty))
    return [...filtered].sort((a, b) => {
      if (sort === 'price') {
        const ap = a.starting_price ?? Number.POSITIVE_INFINITY
        const bp = b.starting_price ?? Number.POSITIVE_INFINITY
        return ap - bp
      }
      return b.average_rating - a.average_rating
    })
  }, [drivers, specialty, sort])

  return (
    <div className="flex flex-col gap-5 pb-4 pt-4">
      <div>
        <h1 className="rd-display text-[30px] font-extrabold leading-tight">Instructors</h1>
        <p className="rd-ink2 mt-1 text-[14px]">
          {loading ? 'Loading…' : `${visible.length} available near you`}
        </p>
      </div>

      {!loading && drivers.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Sort */}
          <div className="inline-flex self-start rounded-full border border-[var(--line)] bg-white p-1">
            {([
              ['rating', 'Top rated'],
              ['price', 'Lowest price'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={`h-9 rounded-full px-4 text-[13px] font-semibold transition-colors ${
                  sort === key ? 'bg-[var(--ink)] text-white' : 'rd-ink2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Specialty */}
          {specialties.length > 0 && (
            <div className="rd-rail -mx-5 px-5">
              {['all', ...specialties].map(item => (
                <button
                  key={item}
                  onClick={() => setSpecialty(item)}
                  aria-pressed={specialty === item}
                  className={`h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                    specialty === item
                      ? 'border-transparent bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                      : 'border-[var(--line)] bg-white text-[var(--ink-2)]'
                  }`}
                >
                  {item === 'all' ? 'All specialities' : item}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rd-skeleton h-[108px] rounded-[18px]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rd-card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="rd-ink3">
            <IconSearch size={26} />
          </span>
          <p className="text-[15px] font-semibold">
            {drivers.length === 0 ? 'No instructors listed yet' : 'Nothing matches that speciality'}
          </p>
          <p className="rd-ink2 text-[13px] leading-[20px]">
            {drivers.length === 0
              ? 'Profiles will appear here as soon as instructors are listed for booking.'
              : 'Try “All specialities” to see everyone available.'}
          </p>
          {drivers.length > 0 && specialty !== 'all' && (
            <button onClick={() => setSpecialty('all')} className="rd-btn-quiet mt-2 h-10 px-4 text-[13px]">
              Show all instructors
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(driver => (
            <Link key={driver.id} to={`/book/drivers/${driver.id}`} className="rd-card rd-press flex gap-3.5 p-3.5">
              <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[14px] bg-[var(--brand-tint)]">
                {driver.photo_url ? (
                  <img src={driver.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="rd-display grid h-full w-full place-items-center text-[22px] font-extrabold text-[var(--brand)]/35">
                    {driver.full_name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[16px] font-semibold">{driver.full_name}</p>
                  {driver.starting_price !== null && (
                    <p className="rd-ink3 shrink-0 text-[11px]">
                      from{' '}
                      <span className="rd-display text-[15px] font-bold text-[var(--ink)]">
                        {formatPrice(driver.starting_price)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  <StarRating rating={driver.average_rating} size={13} />
                  <span className="rd-ink3 text-[12px]">
                    {driver.average_rating > 0
                      ? `${driver.average_rating.toFixed(1)} · ${driver.review_count} ${driver.review_count === 1 ? 'review' : 'reviews'}`
                      : 'Newly listed'}
                  </span>
                </div>

                <SpecialtyRow specialties={driver.specialties} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
