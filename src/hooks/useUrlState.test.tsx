import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearUrlParam, setUrlParam, useUrlParam } from './useUrlState'

describe('useUrlParam', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reads the current value and null when absent', () => {
    window.history.replaceState(null, '', '/?q=ura')
    const { result } = renderHook(() => useUrlParam('q'))
    expect(result.current[0]).toBe('ura')
    const missing = renderHook(() => useUrlParam('rikishi'))
    expect(missing.result.current[0]).toBeNull()
  })

  it('writes with replaceState by default and removes empty values', () => {
    const { result } = renderHook(() => useUrlParam('q'))
    const before = window.history.length
    act(() => result.current[1]('taka'))
    expect(window.location.search).toBe('?q=taka')
    expect(result.current[0]).toBe('taka')
    expect(window.history.length).toBe(before)
    act(() => result.current[1](''))
    expect(window.location.search).toBe('')
    expect(result.current[0]).toBeNull()
  })

  it('pushes history when asked and reacts to Back', async () => {
    const { result } = renderHook(() => useUrlParam('rikishi', 'push'))
    act(() => result.current[1]('4227'))
    expect(window.location.search).toBe('?rikishi=4227')
    // Simulate the Back button
    act(() => {
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current[0]).toBeNull()
  })

  it('keeps other parameters intact', () => {
    window.history.replaceState(null, '', '/?lang=jp')
    const { result } = renderHook(() => useUrlParam('q'))
    act(() => result.current[1]('abi'))
    expect(new URLSearchParams(window.location.search).get('lang')).toBe('jp')
    expect(new URLSearchParams(window.location.search).get('q')).toBe('abi')
  })

  it('notifies every subscriber, including writes made outside hooks', () => {
    const a = renderHook(() => useUrlParam('lang'))
    act(() => setUrlParam('lang', 'jp'))
    expect(a.result.current[0]).toBe('jp')
  })

  it('clears a pushed parameter by going Back, and a deep link by replacing', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const { result } = renderHook(() => useUrlParam('rikishi', 'push'))
    act(() => result.current[1]('4227'))
    act(() => clearUrlParam('rikishi'))
    // A second close request before Back has landed must not go back twice.
    act(() => clearUrlParam('rikishi'))
    expect(back).toHaveBeenCalledTimes(1)
    act(() => {
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // A deep link has no pushed entry to undo: the URL is rewritten in place.
    window.history.replaceState(null, '', '/?rikishi=4227&lang=jp')
    act(() => clearUrlParam('rikishi'))
    expect(back).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?lang=jp')
    expect(result.current[0]).toBeNull()
    back.mockRestore()
  })
})
