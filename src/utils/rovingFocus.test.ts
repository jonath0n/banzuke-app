// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { handleRovingKey, keyTarget } from './rovingFocus'

function build(pairs: Array<[string, boolean, boolean]>): HTMLElement {
  // Sheet-like DOM: all East buttons, then all West buttons (two halves).
  const root = document.createElement('div')
  for (const side of ['east', 'west'] as const) {
    for (const [pair, hasEast, hasWest] of pairs) {
      if ((side === 'east' && !hasEast) || (side === 'west' && !hasWest)) continue
      const b = document.createElement('button')
      b.dataset.side = side
      b.dataset.pair = pair
      b.dataset.id = `${pair}-${side}`
      b.textContent = b.dataset.id
      root.appendChild(b)
    }
  }
  return root
}

const root = build([
  ['100-1-1', true, true],
  ['200-1-1', true, false], // vacant West Ozeki
  ['500-1-1', true, true],
])
const at = (id: string) => root.querySelector<HTMLElement>(`[data-id="${id}"]`)!

describe('keyTarget on the sheet', () => {
  it('walks the rank ladder within a half: ← lower, → higher', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowLeft', 'sheet')).toBe(at('200-1-1-east'))
    expect(keyTarget(root, at('200-1-1-east'), 'ArrowRight', 'sheet')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowRight', 'sheet')).toBeNull()
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowLeft', 'sheet')).toBeNull()
  })
  it('jumps to the partner with ↑ ↓, or nowhere when the seat is vacant', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowDown', 'sheet')).toBe(at('100-1-1-west'))
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowUp', 'sheet')).toBe(at('500-1-1-east'))
    expect(keyTarget(root, at('200-1-1-east'), 'ArrowDown', 'sheet')).toBeNull()
  })
  it('Home and End go to the ends of the side', () => {
    expect(keyTarget(root, at('500-1-1-east'), 'Home', 'sheet')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-west'), 'End', 'sheet')).toBe(at('500-1-1-west'))
  })
  it('ignores other keys', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'Enter', 'sheet')).toBeNull()
  })
})

describe('keyTarget on the list', () => {
  it('walks ranks with ↑ ↓ and switches partner with ← →', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowDown', 'list')).toBe(at('200-1-1-east'))
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowUp', 'list')).toBe(at('100-1-1-west'))
    // East sits on the right of a row: ← from East reaches West, → from West reaches East
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowLeft', 'list')).toBe(at('100-1-1-west'))
    expect(keyTarget(root, at('100-1-1-west'), 'ArrowRight', 'list')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowRight', 'list')).toBeNull()
  })
})

describe('handleRovingKey', () => {
  it('focuses the target and calls preventDefault when target exists', () => {
    const current = at('100-1-1-east')
    const target = at('200-1-1-east')
    const preventDefaultMock = vi.fn()
    const focusMock = vi.spyOn(target, 'focus')

    handleRovingKey(
      root,
      {
        key: 'ArrowLeft',
        target: current,
        preventDefault: preventDefaultMock,
      },
      'sheet'
    )

    expect(preventDefaultMock).toHaveBeenCalled()
    expect(focusMock).toHaveBeenCalled()
  })

  it('does nothing when the event target is not a wrestler button', () => {
    const nonButton = document.createElement('div')
    const preventDefaultMock = vi.fn()

    handleRovingKey(
      root,
      {
        key: 'ArrowLeft',
        target: nonButton,
        preventDefault: preventDefaultMock,
      },
      'sheet'
    )

    expect(preventDefaultMock).not.toHaveBeenCalled()
  })
})
