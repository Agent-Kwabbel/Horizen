import { createContext, useContext, useMemo, useState, useEffect } from "react"
import type { ReactNode } from "react"

export type IconKey = "youtube" | "chat" | "mail" | "drive" | "github" | "globe"
export type QuickLink = { id: string; label: string; href: string; icon: IconKey }
export type Prefs = { showWeather: boolean; links: QuickLink[] }

const LS = "startpage:prefs"

const DEFAULTS: Prefs = {
  showWeather: true,
  links: [
    { id: "1", label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { id: "2", label: "ChatGPT", href: "https://chat.openai.com", icon: "chat" },
    { id: "3", label: "Proton Mail", href: "https://mail.proton.me", icon: "mail" },
    { id: "4", label: "Drive", href: "https://drive.google.com", icon: "drive" },
  ],
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

  // Persist whenever prefs change
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(prefs)) } catch {}
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

