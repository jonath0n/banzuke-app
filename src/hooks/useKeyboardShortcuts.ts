import { useEffect } from 'react'

interface ShortcutActions {
  onToggleLanguage: () => void
  onFocusSearch: () => void
  onEscape: () => void
  onToggleHelp?: () => void
  /** The single printable keys (L, /, ?); Escape works regardless. Default on. */
  singleKeys?: boolean
}

export function useKeyboardShortcuts({
  onToggleLanguage,
  onFocusSearch,
  onEscape,
  onToggleHelp,
  singleKeys = true,
}: ShortcutActions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // But Escape should still work in inputs
        if (e.key === 'Escape') {
          ;(target as HTMLInputElement).blur()
          onEscape()
        }
        return
      }

      // Don't fire if modifier keys are held (allow browser shortcuts)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Escape') {
        onEscape()
        return
      }
      // The single printable keys can be switched off (WCAG 2.1.4)
      if (!singleKeys) return

      switch (e.key) {
        case 'l':
        case 'L':
          e.preventDefault()
          onToggleLanguage()
          break
        case '/':
          e.preventDefault()
          onFocusSearch()
          break
        case '?':
          if (onToggleHelp) {
            e.preventDefault()
            onToggleHelp()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onToggleLanguage, onFocusSearch, onEscape, onToggleHelp, singleKeys])
}
