import { useEffect } from 'react'

interface ShortcutActions {
  onToggleLanguage: () => void
  onFocusSearch: () => void
  onEscape: () => void
}

export function useKeyboardShortcuts({
  onToggleLanguage,
  onFocusSearch,
  onEscape,
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
        case 'Escape':
          onEscape()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onToggleLanguage, onFocusSearch, onEscape])
}
