import { useState, useEffect } from "react"
import AuroraCanvas from "./components/AuroraCanvas"
import SearchBar from "./components/SearchBar.tsx"
import Clock from "./components/Clock"
import QuickLinks from "./components/QuickLinks.tsx"
import WeatherWidget from "./components/WeatherWidget.tsx"
import SettingsFab from "./components/SettingsFab.tsx"
import ChatSidebar from "./components/ChatSidebar.tsx"
import ChatFab from "./components/ChatFab.tsx"
import { Toaster } from "./components/ui/sonner"
import { PrefsProvider, usePrefs } from "@/lib/prefs"

function AppBody() {
  const { prefs } = usePrefs()
  const [chatOpen, setChatOpen] = useState(false)

  // Keyboard shortcut: Ctrl+K to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setChatOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <main className="relative min-h-svh">
      <AuroraCanvas />

      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-xl pointer-events-auto flex flex-col items-stretch gap-3 leading-[0.75]">
          <Clock timeZone="Europe/Amsterdam" />
          <SearchBar placeholder="Search DuckDuckGo..." />
        </div>
      </div>

      <nav className="absolute bottom-10 inset-x-0 flex justify-center gap-10 animate-fade-in">
        <QuickLinks links={prefs.links}/>
      </nav>

      {prefs.showWeather && <WeatherWidget />}
      {prefs.showChat && (
        <>
          <ChatFab onClick={() => setChatOpen(true)} />
          <ChatSidebar open={chatOpen} onOpenChange={setChatOpen} />
        </>
      )}
      <SettingsFab />
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

