/**
 * The stepper chevron used by the archive picker and the day's card. Drawn in
 * the same stroke as CloseIcon. Decorative; the control around it carries the name.
 */
export function ChevronIcon({
  direction,
  size = 16,
}: {
  direction: 'previous' | 'next'
  size?: number
}) {
  const d = direction === 'previous' ? 'M12.5 4L6.5 10l6 6' : 'M7.5 4l6 6-6 6'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
