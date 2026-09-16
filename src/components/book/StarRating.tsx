interface StarRatingProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

// Shared star display (driver cards, reviews) and star input (review form) —
// pass `interactive` + `onChange` for the input variant.
export default function StarRating({ rating, size = 16, interactive = false, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={interactive ? 'active:scale-90 transition-transform' : 'cursor-default'}
          aria-label={interactive ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: size,
              fontVariationSettings: star <= Math.round(rating) ? "'FILL' 1" : "'FILL' 0",
              color: star <= Math.round(rating) ? '#f5a623' : '#c3c5d7',
            }}
          >
            star
          </span>
        </button>
      ))}
    </div>
  )
}
