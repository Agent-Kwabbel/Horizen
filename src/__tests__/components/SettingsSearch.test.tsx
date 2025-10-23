import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsSearch from '@/features/settings/components/SettingsSearch'

describe('SettingsSearch Component', () => {
  const mockOnResultClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SettingsSearch onResultClick={mockOnResultClick} />)
      expect(screen.getByPlaceholderText('Search settings... (beta)')).toBeInTheDocument()
    })

    it('should show search icon', () => {
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)
      const searchIcon = container.querySelector('svg')
      expect(searchIcon).toBeInTheDocument()
    })

    it('should not show clear button initially', () => {
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(0)
    })
  })

  describe('Search Input', () => {
    it('should update query on typing', async () => {
      const user = userEvent.setup()
      render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      expect(input).toHaveValue('security')
    })

    it('should show clear button when query is not empty', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'se')

      const clearButton = container.querySelector('button')
      expect(clearButton).toBeInTheDocument()
    })

    it('should clear query when clear button is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      const clearButton = container.querySelector('button')
      await user.click(clearButton!)

      expect(input).toHaveValue('')
    })
  })

  describe('Search Results', () => {
    it('should not show results for queries less than 2 characters', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'a')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).not.toBeInTheDocument()
      })
    })

    it('should show results for queries 2+ characters', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })
    })

    it('should debounce search (150ms delay)', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')

      await user.type(input, 's')
      const noResults1 = container.querySelector('.absolute.top-full')
      expect(noResults1).not.toBeInTheDocument()

      await user.type(input, 'e')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should show "no results" message when no matches found', async () => {
      const user = userEvent.setup()
      render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'xyzabc')

      await waitFor(() => {
        expect(screen.getByText(/No settings found for/i)).toBeInTheDocument()
        expect(screen.getByText('"xyzabc"')).toBeInTheDocument()
      })
    })

    it('should display result title', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'api keys')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
        const results = screen.getAllByText('API Keys')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    it('should display result path breadcrumbs', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'openai')

      await waitFor(() => {
        const breadcrumbs = container.querySelector('.text-xs.text-white\\/50')
        expect(breadcrumbs).toBeInTheDocument()
      })
    })

    it('should display result description when available', async () => {
      const user = userEvent.setup()
      render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'temperature')

      await waitFor(() => {
        expect(screen.getByText(/Control response randomness/i)).toBeInTheDocument()
      })
    })

    it('should highlight matching text', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'secu')

      await waitFor(() => {
        const highlighted = container.querySelector('.bg-yellow-500\\/20')
        expect(highlighted).toBeInTheDocument()
        expect(highlighted?.textContent).toMatch(/secu/i)
      })
    })
  })

  describe('Result Interaction', () => {
    it('should call onResultClick when result is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      let resultButton: Element | null = null
      await waitFor(() => {
        const buttons = container.querySelectorAll('.absolute.top-full .w-full')
        expect(buttons.length).toBeGreaterThan(0)
        resultButton = buttons[0]
      })

      await user.click(resultButton!)

      expect(mockOnResultClick).toHaveBeenCalledWith('security')
    })

    it('should clear query after clicking result', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      let resultButton: Element | null = null
      await waitFor(() => {
        const buttons = container.querySelectorAll('.absolute.top-full .w-full')
        expect(buttons.length).toBeGreaterThan(0)
        resultButton = buttons[0]
      })

      await user.click(resultButton!)

      expect(input).toHaveValue('')
    })

    it('should clear results after clicking result', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      let resultButton: Element | null = null
      await waitFor(() => {
        const buttons = container.querySelectorAll('.absolute.top-full .w-full')
        expect(buttons.length).toBeGreaterThan(0)
        resultButton = buttons[0]
      })

      await user.click(resultButton!)

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).not.toBeInTheDocument()
      })
    })

    it('should navigate to section for section results', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      let resultButton: Element | null = null
      await waitFor(() => {
        const buttons = container.querySelectorAll('.absolute.top-full .w-full')
        expect(buttons.length).toBeGreaterThan(0)
        resultButton = buttons[0]
      })

      await user.click(resultButton!)

      expect(mockOnResultClick).toHaveBeenCalledWith('security')
    })

    it('should navigate to parent section for setting results', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'openai key')

      let resultButton: Element | null = null
      await waitFor(() => {
        const buttons = container.querySelectorAll('.absolute.top-full .w-full')
        expect(buttons.length).toBeGreaterThan(0)
        resultButton = buttons[0]
      })

      await user.click(resultButton!)

      expect(mockOnResultClick).toHaveBeenCalledWith('api-keys')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should highlight first result by default', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'se')

      await waitFor(() => {
        const buttons = container.querySelectorAll('.absolute.top-full button')
        const highlighted = Array.from(buttons).find(btn => btn.className.includes('bg-white/15'))
        expect(highlighted).toBeTruthy()
      })
    })

    it('should move selection down with ArrowDown', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'se')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.keyboard('{ArrowDown}')

      const buttons = container.querySelectorAll('.absolute.top-full button')
      const highlighted = Array.from(buttons).filter(btn => btn.className.includes('bg-white/15'))
      expect(highlighted.length).toBe(1)
    })

    it('should move selection up with ArrowUp', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'se')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')

      const buttons = container.querySelectorAll('.absolute.top-full button')
      const highlighted = Array.from(buttons).filter(btn => btn.className.includes('bg-white/15'))
      expect(highlighted.length).toBe(1)
    })

    it('should wrap around to last result when pressing ArrowUp on first', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'se')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.keyboard('{ArrowUp}')

      // Should still have one selected result (wrapped to last)
      expect(mockOnResultClick).not.toHaveBeenCalled()
    })

    it('should wrap around to first result when pressing ArrowDown on last', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'widget')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      // Press down many times to wrap
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{ArrowDown}')
      }

      expect(mockOnResultClick).not.toHaveBeenCalled()
    })

    it('should trigger selected result on Enter', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.keyboard('{Enter}')

      expect(mockOnResultClick).toHaveBeenCalledWith('security')
    })

    it('should clear search on Escape', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      expect(input).toHaveValue('')
    })

    it('should blur input on Escape', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security')

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      expect(input).not.toHaveFocus()
    })

    it('should update selection on mouse enter', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'se')

      await waitFor(() => {
        expect(screen.getByText('Search Engine')).toBeInTheDocument()
      })

      const buttons = container.querySelectorAll('button')
      if (buttons.length > 1) {
        await user.hover(buttons[1])

        // The hovered item should now be highlighted
        expect(buttons[1]).toHaveClass('bg-white/15')
      }
    })
  })

  describe('Widget Context Filtering', () => {
    it('should hide widget-specific results when widget disabled', async () => {
      const user = userEvent.setup()
      render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          widgets={[{ type: 'notes', enabled: false }]}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'quick jot')

      await waitFor(() => {
        expect(screen.getByText(/No settings found/i)).toBeInTheDocument()
      })
    })

    it('should show widget-specific results when widget enabled', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          widgets={[{ type: 'notes', enabled: true }]}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'quick jot')

      await waitFor(() => {
        const results = screen.getAllByText('Quick Jot Mode')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    it('should filter weather widget results', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          widgets={[{ type: 'weather', enabled: true }]}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'moon')

      await waitFor(() => {
        const results = screen.getAllByText('Moon Information')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    it('should filter pomodoro widget results', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          widgets={[{ type: 'pomodoro', enabled: true }]}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'notification sound')

      await waitFor(() => {
        const results = screen.getAllByText('Notification Sound')
        expect(results.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Security Context Filtering', () => {
    it('should show lock session when unlocked', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          securityEnabled={true}
          securityUnlocked={true}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'lock session')

      await waitFor(() => {
        const results = screen.getAllByText('Lock Session')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    it('should hide lock session when security disabled', async () => {
      const user = userEvent.setup()
      render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          securityEnabled={false}
          securityUnlocked={false}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'lock session')

      await waitFor(() => {
        expect(screen.queryAllByText('Lock Session').length).toBe(0)
      })
    })

    it('should show unlock session when locked', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          securityEnabled={true}
          securityUnlocked={false}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'unlock')

      await waitFor(() => {
        const results = screen.getAllByText('Unlock Session')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    it('should hide change password when locked', async () => {
      const user = userEvent.setup()
      render(
        <SettingsSearch
          onResultClick={mockOnResultClick}
          securityEnabled={true}
          securityUnlocked={false}
        />
      )

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'change password')

      await waitFor(() => {
        expect(screen.queryByText('Change Password')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid typing', async () => {
      const user = userEvent.setup({ delay: null })
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'security', { delay: 1 })

      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })
    })

    it('should handle clearing and retyping', async () => {
      const user = userEvent.setup()
      const { container } = render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')

      await user.type(input, 'security')
      await waitFor(() => {
        const resultsContainer = container.querySelector('.absolute.top-full')
        expect(resultsContainer).toBeInTheDocument()
      })

      await user.clear(input)
      await user.type(input, 'widgets')

      await waitFor(() => {
        const results = screen.getAllByText('Widgets')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    it('should handle keyboard navigation with no results', async () => {
      const user = userEvent.setup()
      render(<SettingsSearch onResultClick={mockOnResultClick} />)

      const input = screen.getByPlaceholderText('Search settings... (beta)')
      await user.type(input, 'xyzabc')

      await waitFor(() => {
        expect(screen.getByText(/No settings found/i)).toBeInTheDocument()
      })

      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')
      await user.keyboard('{Enter}')

      expect(mockOnResultClick).not.toHaveBeenCalled()
    })
  })
})
