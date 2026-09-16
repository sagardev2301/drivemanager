import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Driver, DriverRatingSummary } from '../../lib/supabase'
import StarRating from '../../components/book/StarRating'

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

  return (
    <div className="flex flex-col -mx-4 -mt-14">
      {/* Dark asphalt hero */}
      <div className="relative bg-on-surface pt-20 pb-10 px-4 overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 w-full opacity-20"
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="0" y="28" width="400" height="4" fill="#ffffff" />
          <rect x="10" y="26" width="24" height="8" rx="2" fill="#f5a623" />
          <rect x="70" y="26" width="24" height="8" rx="2" fill="#f5a623" />
          <rect x="130" y="26" width="24" height="8" rx="2" fill="#f5a623" />
          <rect x="190" y="26" width="24" height="8" rx="2" fill="#f5a623" />
          <rect x="250" y="26" width="24" height="8" rx="2" fill="#f5a623" />
          <rect x="310" y="26" width="24" height="8" rx="2" fill="#f5a623" />
          <rect x="370" y="26" width="24" height="8" rx="2" fill="#f5a623" />
        </svg>
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <span className="material-symbols-outlined text-white text-[48px]">directions_car</span>
          <h1 className="text-headline-lg font-semibold text-white tracking-tight max-w-xs">
            Learn to drive with confidence
          </h1>
          <p className="text-body-base text-white/70 max-w-xs">
            Compare certified instructors, real reviews, and flexible timings near you.
          </p>
          <button
            onClick={() => navigate('/book/drivers')}
            className="h-12 px-6 bg-primary-fixed text-on-primary-fixed rounded-xl font-semibold text-body-base shadow-lg active:scale-95 transition-all flex items-center gap-2"
          >
            Find your instructor
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Trust row */}
      <div className="px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-headline-sm font-semibold text-on-surface">
              {learnerCount !== null ? `${learnerCount}+` : '—'}
            </p>
            <p className="text-caption-xs text-on-surface-variant mt-0.5">Learners trained</p>
          </div>
          <div className="border-x border-outline-variant/40">
            <p className="text-headline-sm font-semibold text-on-surface">Certified</p>
            <p className="text-caption-xs text-on-surface-variant mt-0.5">Instructors</p>
          </div>
          <div>
            <p className="text-headline-sm font-semibold text-on-surface">Flexible</p>
            <p className="text-caption-xs text-on-surface-variant mt-0.5">Timings</p>
          </div>
        </div>
      </div>

      {/* Featured drivers */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-headline-sm font-semibold text-on-surface mb-3">Top-rated instructors</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No instructors listed yet.</p>
        ) : (
          <div className="space-y-3">
            {featured.map(d => (
              <button
                key={d.id}
                onClick={() => navigate(`/book/drivers/${d.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm active:scale-[0.98] transition-all flex items-center gap-3 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
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
