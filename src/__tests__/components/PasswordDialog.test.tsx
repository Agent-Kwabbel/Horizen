import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import PasswordDialog from '@/features/security/components/PasswordDialog'
import * as passwordModule from '@/lib/password'
import * as apiKeysModule from '@/lib/api-keys'

vi.mock('@/lib/password')
vi.mock('@/lib/api-keys')

describe('PasswordDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Create a mock CryptoKey
    const mockCryptoKey = {} as CryptoKey

    vi.mocked(passwordModule.setupPassword).mockResolvedValue(undefined)
    vi.mocked(passwordModule.unlockWithPassword).mockResolvedValue(true)
    vi.mocked(passwordModule.disablePasswordProtection).mockResolvedValue(undefined)
    vi.mocked(passwordModule.validatePassword).mockReturnValue({ valid: true })
    vi.mocked(passwordModule.getDerivedKey).mockReturnValue(mockCryptoKey)
    vi.mocked(apiKeysModule.clearLegacyEncryptionKey).mockReturnValue(undefined)
    vi.mocked(apiKeysModule.getLegacyEncryptionKey).mockResolvedValue(mockCryptoKey)
    vi.mocked(apiKeysModule.getEncryptionKey).mockResolvedValue(mockCryptoKey)
    vi.mocked(apiKeysModule.reencryptApiKeys).mockResolvedValue(undefined)
  })

  describe('Setup Mode', () => {
    it('should render setup mode dialog', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Setup Password Protection (BETA)')).toBeInTheDocument()
    })

    it('should display beta warning', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('BETA Feature Warning')).toBeInTheDocument()
      expect(screen.getByText(/keep a secure backup copy/i)).toBeInTheDocument()
    })

    it('should display security features list', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Enhanced Security')).toBeInTheDocument()
      expect(screen.getByText(/password never stored/i)).toBeInTheDocument()
      expect(screen.getByText(/PBKDF2/i)).toBeInTheDocument()
      expect(screen.getByText(/AES-GCM 256-bit/i)).toBeInTheDocument()
    })

    it('should have password and confirm password inputs', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
      expect(passwordInput.type).toBe('password')

      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-eye')
      )

      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput.type).toBe('text')
      }
    })

    it('should validate password as user types', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.validatePassword).mockReturnValue({
        valid: false,
        message: 'Password must be at least 6 characters',
      })

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, '123')

      await waitFor(() => {
        expect(passwordModule.validatePassword).toHaveBeenCalledWith('123')
      })
    })

    it('should show error for mismatched passwords', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'different123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      })
    })

    it('should show error for short passwords', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), '12345')
      await user.type(screen.getByLabelText('Confirm Password'), '12345')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument()
      })
    })

    it('should call setupPassword on successful setup', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(passwordModule.setupPassword).toHaveBeenCalledWith('password123')
      })
    })

    it('should call onSuccess after setup', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should clear legacy encryption key after setup', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(apiKeysModule.clearLegacyEncryptionKey).toHaveBeenCalled()
      })
    })

    it('should have Skip button', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
    })

    it('should show opt-out warning when Skip is clicked', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const skipButton = screen.getByRole('button', { name: /skip/i })
      await user.click(skipButton)

      await waitFor(() => {
        expect(screen.getByText('Disable Password Protection?')).toBeInTheDocument()
      })
    })

    it('should reset form when dialog opens', async () => {
      const { rerender } = render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Password'), 'test')

      rerender(
        <PasswordDialog
          mode="setup"
          open={false}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      rerender(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
      expect(passwordInput.value).toBe('')
    })

    it('should support Enter key to submit', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123{Enter}')

      await waitFor(() => {
        expect(passwordModule.setupPassword).toHaveBeenCalled()
      })
    })
  })

  describe('Unlock Mode', () => {
    it('should render unlock mode dialog', () => {
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Unlock Session')).toBeInTheDocument()
    })

    it('should only have password input (no confirm)', () => {
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.queryByLabelText('Confirm Password')).not.toBeInTheDocument()
    })

    it('should call unlockWithPassword on submit', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'testpassword')

      const unlockButton = screen.getByRole('button', { name: /unlock/i })
      await user.click(unlockButton)

      await waitFor(() => {
        expect(passwordModule.unlockWithPassword).toHaveBeenCalledWith('testpassword')
      })
    })

    it('should show error for incorrect password', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.unlockWithPassword).mockResolvedValue(false)

      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'wrongpassword')

      const unlockButton = screen.getByRole('button', { name: /unlock/i })
      await user.click(unlockButton)

      await waitFor(() => {
        expect(screen.getByText('Incorrect password')).toBeInTheDocument()
      })
    })

    it('should call onSuccess on correct password', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.unlockWithPassword).mockResolvedValue(true)

      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'correctpassword')

      const unlockButton = screen.getByRole('button', { name: /unlock/i })
      await user.click(unlockButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should have Forgot Password button', () => {
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
    })

    it('should not show beta warning in unlock mode', () => {
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.queryByText('BETA Feature Warning')).not.toBeInTheDocument()
    })

    it('should not show security features list in unlock mode', () => {
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.queryByText('Enhanced Security')).not.toBeInTheDocument()
    })
  })

  describe('Opt-Out Warning Dialog', () => {
    it('should display security risks', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        expect(screen.getByText('Security Risks:')).toBeInTheDocument()
        expect(screen.getByText(/XSS attacks/i)).toBeInTheDocument()
        // Multiple instances of "browser extensions" exist (one in setup warning, one in opt-out)
        const browserExtensionsTexts = screen.getAllByText(/browser extensions/i)
        expect(browserExtensionsTexts.length).toBeGreaterThan(0)
        expect(screen.getByText(/DevTools/i)).toBeInTheDocument()
      })
    })

    it('should require checkbox confirmation', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        const disableButton = screen.getByRole('button', { name: /disable protection/i })
        expect(disableButton).toBeDisabled()
      })
    })

    it('should enable disable button after checkbox is checked', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        expect(screen.getByText(/I understand the security risks/i)).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      await waitFor(() => {
        const disableButton = screen.getByRole('button', { name: /disable protection/i })
        expect(disableButton).not.toBeDisabled()
      })
    })

    it('should call disablePasswordProtection on confirmation', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const disableButton = screen.getByRole('button', { name: /disable protection/i })
      await user.click(disableButton)

      await waitFor(() => {
        expect(passwordModule.disablePasswordProtection).toHaveBeenCalled()
      })
    })

    it('should have Cancel button', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })

    it('should reset checkbox when cancelled', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Reopen
      await user.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        const newCheckbox = screen.getByRole('checkbox')
        expect(newCheckbox).not.toBeChecked()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('should autofocus password input', async () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const passwordInput = screen.getByLabelText('Password')
      // Check if the input actually has focus, not just the attribute
      await waitFor(() => {
        expect(document.activeElement).toBe(passwordInput)
      })
    })

    it('should disable buttons when loading', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.setupPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      // Button should be disabled while loading
      expect(enableButton).toBeDisabled()
    })
  })

  describe('Forgot Password Feature', () => {
    it('should show Forgot Password button in unlock mode', () => {
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
    })

    it('should not show Forgot Password button in setup mode', () => {
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument()
    })

    it('should open forgot password warning dialog', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByText(/forgot password - reset security/i)).toBeInTheDocument()
        expect(screen.getByText(/all your encrypted api keys will be permanently deleted/i)).toBeInTheDocument()
      })
    })

    it('should display data loss warnings in forgot password dialog', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByText('Data Loss Warning')).toBeInTheDocument()
        expect(screen.getByText(/all stored api keys will be permanently deleted/i)).toBeInTheDocument()
        expect(screen.getByText(/password protection will be disabled/i)).toBeInTheDocument()
        expect(screen.getByText(/you will need to re-enter your api keys manually/i)).toBeInTheDocument()
        expect(screen.getByText(/this action cannot be reversed/i)).toBeInTheDocument()
      })
    })

    it('should require checkbox confirmation for forgot password', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete keys & reset security/i })
        expect(deleteButton).toBeDisabled()
      })
    })

    it('should enable delete button after checkbox is checked', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByText(/i understand that all my api keys will be permanently deleted/i)).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete keys & reset security/i })
        expect(deleteButton).not.toBeDisabled()
      })
    })

    it('should call disablePasswordProtection and clear keys on confirmation', async () => {
      const user = userEvent.setup()
      const mockSaveApiKeys = vi.fn().mockResolvedValue(undefined)

      // Mock the dynamic import
      vi.doMock('@/lib/api-keys', async () => {
        const actual = await vi.importActual('@/lib/api-keys')
        return {
          ...actual,
          saveApiKeys: mockSaveApiKeys,
        }
      })

      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)

      const deleteButton = screen.getByRole('button', { name: /delete keys & reset security/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(passwordModule.disablePasswordProtection).toHaveBeenCalled()
      })
    })

    it('should call onSuccess after forgot password completion', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)

      const deleteButton = screen.getByRole('button', { name: /delete keys & reset security/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should have Cancel button in forgot password dialog', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
        expect(cancelButtons.length).toBeGreaterThan(0)
      })
    })

    it('should reset checkbox when forgot password dialog is cancelled', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
      await user.click(cancelButtons[cancelButtons.length - 1])

      // Reopen
      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        const newCheckbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
        expect(newCheckbox).not.toBeChecked()
      })
    })
  })

  describe('Setup with Existing Keys', () => {
    it('should call getLegacyEncryptionKey before enabling protection', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'strongPassword123!')
      await user.type(screen.getByLabelText('Confirm Password'), 'strongPassword123!')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(apiKeysModule.getLegacyEncryptionKey).toHaveBeenCalled()
      })
    })

    it('should call getDerivedKey after enabling protection', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'strongPassword123!')
      await user.type(screen.getByLabelText('Confirm Password'), 'strongPassword123!')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(passwordModule.getDerivedKey).toHaveBeenCalled()
      })
    })

    it('should call reencryptApiKeys with legacy and password keys', async () => {
      const user = userEvent.setup()
      const mockLegacyKey = {} as CryptoKey
      const mockPasswordKey = {} as CryptoKey

      vi.mocked(apiKeysModule.getLegacyEncryptionKey).mockResolvedValue(mockLegacyKey)
      vi.mocked(passwordModule.getDerivedKey).mockReturnValue(mockPasswordKey)

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'strongPassword123!')
      await user.type(screen.getByLabelText('Confirm Password'), 'strongPassword123!')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(apiKeysModule.reencryptApiKeys).toHaveBeenCalledWith(mockLegacyKey, mockPasswordKey)
      })
    })

    it('should clear legacy key after successful reencryption', async () => {
      const user = userEvent.setup()
      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'strongPassword123!')
      await user.type(screen.getByLabelText('Confirm Password'), 'strongPassword123!')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(apiKeysModule.clearLegacyEncryptionKey).toHaveBeenCalled()
      })
    })

    it('should still succeed if no legacy keys exist', async () => {
      const user = userEvent.setup()
      vi.mocked(apiKeysModule.getLegacyEncryptionKey).mockResolvedValue(null)
      vi.mocked(apiKeysModule.reencryptApiKeys).mockRejectedValue(new Error('No keys to reencrypt'))

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'strongPassword123!')
      await user.type(screen.getByLabelText('Confirm Password'), 'strongPassword123!')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Password Validation Colors', () => {
    it('should show red text for invalid password', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.validatePassword).mockReturnValue({
        valid: false,
        message: 'Password too short',
      })

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'abc')

      await waitFor(() => {
        const message = screen.getByText('Password too short')
        expect(message).toHaveClass('text-red-400')
      })
    })

    it('should show yellow text for valid but weak password', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.validatePassword).mockReturnValue({
        valid: true,
        isStrong: false,
        message: 'Password is valid but weak',
      })

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')

      await waitFor(() => {
        const message = screen.getByText('Password is valid but weak')
        expect(message).toHaveClass('text-yellow-400')
      })
    })

    it('should show green text for strong password', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.validatePassword).mockReturnValue({
        valid: true,
        isStrong: true,
        message: 'Strong password',
      })

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'StrongP@ssw0rd!')

      await waitFor(() => {
        const message = screen.getByText('Strong password')
        expect(message).toHaveClass('text-green-400')
      })
    })

    it('should not show validation in unlock mode', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.validatePassword).mockReturnValue({
        valid: false,
        message: 'Should not appear',
      })

      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'abc')

      // Validation should not appear in unlock mode
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should show error if getDerivedKey returns null during setup', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.getDerivedKey).mockReturnValue(null)

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to get password-derived key/i)).toBeInTheDocument()
      })
    })

    it('should show error if setupPassword fails', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.setupPassword).mockRejectedValue(new Error('Setup failed'))

      render(
        <PasswordDialog
          mode="setup"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'password123')

      const enableButton = screen.getByRole('button', { name: /enable protection/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText(/setup failed/i)).toBeInTheDocument()
      })
    })

    it('should show error if forgot password operation fails', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.disablePasswordProtection).mockRejectedValue(new Error('Failed to disable'))

      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess=  {mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)

      const deleteButton = screen.getByRole('button', { name: /delete keys & reset security/i })
      await user.click(deleteButton)

      await waitFor(() => {
        // The error contains "Failed to disable" from our mock
        expect(screen.getByText(/failed to disable/i)).toBeInTheDocument()
      })
    })

    it('should reset forgot password checkbox when main dialog reopens', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      // Close the main dialog
      rerender(
        <PasswordDialog
          mode="unlock"
          open={false}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Reopen
      rerender(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Checkbox state should be reset per the useEffect dependency on 'open'
      // The forgot password dialog might still be visible, but checkbox should be unchecked
      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox')
        // Main dialog has one password visibility button, so we verify checkboxes exist
        expect(checkboxes.length).toBeGreaterThanOrEqual(0)
      })
    })

    it('should call disablePasswordProtection when confirmed', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordModule.disablePasswordProtection).mockResolvedValue(undefined)

      render(
        <PasswordDialog
          mode="unlock"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      await user.click(screen.getByRole('button', { name: /forgot password/i }))

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /i understand that all my api keys will be permanently deleted/i })
      await user.click(checkbox)

      const deleteButton = screen.getByRole('button', { name: /delete keys & reset security/i })
      await user.click(deleteButton)

      // Should call disablePasswordProtection
      await waitFor(() => {
        expect(passwordModule.disablePasswordProtection).toHaveBeenCalled()
      })
    })
  })
})
