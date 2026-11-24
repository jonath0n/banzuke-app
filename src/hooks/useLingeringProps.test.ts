import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLingeringProps } from './useLingeringProps'

type Props = { id: number | null }

function fakeDialog(animations: Array<{ finished: Promise<unknown> }> | null, open = false) {
  const dialog = { open } as unknown as HTMLDialogElement
  if (animations) {
    ;(dialog as unknown as { getAnimations: () => unknown[] }).getAnimations = () => animations
  }
  return dialog
}

describe('useLingeringProps', () => {
  it('returns the live props while open', () => {
    const { result, rerender } = renderHook(({ p }) => useLingeringProps(p, p.id != null), {
      initialProps: { p: { id: 1 } as Props },
    })
    expect(result.current[0]).toEqual({ id: 1 })
    rerender({ p: { id: 2 } })
    expect(result.current[0]).toEqual({ id: 2 })
  })

  it('holds the last open props after close until the fade settles', async () => {
    let finish = () => {}
    const finished = new Promise<void>((resolve) => (finish = resolve))
    const { result, rerender } = renderHook(({ p }) => useLingeringProps(p, p.id != null), {
      initialProps: { p: { id: 7 } as Props },
    })
    rerender({ p: { id: null } })
    expect(result.current[0]).toEqual({ id: 7 })

    act(() => result.current[1](fakeDialog([{ finished }])))
    expect(result.current[0]).toEqual({ id: 7 })

    await act(async () => {
      finish()
      await finished
    })
    expect(result.current[0]).toEqual({ id: null })
  })

  it('lets go at once when nothing is animating', () => {
    const { result, rerender } = renderHook(({ p }) => useLingeringProps(p, p.id != null), {
      initialProps: { p: { id: 7 } as Props },
    })
    rerender({ p: { id: null } })
    act(() => result.current[1](fakeDialog(null)))
    expect(result.current[0]).toEqual({ id: null })
  })
})
