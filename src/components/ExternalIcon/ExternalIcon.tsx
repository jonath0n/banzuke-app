/**
 * Marks a link that leaves the site (a JSA profile). Drawn in the same square
 * stroke as ChevronIcon and CloseIcon. Decorative; the link carries the name.
 */
export function ExternalIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="square"
      />
    </svg>
  )
}
