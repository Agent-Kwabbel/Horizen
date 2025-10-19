// Chat model constants
export const OPENAI_MODELS = [
  { key: "gpt-5", label: "GPT-5" },
  { key: "gpt-5-mini", label: "GPT-5 Mini" },
  { key: "gpt-5-nano", label: "GPT-5 Nano" },
  { key: "gpt-4.1", label: "GPT-4.1" },
  { key: "gpt-4o", label: "GPT-4o" },
  { key: "gpt-4o-mini", label: "GPT-4o Mini" },
] as const

export const ANTHROPIC_MODELS = [
  { key: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { key: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
  { key: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const

export const GEMINI_MODELS = [
  { key: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { key: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { key: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
] as const
