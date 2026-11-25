import { useState } from 'react'

/**
 * Whether a stamp mounting now should be pressed in (`stampPress`): true only
 * while the page is still entering (`<main>` without `data-entered`, set by
 * App once the entrance has played). Decided once, at mount, and kept for the
 * element's life, so the page settling mid-press never cuts the press short
 * (a CSS gate on `data-entered` would remove the animation and snap the
 * stamp), and a stamp mounted later — a tab switch, results that land after
 * the entrance — is simply there.
 */
export function usePressOnEntry(): boolean {
  const [press] = useState(
    () => typeof document !== 'undefined' && !document.querySelector('main[data-entered]')
  )
  return press
}
