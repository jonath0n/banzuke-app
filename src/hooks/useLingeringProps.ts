import { useCallback, useState } from 'react'

/**
 * A dialog's props, held over its close. The native <dialog> fades out on close
 * (transitions with allow-discrete in the dialog's CSS), so it keeps painting
 * for the length of the fade; but by then the selection that fed it is gone and
 * it would fade out empty. While `open`, this returns the live props and keeps
 * them; once closed it goes on returning the props it last showed until
 * `release(dialog)` sees the dialog's own animations settle.
 *
 * Call `release` after the dialog has closed. Where nothing is animating (no
 * allow-discrete support, a test environment) it lets go at once.
 */
export function useLingeringProps<P>(
  props: P,
  open: boolean
): [shown: P, release: (dialog: HTMLDialogElement) => void] {
  const [held, setHeld] = useState<P | null>(null)
  if (open && held !== props) setHeld(props)

  const release = useCallback((dialog: HTMLDialogElement) => {
    const running =
      typeof dialog.getAnimations === 'function' ? dialog.getAnimations({ subtree: true }) : []
    if (running.length === 0) {
      setHeld(null)
      return
    }
    void Promise.allSettled(running.map((a) => a.finished)).then(() => {
      // Reopened meanwhile: the live props are showing again, keep the hold.
      if (!dialog.open) setHeld(null)
    })
  }, [])

  return [!open && held !== null ? held : props, release]
}
