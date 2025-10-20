export type { ChatMessage, ChatModel, OpenAIModel, AnthropicModel, GeminiModel } from "@/lib/prefs"

export type StreamChunk = {
  content: string
  done: boolean
}

export function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    return ''
  }
  return 'http://localhost:3001'
}
