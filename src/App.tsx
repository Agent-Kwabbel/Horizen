import { useState, useEffect, lazy, Suspense, useRef } from "react"
import AuroraCanvas from "./components/AuroraCanvas"
import SearchBar from "./components/SearchBar.tsx"
import Clock from "./components/Clock"
import QuickLinks from "./components/QuickLinks.tsx"
import WeatherWidget from "./components/WeatherWidget.tsx"
import SettingsFab from "./components/SettingsFab.tsx"
import ShortcutsDialog from "./components/ShortcutsDialog.tsx"
import { Toaster } from "./components/ui/sonner"
import { PrefsProvider, usePrefs } from "@/lib/prefs"
import { getShortcuts, matchesShortcut, type ShortcutBinding } from "@/lib/shortcuts"

// Lazy load chat components to reduce initial bundle size
const ChatSidebar = lazy(() => import("./components/ChatSidebar.tsx"))
const ChatFab = lazy(() => import("./components/ChatFab.tsx"))
import type { ChatSidebarRef } from "./components/ChatSidebar.tsx"

function AppBody() {
  const { prefs, setPrefs } = usePrefs()
  const [chatOpen, setChatOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const searchBarRef = useRef<{ focus: () => void }>(null)
  const chatSidebarRef = useRef<ChatSidebarRef>(null)
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>([])

  // Load shortcuts on mount and when shortcuts dialog closes
  useEffect(() => {
    setShortcuts(getShortcuts())
  }, [shortcutsOpen])

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when shortcuts dialog is open (except to close it)
      if (shortcutsOpen && e.key !== "Escape") return

      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        // Exception: allow "/" and "Escape" shortcuts
        if (e.key !== "/" && e.key !== "Escape") return
      }

      // Find matching shortcut
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
                // Clean up any existing empty conversations (same as button behavior)
                const cleanedConvs = prefs.conversations.filter((c) => c.messages.length > 0)

                // Create new chat at the top
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

                // Select the new conversation after a brief delay to ensure refs are ready
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
            case "escape":
              // Close any open dialogs
              setChatOpen(false)
              setSettingsOpen(false)
              setShortcutsOpen(false)
              // Unfocus search
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
          <SearchBar ref={searchBarRef} placeholder="Search DuckDuckGo..." />
        </div>
      </div>

      <nav className="absolute bottom-10 inset-x-0 flex justify-center gap-10 animate-fade-in">
        <QuickLinks links={prefs.links}/>
      </nav>

      {prefs.showWeather && <WeatherWidget />}
      {prefs.showChat && (
        <Suspense fallback={null}>
          <ChatFab onClick={() => setChatOpen(true)} />
          <ChatSidebar ref={chatSidebarRef} open={chatOpen} onOpenChange={setChatOpen} />
        </Suspense>
      )}
      <SettingsFab
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
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

