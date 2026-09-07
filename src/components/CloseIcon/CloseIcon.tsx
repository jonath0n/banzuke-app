/**
 * The × used by every dismiss button: the two dialogs' close buttons and
 * the search box's clear. Decorative; the button around it carries the name.
 */
export function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
