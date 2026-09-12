import type { ReactNode } from 'react'

interface EntityListCardProps {
  onClick?: () => void
  avatarClassName: string
  avatarContent: ReactNode
  name: string
  nameSuffix?: ReactNode
  phone: string
  location?: string | null
  topRight?: ReactNode
  children?: ReactNode
}

// Shared list card shell: same padding, radius, shadow, avatar size, and
// name/phone typography as the Customers page card. Callers supply the
// avatar colors/ring, the top-right badge, and any footer content
// (progress bar, meta row, ...) so entity-specific styling stays local.
export default function EntityListCard({
  onClick,
  avatarClassName,
  avatarContent,
  name,
  nameSuffix,
  phone,
  location,
  topRight,
  children,
}: EntityListCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm active:bg-surface-container-low active:scale-[0.98] transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0 ${avatarClassName}`}>
            {avatarContent}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-on-surface truncate" title={name}>{name}</h2>
              {nameSuffix}
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant mt-0.5 min-w-0">
              <span className="material-symbols-outlined text-[14px] shrink-0">phone</span>
              <span className="text-[11px] tracking-wide truncate">{phone}</span>
            </div>
            {location && (
              <div className="flex items-center gap-1 text-on-surface-variant mt-0.5 min-w-0">
                <span className="material-symbols-outlined text-[14px] text-primary shrink-0">location_on</span>
                <span className="text-[11px] tracking-wide truncate">{location}</span>
              </div>
            )}
          </div>
        </div>
        {topRight}
      </div>
      {children}
    </div>
  )
}
