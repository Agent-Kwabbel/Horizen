import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import ExportDialog from '@/features/security/components/ExportDialog'
import * as importExportModule from '@/lib/import-export'

vi.mock('@/lib/import-export')

describe('ExportDialog', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(importExportModule.exportData).mockResolvedValue('{}')
    vi.mocked(importExportModule.downloadExportFile).mockReturnValue(undefined)
  })

  describe('Export with API Keys', () => {
    it('should show error when exporting API keys while session is locked', async () => {
      const user = userEvent.setup()
      const lockError = new Error('Session locked. Please unlock with your password.')
      vi.mocked(importExportModule.exportData).mockRejectedValue(lockError)

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Check include API keys
      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      // Accept warning
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })).toBeInTheDocument()
      })

      const warningCheckbox = screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })
      await user.click(warningCheckbox)

      // Enter password
      const passwordInput = screen.getByPlaceholderText(/enter password to encrypt export/i)
      await user.type(passwordInput, 'testpassword')

      // Click export
      const exportButton = screen.getByRole('button', { name: /^export$/i })
      await user.click(exportButton)

      // Should show specific locked error message
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Session is locked')
        )
      })

      alertSpy.mockRestore()
    })

    it('should show generic error for other export failures', async () => {
      const user = userEvent.setup()
      const genericError = new Error('Network error')
      vi.mocked(importExportModule.exportData).mockRejectedValue(genericError)

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })).toBeInTheDocument()
      })

      const warningCheckbox = screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })
      await user.click(warningCheckbox)

      const passwordInput = screen.getByPlaceholderText(/enter password to encrypt export/i)
      await user.type(passwordInput, 'testpassword')

      const exportButton = screen.getByRole('button', { name: /^export$/i })
      await user.click(exportButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        )
      })

      alertSpy.mockRestore()
    })

    it('should successfully export with password when session is unlocked', async () => {
      const user = userEvent.setup()
      vi.mocked(importExportModule.exportData).mockResolvedValue('{"test": "data"}')

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })).toBeInTheDocument()
      })

      const warningCheckbox = screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })
      await user.click(warningCheckbox)

      const passwordInput = screen.getByPlaceholderText(/enter password to encrypt export/i)
      await user.type(passwordInput, 'testpassword')

      const exportButton = screen.getByRole('button', { name: /^export$/i })
      await user.click(exportButton)

      await waitFor(() => {
        expect(importExportModule.exportData).toHaveBeenCalled()
        expect(importExportModule.downloadExportFile).toHaveBeenCalledWith('{"test": "data"}')
      })
    })

    it('should require password when exporting API keys', async () => {
      const user = userEvent.setup()

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter password to encrypt export/i)).toBeInTheDocument()
      })
    })

    it('should disable export button until password is entered', async () => {
      const user = userEvent.setup()

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })).toBeInTheDocument()
      })

      const warningCheckbox = screen.getByRole('checkbox', { name: /i understand the risks and will store this file securely/i })
      await user.click(warningCheckbox)

      const exportButton = screen.getByRole('button', { name: /^export$/i })
      expect(exportButton).toBeDisabled()

      const passwordInput = screen.getByPlaceholderText(/enter password to encrypt export/i)
      await user.type(passwordInput, 'testpassword')

      await waitFor(() => {
        expect(exportButton).not.toBeDisabled()
      })
    })
  })

  describe('Export without API Keys', () => {
    it('should export without password when API keys not included', async () => {
      const user = userEvent.setup()
      vi.mocked(importExportModule.exportData).mockResolvedValue('{"prefs": "data"}')

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Only preferences selected by default, no API keys
      const exportButton = screen.getByRole('button', { name: /^export$/i })
      await user.click(exportButton)

      await waitFor(() => {
        expect(importExportModule.exportData).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            includeApiKeys: false
          }),
          undefined // No password
        )
      })
    })

    it('should not show password input when API keys not selected', () => {
      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Password input should not be visible
      expect(screen.queryByPlaceholderText(/enter password to encrypt export/i)).not.toBeInTheDocument()
    })
  })

  describe('Export Options', () => {
    it('should have preferences checked by default', () => {
      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const prefsCheckbox = screen.getByRole('checkbox', { name: /preferences/i })
      expect(prefsCheckbox).toBeChecked()
    })

    it('should have chats checked by default', () => {
      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const chatsCheckbox = screen.getByRole('checkbox', { name: /chat conversations/i })
      expect(chatsCheckbox).toBeChecked()
    })

    it('should not have API keys checked by default', () => {
      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      expect(apiKeysCheckbox).not.toBeChecked()
    })

    it('should allow toggling export options', async () => {
      const user = userEvent.setup()

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const prefsCheckbox = screen.getByRole('checkbox', { name: /preferences/i })
      const chatsCheckbox = screen.getByRole('checkbox', { name: /chat conversations/i })

      await user.click(prefsCheckbox)
      expect(prefsCheckbox).not.toBeChecked()

      await user.click(chatsCheckbox)
      expect(chatsCheckbox).not.toBeChecked()
    })

    it('should disable export button when no options selected', async () => {
      const user = userEvent.setup()

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Uncheck all options
      const prefsCheckbox = screen.getByRole('checkbox', { name: /preferences/i })
      const chatsCheckbox = screen.getByRole('checkbox', { name: /chat conversations/i })

      await user.click(prefsCheckbox)
      await user.click(chatsCheckbox)

      const exportButton = screen.getByRole('button', { name: /^export$/i })
      expect(exportButton).toBeDisabled()
    })
  })

  describe('Security Warning', () => {
    it('should show security warning when API keys selected', async () => {
      const user = userEvent.setup()

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        expect(screen.getByText(/security warning/i)).toBeInTheDocument()
        expect(screen.getByText(/store this backup file securely/i)).toBeInTheDocument()
      })
    })

    it('should require security warning acknowledgment', async () => {
      const user = userEvent.setup()

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /^export$/i })
        expect(exportButton).toBeDisabled()
      })
    })
  })

  describe('Dialog Behavior', () => {
    it('should close dialog after successful export', async () => {
      const user = userEvent.setup()
      vi.mocked(importExportModule.exportData).mockResolvedValue('{"data": "test"}')

      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const exportButton = screen.getByRole('button', { name: /^export$/i })
      await user.click(exportButton)

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should maintain state across dialog opens', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Select API keys
      const apiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      await user.click(apiKeysCheckbox)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter password to encrypt export/i)).toBeInTheDocument()
      })

      // Close dialog
      rerender(
        <ExportDialog
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      // Reopen
      rerender(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      // State is maintained in this implementation
      // This is expected behavior for this component
      const newApiKeysCheckbox = screen.getByRole('checkbox', { name: /api keys/i })
      // Component maintains state, so it will still be checked
      expect(newApiKeysCheckbox).toBeChecked()
    })

    it('should have cancel button', () => {
      render(
        <ExportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })
})
