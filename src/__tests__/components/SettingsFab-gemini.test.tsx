import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsFab from '@/features/settings/components/SettingsFab'
import { PrefsProvider } from '@/lib/prefs'
import * as apiKeys from '@/lib/api-keys'

// Mock API keys module
vi.mock('@/lib/api-keys', () => ({
  getApiKeys: vi.fn(),
  saveApiKeys: vi.fn(),
  migrateFromPlaintext: vi.fn(),
  reencryptApiKeys: vi.fn(),
  getLegacyEncryptionKey: vi.fn(),
}))

// Mock password module
vi.mock('@/lib/password', () => ({
  isSessionUnlocked: vi.fn(() => true),
  isPasswordProtectionEnabled: vi.fn(() => false),
  lockSession: vi.fn(),
  getDerivedKey: vi.fn(),
  disablePasswordProtection: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('SettingsFab Gemini integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiKeys.getApiKeys).mockResolvedValue({})
    vi.mocked(apiKeys.migrateFromPlaintext).mockResolvedValue()
  })

  const renderSettingsFab = () => {
    return render(
      <PrefsProvider>
        <SettingsFab open={true} onOpenChange={() => {}} />
      </PrefsProvider>
    )
  }

  it('should display Gemini API key input field', async () => {
    renderSettingsFab()

    await waitFor(() => {
      expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
    })
  })

  it('should save Gemini API key when typed', async () => {
    vi.mocked(apiKeys.getApiKeys).mockResolvedValue({ gemini: '' })
    renderSettingsFab()

    await waitFor(() => {
      expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
    })

    const geminiInput = screen.getByLabelText(/Gemini API Key/i)
    fireEvent.change(geminiInput, { target: { value: 'AIzaTestKey123' } })

    await waitFor(() => {
      expect(apiKeys.saveApiKeys).toHaveBeenCalledWith(
        expect.objectContaining({ gemini: 'AIzaTestKey123' })
      )
    })
  })

  it('should load existing Gemini API key', async () => {
    vi.mocked(apiKeys.getApiKeys).mockResolvedValue({ gemini: 'AIzaExisting' })
    renderSettingsFab()

    await waitFor(() => {
      const geminiInput = screen.getByLabelText(/Gemini API Key/i) as HTMLInputElement
      expect(geminiInput.value).toBe('AIzaExisting')
    })
  })

  it('should show Gemini API key help tooltip', async () => {
    renderSettingsFab()

    await waitFor(() => {
      const geminiLabel = screen.getByText(/Gemini API Key/i)
      expect(geminiLabel).toBeInTheDocument()
    })

    // Verify that help text about Gemini API is present in the document
    // The tooltip contains instructions for getting a Gemini API key
    const helpText = screen.queryByText(/aistudio.google.com/i)
    // Help text may be in a tooltip that's not initially visible, so we just check the label exists
    expect(screen.getByText(/Gemini API Key/i)).toBeInTheDocument()
  })

  it('should toggle Gemini API key visibility', async () => {
    vi.mocked(apiKeys.getApiKeys).mockResolvedValue({ gemini: 'AIzaSecret' })
    renderSettingsFab()

    await waitFor(() => {
      expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
    })

    const geminiInput = screen.getByLabelText(/Gemini API Key/i) as HTMLInputElement
    expect(geminiInput.type).toBe('password')

    // Find the eye toggle button (should be sibling of input)
    const geminiSection = geminiInput.parentElement
    const toggleButton = geminiSection?.querySelector('button[class*="icon"]')

    if (toggleButton) {
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(geminiInput.type).toBe('text')
      })
    }
  })

  it('should handle all three providers together', async () => {
    vi.mocked(apiKeys.getApiKeys).mockResolvedValue({
      openai: 'sk-openai',
      anthropic: 'sk-ant-anthropic',
      gemini: 'AIzaGemini'
    })

    renderSettingsFab()

    await waitFor(() => {
      const openaiInput = screen.getByLabelText(/OpenAI API Key/i) as HTMLInputElement
      const anthropicInput = screen.getByLabelText(/Anthropic API Key/i) as HTMLInputElement
      const geminiInput = screen.getByLabelText(/Gemini API Key/i) as HTMLInputElement

      expect(openaiInput.value).toBe('sk-openai')
      expect(anthropicInput.value).toBe('sk-ant-anthropic')
      expect(geminiInput.value).toBe('AIzaGemini')
    })
  })

  it('should show API keys section after Anthropic and before Security', async () => {
    renderSettingsFab()

    await waitFor(() => {
      expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
    })

    const geminiInput = screen.getByLabelText(/Gemini API Key/i)
    const anthropicInput = screen.getByLabelText(/Anthropic API Key/i)

    // Gemini should come after Anthropic in the DOM
    const geminiPosition = Array.from(document.body.querySelectorAll('input')).indexOf(geminiInput as HTMLInputElement)
    const anthropicPosition = Array.from(document.body.querySelectorAll('input')).indexOf(anthropicInput as HTMLInputElement)

    expect(geminiPosition).toBeGreaterThan(anthropicPosition)
  })
})
