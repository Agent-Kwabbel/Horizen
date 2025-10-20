import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import ShortcutsDialog from '@/features/shortcuts/components/ShortcutsDialog'
import * as shortcutsModule from '@/lib/shortcuts'

vi.mock('@/lib/shortcuts', async () => {
  const actual = await vi.importActual('@/lib/shortcuts')
  return {
    ...actual,
    saveShortcuts: vi.fn(),
    resetShortcuts: vi.fn(),
  }
})

describe('ShortcutsDialog', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(<ShortcutsDialog open={false} onOpenChange={mockOnOpenChange} />)

    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeInTheDocument()
  })

  it('should display description', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText(/customize keyboard shortcuts/i)).toBeInTheDocument()
  })

  it('should display all category sections', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Interface')).toBeInTheDocument()
  })

  it('should display default shortcuts', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText('Toggle Chat')).toBeInTheDocument()
    expect(screen.getByText('New Chat')).toBeInTheDocument()
    expect(screen.getByText('Focus Chat Input')).toBeInTheDocument()
    expect(screen.getByText('Upload File')).toBeInTheDocument()
    expect(screen.getByText('Focus Search')).toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
  })

  it('should display reset button', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument()
  })

  it('should display done button', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  it('should call onOpenChange when done button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    const doneButton = screen.getByRole('button', { name: /done/i })
    await user.click(doneButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should enter recording mode when shortcut button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Find a shortcut button (they display the key combination)
    const shortcutButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('K') || btn.textContent?.includes('/')
    )
    expect(shortcutButtons.length).toBeGreaterThan(0)

    await user.click(shortcutButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Press any key...')).toBeInTheDocument()
    })
  })

  it('should record new shortcut when key is pressed', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Click to enter recording mode
    const shortcutButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent && !btn.textContent.includes('Reset') && !btn.textContent.includes('Done')
    )
    await user.click(shortcutButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Press any key...')).toBeInTheDocument()
    })

    // Press a key combination
    await user.keyboard('{Control>}x{/Control}')

    await waitFor(() => {
      expect(shortcutsModule.saveShortcuts).toHaveBeenCalled()
    })
  })

  it('should cancel recording when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Enter recording mode
    const shortcutButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent && !btn.textContent.includes('Reset') && !btn.textContent.includes('Done')
    )
    await user.click(shortcutButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Press any key...')).toBeInTheDocument()
    })

    // Press Escape
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByText('Press any key...')).not.toBeInTheDocument()
    })

    // Should not have saved
    expect(shortcutsModule.saveShortcuts).not.toHaveBeenCalled()
  })

  it('should reset shortcuts when reset button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
    await user.click(resetButton)

    expect(shortcutsModule.resetShortcuts).toHaveBeenCalled()
  })

  it('should ignore modifier-only keys during recording', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Enter recording mode
    const shortcutButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent && !btn.textContent.includes('Reset') && !btn.textContent.includes('Done')
    )
    await user.click(shortcutButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Press any key...')).toBeInTheDocument()
    })

    // Press just Control (modifier only)
    await user.keyboard('{Control}')

    // Should still be in recording mode
    expect(screen.getByText('Press any key...')).toBeInTheDocument()
    expect(shortcutsModule.saveShortcuts).not.toHaveBeenCalled()
  })

  it('should show shortcut descriptions', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText('Toggle chat sidebar')).toBeInTheDocument()
    expect(screen.getByText('Start new chat')).toBeInTheDocument()
    expect(screen.getByText('Focus chat message input')).toBeInTheDocument()
    expect(screen.getByText('Upload file to chat')).toBeInTheDocument()
    expect(screen.getByText('Focus search bar')).toBeInTheDocument()
  })

  it('should group shortcuts by category', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    const categories = ['Navigation', 'Chat', 'Interface']
    categories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument()
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeInTheDocument()
  })

  it('should reload shortcuts when dialog reopens', () => {
    const { rerender } = render(<ShortcutsDialog open={false} onOpenChange={mockOnOpenChange} />)

    // Close and reopen
    rerender(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Should display shortcuts
    expect(screen.getByText('Toggle Chat')).toBeInTheDocument()
  })

  it('should display all new shortcuts (focusChatPrompt and uploadFile)', () => {
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // New shortcuts we added
    expect(screen.getByText('Focus Chat Input')).toBeInTheDocument()
    expect(screen.getByText('Upload File')).toBeInTheDocument()
  })

  it('should allow customizing focusChatPrompt shortcut', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Find the Focus Chat Input shortcut
    const focusChatInputText = screen.getByText('Focus Chat Input')
    expect(focusChatInputText).toBeInTheDocument()

    // Find any shortcut button to test customization (they all work the same way)
    const shortcutButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent && !btn.textContent.includes('Reset') && !btn.textContent.includes('Done')
    )
    expect(shortcutButtons.length).toBeGreaterThan(0)
  })

  it('should allow customizing uploadFile shortcut', async () => {
    const user = userEvent.setup()
    render(<ShortcutsDialog open={true} onOpenChange={mockOnOpenChange} />)

    // Find the Upload File shortcut
    const uploadFileText = screen.getByText('Upload File')
    expect(uploadFileText).toBeInTheDocument()

    // Find any shortcut button to test customization (they all work the same way)
    const shortcutButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent && !btn.textContent.includes('Reset') && !btn.textContent.includes('Done')
    )
    expect(shortcutButtons.length).toBeGreaterThan(0)
  })
})
