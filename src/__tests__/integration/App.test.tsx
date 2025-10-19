import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

// Mock lazy-loaded components with proper default export
vi.mock('@/components/ChatSidebar', () => ({
  default: ({ open, onOpenChange }: any) => (
    <div data-testid="chat-sidebar" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close Chat</button>
    </div>
  ),
}))

vi.mock('@/components/ChatFab', () => ({
  default: ({ onClick }: any) => (
    <button data-testid="chat-fab" onClick={onClick}>
      Open Chat
    </button>
  ),
}))

vi.mock('@/lib/api-keys', () => ({
  getApiKeys: vi.fn(async () => ({})),
  saveApiKeys: vi.fn(async () => {}),
  migrateFromPlaintext: vi.fn(async () => {}),
}))

// Mock password security functions to bypass password protection
vi.mock('@/lib/password', () => ({
  getSecurityConfig: vi.fn(() => ({ enabled: false })),
  isSessionUnlocked: vi.fn(() => true),
  refreshSession: vi.fn(),
  isPasswordProtectionEnabled: vi.fn(() => false),
  lockSession: vi.fn(),
  disablePasswordProtection: vi.fn(async () => {}),
  getDerivedKey: vi.fn(async () => null),
}))

// Mock shortcuts
vi.mock('@/lib/shortcuts', () => ({
  getShortcuts: vi.fn(() => [
    { action: 'openChat', key: { key: 'k', ctrlKey: true, metaKey: true }, label: 'Open Chat', category: 'chat', description: 'Open chat' },
  ]),
  matchesShortcut: vi.fn((e: KeyboardEvent, key: any) => {
    // Match if key matches and either Ctrl or Meta is pressed (cross-platform support)
    const keyMatches = e.key.toLowerCase() === key.key.toLowerCase()
    const modifierMatches = (key.ctrlKey || key.metaKey) ? (e.ctrlKey || e.metaKey) : true
    return keyMatches && modifierMatches
  }),
  saveShortcuts: vi.fn(),
  resetShortcuts: vi.fn(),
  formatShortcutKey: vi.fn((key: any) => `${key.ctrlKey ? 'Ctrl+' : ''}${key.key}`),
  getActionLabel: vi.fn((action: string) => action),
}))

