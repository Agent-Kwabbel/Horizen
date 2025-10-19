import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { Search } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { usePrefs, BUILTIN_SEARCH_ENGINES } from "@/lib/prefs"

type Props = {
  placeholder?: string
  newTab?: boolean
}

export type SearchBarRef = {
  focus: () => void
}

type Bang = {
  s: string // search URL template
  h: string // home URL
  n: string // name
}

type BangsMap = Record<string, Bang>

// Lazy load bangs on first use
let bangsPromise: Promise<BangsMap> | null = null
let bangsCache: BangsMap | null = null

async function loadBangs(): Promise<BangsMap> {
  if (bangsCache) return bangsCache

  if (!bangsPromise) {
    bangsPromise = import("@/assets/bangs.js?raw").then((module) => {
      try {
        const bangsData = module.default

        const parseFunc = new Function(bangsData + '; return bangs;')
        const result = parseFunc()

        bangsCache = result
        return result
      } catch (err) {
        console.error("Failed to load bangs:", err)
        return {}
      }
    })
  }

  return bangsPromise
}

const SearchBar = forwardRef<SearchBarRef, Props>(({
  placeholder = "Search DuckDuckGo...",
  newTab = false,
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [openInNewTab, setOpenInNewTab] = useState(newTab)
  const { prefs } = usePrefs()

  const allSearchEngines = [...BUILTIN_SEARCH_ENGINES, ...prefs.customSearchEngines]
  const selectedEngine = allSearchEngines.find((e) => e.id === prefs.searchEngineId) || BUILTIN_SEARCH_ENGINES[0]

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus()
    },
  }))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      setOpenInNewTab(true)
    }
  }

  const processBang = async (query: string): Promise<string | null> => {
    const bangMatch = query.match(/^!(\S+)\s*(.*)$/)
    if (!bangMatch) return null

    const [, bangKey, searchQuery] = bangMatch

    const bangs = await loadBangs()
    const bang = bangs[bangKey]

    if (!bang) return null

    if (!searchQuery.trim()) {
      return bang.h
    }

    return bang.s.replace(/\{\{qe\}\}/g, encodeURIComponent(searchQuery.trim()))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const query = (new FormData(e.currentTarget).get("q") as string)?.trim()
    if (!query) return

    let url: string
    if (query.startsWith('!')) {
      const bangUrl = await processBang(query)
      url = bangUrl || selectedEngine.url.replace('{searchTerms}', encodeURIComponent(query))
    } else {
      url = selectedEngine.url.replace('{searchTerms}', encodeURIComponent(query))
    }

    if (openInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer")
      setOpenInNewTab(newTab)
    } else {
      window.location.href = url
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <InputGroup className="h-11">
        <InputGroupInput
          ref={inputRef}
          name="q"
          placeholder={placeholder || `Search ${selectedEngine.name}...`}
          aria-label="Search"
          className="text-white placeholder:text-white/50 px-5"
          onKeyDown={handleKeyDown}
        />
        <InputGroupAddon>
          <InputGroupButton
            type="submit"
            className="rounded-full h-8 w-8"
            size="icon-xs"
          >
            <Search className="stroke-current" aria-hidden="true" />
            <span className="sr-only">Search</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
})

SearchBar.displayName = "SearchBar"

export default SearchBar
