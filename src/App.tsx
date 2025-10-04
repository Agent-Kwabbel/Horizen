import { useState } from "react"

import AuroraCanvas from "./components/AuroraCanvas"
import SearchBar from "./components/SearchBar.tsx"
import Clock from "./components/Clock"
import QuickLinks from "./components/QuickLinks.tsx"
import WeatherWidget from "./components/WeatherWidget.tsx"
import SettingsFab from "./components/SettingsFab.tsx"
import { PrefsProvider, usePrefs } from "@/lib/prefs"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"

function AppBody() {
  const { prefs } = usePrefs()
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
      <SettingsFab />
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

