// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { handleRovingKey, keyTarget } from './rovingFocus'

function build(pairs: Array<[string, boolean, boolean]>): HTMLElement {
  // All East buttons, then all West buttons: only DOM order within a side matters.
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

describe('keyTarget', () => {
  it('walks ranks with ↑ ↓ and switches partner with ← →', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowDown')).toBe(at('200-1-1-east'))
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowUp')).toBe(at('100-1-1-west'))
    // East sits on the right of a row: ← from East reaches West, → from West reaches East
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowLeft')).toBe(at('100-1-1-west'))
    expect(keyTarget(root, at('100-1-1-west'), 'ArrowRight')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowRight')).toBeNull()
  })
  it('stops at the ends, and finds no partner for a vacant seat', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowUp')).toBeNull()
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowDown')).toBeNull()
    expect(keyTarget(root, at('200-1-1-east'), 'ArrowLeft')).toBeNull()
  })
  it('Home and End go to the ends of the side', () => {
    expect(keyTarget(root, at('500-1-1-east'), 'Home')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-west'), 'End')).toBe(at('500-1-1-west'))
  })
  it('ignores other keys', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'Enter')).toBeNull()
  })
})

describe('handleRovingKey', () => {
  it('focuses the target and calls preventDefault when target exists', () => {
    const current = at('100-1-1-east')
    const target = at('200-1-1-east')
    const preventDefaultMock = vi.fn()
    const focusMock = vi.spyOn(target, 'focus')

    handleRovingKey(root, {
      key: 'ArrowDown',
      target: current,
      preventDefault: preventDefaultMock,
    })

    expect(preventDefaultMock).toHaveBeenCalled()
    expect(focusMock).toHaveBeenCalled()
  })

  it('does nothing when the event target is not a wrestler button', () => {
    const nonButton = document.createElement('div')
    const preventDefaultMock = vi.fn()

    handleRovingKey(root, {
      key: 'ArrowLeft',
      target: nonButton,
      preventDefault: preventDefaultMock,
    })

    expect(preventDefaultMock).not.toHaveBeenCalled()
  })

  it('swallows End at the last wrestler even though there is nowhere to move', () => {
    const current = at('500-1-1-west')
    const focusMock = vi.spyOn(current, 'focus')
    const preventDefaultMock = vi.fn()

    handleRovingKey(root, {
      key: 'End',
      target: current,
      preventDefault: preventDefaultMock,
    })

    expect(preventDefaultMock).toHaveBeenCalled()
    expect(focusMock).not.toHaveBeenCalled()
  })

  it('leaves Tab untouched', () => {
    const current = at('100-1-1-east')
    const preventDefaultMock = vi.fn()

    handleRovingKey(root, {
      key: 'Tab',
      target: current,
      preventDefault: preventDefaultMock,
    })

    expect(preventDefaultMock).not.toHaveBeenCalled()
  })
})
