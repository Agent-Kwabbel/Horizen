import type { ChatMessage, ChatModel, OpenAIModel, AnthropicModel } from "./prefs"
import { getApiKeys } from "./api-keys"

export type StreamChunk = {
  content: string
  done: boolean
}

// Helper to format messages for OpenAI
function formatOpenAIMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role, content: m.content }
    }
    // Multi-part content with images
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
    if (m.content) {
      content.push({ type: "text", text: m.content })
    }
    for (const image of m.images) {
      content.push({ type: "image_url", image_url: { url: image } })
    }
    return { role: m.role, content }
  })
}

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // In production (Vercel), use relative URLs
  if (import.meta.env.PROD) {
    return ''
  }
  // In development, use localhost proxy server
  return 'http://localhost:3001'
}

// OpenAI API Integration
export async function* sendOpenAIMessage(
  messages: ChatMessage[],
  model: OpenAIModel,
  apiKey: string
): AsyncGenerator<StreamChunk> {
  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/openai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      messages: formatOpenAIMessages(messages),
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim() || line.startsWith(":")) continue
      if (line === "data: [DONE]") {
        yield { content: "", done: true }
        return
      }

      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6))
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            yield { content: delta, done: false }
          }
        } catch (err) {
          console.error("Error parsing stream:", err)
        }
      }
    }
  }

  yield { content: "", done: true }
}

// Helper to format messages for Anthropic
function formatAnthropicMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role, content: m.content }
    }
    // Multi-part content with images
    const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []
    if (m.content) {
      content.push({ type: "text", text: m.content })
    }
    for (const image of m.images) {
      // Extract media type and base64 data from data URI
      const match = image.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        const [, mediaType, data] = match
        content.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data },
        })
      }
    }
    return { role: m.role, content }
  })
}

// Anthropic API Integration
export async function* sendAnthropicMessage(
  messages: ChatMessage[],
  model: AnthropicModel,
  apiKey: string
): AsyncGenerator<StreamChunk> {
  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/anthropic/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: formatAnthropicMessages(messages),
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim() || line.startsWith(":")) continue

      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6))

          if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
            yield { content: json.delta.text, done: false }
          }

          if (json.type === "message_stop") {
            yield { content: "", done: true }
            return
          }
        } catch (err) {
          console.error("Error parsing stream:", err)
        }
      }
    }
  }

  yield { content: "", done: true }
}

// Unified API function
export async function* sendChatMessage(
  messages: ChatMessage[],
  chatModel: ChatModel
): AsyncGenerator<StreamChunk> {
  const keys = await getApiKeys()

  if (chatModel.provider === "openai") {
    if (!keys.openai) {
      throw new Error("OpenAI API key not configured. Please add it in Settings.")
    }
    yield* sendOpenAIMessage(messages, chatModel.model as OpenAIModel, keys.openai)
  } else if (chatModel.provider === "anthropic") {
    if (!keys.anthropic) {
      throw new Error("Anthropic API key not configured. Please add it in Settings.")
    }
    yield* sendAnthropicMessage(messages, chatModel.model as AnthropicModel, keys.anthropic)
  } else {
    throw new Error(`Unknown provider: ${chatModel.provider}`)
  }
}
