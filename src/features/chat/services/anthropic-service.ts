import type { ChatMessage, AnthropicModel, StreamChunk } from "./types"
import { getApiBaseUrl } from "./types"

function formatAnthropicMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role, content: m.content }
    }
    const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []
    if (m.content) {
      content.push({ type: "text", text: m.content })
    }
    for (const image of m.images) {
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

export async function* sendAnthropicMessage(
  messages: ChatMessage[],
  model: AnthropicModel,
  apiKey: string,
  signal?: AbortSignal
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
    signal,
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
