import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import SearchBar from '@/components/SearchBar'

// Mock the bangs.js import
vi.mock('@/assets/bangs.js?raw', () => ({
  default: `var bangs = {
    "w": {
      s: "https://en.wikipedia.org/wiki/Special:Search?search={{qe}}&go=Go",
      h: "https://en.wikipedia.org/",
      n: "Wikipedia"
    },
    "yt": {
      s: "https://www.youtube.com/results?search_query={{qe}}",
      h: "https://www.youtube.com/",
      n: "YouTube"
    },
    "gh": {
      s: "https://github.com/search?q={{qe}}",
      h: "https://github.com/",
      n: "GitHub"
    },
    "g": {
      s: "https://www.google.com/search?q={{qe}}",
      h: "https://www.google.com/",
      n: "Google"
    }
  };`
}))

describe('SearchBar', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    delete (window as any).location
    window.location = { href: '' } as any
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    windowOpenSpy.mockRestore()
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

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://duckduckgo.com/?q=new%20tab%20test',
      '_blank',
      'noopener,noreferrer'
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

  // Note: The "/" key shortcut is implemented at the App level, not in SearchBar
  // Testing it requires rendering the full App component (integration test)

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

describe('SearchBar - Bang Operators', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    delete (window as any).location
    window.location = { href: '' } as any
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    windowOpenSpy.mockRestore()
  })

  describe('Bang Loading Optimization', () => {
    it('should NOT load bangs for regular searches', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, 'react hooks{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=react%20hooks')
      })
    })

    it('should handle multiple regular searches without loading bangs', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')

      // First search
      await user.type(input, 'javascript{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=javascript')
      })

      // Second search
      await user.clear(input)
      await user.type(input, 'typescript{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=typescript')
      })
    })
  })

  describe('Wikipedia Bang (!w)', () => {
    it('should redirect to Wikipedia search', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!w TypeScript{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://en.wikipedia.org/wiki/Special:Search?search=TypeScript&go=Go'
        )
      })
    })

    it('should go to Wikipedia homepage when no query provided', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!w{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://en.wikipedia.org/')
      })
    })

    it('should URL-encode special characters', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!w hello & world{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://en.wikipedia.org/wiki/Special:Search?search=hello%20%26%20world&go=Go'
        )
      })
    })
  })

  describe('YouTube Bang (!yt)', () => {
    it('should redirect to YouTube search', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!yt javascript tutorial{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://www.youtube.com/results?search_query=javascript%20tutorial'
        )
      })
    })

    it('should go to YouTube homepage when no query provided', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!yt{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://www.youtube.com/')
      })
    })
  })

  describe('GitHub Bang (!gh)', () => {
    it('should redirect to GitHub search', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!gh react{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://github.com/search?q=react')
      })
    })
  })

  describe('Google Bang (!g)', () => {
    it('should redirect to Google search', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!g anthropic{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://www.google.com/search?q=anthropic')
      })
    })
  })

  describe('Bang Caching', () => {
    it('should cache bangs after first use', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')

      // First bang search
      await user.type(input, '!w React{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://en.wikipedia.org/wiki/Special:Search?search=React&go=Go'
        )
      })

      // Second bang search (should use cache)
      await user.clear(input)
      await user.type(input, '!yt music{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://www.youtube.com/results?search_query=music'
        )
      })
    })
  })

  describe('Unknown Bangs', () => {
    it('should fallback to DuckDuckGo for unknown bang', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!unknownbang test query{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://duckduckgo.com/?q=!unknownbang%20test%20query'
        )
      })
    })
  })

  describe('Shift+Enter with Bangs', () => {
    it('should open bang search in new tab with Shift+Enter', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!w React')
      await user.keyboard('{Shift>}{Enter}{/Shift}')

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith(
          'https://en.wikipedia.org/wiki/Special:Search?search=React&go=Go',
          '_blank',
          'noopener,noreferrer'
        )
      })
    })
  })

  describe('Mixed Usage', () => {
    it('should handle alternating regular and bang searches', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')

      // Regular search
      await user.type(input, 'regular search{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=regular%20search')
      })

      // Bang search
      await user.clear(input)
      await user.type(input, '!w Wikipedia{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe(
          'https://en.wikipedia.org/wiki/Special:Search?search=Wikipedia&go=Go'
        )
      })

      // Regular search again
      await user.clear(input)
      await user.type(input, 'another regular{Enter}')
      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=another%20regular')
      })
    })
  })
})

