import { useState, useEffect, lazy, Suspense, useRef } from "react"
import AuroraCanvas from "./components/AuroraCanvas"
import SearchBar from "./components/SearchBar.tsx"
import Clock from "./components/Clock"
import QuickLinks from "./components/QuickLinks.tsx"
import WeatherWidget from "./components/WeatherWidget.tsx"
import SettingsFab from "./features/settings/components/SettingsFab"
import ShortcutsDialog from "./components/ShortcutsDialog.tsx"
import PasswordDialog from "./features/security/components/PasswordDialog"
import { Toaster } from "./components/ui/sonner"
import { PrefsProvider, usePrefs } from "@/lib/prefs"
import { getShortcuts, matchesShortcut, type ShortcutBinding } from "@/lib/shortcuts"
import { getSecurityConfig, isSessionUnlocked, refreshSession } from "@/lib/password"
import { migrateFromPlaintext } from "@/lib/api-keys"

const ChatSidebar = lazy(() => import("./features/chat/components/ChatSidebar"))
const ChatFab = lazy(() => import("./components/ChatFab.tsx"))
import type { ChatSidebarRef } from "./features/chat/components/ChatSidebar"

function AppBody() {
  const { prefs, setPrefs } = usePrefs()
  const [chatOpen, setChatOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false)
  const [passwordUnlockOpen, setPasswordUnlockOpen] = useState(false)
  const searchBarRef = useRef<{ focus: () => void }>(null)
  const chatSidebarRef = useRef<ChatSidebarRef>(null)
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>([])

  useEffect(() => {
    const initSecurity = async () => {
      await migrateFromPlaintext()
    }

    initSecurity()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const config = getSecurityConfig()
      if (config?.enabled && !isSessionUnlocked()) {
        setPasswordUnlockOpen(true)
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleActivity = () => {
      refreshSession()
    }

    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("keydown", handleActivity)
    window.addEventListener("click", handleActivity)

    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      window.removeEventListener("click", handleActivity)
    }
  }, [])

  useEffect(() => {
    setShortcuts(getShortcuts())
  }, [shortcutsOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shortcutsOpen && e.key !== "Escape") return

      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (e.key !== "Escape") return
      }

      for (const shortcut of shortcuts) {
        if (matchesShortcut(e, shortcut.key)) {
          e.preventDefault()

          switch (shortcut.action) {
            case "openChat":
              if (prefs.showChat) {
                setChatOpen((prev) => !prev)
              }
              break
            case "openSettings":
              setSettingsOpen(true)
              break
            case "openShortcuts":
              setShortcutsOpen(true)
              break
            case "focusSearch":
              searchBarRef.current?.focus()
              break
            case "toggleWeather":
              setPrefs({ ...prefs, showWeather: !prefs.showWeather })
              break
            case "newChat":
              if (prefs.showChat) {
                const cleanedConvs = prefs.conversations.filter((c) => c.messages.length > 0)

                const now = Date.now()
                const newConv = {
                  id: `conv-${now}`,
                  title: "New Conversation",
                  model: prefs.chatModel,
                  messages: [],
                  createdAt: now,
                  updatedAt: now,
                }

                setPrefs({
                  ...prefs,
                  conversations: [newConv, ...cleanedConvs],
                })
                setChatOpen(true)

                setTimeout(() => {
                  chatSidebarRef.current?.selectConversation(newConv.id)
                }, 0)
              }
              break
            case "focusChatPrompt":
              if (prefs.showChat && chatOpen) {
                chatSidebarRef.current?.focusInput()
              }
              break
            case "uploadFile":
              if (prefs.showChat && chatOpen) {
                chatSidebarRef.current?.triggerFileUpload()
              }
              break
            case "toggleGhostMode":
              if (prefs.showChat && chatOpen) {
                chatSidebarRef.current?.toggleGhostMode()
              }
              break
            case "escape":
              setChatOpen(false)
              setSettingsOpen(false)
              setShortcutsOpen(false)
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
              }
              break
          }

          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts, prefs, setPrefs])

  return (
    <main className="relative min-h-svh">
      <AuroraCanvas />

      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-xl pointer-events-auto flex flex-col items-stretch gap-3 leading-[0.75]">
          <Clock timeZone="Europe/Amsterdam" />
          <SearchBar ref={searchBarRef} />
        </div>
      </div>

      {prefs.showQuickLinks && (
        <nav className="absolute bottom-10 inset-x-0 flex justify-center gap-10 animate-fade-in">
          <QuickLinks links={prefs.links}/>
        </nav>
      )}

      {prefs.showWeather && <WeatherWidget />}
      {prefs.showChat && (
        <Suspense fallback={null}>
          <ChatFab onClick={() => {
            const config = getSecurityConfig()
            if (!config) {
              setPasswordSetupOpen(true)
            } else if (config.enabled && !isSessionUnlocked()) {
              setPasswordUnlockOpen(true)
            } else {
              setChatOpen(true)
            }
          }} />
          <ChatSidebar ref={chatSidebarRef} open={chatOpen} onOpenChange={setChatOpen} />
        </Suspense>
      )}
      <SettingsFab
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <PasswordDialog
        mode="setup"
        open={passwordSetupOpen}
        onOpenChange={setPasswordSetupOpen}
        onSuccess={() => {
          setPasswordSetupOpen(false)
          setChatOpen(true)
        }}
      />
      <PasswordDialog
        mode="unlock"
        open={passwordUnlockOpen}
        onOpenChange={setPasswordUnlockOpen}
        onSuccess={() => {
          setPasswordUnlockOpen(false)
          setChatOpen(true)
        }}
      />

      <Toaster />
    </main>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <AppBody />
    </PrefsProvider>
  )
}

