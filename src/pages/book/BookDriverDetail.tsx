import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import type { Driver, CoursePackage, Review, DriverRatingSummary } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import StarRating from '../../components/book/StarRating'
import RatingGauge from '../../components/book/RatingGauge'
import BookingModal from './BookingModal'
import ReviewModal from './ReviewModal'
import Toast from '../../components/Toast'

interface ReviewWithLearner extends Review {
  learner_name: string
}

export default function BookDriverDetail({ session }: { session: Session | null }) {
  const { driverId } = useParams<{ driverId: string }>()
  const navigate = useNavigate()

  const [driver, setDriver] = useState<Driver | null>(null)
  const [packages, setPackages] = useState<CoursePackage[]>([])
  const [reviews, setReviews] = useState<ReviewWithLearner[]>([])
  const [summary, setSummary] = useState<DriverRatingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [bookingPackage, setBookingPackage] = useState<CoursePackage | null>(null)
  const [showBookingChooser, setShowBookingChooser] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 2500)
  }

  const load = useCallback(async () => {
    if (!driverId) return
    const [driverRes, packagesRes, reviewsRes, summaryRes] = await Promise.all([
      supabase.from('drivers').select('*').eq('id', driverId).single(),
      supabase.from('course_packages').select('*').eq('driver_id', driverId).eq('is_active', true).order('price'),
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

    const reviewRows = (reviewsRes.data as Review[] | null) ?? []
    const learnerIds = Array.from(new Set(reviewRows.map(r => r.learner_id)))
    const profileMap = new Map<string, string | null>()
    if (learnerIds.length > 0) {
      const { data: profileRows } = await supabase.from('public_learner_names').select('id, full_name').in('id', learnerIds)
      for (const p of (profileRows as { id: string; full_name: string | null }[] | null) ?? []) {
        profileMap.set(p.id, p.full_name)
      }
    }
    setReviews(
      reviewRows.map(r => ({
        ...r,
        learner_name: profileMap.get(r.learner_id)?.split(' ')[0] ?? 'Learner',
      }))
    )
    setSummary((summaryRes.data as DriverRatingSummary | null) ?? null)
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

  function handleBookClick(pkg?: CoursePackage) {
    if (!session) {
      navigate('/book/login', { state: { from: `/book/drivers/${driverId}` } })
      return
    }
    if (pkg) {
      setBookingPackage(pkg)
    } else if (packages.length === 1) {
      setBookingPackage(packages[0])
    } else {
      setShowBookingChooser(true)
    }
  }

  function handleReviewClick() {
    if (!session) {
      navigate('/book/login', { state: { from: `/book/drivers/${driverId}` } })
      return
    }
    setShowReviewModal(true)
  }

  if (loading) {
    return (
      <div className="pt-4 space-y-4">
        <div className="h-40 rounded-2xl bg-white/60 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/60 animate-pulse" />
      </div>
    )
  }

  if (notFound || !driver) {
    return (
      <div className="pt-12 text-center">
        <p className="text-body-base font-semibold text-on-surface">Instructor not found</p>
        <button onClick={() => navigate('/book/drivers')} className="mt-3 text-primary text-body-sm font-semibold">
          Back to all instructors
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-8">
      <Toast message={toastMessage} />

      {/* Header */}
      <div className="sr-panel rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_1px_2px_rgba(20,27,43,0.06)]">
            {driver.photo_url ? (
              <img src={driver.photo_url} alt={driver.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant text-[32px]">person</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-headline-sm font-semibold text-on-surface truncate">{driver.full_name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={summary?.average_rating ?? 0} size={15} />
              <span className="text-caption-xs text-on-surface-variant">
                {summary && summary.average_rating > 0 ? summary.average_rating.toFixed(1) : 'New'} ({summary?.review_count ?? 0} reviews)
              </span>
            </div>
            {driver.years_experience !== null && (
              <p className="text-caption-xs text-on-surface-variant mt-0.5">{driver.years_experience}+ years experience</p>
            )}
          </div>
          <RatingGauge rating={summary?.average_rating ?? 0} reviewCount={summary?.review_count ?? 0} size={64} />
        </div>
        {driver.bio && <p className="text-body-sm text-on-surface-variant">{driver.bio}</p>}
        {driver.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {driver.specialties.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-white/70 text-caption-xs text-on-surface-variant font-medium">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sr-chrome-divider" />

      {/* Packages */}
      <div>
        <h2 className="text-headline-sm font-semibold text-on-surface mb-3">Course packages</h2>
        {packages.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No packages listed yet.</p>
        ) : (
          <div className="space-y-3">
            {packages.map(pkg => (
              <div key={pkg.id} className="sr-panel sr-tilt rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-strong text-on-surface">{pkg.name}</p>
                  <p className="text-caption-xs text-on-surface-variant mt-0.5">
                    {pkg.class_count} classes · {pkg.class_duration_minutes} min each
                  </p>
                  {pkg.description && <p className="text-body-sm text-on-surface-variant mt-1">{pkg.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-body-strong text-on-surface">₹{pkg.price}</p>
                  <button
                    onClick={() => handleBookClick(pkg)}
                    className="sr-btn-primary h-9 px-3 rounded-full text-white text-caption-xs font-semibold active:scale-95 transition-all"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-headline-sm font-semibold text-on-surface">Reviews</h2>
          {canReview && (
            <button onClick={handleReviewClick} className="text-primary text-caption-xs font-semibold">
              Leave a review
            </button>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="sr-panel rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-body-strong text-on-surface">{r.learner_name}</p>
                  <StarRating rating={r.rating} size={14} />
                </div>
                {r.comment && <p className="text-body-sm text-on-surface-variant mt-1.5">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky primary CTA */}
      <div
        className="fixed bottom-0 left-0 w-full z-30 px-4 pb-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={() => handleBookClick()}
          className="sr-btn-primary w-full h-12 text-white rounded-2xl font-semibold text-body-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">event_available</span>
          Book a class
        </button>
      </div>

      <AnimatePresence>
        {showBookingChooser && (
          <PackageChooserSheet
            packages={packages}
            onClose={() => setShowBookingChooser(false)}
            onSelect={pkg => {
              setShowBookingChooser(false)
              setBookingPackage(pkg)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingPackage && session && (
          <BookingModal
            driver={driver}
            coursePackage={bookingPackage}
            session={session}
            onClose={() => setBookingPackage(null)}
            onBooked={() => {
              setBookingPackage(null)
              showToast('Booking request sent — pending confirmation')
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReviewModal && session && (
          <ReviewModal
            driverId={driver.id}
            session={session}
            onClose={() => setShowReviewModal(false)}
            onSaved={() => {
              setShowReviewModal(false)
              showToast('Thanks for your review!')
              load()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PackageChooserSheet({
  packages,
  onClose,
  onSelect,
}: {
  packages: CoursePackage[]
  onClose: () => void
  onSelect: (pkg: CoursePackage) => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-on-surface/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="sr-panel w-full max-w-sm rounded-t-3xl p-4 flex flex-col gap-3"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-1 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>
        <h3 className="text-headline-sm font-semibold text-on-surface px-1">Choose a package</h3>
        {packages.map(pkg => (
          <button
            key={pkg.id}
            onClick={() => onSelect(pkg)}
            className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/70 active:scale-[0.98] transition-all text-left"
          >
            <div>
              <p className="text-body-strong text-on-surface">{pkg.name}</p>
              <p className="text-caption-xs text-on-surface-variant">{pkg.class_count} classes</p>
            </div>
            <p className="text-body-strong text-on-surface">₹{pkg.price}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