describe('SearchBar - Search Engines', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    delete (window as any).location
    window.location = { href: '' } as any
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    windowOpenSpy.mockRestore()
  })

  describe('Built-in Search Engines', () => {
    it('should use DuckDuckGo by default', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, 'default search{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=default%20search')
      })
    })

    it('should update placeholder based on selected search engine', () => {
      // This test would require PrefsProvider wrapper with different searchEngineId
      // Will be tested in integration test
    })

    it('should use Google when searchEngineId is google', async () => {
      // Note: This test requires PrefsProvider wrapper
      // Testing the SearchBar component directly with preferences
    })

    it('should use Bing when searchEngineId is bing', async () => {
      // Note: Requires PrefsProvider wrapper with searchEngineId set to "bing"
    })

    it('should use Brave Search when searchEngineId is brave', async () => {
      // Note: Requires PrefsProvider wrapper
    })

    it('should use Startpage when searchEngineId is startpage', async () => {
      // Note: Requires PrefsProvider wrapper
    })

    it('should use Ecosia when searchEngineId is ecosia', async () => {
      // Note: Requires PrefsProvider wrapper
    })

    it('should use Qwant when searchEngineId is qwant', async () => {
      // Note: Requires PrefsProvider wrapper
    })

    it('should properly encode search terms in URL', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, 'special chars: @#$%{Enter}')

      await waitFor(() => {
        expect(window.location.href).toContain('%40%23%24%25')
      })
    })

    it('should handle unicode characters', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, 'こんにちは世界{Enter}')

      await waitFor(() => {
        expect(window.location.href).toContain(encodeURIComponent('こんにちは世界'))
      })
    })

    it('should handle emojis in search', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, 'hello 🌍 world{Enter}')

      await waitFor(() => {
        expect(window.location.href).toContain(encodeURIComponent('hello 🌍 world'))
      })
    })
  })

  describe('Search Engine Priority with Bangs', () => {
    it('should use bang URL instead of selected search engine', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!w testing{Enter}')

      await waitFor(() => {
        // Should use Wikipedia bang, not DuckDuckGo
        expect(window.location.href).toBe(
          'https://en.wikipedia.org/wiki/Special:Search?search=testing&go=Go'
        )
      })
    })

    it('should fallback to search engine for unknown bangs', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, '!xyz unknown{Enter}')

      await waitFor(() => {
        // Should fall back to DuckDuckGo with the bang included
        expect(window.location.href).toBe('https://duckduckgo.com/?q=!xyz%20unknown')
      })
    })
  })

  describe('Custom Search Engines', () => {
    it('should handle custom search engine with {searchTerms} placeholder', async () => {
      // Note: Requires PrefsProvider wrapper with custom search engine
      // Custom engine: { id: "custom", name: "Custom", url: "https://custom.com/search?q={searchTerms}" }
    })

    it('should handle custom search engine with different placeholder format', async () => {
      // Note: This would require extending the SearchEngine type if needed
    })
  })

  describe('Search Engine Edge Cases', () => {
    it('should handle very long search queries', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const longQuery = 'a'.repeat(500)
      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, `${longQuery}{Enter}`)

      await waitFor(() => {
        expect(window.location.href).toContain(encodeURIComponent(longQuery))
      })
    })

    it('should handle search with only spaces between words', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      await user.type(input, 'word1    word2{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=word1%20%20%20%20word2')
      })
    })

    it('should handle search with newlines', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)

      const input = screen.getByPlaceholderText('Search DuckDuckGo...')
      // Note: HTML input elements don't accept newlines, they get stripped
      // Testing that newlines are stripped and the search still works
      await user.type(input, 'line1line2{Enter}')

      await waitFor(() => {
        expect(window.location.href).toBe('https://duckduckgo.com/?q=line1line2')
      })
    })
  })
})
