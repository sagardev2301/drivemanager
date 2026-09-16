import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Driver, DriverRatingSummary, CoursePackage, Review } from '../../lib/supabase'
import StarRating from '../../components/book/StarRating'
import { IconArrowRight, IconCar, IconChevronRight } from '../../components/book/icons'
import { formatPrice } from '../../lib/bookingFormat'

interface RailDriver extends Driver {
  average_rating: number
  review_count: number
  starting_price: number | null
}

interface LandingReview extends Review {
  learner_name: string
  driver_name: string
}

const STEPS = [
  {
    title: 'Pick your instructor',
    body: 'Compare profiles, packages and ratings. Every review here comes from a learner who actually took classes.',
  },
  {
    title: 'Request a time',
    body: 'Choose a date and slot that fits your week. Your request goes straight to that instructor.',
  },
  {
    title: 'Get confirmed, then drive',
    body: "You'll see the status under Bookings. Pay at the lesson — cash, UPI or card, whatever suits you.",
  },
]

export default function BookLanding() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState<RailDriver[]>([])
  const [reviews, setReviews] = useState<LandingReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function load() {
      const [driversRes, summaryRes, packagesRes, reviewsRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('is_active', true),
        supabase.from('driver_rating_summary').select('*'),
        supabase.from('course_packages').select('*').eq('is_active', true),
        supabase
          .from('reviews')
          .select('*, drivers(full_name)')
          .not('comment', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3),
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

      const list = ((driversRes.data as Driver[] | null) ?? []).map(d => ({
        ...d,
        average_rating: summaryMap.get(d.id)?.average_rating ?? 0,
        review_count: summaryMap.get(d.id)?.review_count ?? 0,
        starting_price: priceByDriver.get(d.id) ?? null,
      }))
      list.sort((a, b) => b.average_rating - a.average_rating)
      setDrivers(list)

      const reviewRows = (reviewsRes.data as (Review & { drivers: { full_name: string } | null })[] | null) ?? []
      const learnerIds = Array.from(new Set(reviewRows.map(r => r.learner_id)))
      const nameMap = new Map<string, string | null>()
      if (learnerIds.length > 0) {
        const { data } = await supabase.from('public_learner_names').select('id, full_name').in('id', learnerIds)
        for (const row of (data as { id: string; full_name: string | null }[] | null) ?? []) {
          nameMap.set(row.id, row.full_name)
        }
      }
      if (ignore) return
      setReviews(
        reviewRows.map(r => ({
          ...r,
          learner_name: nameMap.get(r.learner_id)?.split(' ')[0] ?? 'Learner',
          driver_name: r.drivers?.full_name ?? 'your instructor',
        }))
      )
      setLoading(false)
    }

    load()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-12 pb-6">
      {/* Opening statement */}
      <section className="pt-4">
        <h1 className="rd-display text-[clamp(40px,12vw,54px)] font-extrabold leading-[0.92]">
          Learn to
          <br />
          drive with
          <br />
          <span className="rd-brand">confidence.</span>
        </h1>
        <p className="rd-ink2 mt-4 max-w-[33ch] text-[15px] leading-[23px]">
          Compare certified instructors near you, read what past learners actually said, and hold a slot that fits your
          week.
        </p>
        <button onClick={() => navigate('/book/drivers')} className="rd-btn mt-6 h-14 w-full text-[15px]">
          Find your instructor
          <IconArrowRight size={18} />
        </button>
      </section>

      {/* Instructors */}
      <section>
        <header className="mb-4 flex items-end justify-between gap-3">
          <h2 className="rd-display text-[21px] font-bold">Meet the instructors</h2>
          {drivers.length > 0 && (
            <Link to="/book/drivers" className="rd-brand shrink-0 text-[13px] font-semibold">
              See all
            </Link>
          )}
        </header>

        {loading ? (
          <div className="rd-rail -mx-5 px-5">
            {[0, 1].map(i => (
              <div key={i} className="rd-skeleton h-[236px] w-[210px] rounded-[18px]" />
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="rd-card flex flex-col items-center gap-2 px-6 py-9 text-center">
            <span className="rd-ink3">
              <IconCar size={28} />
            </span>
            <p className="text-[15px] font-semibold">Instructor profiles are on the way</p>
            <p className="rd-ink2 text-[13px] leading-[20px]">
              Nobody has been listed for booking yet. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="rd-rail -mx-5 px-5">
            {drivers.slice(0, 6).map(driver => (
              <Link
                key={driver.id}
                to={`/book/drivers/${driver.id}`}
                className="rd-card rd-press w-[210px] overflow-hidden"
              >
                <div className="relative h-[124px] bg-[var(--brand-tint)]">
                  {driver.photo_url ? (
                    <img
                      src={driver.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="rd-display absolute inset-0 grid place-items-center text-[34px] font-extrabold text-[var(--brand)]/35">
                      {driver.full_name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="truncate text-[15px] font-semibold">{driver.full_name}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StarRating rating={driver.average_rating} size={13} />
                    <span className="rd-ink3 text-[12px]">
                      {driver.average_rating > 0 ? driver.average_rating.toFixed(1) : 'New'}
                    </span>
                  </div>
                  <p className="rd-ink2 mt-2.5 text-[13px]">
                    {driver.starting_price !== null ? (
                      <>
                        from <span className="font-semibold text-[var(--ink)]">{formatPrice(driver.starting_price)}</span>
                      </>
                    ) : (
                      'Packages coming soon'
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How it works — the sequence is the information, so it is numbered */}
      <section>
        <h2 className="rd-display mb-5 text-[21px] font-bold">How booking works</h2>
        <ol className="relative">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative pb-7 pl-12 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className="absolute bottom-2 left-[15px] top-9 w-px bg-[var(--line)]" aria-hidden="true" />
              )}
              <span className="rd-display absolute left-0 top-0 grid h-[31px] w-[31px] place-items-center rounded-full bg-[var(--ink)] text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <h3 className="pt-1 text-[15px] font-semibold">{step.title}</h3>
              <p className="rd-ink2 mt-1 text-[14px] leading-[21px]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section>
          <h2 className="rd-display mb-4 text-[21px] font-bold">What learners said</h2>
          <div className="flex flex-col gap-3">
            {reviews.map(review => (
              <Link key={review.id} to={`/book/drivers/${review.driver_id}`} className="rd-card rd-press block p-4">
                <StarRating rating={review.rating} size={14} />
                <p className="mt-2.5 text-[14px] leading-[22px]">“{review.comment}”</p>
                <p className="rd-ink3 mt-2.5 flex items-center gap-1 text-[12px] font-medium">
                  {review.learner_name} · on {review.driver_name}
                  <IconChevronRight size={13} />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
