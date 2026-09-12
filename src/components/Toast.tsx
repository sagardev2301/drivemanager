import { AnimatePresence, motion } from 'framer-motion'
import { toastVariants } from '../lib/motionPresets'

interface ToastProps {
  message: string | null
}

// Shared success toast: slides down + fades in from the top, reverses on
// dismiss. Used by any page that calls a local showToast(msg) helper.
export default function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-slate-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
