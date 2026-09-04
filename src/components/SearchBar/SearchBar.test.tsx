import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { SearchBar } from './SearchBar'

function renderBar(props: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
  const onChange = vi.fn()
  const utils = render(
    <LanguageProvider>
      <SearchBar value="" onChange={onChange} totalCount={42} matchedCount={0} {...props} />
    </LanguageProvider>
  )
  return { ...utils, onChange }
}

describe('SearchBar', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reports typed input and shows the shortcut hint while empty', async () => {
    const user = userEvent.setup()
    const { onChange } = renderBar()
    expect(screen.getByText('/')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search wrestlers' }), 'ura')
    expect(onChange).toHaveBeenLastCalledWith('ura')
  })

  it('does not commit the query while an IME composition is in progress', () => {
    const { onChange } = renderBar()
    const input = screen.getByRole('searchbox')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ほう' } })
    fireEvent.change(input, { target: { value: 'ほうしょう' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '豊昇龍' } })
    fireEvent.compositionEnd(input, { target: { value: '豊昇龍' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('豊昇龍')
  })

  it('announces the match count and offers to clear', async () => {
    const user = userEvent.setup()
    const { onChange } = renderBar({ value: 'taka', matchedCount: 3 })
    expect(screen.getByRole('status')).toHaveTextContent('3 of 42 wrestlers')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('follows external value changes', () => {
    const { rerender } = renderBar({ value: 'abc' })
    expect(screen.getByRole('searchbox')).toHaveValue('abc')
    rerender(
      <LanguageProvider>
        <SearchBar value="" onChange={vi.fn()} totalCount={42} matchedCount={0} />
      </LanguageProvider>
    )
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('speaks Japanese in Japanese mode', () => {
    window.history.replaceState(null, '', '/?lang=jp')
    renderBar({ value: 'x', matchedCount: 2 })
    expect(screen.getByRole('searchbox', { name: '力士を検索' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('42人中 2人')
  })
})
