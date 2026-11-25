import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { usePressOnEntry } from './usePressOnEntry'

describe('usePressOnEntry', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('presses a stamp that mounts while the page is entering, and keeps it pressed', () => {
    const main = document.createElement('main')
    document.body.append(main)
    const { result, rerender } = renderHook(() => usePressOnEntry())
    expect(result.current).toBe(true)
    // The page settling mid-press does not take the press away
    main.setAttribute('data-entered', '')
    rerender()
    expect(result.current).toBe(true)
  })

  it('sets a stamp in place once the page has entered', () => {
    const main = document.createElement('main')
    main.setAttribute('data-entered', '')
    document.body.append(main)
    expect(renderHook(() => usePressOnEntry()).result.current).toBe(false)
  })
})
