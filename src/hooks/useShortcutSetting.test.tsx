import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SHORTCUTS_KEY, useShortcutSetting } from './useShortcutSetting'

describe('useShortcutSetting', () => {
  beforeEach(() => localStorage.clear())

  it('is on by default, off once switched, and remembers the choice', () => {
    const { result } = renderHook(() => useShortcutSetting())
    expect(result.current[0]).toBe(true)
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
    expect(localStorage.getItem(SHORTCUTS_KEY)).toBe('off')
    const again = renderHook(() => useShortcutSetting())
    expect(again.result.current[0]).toBe(false)
    act(() => again.result.current[1](true))
    expect(localStorage.getItem(SHORTCUTS_KEY)).toBeNull()
  })
})
