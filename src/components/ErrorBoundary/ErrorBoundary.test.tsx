import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ error }: { error: unknown }): ReactNode {
  throw error
}

function renderWithLanguage(ui: ReactNode, language: 'en' | 'jp' = 'en') {
  window.history.replaceState(null, '', language === 'jp' ? '/?lang=jp' : '/')
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when nothing throws', () => {
    renderWithLanguage(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('fine')).toBeInTheDocument()
  })

  it('shows a fallback with the error message', () => {
    renderWithLanguage(
      <ErrorBoundary>
        <Bomb error={new Error('kaboom')} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText('kaboom')).toBeInTheDocument()
  })

  it('normalizes non-Error throwables', () => {
    const { unmount } = renderWithLanguage(
      <ErrorBoundary>
        <Bomb error="a string" />
      </ErrorBoundary>
    )
    expect(screen.getByText('a string')).toBeInTheDocument()
    unmount()

    renderWithLanguage(
      <ErrorBoundary>
        <Bomb error={{ message: 'object message' }} />
      </ErrorBoundary>
    )
    expect(screen.getByText('object message')).toBeInTheDocument()
  })

  it('speaks Japanese when the UI does', () => {
    renderWithLanguage(
      <ErrorBoundary>
        <Bomb error={new Error('kaboom')} />
      </ErrorBoundary>,
      'jp'
    )
    expect(screen.getByRole('alert')).toHaveTextContent('表示できませんでした')
    expect(screen.getByRole('button', { name: 'もう一度試す' })).toBeInTheDocument()
  })

  it('uses a custom fallback when provided', () => {
    renderWithLanguage(
      <ErrorBoundary fallback={<p>custom</p>}>
        <Bomb error={new Error('x')} />
      </ErrorBoundary>
    )
    expect(screen.getByText('custom')).toBeInTheDocument()
  })

  it('retries rendering when "Try again" is pressed', async () => {
    const user = userEvent.setup()
    let shouldThrow = true
    function Flaky() {
      if (shouldThrow) throw new Error('first time')
      return <p>recovered</p>
    }
    renderWithLanguage(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    shouldThrow = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('recovered')).toBeInTheDocument()
  })
})
