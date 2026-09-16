import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Booking } from '../../lib/supabase'
import { useModalBackButton } from '../../hooks/useModalBackButton'
import { backdropVariants, sheetVariants } from '../../lib/motionPresets'
import StarRating from '../../components/book/StarRating'

interface ReviewModalProps {
  driverId: string
  session: Session
  onClose: () => void
  onSaved: () => void
}

export default function ReviewModal({ driverId, session, onClose, onSaved }: ReviewModalProps) {
  const { requestClose, markHandled } = useModalBackButton(true, onClose)

  const [bookingId, setBookingId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('bookings')
      .select('id')
      .eq('driver_id', driverId)
      .eq('learner_id', session.user.id)
      .eq('status', 'confirmed')
      .order('requested_date', { ascending: false })
      .limit(1)
      .then(({ data }) => setBookingId((data as Pick<Booking, 'id'>[] | null)?.[0]?.id ?? null))
  }, [driverId, session.user.id])

  async function handleSubmit() {
    if (!bookingId) return
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('reviews').insert({
      learner_id: session.user.id,
      driver_id: driverId,
      booking_id: bookingId,
      rating,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    markHandled()
    onSaved()
  }

  return createPortal(
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={requestClose}
    >
      <motion.div
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl p-4 flex flex-col gap-4"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-1 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-container-high" />
        </div>

        <h3 className="text-headline-sm font-semibold text-on-surface px-1">Leave a review</h3>

        <div className="flex flex-col items-center gap-2 py-2">
          <StarRating rating={rating} size={32} interactive onChange={setRating} />
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="How was your experience? (optional)"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline border border-outline-variant/30 resize-none"
        />

        {error && (
          <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-body-sm">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <button
          disabled={submitting || !bookingId}
          onClick={handleSubmit}
          className="w-full h-11 bg-primary text-on-primary rounded-xl font-semibold text-body-base disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {submitting ? 'Submitting...' : 'Submit review'}
        </button>
      </motion.div>
    </motion.div>,
    document.body
  )
}
