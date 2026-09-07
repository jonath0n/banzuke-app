import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MovementBadge } from './MovementBadge'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Movement } from '../../utils/diff'

const prev = {
  division: 'makuuchi' as const,
  rankCode: 500,
  rankNumber: 5,
  seat: 1,
  side: 'east' as const,
}
const wrap = (m: Movement, variant: 'sheet' | 'row' = 'sheet') =>
  render(
    <LanguageProvider>
      <MovementBadge movement={m} variant={variant} />
    </LanguageProvider>
  ).container

describe('MovementBadge', () => {
  it('shows an up arrow and the previous rank', () => {
    const el = wrap({ kind: 'up', previous: prev, sideChanged: false }).firstElementChild!
    expect(el).toHaveTextContent('▲')
    expect(el).toHaveTextContent('M5')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('data-kind', 'up')
  })

  it('shows a down arrow', () => {
    expect(
      wrap({ kind: 'down', previous: { ...prev, rankCode: 400 }, sideChanged: false })
    ).toHaveTextContent('▼K')
  })

  it('marks a newcomer', () => {
    const el = wrap({ kind: 'new', previous: null, sideChanged: false }).firstElementChild!
    expect(el).toHaveTextContent('New')
    expect(el).toHaveAttribute('data-kind', 'new')
  })

  it('renders nothing on the sheet for an unchanged rank, but a side swap on a row', () => {
    expect(wrap({ kind: 'same', previous: prev, sideChanged: false }).firstElementChild).toBeNull()
    expect(
      wrap({ kind: 'same', previous: prev, sideChanged: false }, 'row').firstElementChild
    ).toBeNull()
    expect(
      wrap({ kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true }, 'row')
    ).toHaveTextContent('W→E')
    expect(
      wrap({ kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true }, 'sheet')
        .firstElementChild
    ).toBeNull()
  })
})
