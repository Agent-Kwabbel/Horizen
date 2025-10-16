// Separate localStorage for API keys (security by obscurity)
const API_KEYS_LS = "startpage:api:keys"

export type ApiKeys = {
  openai?: string
  anthropic?: string
}

export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(API_KEYS_LS)
    if (!raw) return {}
    return JSON.parse(raw) as ApiKeys
  } catch {
    return {}
  }
}

export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(API_KEYS_LS, JSON.stringify(keys))
  } catch (err) {
    console.error("Failed to save API keys:", err)
  }
}

export function updateApiKey(provider: "openai" | "anthropic", key: string): void {
  const current = getApiKeys()
  saveApiKeys({ ...current, [provider]: key })
}

export function clearApiKey(provider: "openai" | "anthropic"): void {
  const current = getApiKeys()
  delete current[provider]
  saveApiKeys(current)
}
