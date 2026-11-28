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
    expect(screen.getByRole('link', { name: 'results via sumo-api.com' })).toHaveAttribute(
      'href',
      'https://www.sumo-api.com/'
    )
    expect(screen.getByRole('link', { name: 'Lettersoup' })).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()} Jon Allen`))
    ).toBeInTheDocument()
    expect(screen.getByText(/unofficial fan project/)).toBeInTheDocument()
    expect(screen.queryByText('Keyboard shortcuts')).toBeNull()
  })

  it('explains how to read the banzuke, in the reader’s language', () => {
    renderFooter('en')
    const guide = screen.getByRole('region', { name: 'Reading the banzuke' })
    expect(guide).toHaveTextContent(/ranking sheet for a grand sumo tournament/)
    expect(guide).toHaveTextContent(/kachi-koshi/)
  })

  it('explains the banzuke in Japanese mode', () => {
    renderFooter('jp')
    expect(screen.getByRole('region', { name: '番付の見方' })).toHaveTextContent(/順位表/)
  })

  it('translates its chrome in Japanese mode', () => {
    renderFooter('jp')
    expect(screen.getByRole('link', { name: '日本相撲協会' })).toBeInTheDocument()
    expect(screen.getByText(/非公式のファンプロジェクト/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lettersoup' }).parentElement).toHaveTextContent(
      'Sofia Sans Condensed（Lettersoup 作）'
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
