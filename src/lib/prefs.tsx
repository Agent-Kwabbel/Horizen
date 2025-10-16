import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react"
import type { ReactNode } from "react"

export type IconKey = "youtube" | "chat" | "mail" | "drive" | "github" | "globe"
export type QuickLink = { id: string; label: string; href: string; icon: IconKey }

export type ModelProvider = "openai" | "anthropic"
export type OpenAIModel = "gpt-5" | "gpt-5-mini" | "gpt-5-nano" | "gpt-4.1" | "gpt-4o" | "gpt-4o-mini"
export type AnthropicModel = "claude-sonnet-4-5-20250929" | "claude-opus-4-1-20250805" | "claude-3-5-haiku-20241022"
export type ChatModel = { provider: ModelProvider; model: OpenAIModel | AnthropicModel }

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  images?: string[] // base64 data URIs
}

export type ChatConversation = {
  id: string
  title: string
  model: ChatModel
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export type Prefs = {
  showWeather: boolean
  showChat: boolean
  showVerifiedOrgModels: boolean
  links: QuickLink[]
  chatModel: ChatModel
  conversations: ChatConversation[]
}

const LS = "startpage:prefs"

const DEFAULTS: Prefs = {
  showWeather: true,
  showChat: true,
  showVerifiedOrgModels: false,
  links: [
    { id: "1", label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { id: "2", label: "ChatGPT", href: "https://chat.openai.com", icon: "chat" },
    { id: "3", label: "Proton Mail", href: "https://mail.proton.me", icon: "mail" },
    { id: "4", label: "Drive", href: "https://drive.google.com", icon: "drive" },
  ],
  chatModel: { provider: "openai", model: "gpt-4o" },
  conversations: [],
}

function loadInitial(): Prefs {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

type Ctx = {
  prefs: Prefs
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>
}
const PrefsContext = createContext<Ctx | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadInitial())
  const saveTimeoutRef = useRef<number | null>(null)

  // Debounced persist to prevent localStorage write storms during streaming
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Schedule save after 500ms of inactivity
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(LS, JSON.stringify(prefs))
      } catch (err) {
        console.error('Failed to save preferences:', err)
      }
      saveTimeoutRef.current = null
    }, 500)

    // Ensure final state is saved on unmount
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current)
        try {
          localStorage.setItem(LS, JSON.stringify(prefs))
        } catch {}
      }
    }
  }, [prefs])

  // (Optional) sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS && e.newValue) {
        try {
          const next = JSON.parse(e.newValue) as Prefs
          setPrefs(prev => ({ ...prev, ...next }))
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs])
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

// Consume from anywhere (shared live state)
export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error("usePrefs must be used within <PrefsProvider>")
  return ctx
}

