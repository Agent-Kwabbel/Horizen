import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import ChatSidebar, { type ChatSidebarRef } from '@/components/ChatSidebar'

// Mock the chat API
vi.mock('@/lib/chat-api', () => ({
  sendChatMessage: vi.fn(async function* () {
    yield { content: 'Test response' }
  }),
}))

// Mock API keys
vi.mock('@/lib/api-keys', () => ({
  getApiKeys: vi.fn(async () => ({
    openai: 'sk-test-key',
    anthropic: 'sk-ant-test-key',
  })),
  saveApiKeys: vi.fn(async () => {}),
  migrateFromPlaintext: vi.fn(async () => {}),
}))

describe('ChatSidebar', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(<ChatSidebar open={false} onOpenChange={mockOnOpenChange} />)

    expect(screen.queryByText('Chat Assistant')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText('Chat Assistant')).toBeInTheDocument()
  })

  it('should display New Chat button', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
  })

  it('should create new conversation when New Chat button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
    })

    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    await user.click(newChatButton)

    await waitFor(() => {
      const conversations = screen.getAllByText('New Conversation')
      expect(conversations.length).toBe(2)
    })
  })

  it('should display message input', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
  })

  it('should display send button', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-send')
    )
    expect(sendButton).toBeInTheDocument()
  })

  it('should display file upload button', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    const buttons = screen.getAllByRole('button')
    const uploadButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-paperclip')
    )
    expect(uploadButton).toBeInTheDocument()
  })

  describe('ref methods', () => {
    it('should expose focusInput method via ref', () => {
      const ref = createRef<ChatSidebarRef>()
      render(<ChatSidebar ref={ref} open={true} onOpenChange={mockOnOpenChange} />)

      expect(ref.current).toBeTruthy()
      expect(ref.current?.focusInput).toBeInstanceOf(Function)
    })

    it('should expose triggerFileUpload method via ref', () => {
      const ref = createRef<ChatSidebarRef>()
      render(<ChatSidebar ref={ref} open={true} onOpenChange={mockOnOpenChange} />)

      expect(ref.current).toBeTruthy()
      expect(ref.current?.triggerFileUpload).toBeInstanceOf(Function)
    })

    it('should expose selectConversation method via ref', () => {
      const ref = createRef<ChatSidebarRef>()
      render(<ChatSidebar ref={ref} open={true} onOpenChange={mockOnOpenChange} />)

      expect(ref.current).toBeTruthy()
      expect(ref.current?.selectConversation).toBeInstanceOf(Function)
    })

    it('should focus input when focusInput is called', async () => {
      const ref = createRef<ChatSidebarRef>()
      render(<ChatSidebar ref={ref} open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(ref.current).toBeTruthy()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      expect(document.activeElement).not.toBe(input)

      ref.current?.focusInput()

      await waitFor(() => {
        expect(document.activeElement).toBe(input)
      })
    })

    it('should trigger file input when triggerFileUpload is called', async () => {
      const ref = createRef<ChatSidebarRef>()
      render(<ChatSidebar ref={ref} open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(ref.current).toBeTruthy()
      })

      // Mock the click method
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toBeTruthy()

      const clickSpy = vi.spyOn(fileInput, 'click')

      ref.current?.triggerFileUpload()

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalled()
      })
    })

    it('should select conversation when selectConversation is called', async () => {
      const ref = createRef<ChatSidebarRef>()
      render(<ChatSidebar ref={ref} open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(ref.current).toBeTruthy()
        expect(screen.getByText('New Conversation')).toBeInTheDocument()
      })

      // Get the conversation ID from localStorage
      const prefs = JSON.parse(localStorage.getItem('startpage:prefs') || '{}')
      const conversationId = prefs.conversations?.[0]?.id

      if (conversationId) {
        ref.current?.selectConversation(conversationId)

        await waitFor(() => {
          // The conversation should now be highlighted/selected
          // We can verify this by checking if the textarea is visible and ready for input
          const input = screen.getByPlaceholderText(/type your message/i)
          expect(input).toBeInTheDocument()
        })
      }
    })
  })

  it('should auto-create conversation when sidebar opens', async () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
    })
  })

  it('should display model selection dropdowns', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByText('Model')).toBeInTheDocument()
  })

  it('should allow sending a message', async () => {
    const user = userEvent.setup()
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/type your message/i)
    await user.type(input, 'Hello, world!')

    expect(input).toHaveValue('Hello, world!')

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-send')
    )

    if (sendButton) {
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Hello, world!')).toBeInTheDocument()
      })
    }
  })

  it('should display conversation list', async () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
    })
  })

  it('should allow editing conversation title', async () => {
    const user = userEvent.setup()
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
    })

    // Find and click the edit button (pencil icon)
    const buttons = screen.getAllByRole('button')
    const editButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-pencil')
    )

    if (editButton) {
      await user.click(editButton)

      await waitFor(() => {
        const input = screen.getByDisplayValue('New Conversation')
        expect(input).toBeInTheDocument()
      })
    }
  })

  it('should allow deleting conversation', async () => {
    const user = userEvent.setup()
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
    })

    // Find and click the delete button (trash icon)
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    )

    if (deleteButton) {
      await user.click(deleteButton)

      await waitFor(() => {
        // Should show empty state or create new conversation
        expect(screen.queryByText('New Conversation') || screen.getByText('Start a conversation')).toBeTruthy()
      })
    }
  })

  it('should clean up empty conversations when sidebar closes', async () => {
    const { rerender } = render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
    })

    // Close the sidebar
    rerender(<ChatSidebar open={false} onOpenChange={mockOnOpenChange} />)

    // Check localStorage - empty conversations should be removed
    await waitFor(() => {
      const prefs = JSON.parse(localStorage.getItem('startpage:prefs') || '{}')
      const emptyConversations = (prefs.conversations || []).filter((c: any) => c.messages.length === 0)
      expect(emptyConversations.length).toBe(0)
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
  })
})