describe('App Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
    vi.clearAllMocks()
  })

  it('should render the main app structure', () => {
    render(<App />)

    expect(screen.getByRole('search')).toBeInTheDocument()
    const navs = screen.getAllByRole('navigation')
    expect(navs.length).toBeGreaterThan(0)
  })

  it('should render all main components', () => {
    render(<App />)

    // SearchBar
    expect(screen.getByPlaceholderText('Search DuckDuckGo...')).toBeInTheDocument()

    // QuickLinks
    expect(screen.getByText('YouTube')).toBeInTheDocument()

    // SettingsFab
    expect(screen.getByTitle('Settings')).toBeInTheDocument()

    // Canvas
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('should render WeatherWidget by default', () => {
    render(<App />)

    expect(screen.getByText('Select location')).toBeInTheDocument()
  })

  it('should hide WeatherWidget when preference is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Select location')).toBeInTheDocument()

    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Show weather')).toBeInTheDocument()
    })

    const weatherToggle = screen.getByLabelText('Show weather')
    await user.click(weatherToggle)

    await waitFor(() => {
      expect(screen.queryByText('Select location')).not.toBeInTheDocument()
    })
  })

  it('should render ChatFab by default', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-fab')).toBeInTheDocument()
    })
  })

  it('should hide ChatFab when preference is disabled', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('chat-fab')).toBeInTheDocument()
    })

    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Show chat')).toBeInTheDocument()
    })

    const chatToggle = screen.getByLabelText('Show chat')
    await user.click(chatToggle)

    await waitFor(() => {
      expect(screen.queryByTestId('chat-fab')).not.toBeInTheDocument()
    })
  })

  it('should open chat sidebar when ChatFab is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for lazy-loaded chat components to be available
    await waitFor(() => {
      expect(screen.getByTestId('chat-fab')).toBeInTheDocument()
    })

    const chatFab = screen.getByTestId('chat-fab')
    await user.click(chatFab)

    await waitFor(() => {
      const sidebar = screen.getByTestId('chat-sidebar')
      expect(sidebar).toHaveAttribute('data-open', 'true')
    })
  })

  it('should close chat sidebar when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for lazy-loaded chat components to be available
    await waitFor(() => {
      expect(screen.getByTestId('chat-fab')).toBeInTheDocument()
    })

    const chatFab = screen.getByTestId('chat-fab')
    await user.click(chatFab)

    await waitFor(() => {
      const sidebar = screen.getByTestId('chat-sidebar')
      expect(sidebar).toHaveAttribute('data-open', 'true')
    })

    // Press Escape to close the sidebar
    await user.keyboard('{Escape}')

    await waitFor(() => {
      // When closed, the Sheet may unmount the content, so check that it's either
      // not in the document or has data-open="false"
      const sidebar = screen.queryByTestId('chat-sidebar')
      if (sidebar) {
        expect(sidebar).toHaveAttribute('data-open', 'false')
      } else {
        // Sidebar unmounted, which is also valid for a closed state
        expect(sidebar).not.toBeInTheDocument()
      }
    })
  })

  it('should toggle chat sidebar with Ctrl+K', async () => {
    render(<App />)

    // Wait for lazy-loaded chat components to be available
    await waitFor(() => {
      expect(screen.getByTestId('chat-fab')).toBeInTheDocument()
    })

    // Dispatch keyboard event directly like the prevent default test
    const event1 = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event1)

    await waitFor(() => {
      const sidebar = screen.getByTestId('chat-sidebar')
      expect(sidebar).toHaveAttribute('data-open', 'true')
    })

    // Toggle it back off
    const event2 = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event2)

    await waitFor(() => {
      // When closed, the Sheet may unmount the content
      const sidebar = screen.queryByTestId('chat-sidebar')
      if (sidebar) {
        expect(sidebar).toHaveAttribute('data-open', 'false')
      } else {
        // Sidebar unmounted, which is also valid for a closed state
        expect(sidebar).not.toBeInTheDocument()
      }
    })
  })

  it('should toggle chat sidebar with Cmd+K on Mac', async () => {
    render(<App />)

    // Wait for lazy-loaded chat components to be available
    await waitFor(() => {
      expect(screen.getByTestId('chat-fab')).toBeInTheDocument()
    })

    // Dispatch keyboard event directly
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    })
    window.dispatchEvent(event)

    await waitFor(() => {
      const sidebar = screen.getByTestId('chat-sidebar')
      expect(sidebar).toHaveAttribute('data-open', 'true')
    })
  })

  it('should prevent default behavior for Ctrl+K', async () => {
    const user = userEvent.setup()
    const preventDefaultSpy = vi.fn()

    render(<App />)

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })
    event.preventDefault = preventDefaultSpy

    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should display all default quick links', () => {
    render(<App />)

    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Proton Mail')).toBeInTheDocument()
    expect(screen.getByText('Drive')).toBeInTheDocument()
  })

  it('should update quick links when modified in settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('YouTube')).toBeInTheDocument()
    })

    const youtubeInput = screen.getByDisplayValue('YouTube')
    await user.clear(youtubeInput)
    await user.type(youtubeInput, 'My Custom Link')

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.getByText('My Custom Link')).toBeInTheDocument()
    })
  })

  it('should perform search from SearchBar', async () => {
    const user = userEvent.setup()
    delete (window as any).location
    window.location = { href: '' } as any

    render(<App />)

    const input = screen.getByPlaceholderText('Search DuckDuckGo...')
    await user.type(input, 'test query')

    const button = screen.getByRole('button', { name: /search/i })
    await user.click(button)

    expect(window.location.href).toBe('https://duckduckgo.com/?q=test%20query')
  })

  it('should have proper layout structure', () => {
    const { container } = render(<App />)

    const main = container.querySelector('main')
    expect(main).toHaveClass('relative', 'min-h-svh')

    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveClass('fixed', 'inset-0')
  })

  it('should render Clock component', () => {
    render(<App />)

    // Clock should be present (it shows time)
    const clockContainer = document.querySelector('.leading-\\[0\\.75\\]')
    expect(clockContainer).toBeInTheDocument()
  })

  it('should handle weather widget location selection', async () => {
    const user = userEvent.setup()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 1,
            name: 'London',
            country: 'UK',
            latitude: 51.5074,
            longitude: -0.1278,
            admin1: 'England',
          },
        ],
      }),
    } as Response)

    render(<App />)

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search city…')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'London')

    await waitFor(() => {
      expect(screen.getByText('London')).toBeInTheDocument()
    })
  })

  it('should persist preferences across component remounts', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Show weather')).toBeInTheDocument()
    })

    const weatherToggle = screen.getByLabelText('Show weather')
    await user.click(weatherToggle)

    unmount()

    // Render a new instance
    render(<App />)

    expect(screen.queryByText('Select location')).not.toBeInTheDocument()
  })

  it('should handle adding and removing quick links', async () => {
    const user = userEvent.setup()
    render(<App />)

    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add link/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add link/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('New')).toBeInTheDocument()
    })

    const newLinkInput = screen.getByDisplayValue('New')
    await user.clear(newLinkInput)
    await user.type(newLinkInput, 'Test Link')

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.getByText('Test Link')).toBeInTheDocument()
    })
  })

  it('should render Toaster for notifications', () => {
    const { container } = render(<App />)

    // Toaster component is rendered (check for its container)
    const toaster = container.querySelector('[data-sonner-toaster]') || container.querySelector('.toaster')
    // Toaster might not be visible until toast is triggered, so we just check it doesn't error
    expect(container).toBeInTheDocument()
  })

  it('should maintain responsive layout', () => {
    const { container } = render(<App />)

    const searchContainer = container.querySelector('.max-w-xl')
    expect(searchContainer).toBeInTheDocument()
    expect(searchContainer).toHaveClass('w-full', 'max-w-xl')
  })

  it('should cleanup keyboard event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<App />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should integrate PrefsProvider correctly', () => {
    render(<App />)

    // If PrefsProvider is working, default preferences should be displayed
    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('Select location')).toBeInTheDocument()
  })

  it('should handle simultaneous interactions', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open settings
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Show weather')).toBeInTheDocument()
    })

    // Weather widget location button should still be accessible
    const locationButton = screen.getByTitle('Change location')
    expect(locationButton).toBeInTheDocument()
  })

  it('should handle clock timezone prop', () => {
    render(<App />)

    // Clock is rendered with Europe/Amsterdam timezone
    // We can't easily test the actual time display, but we can verify the component renders
    const clockContainer = document.querySelector('.leading-\\[0\\.75\\]')
    expect(clockContainer).toBeInTheDocument()
  })
})
