import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEverTrue } from './useEverTrue'

describe('useEverTrue', () => {
  it('is false until the value is true, then stays true', () => {
    const { result, rerender } = renderHook(({ value }) => useEverTrue(value), {
      initialProps: { value: false },
    })
    expect(result.current).toBe(false)
    rerender({ value: true })
    expect(result.current).toBe(true)
    rerender({ value: false })
    expect(result.current).toBe(true)
  })

  it('is true from the first render when the value starts true', () => {
    const { result } = renderHook(() => useEverTrue(true))
    expect(result.current).toBe(true)
  })
})
