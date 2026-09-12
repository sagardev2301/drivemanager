import type { ReactNode } from 'react'

interface FilterChipRowProps {
  children: ReactNode
}

// Shared filter-chip row: horizontal scroll wrapper used by both the
// Customers and Leads filter bars (see Customers.tsx for the original).
export function FilterChipRow({ children }: FilterChipRowProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-none">
      {children}
    </div>
  )
}

interface FilterChipProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

// Shared filter chip pill: same shape/spacing/active-inactive treatment
// as the Customers page chips.
export function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
        active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      {children}
    </button>
  )
}
