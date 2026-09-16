import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { backdropVariants, sheetVariants } from '../../lib/motionPresets'
import { IconClose } from './icons'

interface SheetProps {
  title: string
  subtitle?: string
  onDismiss: () => void
  children: ReactNode
  footer?: ReactNode
}

// Presentational bottom-sheet shell for the portal. History/back-button
// handling stays with the caller (useModalBackButton) so the owning modal
// keeps control of what "close" means on a success path vs. a dismissal.
export default function Sheet({ title, subtitle, onDismiss, children, footer }: SheetProps) {
  return createPortal(
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0b0f1a]/45 backdrop-blur-[2px]"
      onClick={onDismiss}
    >
      <motion.div
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rd rd-sheet flex w-full max-w-md flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-9 rounded-full bg-[#d6dbe6]" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-4">
          <div className="min-w-0">
            <h2 className="rd-display text-[19px] font-bold leading-tight">{title}</h2>
            {subtitle && <p className="rd-ink2 mt-0.5 truncate text-[13px]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="rd-ink2 -mr-1.5 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors active:bg-[#f0f3f8]"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">{children}</div>

        {footer && (
          <div
            className="border-t border-[var(--line)] px-5 pt-3"
            style={{ paddingBottom: 'calc(0.9rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}
