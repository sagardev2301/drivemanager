import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Driver, DriverRatingSummary } from '../../lib/supabase'
import StarRating from '../../components/book/StarRating'
import RatingGauge from '../../components/book/RatingGauge'

interface FeaturedDriver extends Driver {
  average_rating: number
  review_count: number
}

export default function BookLanding() {
  const navigate = useNavigate()
  const [featured, setFeatured] = useState<FeaturedDriver[]>([])
  const [learnerCount, setLearnerCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function load() {
      const [driversRes, summaryRes, countRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true),
        supabase.from('driver_rating_summary').select('*'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ])
      if (ignore) return

      const summaries = (summaryRes.data as DriverRatingSummary[] | null) ?? []
      const summaryMap = new Map(summaries.map(s => [s.driver_id, s]))
      const drivers = (driversRes.data as Driver[] | null) ?? []
      const merged: FeaturedDriver[] = drivers.map(d => ({
        ...d,
        average_rating: summaryMap.get(d.id)?.average_rating ?? 0,
        review_count: summaryMap.get(d.id)?.review_count ?? 0,
      }))
      merged.sort((a, b) => b.average_rating - a.average_rating)

      setFeatured(merged.slice(0, 3))
      setLearnerCount(countRes.count ?? null)
      setLoading(false)
    }

    load()
    return () => {
      ignore = true
    }
  }, [])

  const topDriver = featured[0]

  return (
    <div className="flex flex-col -mx-4 -mt-[4.75rem]">
      {/* Showroom hero: spotlight ground + glass instrument card */}
      <div className="relative pt-24 pb-14 px-4 overflow-hidden sr-stage">
        <div className="absolute inset-x-0 bottom-0 h-24 sr-floor" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_16px_32px_-10px_rgba(0,63,177,0.55)]"
            style={{ background: 'linear-gradient(155deg,#4d7dff,#003fb1)' }}
          >
            <span className="material-symbols-outlined text-white text-[32px]">directions_car</span>
          </div>
          <h1 className="text-headline-lg font-semibold text-on-surface tracking-tight max-w-xs">
            Learn to drive with confidence
          </h1>
          <p className="text-body-base text-on-surface-variant max-w-xs">
            Compare certified instructors, real reviews, and flexible timings near you.
          </p>
          <button
            onClick={() => navigate('/book/drivers')}
            className="sr-btn-primary h-12 px-6 text-white rounded-full font-semibold text-body-base active:scale-95 transition-all flex items-center gap-2"
          >
            Find your instructor
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {/* Instrument card: trust stats as a dashboard readout */}
        <div className="relative z-10 mt-8 sr-panel rounded-2xl p-4 grid grid-cols-3 gap-2 text-center max-w-sm mx-auto">
          <div>
            <p className="text-headline-sm font-semibold text-on-surface">
              {learnerCount !== null ? `${learnerCount}+` : '—'}
            </p>
            <p className="text-caption-xs text-on-surface-variant mt-0.5">Trained</p>
          </div>
          <div className="border-x border-white/60">
            <p className="text-headline-sm font-semibold text-on-surface">Certified</p>
            <p className="text-caption-xs text-on-surface-variant mt-0.5">Instructors</p>
          </div>
          <div>
            <p className="text-headline-sm font-semibold text-on-surface">Flexible</p>
            <p className="text-caption-xs text-on-surface-variant mt-0.5">Timings</p>
          </div>
        </div>
      </div>

      <div className="sr-chrome-divider mx-4" />

      {/* Top-rated instructor, gauge-forward */}
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-headline-sm font-semibold text-on-surface mb-3">Top-rated instructor</h2>
        {loading ? (
          <div className="h-28 rounded-2xl bg-white/60 animate-pulse" />
        ) : topDriver ? (
          <button
            onClick={() => navigate(`/book/drivers/${topDriver.id}`)}
            className="sr-panel sr-tilt w-full rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98]"
          >
            <RatingGauge rating={topDriver.average_rating} reviewCount={topDriver.review_count} size={84} />
            <div className="min-w-0 flex-1 pl-2">
              <p className="text-body-strong text-on-surface truncate">{topDriver.full_name}</p>
              {topDriver.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {topDriver.specialties.slice(0, 2).map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-white/70 text-caption-xs text-on-surface-variant font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] shrink-0">chevron_right</span>
          </button>
        ) : (
          <p className="text-body-sm text-on-surface-variant">No instructors listed yet.</p>
        )}
      </div>

      {/* Remaining featured drivers */}
      <div className="px-4 pt-4 pb-4">
        {!loading && featured.length > 1 && (
          <div className="space-y-3">
            {featured.slice(1).map(d => (
              <button
                key={d.id}
                onClick={() => navigate(`/book/drivers/${d.id}`)}
                className="sr-panel sr-tilt w-full rounded-xl p-4 active:scale-[0.98] transition-all flex items-center gap-3 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center shrink-0 overflow-hidden">
                  {d.photo_url ? (
                    <img src={d.photo_url} alt={d.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">person</span>
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
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
