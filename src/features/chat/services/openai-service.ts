import type { ChatMessage, OpenAIModel, StreamChunk } from "./types"
import { getApiBaseUrl } from "./types"

function formatOpenAIMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role, content: m.content }
    }
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

export async function* sendOpenAIMessage(
  messages: ChatMessage[],
  model: OpenAIModel,
  apiKey: string,
  signal?: AbortSignal
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
    signal,
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
