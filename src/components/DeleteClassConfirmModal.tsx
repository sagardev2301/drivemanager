import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useModalBackButton } from '../hooks/useModalBackButton'
import { backdropVariants } from '../lib/motionPresets'

interface Props {
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  studentName: string
  error: string | null
}

export default function DeleteClassConfirmModal({ onClose, onConfirm, deleting, studentName, error }: Props) {
  const { requestClose } = useModalBackButton(true, onClose)

  return createPortal(
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => !deleting && requestClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center mb-4 mx-auto">
          <span className="material-symbols-outlined text-[26px]">delete_forever</span>
        </div>

        <h3 className="text-[18px] font-bold text-on-surface text-center mb-2">
          Delete Class?
        </h3>

        <p className="text-[13px] text-on-surface-variant text-center mb-6 leading-relaxed">
          Are you sure you want to delete this class for{' '}
          <span className="font-semibold text-on-surface">{studentName}</span>? This action cannot be undone.
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-[13px] mb-4">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={deleting}
            className="flex-1 h-11 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-[14px] hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-11 rounded-xl bg-error text-on-error font-semibold text-[14px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
          >
            {deleting ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Deleting...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">delete</span>Delete</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
