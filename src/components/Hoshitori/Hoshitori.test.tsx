import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

  /* The List's West cell inherits `direction: rtl` from the row. Under it the
     bidi algorithm paints the score "2–0" as "0–2" and lays the strip out with
     day 1 on the right, so both declare ltr. jsdom does no bidi layout, so the
     guard is on the stylesheet. */
  it('pins the score and the strip to ltr, so a West cell cannot mirror them', () => {
    const css = readFileSync(resolve(__dirname, 'Hoshitori.module.css'), 'utf8')
    for (const selector of ['.sheet', '.strip', '.score']) {
      const block = css.slice(css.indexOf(`${selector} {`))
      expect(block.slice(0, block.indexOf('}')), selector).toMatch(/direction:\s*ltr/)
    }
  })

  it('on a row names the champion instead of the state', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="row" champion />).firstElementChild!
    expect(el).toHaveTextContent('Yusho')
    expect(el).not.toHaveTextContent('Kachi-koshi')
  })
})
