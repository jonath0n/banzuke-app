import { useCallback, useState } from 'react'

/** localStorage key for the single-key shortcuts switch; absent means on. */
export const SHORTCUTS_KEY = 'banzuke:single-key-shortcuts'

function read(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_KEY) !== 'off'
  } catch {
    return true
  }
}

/**
 * Whether the single-character shortcuts (L, /, ?) are on. WCAG 2.1.4: a
 * shortcut made of one printable key must be turnable off, because speech
 * input and some assistive technology send those keys as text. Escape and
 * the arrows are not single printable keys and stay on. Persisted per browser.
 */
export function useShortcutSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(read)
  const set = useCallback((next: boolean) => {
    setOn(next)
    try {
      if (next) localStorage.removeItem(SHORTCUTS_KEY)
      else localStorage.setItem(SHORTCUTS_KEY, 'off')
    } catch {
      // Private mode or quota: the choice lasts the page.
    }
  }, [])
  return [on, set]
}
