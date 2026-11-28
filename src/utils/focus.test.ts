import { afterEach, describe, expect, it } from 'vitest'
import { focusFirst } from './focus'

afterEach(() => {
  document.body.innerHTML = ''
})

function button(parent: HTMLElement = document.body): HTMLButtonElement {
  const b = document.createElement('button')
  parent.appendChild(b)
  return b
}

describe('focusFirst', () => {
  it('focuses the first candidate that can take focus', () => {
    const a = button()
    const b = button()
    expect(focusFirst([a, b])).toBe(a)
    expect(document.activeElement).toBe(a)
  })

  it('skips missing, detached and body candidates', () => {
    const detached = document.createElement('button')
    const b = button()
    expect(focusFirst([null, undefined, detached, document.body, b])).toBe(b)
    expect(document.activeElement).toBe(b)
  })

  it('skips an element inside a closed dialog', () => {
    const dialog = document.createElement('dialog')
    document.body.appendChild(dialog)
    const inside = button(dialog)
    const outside = button()
    expect(focusFirst([inside, outside])).toBe(outside)
  })

  it('skips what will not take focus, and returns null when nothing does', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    expect(focusFirst([div])).toBeNull()
    div.tabIndex = -1
    expect(focusFirst([div])).toBe(div)
  })
})
