import { useState, useCallback } from "react"
import { usePrefs } from "@/lib/prefs"
import { sendChatMessage } from "@/features/chat/services/chat-api"
import type { ChatMessage as ChatMessageType, ChatModel } from "@/lib/prefs"

type UseChatStreamingProps = {
  currentConversationId: string | null
}

export function useChatStreaming({ currentConversationId }: UseChatStreamingProps) {
  const { prefs, setPrefs } = usePrefs()
  const [isLoading, setIsLoading] = useState(false)
  const [streamingControllers, setStreamingControllers] = useState<Map<string, AbortController>>(new Map())

  const stopStream = (convId: string) => {
    const controller = streamingControllers.get(convId)
    if (controller) {
      controller.abort()
      setStreamingControllers((prev) => {
        const next = new Map(prev)
        next.delete(convId)
        return next
      })
      setIsLoading(false)
    }
  }

  const regenerateAssistantResponse = useCallback(async (messages: ChatMessageType[], model: ChatModel) => {
    if (!currentConversationId) return

    setIsLoading(true)

    const assistantMessage: ChatMessageType = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: [...messages, assistantMessage], updatedAt: Date.now() }
          : c
      ),
    }))

    const controller = new AbortController()
    setStreamingControllers((prev) => new Map(prev).set(currentConversationId, controller))

    try {
      const stream = sendChatMessage(messages, model, controller.signal)

      for await (const chunk of stream) {
        if (chunk.content) {
          setPrefs((p) => ({
            ...p,
            conversations: p.conversations.map((c) =>
              c.id === currentConversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: m.content + chunk.content } : m
                    ),
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }))
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
      } else {
        const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
        setPrefs((p) => ({
          ...p,
          conversations: p.conversations.map((c) =>
            c.id === currentConversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: `Error: ${errorMsg}` } : m
                  ),
                }
              : c
          ),
        }))
      }
    } finally {
      setStreamingControllers((prev) => {
        const next = new Map(prev)
        next.delete(currentConversationId)
        return next
      })
      setIsLoading(false)
    }
  }, [currentConversationId, setPrefs])

  const retryMessage = useCallback(async (messageId: string, modifier?: string, newModel?: ChatModel) => {
    if (!currentConversationId || isLoading) return
    const conv = prefs.conversations.find((c) => c.id === currentConversationId)
    if (!conv) return

    const messageIndex = conv.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1 || conv.messages[messageIndex].role !== "assistant") return

    const messagesToRetry = conv.messages.slice(0, messageIndex)

    let finalMessages = [...messagesToRetry]
    if (modifier && finalMessages.length > 0) {
      const lastUserMsgIndex = finalMessages.length - 1
      const lastMsg = finalMessages[lastUserMsgIndex]
      finalMessages[lastUserMsgIndex] = {
        ...lastMsg,
        content: `${lastMsg.content}\n\n[${modifier}]`
      }
    }

    const modelToUse = newModel || conv.model
    if (newModel) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === currentConversationId ? { ...c, model: newModel } : c
        ),
      }))
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: messagesToRetry, updatedAt: Date.now() }
          : c
      ),
    }))

    await regenerateAssistantResponse(finalMessages, modelToUse)
  }, [currentConversationId, isLoading, prefs.conversations, setPrefs, regenerateAssistantResponse])

  return {
    isLoading,
    streamingControllers,
    stopStream,
    regenerateAssistantResponse,
    retryMessage,
  }
}
