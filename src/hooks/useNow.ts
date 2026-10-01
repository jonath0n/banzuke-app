import { useEffect, useState } from 'react'

/**
 * The current time, re-read every `everyMs` while the page is visible, so a
 * line like "updated 3 minutes ago" keeps counting. Pauses in a hidden tab
 * and catches up the moment it is shown again.
 */
export function useNow(everyMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    const timer = setInterval(tick, everyMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [everyMs])
  return now
}
