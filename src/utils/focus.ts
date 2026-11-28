/**
 * Focuses the first candidate that can take focus now, and returns it (or null).
 *
 * When a dialog closes or a control removes itself, the element that should get
 * focus back may be gone: detached, or inside the sibling dialog that has since
 * closed, where `focus()` fails silently and leaves the reader on <body> with
 * nothing focused (WCAG 2.4.3). So each candidate is tried in turn, and one
 * only counts once `document.activeElement` really is it.
 */
export function focusFirst(
  candidates: ReadonlyArray<Element | null | undefined>,
  options?: FocusOptions
): HTMLElement | null {
  for (const el of candidates) {
    if (!(el instanceof HTMLElement) || el === document.body || !el.isConnected) continue
    if (el.closest('dialog:not([open])')) continue
    el.focus(options)
    if (document.activeElement === el) return el
  }
  return null
}
