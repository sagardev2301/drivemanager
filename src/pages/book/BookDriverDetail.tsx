import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type {
  CoursePackage,
  Driver,
  DriverAvailability,
  DriverRatingSummary,
  Review,
} from '../../lib/supabase'
import StarRating from '../../components/book/StarRating'
import BookingModal from './BookingModal'
import ReviewModal from './ReviewModal'
import Toast from '../../components/Toast'
import { IconArrowLeft, IconCalendar, IconStar, IconTicket } from '../../components/book/icons'
import { WEEKDAY_SHORT, formatPrice, formatTimeLabel } from '../../lib/bookingFormat'

interface ReviewWithLearner extends Review {
  learner_name: string
}

export default function BookDriverDetail({ session }: { session: Session | null }) {
  const { driverId } = useParams<{ driverId: string }>()
  const navigate = useNavigate()

  const [driver, setDriver] = useState<Driver | null>(null)
  const [packages, setPackages] = useState<CoursePackage[]>([])
  const [availability, setAvailability] = useState<DriverAvailability[]>([])
  const [reviews, setReviews] = useState<ReviewWithLearner[]>([])
  const [summary, setSummary] = useState<DriverRatingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [bookingOpen, setBookingOpen] = useState(false)
  const [preselectedPackage, setPreselectedPackage] = useState<CoursePackage | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(prev => (prev === message ? null : prev)), 2600)
  }

  const load = useCallback(async () => {
    if (!driverId) return
    const [driverRes, packagesRes, availabilityRes, reviewsRes, summaryRes] = await Promise.all([
      supabase.from('drivers').select('*').eq('id', driverId).single(),
      supabase.from('course_packages').select('*').eq('driver_id', driverId).eq('is_active', true).order('price'),
      supabase
        .from('driver_availability')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('day_of_week'),
      supabase.from('reviews').select('*').eq('driver_id', driverId).order('created_at', { ascending: false }),
      supabase.from('driver_rating_summary').select('*').eq('driver_id', driverId).maybeSingle(),
    ])

    if (driverRes.error || !driverRes.data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setDriver(driverRes.data as Driver)
    setPackages((packagesRes.data as CoursePackage[] | null) ?? [])
    setAvailability((availabilityRes.data as DriverAvailability[] | null) ?? [])
    setSummary((summaryRes.data as DriverRatingSummary | null) ?? null)

    const reviewRows = (reviewsRes.data as Review[] | null) ?? []
    const learnerIds = Array.from(new Set(reviewRows.map(r => r.learner_id)))
    const nameMap = new Map<string, string | null>()
    if (learnerIds.length > 0) {
      const { data } = await supabase.from('public_learner_names').select('id, full_name').in('id', learnerIds)
      for (const row of (data as { id: string; full_name: string | null }[] | null) ?? []) {
        nameMap.set(row.id, row.full_name)
      }
    }
    setReviews(
      reviewRows.map(r => ({ ...r, learner_name: nameMap.get(r.learner_id)?.split(' ')[0] ?? 'Learner' }))
    )
    setLoading(false)
  }, [driverId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!session || !driverId) {
      setCanReview(false)
      return
    }
    supabase
      .from('bookings')
      .select('id')
      .eq('driver_id', driverId)
      .eq('learner_id', session.user.id)
      .eq('status', 'confirmed')
      .limit(1)
      .then(({ data }) => setCanReview(!!data && data.length > 0))
  }, [session, driverId])

  const availabilityByDay = useMemo(() => {
    const grouped = new Map<number, DriverAvailability[]>()
    for (const slot of availability) {
      const existing = grouped.get(slot.day_of_week) ?? []
      existing.push(slot)
      grouped.set(slot.day_of_week, existing)
    }
    return grouped
  }, [availability])

  function requireLogin() {
    navigate('/book/login', { state: { from: `/book/drivers/${driverId}` } })
  }

  function openBooking(pkg?: CoursePackage) {
    if (!session) return requireLogin()
    setPreselectedPackage(pkg ?? null)
    setBookingOpen(true)
  }

  function openReview() {
    if (!session) return requireLogin()
    setReviewOpen(true)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rd-skeleton h-[230px] rounded-b-[26px]" />
        <div className="flex flex-col gap-3 p-5">
          <div className="rd-skeleton h-24 rounded-[18px]" />
          <div className="rd-skeleton h-24 rounded-[18px]" />
        </div>
      </div>
    )
  }

  if (notFound || !driver) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="rd-display text-[19px] font-bold">This instructor isn’t available</p>
        <p className="rd-ink2 text-[14px]">The profile may have been removed from booking.</p>
        <button onClick={() => navigate('/book/drivers')} className="rd-btn mt-1 h-11 px-5 text-[14px]">
          Browse instructors
        </button>
      </div>
    )
  }

  const rating = summary?.average_rating ?? 0
  const reviewCount = summary?.review_count ?? 0

  return (
    <div className="mx-auto w-full max-w-md pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <Toast message={toastMessage} />

      {/* Photo header */}
      <header className="relative h-[240px] overflow-hidden rounded-b-[26px] bg-[var(--brand)]">
        {driver.photo_url ? (
          <img src={driver.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2f6bef] to-[#123f9e]">
            <span className="rd-display text-[64px] font-extrabold text-white/25">
              {driver.full_name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06090f]/85 via-[#06090f]/25 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-90"
          style={{ top: 'calc(0.9rem + env(safe-area-inset-top, 0px))' }}
        >
          <IconArrowLeft size={19} />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h1 className="rd-display text-[28px] font-extrabold leading-tight">{driver.full_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            <span className="flex items-center gap-1.5">
              <StarRating rating={rating} size={14} />
              <span className="font-semibold">
                {rating > 0 ? rating.toFixed(1) : 'Newly listed'}
              </span>
              {reviewCount > 0 && (
                <span className="text-white/70">
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              )}
            </span>
            {driver.years_experience !== null && (
              <span className="text-white/80">{driver.years_experience}+ yrs experience</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-8 px-5 pt-6">
        {driver.bio && <p className="text-[15px] leading-[24px]">{driver.bio}</p>}

        {driver.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {driver.specialties.map(s => (
              <span key={s} className="rd-chip rd-chip-brand">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Packages */}
        <section>
          <h2 className="rd-display mb-3.5 text-[19px] font-bold">Packages</h2>
          {packages.length === 0 ? (
            <div className="rd-card flex items-center gap-3 p-4">
              <span className="rd-ink3">
                <IconTicket size={20} />
              </span>
              <p className="rd-ink2 text-[14px]">No packages published yet — check back soon.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {packages.map(pkg => (
                <div key={pkg.id} className="rd-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold">{pkg.name}</p>
                      <p className="rd-ink2 mt-0.5 text-[13px]">
                        {pkg.class_count} {pkg.class_count === 1 ? 'class' : 'classes'} · {pkg.class_duration_minutes} min
                        each
                      </p>
                    </div>
                    <p className="rd-display shrink-0 text-[20px] font-extrabold">{formatPrice(pkg.price)}</p>
                  </div>
                  {pkg.description && (
                    <p className="rd-ink2 mt-2 text-[13px] leading-[20px]">{pkg.description}</p>
                  )}
                  <button
                    onClick={() => openBooking(pkg)}
                    className="rd-btn-quiet mt-3.5 h-11 w-full text-[14px]"
                  >
                    Choose this package
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Weekly availability */}
        {availability.length > 0 && (
          <section>
            <h2 className="rd-display mb-3.5 flex items-center gap-2 text-[19px] font-bold">
              <IconCalendar size={18} />
              Usual hours
            </h2>
            <div className="rd-card divide-y divide-[var(--line)]">
              {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                const slots = availabilityByDay.get(dow)
                return (
                  <div key={dow} className="flex items-center justify-between px-4 py-2.5">
                    <span className={`text-[14px] font-semibold ${slots ? '' : 'rd-ink3'}`}>
                      {WEEKDAY_SHORT[dow]}
                    </span>
                    <span className={`text-[13px] ${slots ? 'rd-ink2' : 'rd-ink3'}`}>
                      {slots
                        ? slots
                            .map(s => `${formatTimeLabel(s.start_time)} – ${formatTimeLabel(s.end_time)}`)
                            .join(', ')
                        : 'Closed'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className="rd-display text-[19px] font-bold">Reviews</h2>
            {canReview && (
              <button onClick={openReview} className="rd-brand flex items-center gap-1 text-[13px] font-semibold">
                <IconStar size={14} />
                Write one
              </button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="rd-card p-4">
              <p className="rd-ink2 text-[14px]">
                No reviews yet{canReview ? ' — you could be the first.' : '. They appear once learners finish classes.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map(review => (
                <article key={review.id} className="rd-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold">{review.learner_name}</p>
                    <StarRating rating={review.rating} size={13} />
                  </div>
                  {review.comment && (
                    <p className="rd-ink2 mt-2 text-[14px] leading-[22px]">{review.comment}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[rgba(255,255,255,0.92)] px-5 pt-3 backdrop-blur-xl"
        style={{ paddingBottom: 'calc(0.9rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto max-w-md">
          <button
            onClick={() => openBooking()}
            disabled={packages.length === 0}
            className="rd-btn h-[52px] w-full text-[15px]"
          >
            {packages.length === 0 ? 'Not open for booking yet' : 'Book a class'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {bookingOpen && session && (
          <BookingModal
            driver={driver}
            packages={packages}
            initialPackage={preselectedPackage}
            session={session}
            onClose={() => setBookingOpen(false)}
            onBooked={() => {
              setBookingOpen(false)
              showToast('Request sent — waiting on confirmation')
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewOpen && session && (
          <ReviewModal
            driverId={driver.id}
            driverName={driver.full_name}
            session={session}
            onClose={() => setReviewOpen(false)}
            onSaved={() => {
              setReviewOpen(false)
              showToast('Thanks — your review is live')
              load()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
