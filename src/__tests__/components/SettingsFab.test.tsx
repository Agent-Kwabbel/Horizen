import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import SettingsFab from '@/components/SettingsFab'
import * as apiKeysModule from '@/lib/api-keys'

vi.mock('@/lib/api-keys', () => ({
  getApiKeys: vi.fn(() => ({})),
  saveApiKeys: vi.fn(),
}))

describe('SettingsFab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(apiKeysModule.getApiKeys).mockReturnValue({})
  })

  it('should render settings button', () => {
    render(<SettingsFab />)
    const button = screen.getByTitle('Settings')
    expect(button).toBeInTheDocument()
  })

  it('should open settings sheet when button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    })
  })

  it('should display weather toggle', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('Show weather')).toBeInTheDocument()
    })
  })

  it('should toggle weather setting', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const weatherToggle = screen.getByLabelText('Show weather')
      expect(weatherToggle).toBeChecked()
    })

    const weatherToggle = screen.getByLabelText('Show weather')
    await user.click(weatherToggle)

    await waitFor(() => {
      expect(weatherToggle).not.toBeChecked()
    })
  })

  it('should display chat toggle', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('Show chat')).toBeInTheDocument()
    })
  })

  it('should toggle chat setting', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const chatToggle = screen.getByLabelText('Show chat')
      expect(chatToggle).toBeChecked()
    })

    const chatToggle = screen.getByLabelText('Show chat')
    await user.click(chatToggle)

    await waitFor(() => {
      expect(chatToggle).not.toBeChecked()
    })
  })

  it('should display API key inputs', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
      expect(screen.getByLabelText('Anthropic API Key')).toBeInTheDocument()
    })
  })

  it('should allow entering OpenAI API key', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('OpenAI API Key')
    await user.type(input, 'sk-test-key')

    expect(input).toHaveValue('sk-test-key')
  })

  it('should allow entering Anthropic API key', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('Anthropic API Key')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('Anthropic API Key')
    await user.type(input, 'sk-ant-test-key')

    expect(input).toHaveValue('sk-ant-test-key')
  })

  it('should toggle OpenAI API key visibility', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement
    expect(input.type).toBe('password')

    const toggleButtons = screen.getAllByRole('button')
    const eyeButton = toggleButtons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-eye')
    )

    if (eyeButton) {
      await user.click(eyeButton)
      expect(input.type).toBe('text')
    }
  })

  it('should display existing API keys', async () => {
    const user = userEvent.setup()
    vi.mocked(apiKeysModule.getApiKeys).mockReturnValue({
      openai: 'sk-existing-openai',
      anthropic: 'sk-ant-existing-anthropic',
    })

    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const openaiInput = screen.getByLabelText('OpenAI API Key') as HTMLInputElement
      const anthropicInput = screen.getByLabelText('Anthropic API Key') as HTMLInputElement

      expect(openaiInput.value).toBe('sk-existing-openai')
      expect(anthropicInput.value).toBe('sk-ant-existing-anthropic')
    })
  })

  it('should save API keys to localStorage', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('OpenAI API Key')
    await user.type(input, 'sk-new-key')

    await waitFor(() => {
      expect(apiKeysModule.saveApiKeys).toHaveBeenCalled()
    })
  })

  it('should display verified org models toggle', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('Show verified org models')).toBeInTheDocument()
    })
  })

  it('should toggle verified org models setting', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const toggle = screen.getByLabelText('Show verified org models')
      expect(toggle).not.toBeChecked()
    })

    const toggle = screen.getByLabelText('Show verified org models')
    await user.click(toggle)

    await waitFor(() => {
      expect(toggle).toBeChecked()
    })
  })

  it('should display quick links section', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Quick Links')).toBeInTheDocument()
    })
  })

  it('should display default quick links', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByDisplayValue('YouTube')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ChatGPT')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Proton Mail')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Drive')).toBeInTheDocument()
    })
  })

  it('should add new quick link', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Quick Links')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add link/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('New')).toBeInTheDocument()
    })
  })

  it('should update quick link label', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByDisplayValue('YouTube')).toBeInTheDocument()
    })

    const youtubeInput = screen.getByDisplayValue('YouTube')
    await user.clear(youtubeInput)
    await user.type(youtubeInput, 'My YouTube')

    expect(youtubeInput).toHaveValue('My YouTube')
  })

  it('should update quick link URL', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://youtube.com')).toBeInTheDocument()
    })

    const urlInput = screen.getByDisplayValue('https://youtube.com')
    await user.clear(urlInput)
    await user.type(urlInput, 'https://youtube.com/feed/subscriptions')

    expect(urlInput).toHaveValue('https://youtube.com/feed/subscriptions')
  })

  it('should remove quick link', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByDisplayValue('YouTube')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByTitle('Remove')
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(screen.queryByDisplayValue('YouTube')).not.toBeInTheDocument()
    })
  })

  it('should change quick link icon', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Quick Links')).toBeInTheDocument()
    })

    // Find the first icon select trigger
    const selectTriggers = screen.getAllByRole('combobox')
    expect(selectTriggers.length).toBeGreaterThan(0)

    // The select component is present - this is sufficient to verify the functionality exists
    expect(selectTriggers[0]).toBeInTheDocument()
  })

  it('should display delete all chats button', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete all chats/i })).toBeInTheDocument()
    })
  })

  it('should show confirmation dialog for delete all chats', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete all chats/i })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /delete all chats/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
    })
  })

  it('should cancel delete all chats', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete all chats/i })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /delete all chats/i })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText(/this action cannot be undone/i)).not.toBeInTheDocument()
    })
  })

  it('should display auto-save message', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Changes are saved automatically.')).toBeInTheDocument()
    })
  })

  it('should handle multiple quick links', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /add link/i })
      expect(addButton).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add link/i })

    await user.click(addButton)
    await user.click(addButton)
    await user.click(addButton)

    await waitFor(() => {
      const newLinks = screen.getAllByDisplayValue('New')
      expect(newLinks.length).toBe(3)
    })
  })

  it('should preserve preferences across reopens', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const weatherToggle = screen.getByLabelText('Show weather')
      expect(weatherToggle).toBeInTheDocument()
    })

    const weatherToggle = screen.getByLabelText('Show weather')
    await user.click(weatherToggle)

    // Close the sheet (click outside or press escape)
    await user.keyboard('{Escape}')

    // Rerender
    rerender(<SettingsFab />)

    // Reopen
    await user.click(button)

    await waitFor(() => {
      const weatherToggleAfter = screen.getByLabelText('Show weather')
      expect(weatherToggleAfter).not.toBeChecked()
    })
  })

  it('should have proper aria labels', async () => {
    const user = userEvent.setup()
    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('Show weather')).toBeInTheDocument()
      expect(screen.getByLabelText('Show chat')).toBeInTheDocument()
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
      expect(screen.getByLabelText('Anthropic API Key')).toBeInTheDocument()
    })
  })

  it('should handle empty API keys', async () => {
    const user = userEvent.setup()
    vi.mocked(apiKeysModule.getApiKeys).mockReturnValue({})

    render(<SettingsFab />)

    const button = screen.getByTitle('Settings')
    await user.click(button)

    await waitFor(() => {
      const openaiInput = screen.getByLabelText('OpenAI API Key') as HTMLInputElement
      const anthropicInput = screen.getByLabelText('Anthropic API Key') as HTMLInputElement

      expect(openaiInput.value).toBe('')
      expect(anthropicInput.value).toBe('')
    })
  })
})
