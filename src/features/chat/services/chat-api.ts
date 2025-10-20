import type { ChatMessage, ChatModel, OpenAIModel, AnthropicModel, GeminiModel, StreamChunk } from "./types"
import { getApiKeys } from "@/lib/api-keys"
import { sendOpenAIMessage } from "./openai-service"
import { sendAnthropicMessage } from "./anthropic-service"
import { sendGeminiMessage } from "./gemini-service"

export type { StreamChunk } from "./types"

export async function* sendChatMessage(
  messages: ChatMessage[],
  chatModel: ChatModel,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const keys = await getApiKeys()

  if (chatModel.provider === "openai") {
    if (!keys.openai) {
      throw new Error("OpenAI API key not configured. Please add it in Settings.")
    }
    yield* sendOpenAIMessage(messages, chatModel.model as OpenAIModel, keys.openai, signal)
  } else if (chatModel.provider === "anthropic") {
    if (!keys.anthropic) {
      throw new Error("Anthropic API key not configured. Please add it in Settings.")
    }
    yield* sendAnthropicMessage(messages, chatModel.model as AnthropicModel, keys.anthropic, signal)
  } else if (chatModel.provider === "gemini") {
    if (!keys.gemini) {
      throw new Error("Gemini API key not configured. Please add it in Settings.")
    }
    yield* sendGeminiMessage(messages, chatModel.model as GeminiModel, keys.gemini, signal)
  } else {
    throw new Error(`Unknown provider: ${chatModel.provider}`)
  }
}
