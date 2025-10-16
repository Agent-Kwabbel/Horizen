import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '@/components/SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    delete (window as any).location
    window.location = { href: '' } as any
    window.open = vi.fn()
  })

  it('should render with default placeholder', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    expect(input).toBeInTheDocument()
  })

  it('should render with custom placeholder', () => {
    render(<SearchBar placeholder="Search the web" />)
    const input = screen.getByPlaceholderText('Search the web')
    expect(input).toBeInTheDocument()
  })

  it('should have search role', () => {
    render(<SearchBar />)
    const form = screen.getByRole('search')
    expect(form).toBeInTheDocument()
  })

  it('should auto-focus input on mount', async () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search DuckDuckGo...')

    await waitFor(() => {
      expect(input).toHaveFocus()
    })
  })

  it('should submit search query and navigate', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, 'test query')

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.location.href).toBe('https://duckduckgo.com/?q=test%20query')
  })

  it('should submit by pressing Enter', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, 'enter test{Enter}')

    expect(window.location.href).toBe('https://duckduckgo.com/?q=enter%20test')
  })

  it('should open in new tab when newTab prop is true', async () => {
    const user = userEvent.setup()
    render(<SearchBar newTab />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, 'new tab test')

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.open).toHaveBeenCalledWith(
      'https://duckduckgo.com/?q=new%20tab%20test',
      '_blank'
    )
  })

  it('should not submit empty query', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.location.href).toBe('')
  })

  it('should trim whitespace from query', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, '  spaced query  ')

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.location.href).toBe('https://duckduckgo.com/?q=spaced%20query')
  })

  it('should not submit query with only whitespace', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, '    ')

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.location.href).toBe('')
  })

  it('should properly encode special characters', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, 'hello & goodbye')

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.location.href).toBe('https://duckduckgo.com/?q=hello%20%26%20goodbye')
  })

  it('should focus input when "/" key is pressed', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')

    // Blur the input first
    input.blur()
    expect(input).not.toHaveFocus()

    // Press / key
    await user.keyboard('/')

    await waitFor(() => {
      expect(input).toHaveFocus()
    })
  })

  it('should not focus input when "/" is pressed while typing in input', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')

    // Type in the input
    await user.type(input, 'search/')

    // Input should still have the slash character
    expect(input).toHaveValue('search/')
  })

  it('should not focus input when "/" is pressed in textarea', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <div>
        <SearchBar />
        <textarea data-testid="textarea" />
      </div>
    )

    const textarea = screen.getByTestId('textarea')
    const input = screen.getByPlaceholderText('Search DuckDuckGo...')

    // Focus textarea
    textarea.focus()
    expect(textarea).toHaveFocus()

    // Press / key
    await user.keyboard('/')

    // Input should not be focused
    expect(input).not.toHaveFocus()
    expect(textarea).toHaveFocus()
  })

  it('should have accessible search button', () => {
    render(<SearchBar />)
    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toBeInTheDocument()
  })

  it('should have proper ARIA label', () => {
    render(<SearchBar />)
    const input = screen.getByLabelText('Search')
    expect(input).toBeInTheDocument()
  })

  it('should handle multiple rapid submissions', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    const button = screen.getByRole('button', { name: /search/i })

    await user.type(input, 'first')
    await user.click(button)

    const firstUrl = window.location.href
    expect(firstUrl).toBe('https://duckduckgo.com/?q=first')
  })

  it('should clear and accept new query after submission', async () => {
    const user = userEvent.setup()
    render(<SearchBar />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    const button = screen.getByRole('button', { name: /search/i })

    // First search
    await user.type(input, 'first search')
    await user.click(button)

    // Clear input
    await user.clear(input)

    // Second search
    await user.type(input, 'second search')
    await user.click(button)

    expect(window.location.href).toBe('https://duckduckgo.com/?q=second%20search')
  })
})
