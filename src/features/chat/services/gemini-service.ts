import type { ChatMessage, GeminiModel, StreamChunk } from "./types"
import { getApiBaseUrl } from "./types"

function formatGeminiMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }
    }
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []
    if (m.content) {
      parts.push({ text: m.content })
    }
    for (const image of m.images) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        const [, mimeType, data] = match
        parts.push({ inlineData: { mimeType, data } })
      }
    }
    return { role: m.role === "assistant" ? "model" : "user", parts }
  })
}

export async function* sendGeminiMessage(
  messages: ChatMessage[],
  model: GeminiModel,
  apiKey: string,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/gemini/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      contents: formatGeminiMessages(messages),
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
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
      if (!line.trim() || line.startsWith(':')) continue

      let jsonStr = line
      if (line.startsWith('data: ')) {
        jsonStr = line.slice(6)
      }

      if (!jsonStr.trim()) continue

      try {
        const json = JSON.parse(jsonStr)

        if (json.candidates && json.candidates[0]?.content?.parts) {
          const text = json.candidates[0].content.parts[0]?.text
          if (text) {
            yield { content: text, done: false }
          }
        }

        if (json.candidates && json.candidates[0]?.finishReason) {
          yield { content: "", done: true }
          return
        }
      } catch (err) {
      }
    }
  }

  yield { content: "", done: true }
}
