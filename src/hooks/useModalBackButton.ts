import { useEffect, useRef } from 'react'

interface ModalBackButtonState {
  pushed: boolean
  handled: boolean
}

// Shared across every hook instance. When a modal's history entry is
// released without being consumed via popstate (e.g. it was swapped for a
// different modal within the same React commit — Mark Done -> Collect
// Payment), we can't just call history.back() immediately: that call is
// asynchronous, so if the incoming modal's mount effect calls pushState
// before the browser gets around to processing the back(), the back() ends
// up popping the NEW entry instead of the old one, closing the modal that
// just opened. Instead we park the released entry here for one microtask —
// long enough for a modal mounting in the same commit to "adopt" it (no
// push, no pop, net-zero history ops) — and only actually call
// history.back() if nothing claimed it.
let releasedEntry: { claimed: boolean } | null = null

/**
 * Syncs a modal/bottom-sheet's open state with browser history so the
 * hardware/gesture back button closes it instead of falling through to
 * page navigation (or, in the Android wrapper, the exit-confirmation dialog).
 *
 * While `isOpen`, ensures exactly one history entry is attributed to this
 * modal (either by pushing one, or adopting one left behind by a modal that
 * closed in the same commit). A real back-press (popstate) calls
 * `onRequestClose`. Any other close path should call `requestClose()`
 * (returned below) so it consumes that same entry via history.back() rather
 * than flipping state directly — otherwise the next real back-press pops a
 * stale entry and does nothing visible ("dead" back press).
 */
export function useModalBackButton(isOpen: boolean, onRequestClose: () => void) {
  const closeRef = useRef(onRequestClose)
  closeRef.current = onRequestClose

  const stateRef = useRef<ModalBackButtonState>({ pushed: false, handled: false })

  useEffect(() => {
    if (!isOpen) return

    if (releasedEntry && !releasedEntry.claimed) {
      // Take over the entry a just-unmounted modal left behind this same
      // commit, instead of pushing a new one.
      releasedEntry.claimed = true
    } else {
      window.history.pushState({ modalBackGuard: true }, '')
    }
    stateRef.current = { pushed: true, handled: false }

    function handlePopState() {
      stateRef.current.handled = true
      closeRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (stateRef.current.pushed && !stateRef.current.handled) {
        stateRef.current.handled = true
        const token = { claimed: false }
        releasedEntry = token
        queueMicrotask(() => {
          if (releasedEntry === token && !token.claimed) {
            releasedEntry = null
            window.history.back()
          }
        })
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
