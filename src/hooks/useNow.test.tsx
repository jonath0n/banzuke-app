import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('ticks once a minute while visible and when the tab comes back', () => {
    const { result } = renderHook(() => useNow())
    expect(result.current.toISOString()).toBe('2026-11-08T09:00:00.000Z')
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.toISOString()).toBe('2026-11-08T09:01:00.000Z')

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(result.current.toISOString()).toBe('2026-11-08T09:01:00.000Z')

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.toISOString()).toBe('2026-11-08T09:03:00.000Z')
  })
})
