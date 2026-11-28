import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { DivisionTabs } from './DivisionTabs'

function renderTabs(value: 'makuuchi' | 'juryo' = 'makuuchi', lang: 'en' | 'jp' = 'en') {
  const onChange = vi.fn()
  window.history.replaceState({}, '', `/?lang=${lang}`)
  render(
    <LanguageProvider>
      <DivisionTabs
        value={value}
        onChange={onChange}
        divisions={['makuuchi', 'juryo']}
        counts={{ makuuchi: 42, juryo: 28 }}
      />
    </LanguageProvider>
  )
  return { onChange }
}

describe('DivisionTabs', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders a labelled tablist with the selected tab focusable', () => {
    renderTabs()
    expect(screen.getByRole('tablist', { name: 'Division' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['MakuuchiM42', 'JuryoJ28'])
    // Wide, the abbreviation is display: none and out of the name; under 720px it shows
    // and joins the name, so a voice user can say what they see (WCAG 2.5.3).
    expect(tabs[0]).toHaveAccessibleName('Makuuchi 42')
    expect(tabs[0].querySelector('[aria-hidden]')).toBeNull()
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
  })

  it('selects on click', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTabs()
    await user.click(screen.getByRole('tab', { name: /Juryo/ }))
    expect(onChange).toHaveBeenCalledWith('juryo')
  })

  it('moves with the arrow keys and wraps around', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTabs()
    screen.getByRole('tab', { name: /Makuuchi/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('juryo')
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith('juryo')
    await user.keyboard('{End}')
    expect(onChange).toHaveBeenLastCalledWith('juryo')
    await user.keyboard('{Home}')
    expect(onChange).toHaveBeenLastCalledWith('makuuchi')
  })

  it('offers the divisions it is given, a loading one without a count', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    window.history.replaceState({}, '', '/?lang=en')
    render(
      <LanguageProvider>
        <DivisionTabs
          value="makuuchi"
          onChange={onChange}
          divisions={['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi']}
          counts={{ makuuchi: 42, juryo: 28, makushita: 120 }}
        />
      </LanguageProvider>
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'MakuuchiM42',
      'JuryoJ28',
      'MakushitaMs120',
      'SandanmeSd',
      'JonidanJd',
      'JonokuchiJk',
    ])
    tabs[0].focus()
    await user.keyboard('{End}')
    expect(onChange).toHaveBeenLastCalledWith('jonokuchi')
  })

  it('shows matches against totals while a search is active', () => {
    window.history.replaceState({}, '', '/?lang=en')
    render(
      <LanguageProvider>
        <DivisionTabs
          value="makuuchi"
          onChange={vi.fn()}
          divisions={['makuuchi', 'juryo']}
          counts={{ makuuchi: 42, juryo: 28 }}
          matched={{ makuuchi: 6, juryo: 0 }}
        />
      </LanguageProvider>
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['MakuuchiM6/42', 'JuryoJ0/28'])
  })

  it('uses Japanese labels in Japanese mode', () => {
    renderTabs('juryo', 'jp')
    expect(screen.getByRole('tablist', { name: '階級' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /十両/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['幕内42', '十両28'])
  })
})
