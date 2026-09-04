import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { Footer } from './Footer'

function renderFooter(lang: 'en' | 'jp', props: Parameters<typeof Footer>[0] = {}) {
  window.history.replaceState({}, '', `/?lang=${lang}`)
  return render(
    <LanguageProvider>
      <Footer {...props} />
    </LanguageProvider>
  )
}

describe('Footer', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('credits the author, data source, typefaces and the current year', () => {
    renderFooter('en')
    expect(screen.getByRole('link', { name: 'Japan Sumo Association' })).toHaveAttribute(
      'href',
      'https://sumo.or.jp/'
    )
    expect(screen.getByRole('link', { name: 'Emily Sneddon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Instrument' })).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()} Jon Allen`))
    ).toBeInTheDocument()
    expect(screen.getByText(/unofficial fan project/)).toBeInTheDocument()
    expect(screen.queryByText('Keyboard shortcuts')).toBeNull()
  })

  it('translates its chrome in Japanese mode', () => {
    renderFooter('jp')
    expect(screen.getByRole('link', { name: '日本相撲協会' })).toBeInTheDocument()
    expect(screen.getByText(/非公式のファンプロジェクト/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Emily Sneddon' }).parentElement).toHaveTextContent(
      'Fran Sans（Emily Sneddon 作）'
    )
  })

  it('hosts the keyboard shortcuts panel when given a toggle', async () => {
    const user = userEvent.setup()
    const onToggleHelp = vi.fn()
    renderFooter('en', { helpOpen: false, onToggleHelp })
    await user.click(screen.getByText('Keyboard shortcuts'))
    expect(onToggleHelp).toHaveBeenCalledWith(true)
  })
})
