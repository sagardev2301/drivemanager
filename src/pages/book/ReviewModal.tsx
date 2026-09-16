import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Booking } from '../../lib/supabase'
import { useModalBackButton } from '../../hooks/useModalBackButton'
import Sheet from '../../components/book/Sheet'
import StarRating from '../../components/book/StarRating'

interface ReviewModalProps {
  driverId: string
  driverName: string
  session: Session
  onClose: () => void
  onSaved: () => void
}

const RATING_WORDS: Record<number, string> = {
  1: 'Poor',
  2: 'Below average',
  3: 'Fine',
  4: 'Good',
  5: 'Excellent',
}

export default function ReviewModal({ driverId, driverName, session, onClose, onSaved }: ReviewModalProps) {
  const { requestClose } = useModalBackButton(true, onClose)

  const [bookingId, setBookingId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reviews are gated to a confirmed booking with this driver, matching the
  // RLS policy — resolve which booking this review hangs off before enabling
  // submit, so a rejected insert can't be the first time the learner finds out.
  useEffect(() => {
    let ignore = false
    supabase
      .from('bookings')
      .select('id')
      .eq('driver_id', driverId)
      .eq('learner_id', session.user.id)
      .eq('status', 'confirmed')
      .order('requested_date', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (ignore) return
        setBookingId((data as Pick<Booking, 'id'>[] | null)?.[0]?.id ?? null)
      })
    return () => {
      ignore = true
    }
  }, [driverId, session.user.id])

  async function handleSubmit() {
    if (!bookingId) return
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('reviews').insert({
      learner_id: session.user.id,
      driver_id: driverId,
      booking_id: bookingId,
      rating,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    if (insertError) {
      setError('Could not post your review. Try again in a moment.')
      return
    }
    onSaved()
  }

  return (
    <Sheet
      title="Rate your instructor"
      subtitle={driverName}
      onDismiss={requestClose}
      footer={
        <button
          disabled={submitting || !bookingId}
          onClick={handleSubmit}
          className="rd-btn h-[52px] w-full text-[15px]"
        >
          {submitting ? 'Posting…' : 'Post review'}
        </button>
      }
    >
      <div className="flex flex-col gap-5 pb-5">
        <div className="rd-card flex flex-col items-center gap-2 py-6">
          <StarRating rating={rating} size={30} interactive onChange={setRating} />
          <p className="rd-display text-[15px] font-bold">{RATING_WORDS[rating]}</p>
        </div>

        <div>
          <label htmlFor="review-comment" className="mb-2 block text-[14px] font-semibold">
            Anything worth telling other learners?
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="How were the lessons, the timings, the car?"
            className="rd-field h-auto resize-none py-3 leading-[22px]"
          />
          <p className="rd-ink3 mt-1.5 text-right text-[12px]">{comment.length}/500</p>
        </div>

        {!bookingId && (
          <p className="rd-chip rd-chip-mute h-auto w-full justify-start px-3 py-2 text-[13px] leading-[19px]">
            Reviews open up once you have a confirmed class with this instructor.
          </p>
        )}

        {error && (
          <p className="rd-chip rd-chip-stop h-auto w-full justify-start px-3 py-2 text-[13px]">{error}</p>
        )}
      </div>
    </Sheet>
  )
}
