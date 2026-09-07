import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Hoshitori } from './Hoshitori'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRecord } from '../../test/fixtures'

const wrap = (ui: ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>).container

describe('Hoshitori', () => {
  it('on the sheet shows the score, hidden from assistive tech, with the state as data', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="sheet" />).firstElementChild!
    expect(el).toHaveTextContent('8–3–1')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('data-state', 'kachikoshi')
    expect(el.textContent).not.toContain('優')
  })

  it('marks the champion', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="sheet" champion />).firstElementChild!
    expect(el).toHaveTextContent('優')
  })

  it('on a row draws fifteen cells in day order, padding the days to come', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="row" />).firstElementChild!
    const cells = el.querySelectorAll('[data-day]')
    expect(cells).toHaveLength(15)
    expect([...cells].map((c) => c.textContent).join('')).toBe('○○●○○●○休○○●○···')
    expect(el).toHaveTextContent('Kachi-koshi')
  })

  it('reads make-koshi off the record', () => {
    const el = wrap(
      <Hoshitori record={{ wins: 2, losses: 8, absences: 0, bouts: [] }} variant="row" />
    ).firstElementChild!
    expect(el).toHaveAttribute('data-state', 'makekoshi')
    expect(el).toHaveTextContent('Make-koshi')
    expect(el).toHaveTextContent('2–8')
  })

  it('on a row names the champion instead of the state', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="row" champion />).firstElementChild!
    expect(el).toHaveTextContent('優勝')
    expect(el).not.toHaveTextContent('Kachi-koshi')
  })
})
