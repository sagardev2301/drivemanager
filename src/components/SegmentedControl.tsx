import { motion } from 'framer-motion'

interface SegmentedControlProps<T extends string> {
  options: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
}

// Fixed-width pill row with a single shared-layout background that slides
// between options, instead of each pill independently toggling color.
// Distinct from FilterChip/FilterChipRow (used by Customers/Leads), which
// scroll horizontally with a variable number of pills and don't suit a
// single sliding indicator.
export default function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center gap-1 bg-surface-container-low rounded-full p-1">
      {options.map(opt => {
        const active = opt.key === value
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`relative flex-1 px-2 py-1.5 rounded-full text-[12px] font-semibold text-center transition-colors active:scale-95 ${
              active ? 'text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            {active && (
              <motion.div
                layoutId="segmentedControlPill"
                className="absolute inset-0 bg-primary rounded-full shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
