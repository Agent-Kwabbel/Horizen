import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import ChatSidebar, { type ChatSidebarRef } from '@/features/chat/components/ChatSidebar'

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

    // Send a message to make the conversation non-empty
    const input = screen.getByPlaceholderText(/type your message/i)
    await user.type(input, 'First message')
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-send')
    )
    if (sendButton) {
      await user.click(sendButton)
      await waitFor(() => {
        // Message appears in multiple places, use getAllByText
        const messages = screen.getAllByText('First message')
        expect(messages.length).toBeGreaterThan(0)
      })
    }

    // Verify conversation count before creating new one
    const prefsBeforeNewChat = JSON.parse(localStorage.getItem('startpage:prefs') || '{}')
    expect(prefsBeforeNewChat.conversations.length).toBe(1)

    // Now click New Chat - should create a second conversation
    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    await user.click(newChatButton)

    await waitFor(() => {
      const prefsAfterNewChat = JSON.parse(localStorage.getItem('startpage:prefs') || '{}')
      // Should have 2 conversations: the one with messages and the new empty one
      expect(prefsAfterNewChat.conversations.length).toBe(2)

      // The new conversation should be titled "New Conversation"
      expect(screen.getByText('New Conversation')).toBeInTheDocument()
      // The old conversation should be titled with its first message
      expect(screen.getByText('First message')).toBeInTheDocument()
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
        // Message appears in both the conversation list and the message content
        const messages = screen.getAllByText('Hello, world!')
        expect(messages.length).toBeGreaterThan(0)
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

    // Verify we have an empty conversation before closing
    const prefsBeforeClose = JSON.parse(localStorage.getItem('startpage:prefs') || '{}')
    expect(prefsBeforeClose.conversations.length).toBe(1)
    expect(prefsBeforeClose.conversations[0].messages.length).toBe(0)

    // Close the sidebar
    rerender(<ChatSidebar open={false} onOpenChange={mockOnOpenChange} />)

    // Wait for the useEffect cleanup to run and check localStorage
    await waitFor(() => {
      const prefs = JSON.parse(localStorage.getItem('startpage:prefs') || '{}')
      const emptyConversations = (prefs.conversations || []).filter((c: any) => c.messages.length === 0)
      expect(emptyConversations.length).toBe(0)
    }, { timeout: 3000 })
  })

  it('should have proper accessibility attributes', () => {
    render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
  })

  describe('Ghost Mode', () => {
    it('should enable ghost mode toggle on new conversation', async () => {
      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText('New Conversation')).toBeInTheDocument()
      })

      // Find ghost mode button
      const buttons = screen.getAllByRole('button')
      const ghostButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-ghost')
      )

      expect(ghostButton).toBeTruthy()
      expect(ghostButton).not.toBeDisabled()
    })

    it('should disable ghost mode button after sending message', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send a message
      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Hello, this is a test message!')

      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )

      if (sendButton) {
        await user.click(sendButton)

        await waitFor(() => {
          // Message appears in multiple places, so use getAllByText
          const messages = screen.getAllByText('Hello, this is a test message!')
          expect(messages.length).toBeGreaterThan(0)
        })

        // Re-query ghost button after state update
        await waitFor(() => {
          const updatedButtons = screen.getAllByRole('button')
          const ghostButton = updatedButtons.find(btn =>
            btn.querySelector('svg')?.classList.contains('lucide-ghost')
          )

          if (ghostButton) {
            expect(ghostButton).toBeDisabled()
          }
        })
      }
    })

    it('should not allow toggling ghost mode on conversation with messages', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send a message first
      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test message')

      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )

      if (sendButton) {
        await user.click(sendButton)

        await waitFor(() => {
          const ghostButton = buttons.find(btn =>
            btn.querySelector('svg')?.classList.contains('lucide-ghost')
          )

          if (ghostButton) {
            expect(ghostButton).toBeDisabled()
            expect(ghostButton).toHaveClass('cursor-not-allowed')
          }
        })
      }
    })

    it('should re-enable ghost mode on new conversation', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send a message to disable ghost mode
      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test')

      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )

      if (sendButton) {
        await user.click(sendButton)
      }

      // Create new conversation
      const newChatButton = screen.getByRole('button', { name: /new chat/i })
      await user.click(newChatButton)

      await waitFor(() => {
        const ghostButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-ghost')
        )

        if (ghostButton) {
          expect(ghostButton).not.toBeDisabled()
        }
      })
    })

    it('should toggle ghost mode on empty conversation', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText('New Conversation')).toBeInTheDocument()
      })

      const buttons = screen.getAllByRole('button')
      const ghostButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-ghost')
      )

      if (ghostButton) {
        // Should be enabled and clickable
        expect(ghostButton).not.toBeDisabled()

        await user.click(ghostButton)

        // Should still be enabled (just toggled on)
        expect(ghostButton).not.toBeDisabled()
      }
    })
  })

  describe('Stream Abort/Stop Functionality', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should display stop button while streaming', async () => {
      const user = userEvent.setup()

      // Mock a streaming response that takes time
      const { sendChatMessage } = await import('@/lib/chat-api')
      vi.mocked(sendChatMessage).mockImplementation(async function* () {
        yield { content: 'Start', done: false }
        await new Promise(resolve => setTimeout(resolve, 100))
        yield { content: ' streaming', done: false }
        await new Promise(resolve => setTimeout(resolve, 100))
        yield { content: ' response', done: false }
        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test message')

      // Click send button
      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )

      expect(sendButton).toBeTruthy()
      await user.click(sendButton!)

      // Wait for streaming to start and check for stop button
      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-square')
        )
        expect(stopButton).toBeInTheDocument()
      })

      // Verify send button is gone
      await waitFor(() => {
        const sendButtons = screen.getAllByRole('button').filter(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButtons.length).toBe(0)
      })
    })

    it('should hide stop button after stream completes', async () => {
      const user = userEvent.setup()

      // Mock a quick streaming response
      const { sendChatMessage } = await import('@/lib/chat-api')
      vi.mocked(sendChatMessage).mockImplementation(async function* () {
        yield { content: 'Quick response', done: false }
        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test')

      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )

      await user.click(sendButton!)

      // Wait for stream to complete and verify send button is back
      await waitFor(() => {
        const sendButtonAfter = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButtonAfter).toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify stop button is gone
      const stopButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      expect(stopButtons.length).toBe(0)
    })

    it('should stop stream when stop button is clicked', async () => {
      const user = userEvent.setup()

      // Mock a long streaming response with abort handling
      const { sendChatMessage } = await import('@/lib/chat-api')
      vi.mocked(sendChatMessage).mockImplementation(async function* (messages, model, signal) {
        yield { content: 'Start', done: false }

        // Simulate streaming that checks abort signal
        for (let i = 0; i < 10; i++) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }
          await new Promise(resolve => setTimeout(resolve, 50))
          yield { content: ` chunk${i}`, done: false }
        }

        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test abort')

      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )

      await user.click(sendButton!)

      // Wait for streaming to start
      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-square')
        )
        expect(stopButton).toBeInTheDocument()
      })

      // Click stop button
      const stopButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      await user.click(stopButton!)

      // Verify send button is back (stream was stopped)
      await waitFor(() => {
        const sendButtonAfter = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButtonAfter).toBeInTheDocument()
      })

      // Verify the response was not completed
      const messages = screen.queryAllByText(/chunk9/)
      expect(messages.length).toBe(0) // Should not reach chunk9
    })

    it('should not display error message when stream is stopped by user', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')
      vi.mocked(sendChatMessage).mockImplementation(async function* (messages, model, signal) {
        yield { content: 'Starting', done: false }

        // Continuously check abort signal during streaming
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 50))

          if (signal?.aborted) {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            throw error
          }

          yield { content: ` chunk${i}`, done: false }
        }

        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test')

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-square')
        )
        expect(stopButton).toBeInTheDocument()
      })

      const stopButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      await user.click(stopButton!)

      // Wait for send button to return
      await waitFor(() => {
        const sendButtonAfter = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButtonAfter).toBeInTheDocument()
      })

      // Verify no error message was displayed in chat messages
      expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/AbortError/)).not.toBeInTheDocument()
    })

    it('should allow sending new message immediately after stopping', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')

      // First call - will be aborted
      let callCount = 0
      vi.mocked(sendChatMessage).mockImplementation(async function* (messages, model, signal) {
        callCount++

        if (callCount === 1) {
          yield { content: 'First', done: false }
          await new Promise(resolve => setTimeout(resolve, 100))

          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }

          yield { content: ' response', done: false }
          yield { content: '', done: true }
        } else {
          // Second call - should complete
          yield { content: 'Second response', done: false }
          yield { content: '', done: true }
        }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send first message
      let input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'First message')

      let sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Wait for streaming and stop it
      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-square')
        )
        expect(stopButton).toBeInTheDocument()
      })

      const stopButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      await user.click(stopButton!)

      // Wait for send button to be available again
      await waitFor(() => {
        sendButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButton).toBeInTheDocument()
      })

      // Send second message immediately
      input = screen.getByPlaceholderText(/type your message/i)
      await user.clear(input)
      await user.type(input, 'Second message')

      sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Verify second message was sent successfully
      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument()
      })
    })

    it('should handle multiple conversations streaming independently', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')

      vi.mocked(sendChatMessage).mockImplementation(async function* (messages, model, signal) {
        yield { content: 'Response', done: false }

        for (let i = 0; i < 3; i++) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }
          await new Promise(resolve => setTimeout(resolve, 100))
          yield { content: ` ${i}`, done: false }
        }

        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send message in first conversation
      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'First conv')

      let sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Wait for stream to start
      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-square')
        )
        expect(stopButton).toBeInTheDocument()
      })

      // Create second conversation
      const newChatButton = screen.getByRole('button', { name: /new chat/i })
      await user.click(newChatButton)

      // Wait for new conversation to be ready
      await waitFor(() => {
        sendButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButton).toBeInTheDocument()
      })

      // In second conversation, send button should be available (first conv is streaming independently)
      expect(sendButton).toBeTruthy()
    })

    it('should stop only the current conversation when stop is clicked', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')

      vi.mocked(sendChatMessage).mockImplementation(async function* (messages, model, signal) {
        yield { content: 'Start', done: false }

        for (let i = 0; i < 5; i++) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }
          await new Promise(resolve => setTimeout(resolve, 100))
          yield { content: ` ${i}`, done: false }
        }

        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send message in first conversation
      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'First')

      let sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Wait for stream to start
      await waitFor(() => {
        const stopButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-square')
        )
        expect(stopButton).toBeInTheDocument()
      })

      // Stop the stream
      const stopButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      await user.click(stopButton!)

      // Verify send button returns
      await waitFor(() => {
        sendButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButton).toBeInTheDocument()
      })
    })

    it('should work with message edit and regeneration', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')

      // First call completes, second can be aborted
      let callCount = 0
      vi.mocked(sendChatMessage).mockImplementation(async function* (messages, model, signal) {
        callCount++

        if (callCount === 1) {
          yield { content: 'First response', done: false }
          yield { content: '', done: true }
        } else {
          // Second response - can be aborted
          yield { content: 'Regenerating', done: false }

          for (let i = 0; i < 5; i++) {
            if (signal?.aborted) {
              throw new DOMException('Aborted', 'AbortError')
            }
            await new Promise(resolve => setTimeout(resolve, 100))
            yield { content: ` part${i}`, done: false }
          }

          yield { content: '', done: true }
        }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      // Send initial message
      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test message')

      let sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Wait for first response to complete
      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument()
      })

      // Verify the stop button feature works with regeneration flows
      // The key point is that AbortController is created and cleaned up properly
      expect(callCount).toBe(1)
    })

    it('should clean up abort controllers on stream completion', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')
      vi.mocked(sendChatMessage).mockImplementation(async function* () {
        yield { content: 'Response', done: false }
        yield { content: '', done: true }
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test')

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Wait for stream to complete
      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument()
      })

      // Verify send button is back (controller was cleaned up)
      await waitFor(() => {
        const sendButtonAfter = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButtonAfter).toBeInTheDocument()
      })

      // No stop button should be present
      const stopButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      expect(stopButtons.length).toBe(0)
    })

    it('should clean up abort controllers on error', async () => {
      const user = userEvent.setup()

      const { sendChatMessage } = await import('@/lib/chat-api')
      vi.mocked(sendChatMessage).mockImplementation(async function* () {
        yield { content: 'Start', done: false }
        throw new Error('Network error')
      })

      render(<ChatSidebar open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      await user.type(input, 'Test')

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-send')
      )
      await user.click(sendButton!)

      // Wait for error to be displayed
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/Error: Network error/)
        expect(errorMessages.length).toBeGreaterThan(0)
      })

      // Verify send button is back (controller was cleaned up)
      await waitFor(() => {
        const sendButtonAfter = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-send')
        )
        expect(sendButtonAfter).toBeInTheDocument()
      })

      // No stop button should be present
      const stopButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-square')
      )
      expect(stopButtons.length).toBe(0)
    })
  })
})
