import { useState } from 'react'

/**
 * True from the first render in which `value` is true, and ever after. Used to
 * mount a lazy dialog on its first open and keep it mounted for the close
 * transition, without fetching its chunk on page load.
 */
export function useEverTrue(value: boolean): boolean {
  const [seen, setSeen] = useState(value)
  // Deriving state from a prop during render, the way the React docs describe
  // it: the condition keeps this from running again once latched.
  if (value && !seen) setSeen(true)
  return seen || value
}
