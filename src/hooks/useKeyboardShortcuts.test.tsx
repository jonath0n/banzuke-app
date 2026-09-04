import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function setup() {
  const actions = {
    onToggleLanguage: vi.fn(),
    onFocusSearch: vi.fn(),
    onEscape: vi.fn(),
    onToggleHelp: vi.fn(),
  }
  const hook = renderHook(() => useKeyboardShortcuts(actions))
  return { ...actions, ...hook }
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('maps l, / and Escape to actions', () => {
    const { onToggleLanguage, onFocusSearch, onEscape, onToggleHelp } = setup()
    expect(press('l').defaultPrevented).toBe(true)
    press('L')
    expect(onToggleLanguage).toHaveBeenCalledTimes(2)
    expect(press('/').defaultPrevented).toBe(true)
    expect(onFocusSearch).toHaveBeenCalledTimes(1)
    press('Escape')
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(press('?').defaultPrevented).toBe(true)
    expect(onToggleHelp).toHaveBeenCalledTimes(1)
  })

  it('ignores shortcuts when a modifier is held', () => {
    const { onToggleLanguage, onFocusSearch } = setup()
    press('l', { ctrlKey: true })
    press('l', { metaKey: true })
    press('/', { altKey: true })
    expect(onToggleLanguage).not.toHaveBeenCalled()
    expect(onFocusSearch).not.toHaveBeenCalled()
  })

  it('does not fire letter shortcuts while typing, but Escape blurs the field', () => {
    const { onToggleLanguage, onEscape } = setup()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    press('l', {}, input)
    expect(onToggleLanguage).not.toHaveBeenCalled()
    press('Escape', {}, input)
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(document.activeElement).not.toBe(input)
  })

  it('removes its listener on unmount', () => {
    const { onToggleLanguage, unmount } = setup()
    unmount()
    press('l')
    expect(onToggleLanguage).not.toHaveBeenCalled()
  })
})
