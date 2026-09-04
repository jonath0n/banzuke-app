import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ error }: { error: unknown }): ReactNode {
  throw error
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('fine')).toBeInTheDocument()
  })

  it('shows a fallback with the error message', () => {
    render(
      <ErrorBoundary>
        <Bomb error={new Error('kaboom')} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText('kaboom')).toBeInTheDocument()
  })

  it('normalizes non-Error throwables', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <Bomb error="a string" />
      </ErrorBoundary>
    )
    expect(screen.getByText('a string')).toBeInTheDocument()
    unmount()

    render(
      <ErrorBoundary>
        <Bomb error={{ message: 'object message' }} />
      </ErrorBoundary>
    )
    expect(screen.getByText('object message')).toBeInTheDocument()
  })

  it('uses a custom fallback when provided', () => {
    render(
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
    render(
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
