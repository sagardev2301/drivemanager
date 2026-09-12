import type { Transition, Variants } from 'framer-motion'

// Shared timing/easing so every modal, sheet, and toast in the app feels
// consistent instead of each component hand-tuning its own duration.
export const sheetTransition: Transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] }
export const fadeTransition: Transition = { duration: 0.18, ease: 'easeOut' }

// Backdrop behind a bottom-sheet modal.
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: fadeTransition },
  exit: { opacity: 0, transition: fadeTransition },
}

// The sheet itself: slides up from below the viewport on enter, reverses on exit.
export const sheetVariants: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: sheetTransition },
  exit: { y: '100%', transition: sheetTransition },
}

// Top-of-screen toast.
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: fadeTransition },
  exit: { opacity: 0, y: -16, transition: fadeTransition },
}

// Filtered/deleted list cards: fade + scale in, fade + collapse-height out.
export const listItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: fadeTransition },
  exit: {
    opacity: 0,
    scale: 0.96,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
}
