import { useCallback, useEffect, useRef } from 'react'
import { focusFirst } from '../utils/focus'

interface Pending {
  /** Tried in order after each render until one matches and takes focus. */
  selectors: readonly string[]
  onFocused?: (el: HTMLElement) => void
}

/**
 * Moves focus to an element that the next render (or a later one) will draw.
 *
 * Some controls remove themselves when used: the basho picker's links go while the
 * archived sheet loads, and the empty state's buttons go with the empty state. Focus
 * would fall to <body> (WCAG 2.4.3), so the control asks for its successor instead,
 * by selector, and focus lands on it once it exists. Call this in the component whose
 * renders bring the target (App): it checks after each of them. A focus the reader
 * makes in the meantime wins, and the request is dropped.
 */
export function usePendingFocus(): (
  selectors: readonly string[],
  onFocused?: (el: HTMLElement) => void
) => void {
  const pending = useRef<Pending | null>(null)

  useEffect(() => {
    const drop = () => {
      pending.current = null
    }
    document.addEventListener('focusin', drop)
    return () => document.removeEventListener('focusin', drop)
  }, [])

  useEffect(() => {
    const request = pending.current
    if (!request) return
    for (const selector of request.selectors) {
      const el = document.querySelector(selector)
      if (!el) continue
      // Settled before focusing, so the focusin this fires is not taken for the reader's.
      pending.current = null
      if (focusFirst([el])) {
        request.onFocused?.(el as HTMLElement)
        return
      }
      pending.current = request
    }
  })

  return useCallback((selectors: readonly string[], onFocused?: (el: HTMLElement) => void) => {
    pending.current = { selectors, onFocused }
  }, [])
}
