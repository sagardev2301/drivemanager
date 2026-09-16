import { WEEKDAY_SHORT } from '../../lib/bookingFormat'

export interface StripDay {
  date: string // YYYY-MM-DD
  dow: number
  available: boolean
}

interface DateStripProps {
  days: StripDay[]
  selected: string
  onSelect: (date: string) => void
}

// Swipeable day rail — replaces launching a full calendar modal to pick a
// date, which is a lot of ceremony for "the next couple of weeks" on a phone.
// Days the instructor never works are shown but disabled, so the learner can
// see the shape of the week rather than wondering where Sunday went.
export default function DateStrip({ days, selected, onSelect }: DateStripProps) {
  return (
    <div className="rd-rail -mx-5 px-5" role="group" aria-label="Choose a date">
      {days.map(day => {
        const isSelected = day.date === selected
        const dayNumber = day.date.slice(8, 10).replace(/^0/, '')
        return (
          <button
            key={day.date}
            type="button"
            disabled={!day.available}
            onClick={() => onSelect(day.date)}
            aria-pressed={isSelected}
            className={`flex h-[70px] w-[58px] flex-col items-center justify-center gap-1 rounded-[16px] border transition-all duration-150 active:scale-95 ${
              isSelected
                ? 'border-transparent bg-[var(--brand)] text-white shadow-[0_8px_18px_-10px_rgba(18,63,158,0.9)]'
                : day.available
                  ? 'border-[var(--line)] bg-white text-[var(--ink)]'
                  : 'border-transparent bg-[#eceff5] text-[var(--ink-3)]'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isSelected ? 'text-white/75' : 'rd-ink3'}`}>
              {WEEKDAY_SHORT[day.dow]}
            </span>
            <span className="rd-display text-[19px] font-bold leading-none">{dayNumber}</span>
          </button>
        )
      })}
    </div>
  )
}
