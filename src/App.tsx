import { useState } from "react"

import AuroraCanvas from "./components/AuroraCanvas"
import SearchBar from "./components/SearchBar.tsx"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="relative min-h-svh">
      <AuroraCanvas />

      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-lg lg:max-w-2xl pointer-events-auto animate-fade-in">
          <SearchBar placeholder="Search DuckDuckGo..." />
        </div>
      </div>    
    </main>
  )
}
