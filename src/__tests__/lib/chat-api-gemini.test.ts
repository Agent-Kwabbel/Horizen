import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendGeminiMessage, sendChatMessage } from '@/lib/chat-api'
import type { ChatMessage, ChatModel, GeminiModel } from '@/lib/prefs'
import * as apiKeys from '@/lib/api-keys'

// Mock getApiKeys
vi.mock('@/lib/api-keys', () => ({
  getApiKeys: vi.fn(),
}))

// Mock global fetch
global.fetch = vi.fn()

describe('chat-api gemini integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendGeminiMessage', () => {
    it('should format messages correctly for Gemini API', async () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      ]

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify({
                  candidates: [{
                    content: { parts: [{ text: 'Hello!' }] }
                  }]
                }) + '\n')
              })
              .mockResolvedValueOnce({ done: true })
          })
        }
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const stream = sendGeminiMessage(messages, 'gemini-2.5-flash' as GeminiModel, 'AIzaTest')
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/gemini/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'AIzaTest',
          },
          body: expect.stringContaining('"role":"user"')
        })
      )

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].content).toBe('Hello!')
    })

    it('should convert assistant role to model for Gemini', async () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hi', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hello', timestamp: Date.now() },
      ]

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValueOnce({ done: true })
          })
        }
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const stream = sendGeminiMessage(messages, 'gemini-2.5-pro' as GeminiModel, 'AIzaTest')
      for await (const _ of stream) {
        // Consume stream
      }

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
      expect(callBody.contents[1].role).toBe('model')
    })

    it('should handle images in messages', async () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'What is this?',
          timestamp: Date.now(),
          images: ['data:image/png;base64,iVBORw0KGgo=']
        },
      ]

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValueOnce({ done: true })
          })
        }
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const stream = sendGeminiMessage(messages, 'gemini-2.5-flash' as GeminiModel, 'AIzaTest')
      for await (const _ of stream) {
        // Consume stream
      }

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
      expect(callBody.contents[0].parts).toHaveLength(2)
      expect(callBody.contents[0].parts[0]).toEqual({ text: 'What is this?' })
      expect(callBody.contents[0].parts[1]).toEqual({
        inlineData: {
          mimeType: 'image/png',
          data: 'iVBORw0KGgo='
        }
      })
    })

    it('should throw error when API returns non-ok status', async () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      ]

      const mockResponse = {
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const stream = sendGeminiMessage(messages, 'gemini-2.5-flash' as GeminiModel, 'invalid-key')

      await expect(async () => {
        for await (const _ of stream) {
          // Should throw
        }
      }).rejects.toThrow('Gemini API error: 401')
    })
  })

  describe('sendChatMessage with Gemini', () => {
    it('should use Gemini API when provider is gemini', async () => {
      vi.mocked(apiKeys.getApiKeys).mockResolvedValue({ gemini: 'AIzaTest' })

      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Test', timestamp: Date.now() },
      ]

      const chatModel: ChatModel = {
        provider: 'gemini',
        model: 'gemini-2.5-flash'
      }

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(JSON.stringify({
                  candidates: [{
                    content: { parts: [{ text: 'Response' }] }
                  }]
                }) + '\n')
              })
              .mockResolvedValueOnce({ done: true })
          })
        }
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const stream = sendChatMessage(messages, chatModel)
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gemini/generate'),
        expect.any(Object)
      )

      expect(chunks.some(c => c.content === 'Response')).toBe(true)
    })

    it('should throw error when Gemini API key is not configured', async () => {
      vi.mocked(apiKeys.getApiKeys).mockResolvedValue({})

      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Test', timestamp: Date.now() },
      ]

      const chatModel: ChatModel = {
        provider: 'gemini',
        model: 'gemini-2.5-pro'
      }

      const stream = sendChatMessage(messages, chatModel)

      await expect(async () => {
        for await (const _ of stream) {
          // Should throw
        }
      }).rejects.toThrow('Gemini API key not configured')
    })
  })
})
