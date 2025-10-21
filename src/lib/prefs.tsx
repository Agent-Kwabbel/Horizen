import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react"
import type { ReactNode } from "react"
import type { WidgetConfig } from "./widgets"
import { DEFAULT_WIDGETS } from "./widgets"

export type IconKey = "youtube" | "chat" | "mail" | "drive" | "github" | "globe"
export type QuickLink = { id: string; label: string; href: string; icon: IconKey }

export type SearchEngine = {
  id: string
  name: string
  url: string
  isCustom?: boolean
}

export type ModelProvider = "openai" | "anthropic" | "gemini"
export type OpenAIModel = "gpt-5" | "gpt-5-mini" | "gpt-5-nano" | "gpt-4.1" | "gpt-4o" | "gpt-4o-mini"
export type AnthropicModel = "claude-sonnet-4-5-20250929" | "claude-opus-4-1-20250805" | "claude-3-5-haiku-20241022"
export type GeminiModel = "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite"
export type ChatModel = { provider: ModelProvider; model: OpenAIModel | AnthropicModel | GeminiModel }

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
  isGhostMode?: boolean
}

export type WeatherUnits = {
  temperature: "celsius" | "fahrenheit" | "kelvin"
  windSpeed: "ms" | "kmh" | "mph" | "knots" | "beaufort" | "fts"
  precipitation: "mm" | "inch"
  visibility: "km" | "miles"
  pressure: "hpa" | "mb" | "inhg" | "atm"
}

export type Prefs = {
  widgets: WidgetConfig[]
  showChat: boolean
  showQuickLinks: boolean
  showVerifiedOrgModels: boolean
  links: QuickLink[]
  chatModel: ChatModel
  conversations: ChatConversation[]
  searchEngineId: string
  customSearchEngines: SearchEngine[]

  // Legacy fields for migration
  showWeather?: boolean
  weatherUnits?: WeatherUnits
}

const LS = "startpage:prefs"

export const BUILTIN_SEARCH_ENGINES: SearchEngine[] = [
  { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q={searchTerms}" },
  { id: "google", name: "Google", url: "https://www.google.com/search?q={searchTerms}" },
  { id: "bing", name: "Bing", url: "https://www.bing.com/search?q={searchTerms}" },
  { id: "brave", name: "Brave Search", url: "https://search.brave.com/search?q={searchTerms}" },
  { id: "startpage", name: "Startpage", url: "https://www.startpage.com/sp/search?query={searchTerms}" },
  { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q={searchTerms}" },
  { id: "qwant", name: "Qwant", url: "https://www.qwant.com/?q={searchTerms}" },
]

const DEFAULTS: Prefs = {
  widgets: DEFAULT_WIDGETS,
  showChat: true,
  showQuickLinks: true,
  showVerifiedOrgModels: false,
  links: [
    { id: "1", label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { id: "2", label: "GitHub", href: "https://github.com", icon: "github" },
    { id: "3", label: "Proton Mail", href: "https://mail.proton.me", icon: "mail" },
    { id: "4", label: "Drive", href: "https://drive.google.com", icon: "drive" },
  ],
  chatModel: { provider: "openai", model: "gpt-4o" },
  conversations: [],
  searchEngineId: "duckduckgo",
  customSearchEngines: [],
}

function migratePrefs(loaded: any): Prefs {
  const migrated = { ...DEFAULTS, ...loaded }

  // Migrate from old showWeather/weatherUnits to widgets
  if (loaded.showWeather !== undefined && !loaded.widgets) {
    migrated.widgets = [...DEFAULT_WIDGETS]

    // Update weather widget based on old prefs
    const weatherWidget = migrated.widgets.find((w: WidgetConfig) => w.type === "weather")
    if (weatherWidget && weatherWidget.type === "weather") {
      weatherWidget.enabled = loaded.showWeather

      // Migrate weather units if they exist
      if (loaded.weatherUnits) {
        weatherWidget.settings = {
          ...weatherWidget.settings,
          units: loaded.weatherUnits,
        }
      }
    }

    // Clean up legacy fields
    delete migrated.showWeather
    delete migrated.weatherUnits
  }

  return migrated
}

function loadInitial(): Prefs {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return DEFAULTS
    const loaded = JSON.parse(raw)
    return migratePrefs(loaded)
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

  useEffect(() => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        const prefsToSave = {
          ...prefs,
          conversations: prefs.conversations.filter((c) => !c.isGhostMode)
        }
        localStorage.setItem(LS, JSON.stringify(prefsToSave))
      } catch (err) {
        console.error('Failed to save preferences:', err)
      }
      saveTimeoutRef.current = null
    }, 500)

    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current)
        try {
          const prefsToSave = {
            ...prefs,
            conversations: prefs.conversations.filter((c) => !c.isGhostMode)
          }
          localStorage.setItem(LS, JSON.stringify(prefsToSave))
        } catch {}
      }
    }
  }, [prefs])

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

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error("usePrefs must be used within <PrefsProvider>")
  return ctx
}

