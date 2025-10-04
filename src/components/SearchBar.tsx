import { FormEvent } from "react"
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
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const query = (new FormData(form).get("q") as string)?.trim()
    if (!query) return // prevent empty submission
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    if (newTab) window.open(url, "_blank")
    else window.location.href = url
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <InputGroup className="h-11">
        <InputGroupInput
          name="q"
          placeholder={placeholder}
          aria-label="Search"
          className="text-white placeholder:text-white/50 px-5"
        />
        <InputGroupAddon>
          <InputGroupButton type="submit" className="rounded-full h-8 w-8" size="icon-xs">
            <Search className="stoke-current" aria-hidden="true" />
            <span className="sr-only">Search</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
