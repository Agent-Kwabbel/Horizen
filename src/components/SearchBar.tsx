import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import type { FormEvent } from "react"
import { Search } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type Props = {
  placeholder?: string
  newTab?: boolean
}

export type SearchBarRef = {
  focus: () => void
}

const SearchBar = forwardRef<SearchBarRef, Props>(({
  placeholder = "Search DuckDuckGo...",
  newTab = false,
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus()
    },
  }))

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const query = (new FormData(e.currentTarget).get("q") as string)?.trim()
    if (!query) return
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    if (newTab) window.open(url, "_blank")
    else window.location.href = url
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
          placeholder={placeholder}
          aria-label="Search"
          className="text-white placeholder:text-white/50 px-5"
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
