import { IconStar } from './icons'

interface StarRatingProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

const GOLD = '#E8A317'
const EMPTY = '#CBD2E0'

// Display treatment for driver/review ratings, and the input for the review
// sheet when `interactive` is set.
export default function StarRating({ rating, size = 15, interactive = false, onChange }: StarRatingProps) {
  const rounded = Math.round(rating)

  if (!interactive) {
    return (
      <div className="flex items-center gap-[3px]" role="img" aria-label={`${rating.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map(star => (
          <IconStar key={star} size={size} filled={star <= rounded} style={{ color: star <= rounded ? GOLD : EMPTY }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={star <= rounded}
          className="p-1 transition-transform duration-150 active:scale-90"
        >
          <IconStar size={size} filled={star <= rounded} style={{ color: star <= rounded ? GOLD : EMPTY }} />
        </button>
      ))}
    </div>
  )
}
