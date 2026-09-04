import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { Footer } from './Footer'

function renderFooter(lang: 'en' | 'jp') {
  window.history.replaceState({}, '', `/?lang=${lang}`)
  return render(
    <LanguageProvider>
      <Footer />
    </LanguageProvider>
  )
}

describe('Footer', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('credits the data source and the current year', () => {
    renderFooter('en')
    expect(screen.getByRole('link', { name: 'Japan Sumo Association' })).toHaveAttribute(
      'href',
      'https://sumo.or.jp/'
    )
    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()} Jon Allen`))
    ).toBeInTheDocument()
    expect(screen.getByText(/unofficial fan project/)).toBeInTheDocument()
  })

  it('translates its chrome in Japanese mode', () => {
    renderFooter('jp')
    expect(screen.getByRole('link', { name: '日本相撲協会' })).toBeInTheDocument()
    expect(screen.getByText(/非公式のファンプロジェクト/)).toBeInTheDocument()
  })
})
