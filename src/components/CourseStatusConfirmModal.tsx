import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useModalBackButton } from '../hooks/useModalBackButton'
import { backdropVariants } from '../lib/motionPresets'

interface Props {
  onClose: () => void
  onConfirm: () => void
  updating: boolean
  fullName: string
  isCompleted: boolean
}

export default function CourseStatusConfirmModal({ onClose, onConfirm, updating, fullName, isCompleted }: Props) {
  const { requestClose } = useModalBackButton(true, onClose)

  return createPortal(
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => !updating && requestClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-xl bg-tertiary-fixed/30 text-tertiary flex items-center justify-center mb-4 mx-auto">
          <span className="material-symbols-outlined text-[26px]">
            {isCompleted ? 'restart_alt' : 'task_alt'}
          </span>
        </div>

        <h3 className="text-[18px] font-bold text-on-surface text-center mb-2">
          {isCompleted ? 'Reactivate Course?' : 'Complete Course?'}
        </h3>

        <p className="text-[13px] text-on-surface-variant text-center mb-6 leading-relaxed">
          {isCompleted ? (
            <>Reactivate the course for <span className="font-semibold text-on-surface">{fullName}</span>? They'll show as active again.</>
          ) : (
            <>Mark the course as completed for <span className="font-semibold text-on-surface">{fullName}</span>? This updates their status to Completed.</>
          )}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={updating}
            className="flex-1 h-11 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-[14px] hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={updating}
            className="flex-1 h-11 rounded-xl bg-tertiary text-on-tertiary font-semibold text-[14px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
          >
            {updating ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">check_circle</span>Confirm</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
