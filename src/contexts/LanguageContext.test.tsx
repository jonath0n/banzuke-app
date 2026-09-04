import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { LanguageProvider, useLanguage } from './LanguageContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
)

describe('LanguageContext', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.body.classList.remove('lang-jp')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to English and updates the document language', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(result.current.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.body.classList.contains('lang-jp')).toBe(false)
  })

  it('reads ?lang=jp from the URL', () => {
    window.history.replaceState({}, '', '/?lang=jp')
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(result.current.language).toBe('jp')
    expect(document.documentElement.lang).toBe('ja')
    expect(document.body.classList.contains('lang-jp')).toBe(true)
  })

  it('falls back to English for unknown URL values', () => {
    window.history.replaceState({}, '', '/?lang=fr')
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(result.current.language).toBe('en')
  })

  it('remembers the choice in localStorage', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper })
    act(() => result.current.setLanguage('jp'))
    expect(result.current.language).toBe('jp')
    expect(localStorage.getItem('banzuke-language')).toBe('jp')
    expect(document.documentElement.lang).toBe('ja')

    const fresh = renderHook(() => useLanguage(), { wrapper })
    expect(fresh.result.current.language).toBe('jp')
  })

  it('prefers the URL over a stored preference', () => {
    localStorage.setItem('banzuke-language', 'jp')
    window.history.replaceState({}, '', '/?lang=en')
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(result.current.language).toBe('en')
  })

  it('survives localStorage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(result.current.language).toBe('en')
    act(() => result.current.setLanguage('jp'))
    expect(result.current.language).toBe('jp')
  })

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useLanguage())).toThrow(/within a LanguageProvider/)
  })
})
