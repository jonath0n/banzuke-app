import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultsToggle } from './ResultsToggle'
import { LanguageProvider } from '../../contexts/LanguageContext'

describe('ResultsToggle', () => {
  it('is a pressed button that says how far the results go', async () => {
    const onChange = vi.fn()
    render(
      <LanguageProvider>
        <ResultsToggle on onChange={onChange} day={8} />
      </LanguageProvider>
    )
    const button = screen.getByRole('button', { name: /Results.*through day 8/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(button)
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
