import { useEffect, useRef } from 'react'

interface ModalBackButtonState {
  pushed: boolean
  handled: boolean
}

/**
 * Syncs a modal/bottom-sheet's open state with browser history so the
 * hardware/gesture back button closes it instead of falling through to
 * page navigation (or, in the Android wrapper, the exit-confirmation dialog).
 *
 * While `isOpen`, pushes one history entry. A real back-press (popstate)
 * calls `onRequestClose`. Any other close path should call `requestClose()`
 * (returned below) so it consumes that same entry via history.back() rather
 * than flipping state directly — otherwise the next real back-press pops a
 * stale entry and does nothing visible ("dead" back press).
 *
 * If the modal unmounts without the entry being consumed (e.g. one modal
 * swapped for another without going through requestClose), the entry is
 * popped automatically on cleanup so the stack never grows unbounded.
 */
export function useModalBackButton(isOpen: boolean, onRequestClose: () => void) {
  const closeRef = useRef(onRequestClose)
  closeRef.current = onRequestClose

  const stateRef = useRef<ModalBackButtonState>({ pushed: false, handled: false })

  useEffect(() => {
    if (!isOpen) return

    stateRef.current = { pushed: true, handled: false }
    window.history.pushState({ modalBackGuard: true }, '')

    function handlePopState() {
      stateRef.current.handled = true
      closeRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (stateRef.current.pushed && !stateRef.current.handled) {
        stateRef.current.handled = true
        window.history.back()
      }
    }
  }, [isOpen])

  function requestClose() {
    window.history.back()
  }

  // For close actions that also navigate to a new route (e.g. via
  // navigate(path, { replace: true })): call this synchronously first so
  // the cleanup above doesn't also call history.back() after the entry has
  // already been replaced out from under it.
  function markHandled() {
    stateRef.current.handled = true
  }

  return { requestClose, markHandled }
}
