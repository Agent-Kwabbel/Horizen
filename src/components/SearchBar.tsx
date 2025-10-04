import { useEffect, useRef } from "react"
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

export default function SearchBar({
  placeholder = "Search DuckDuckGo...",
  newTab = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

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

    const handleKey = (e: KeyboardEvent) => {
      const isTyping =
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      if (e.key === "/" && !isTyping) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
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
}
