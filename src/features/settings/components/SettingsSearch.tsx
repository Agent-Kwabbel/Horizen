import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, X, ChevronRight } from "lucide-react"
import { searchSettings, highlightMatch } from "@/lib/settings-search"
import type { SearchResult } from "@/lib/settings-search"

type SettingsSearchProps = {
  onResultClick: (sectionId: string) => void
  widgets?: Array<{ type: string; enabled: boolean }>
  securityEnabled?: boolean
  securityUnlocked?: boolean
}

export default function SettingsSearch({ onResultClick, widgets, securityEnabled, securityUnlocked }: SettingsSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const timeoutId = setTimeout(() => {
      const searchResults = searchSettings(query, {
        widgets,
        securityEnabled,
        securityUnlocked,
      })
      setResults(searchResults)
      setSelectedIndex(0)
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [query, widgets, securityEnabled, securityUnlocked])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    } else if (e.key === "Escape") {
      setQuery("")
      setResults([])
      inputRef.current?.blur()
    }
  }

  const handleResultClick = (result: SearchResult) => {
    const sectionId = result.type === 'section' ? result.id : result.section || result.id
    onResultClick(sectionId)
    setQuery("")
    setResults([])
  }

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setSelectedIndex(0)
  }

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search settings... (beta)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-xl max-h-[400px] overflow-y-auto z-50">
          {results.map((result, index) => {
            const highlighted = highlightMatch(result.title, query)

            return (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${
                  index === selectedIndex
                    ? "bg-white/15"
                    : "bg-transparent hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    {result.path.map((segment, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-3 w-3" />}
                        <span>{segment}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-white font-medium">
                  {highlighted.map((part, i) => (
                    <span
                      key={i}
                      className={
                        part.highlighted
                          ? "bg-yellow-500/20 text-yellow-300"
                          : ""
                      }
                    >
                      {part.text}
                    </span>
                  ))}
                </div>

                {result.description && (
                  <div className="text-xs text-white/40 mt-1">
                    {result.description}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-xl px-4 py-6 text-center z-50">
          <p className="text-sm text-white/50">
            No settings found for <span className="text-white font-medium">"{query}"</span>
          </p>
        </div>
      )}
    </div>
  )
}
