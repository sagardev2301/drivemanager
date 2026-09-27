import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { SiteReview, SiteReviewStatus } from '../lib/supabase'
import { formatRelativeTime } from '../lib/dateUtils'
import { listItemVariants } from '../lib/motionPresets'
import SegmentedControl from '../components/SegmentedControl'
import Toast from '../components/Toast'

const TABS: { key: SiteReviewStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const EMPTY_TEXT: Record<SiteReviewStatus, string> = {
  pending: 'No reviews waiting for approval.',
  approved: 'No approved reviews yet. Approved reviews appear on the website.',
  rejected: 'No rejected reviews.',
}

const SELECT = 'id, customer_id, author_name, rating, comment, status, created_at, customers(full_name, customer_code)'

type LoadState = 'loading' | 'ready' | 'missing_table' | 'error'

// PostgREST reports an unknown table as PGRST205 ("not in the schema cache");
// Postgres itself uses 42P01. Either means the website migration hasn't run.
function isMissingTableError(error: { code?: string; message?: string }) {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    (/site_reviews/.test(error.message ?? '') && /does not exist|schema cache/i.test(error.message ?? ''))
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`material-symbols-outlined text-[16px] ${i <= rating ? 'text-amber-500' : 'text-outline-variant'}`}
          style={{ fontVariationSettings: i <= rating ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function Reviews() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<SiteReview[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [activeTab, setActiveTab] = useState<SiteReviewStatus>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev))
    }, 2500)
  }

  useEffect(() => {
    let ignore = false
    supabase
      .from('site_reviews')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (ignore) return
        if (error) {
          console.error('Error fetching site reviews:', error)
          setLoadState(isMissingTableError(error) ? 'missing_table' : 'error')
        } else {
          setReviews((data ?? []) as unknown as SiteReview[])
          setLoadState('ready')
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  const counts = useMemo(() => {
    const result: Record<SiteReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 }
    for (const r of reviews) {
      if (r.status in result) result[r.status]++
    }
    return result
  }, [reviews])

  const visibleReviews = useMemo(
    () => reviews.filter(r => r.status === activeTab),
    [reviews, activeTab],
  )

  async function setStatus(review: SiteReview, status: SiteReviewStatus) {
    setBusyId(review.id)
    setActionError(null)
    const { error } = await supabase.from('site_reviews').update({ status }).eq('id', review.id)
    setBusyId(null)
    if (error) {
      console.error('Error updating review status:', error)
      setActionError(`Couldn't update the review from ${review.author_name}. Please try again.`)
      return
    }
    setReviews(prev => prev.map(r => (r.id === review.id ? { ...r, status } : r)))
    showToast(status === 'approved' ? 'Review approved — now live on the website' : 'Review rejected')
  }

  const tabOptions = TABS.map(t => ({
    key: t.key,
    label: loadState === 'ready' ? `${t.label} ${counts[t.key]}` : t.label,
  }))

  return (
    <div className="flex flex-col space-y-4 pb-12">
      <Toast message={toastMessage} />

      <div className="pt-1">
        <h1 className="text-headline-md text-on-surface">Website Reviews</h1>
        <p className="text-body-sm text-on-surface-variant mt-0.5">
          Approve a review to publish it on the website.
        </p>
      </div>

      {loadState === 'missing_table' ? (
        <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-6 text-center flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">database</span>
          </div>
          <div>
            <p className="text-headline-sm text-on-surface">Reviews aren't set up yet</p>
            <p className="text-body-sm text-on-surface-variant mt-1 max-w-xs mx-auto">
              The <code className="font-mono">site_reviews</code> table doesn't exist in the database. Run the
              website migration (<code className="font-mono">20260927_website_reviews_and_leads.sql</code>) in the
              Supabase SQL Editor, then reload this page.
            </p>
          </div>
        </div>
      ) : loadState === 'error' ? (
        <div className="bg-error-container text-on-error-container rounded-xl p-4 flex items-start gap-2">
          <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
          <p className="text-body-sm">Couldn't load reviews. Check your connection and reload the page.</p>
        </div>
      ) : (
        <>
          <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />

          {actionError && (
            <div className="bg-error-container text-on-error-container rounded-xl p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <p className="text-body-sm flex-1">{actionError}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setActionError(null)}
                className="shrink-0 -m-1 p-1 rounded-full"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          <div className="space-y-3">
            {loadState === 'loading' ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm animate-pulse space-y-2">
                  <div className="h-4 bg-surface-container-high rounded w-1/3" />
                  <div className="h-3 bg-surface-container rounded w-1/4" />
                  <div className="h-3 bg-surface-container rounded w-full" />
                </div>
              ))
            ) : visibleReviews.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-8 text-center flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px]">reviews</span>
                </div>
                <p className="text-body-sm text-on-surface-variant max-w-xs">{EMPTY_TEXT[activeTab]}</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {visibleReviews.map(review => {
                  const busy = busyId === review.id
                  const customer = review.customers
                  return (
                    <motion.div
                      key={review.id}
                      layout
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="bg-surface-container-lowest rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="text-headline-sm text-on-surface truncate" title={review.author_name}>
                            {review.author_name}
                          </h2>
                          <Stars rating={review.rating} />
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-caption-xs text-on-surface-variant">{formatDate(review.created_at)}</p>
                          <p className="text-caption-xs text-outline">{formatRelativeTime(review.created_at)}</p>
                        </div>
                      </div>

                      <p className="text-body-base text-on-surface mt-2 whitespace-pre-line break-words">
                        {review.comment}
                      </p>

                      {/* Who actually wrote it: the verified customer the RPC matched by phone */}
                      <div className="mt-3 pt-3 border-t border-surface-container-high">
                        {customer && review.customer_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/customers/${review.customer_id}`)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-label-badge active:scale-95 transition-all max-w-full"
                          >
                            <span className="material-symbols-outlined text-[14px] text-primary">verified_user</span>
                            <span className="truncate">{customer.full_name}</span>
                            <span className="text-outline shrink-0">· {customer.customer_code}</span>
                            <span className="material-symbols-outlined text-[14px] shrink-0">chevron_right</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-label-badge">
                            <span className="material-symbols-outlined text-[14px]">person_off</span>
                            <span>No linked customer</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(review, 'rejected')}
                            className="flex-1 h-10 rounded-xl border border-outline-variant text-error text-body-strong flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                            <span>{review.status === 'approved' ? 'Unpublish' : 'Reject'}</span>
                          </button>
                        )}
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(review, 'approved')}
                            className="flex-1 h-10 rounded-xl bg-tertiary-container text-on-tertiary text-body-strong flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {busy ? 'progress_activity' : 'check'}
                            </span>
                            <span>Approve</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </>
      )}
    </div>
  )
}
