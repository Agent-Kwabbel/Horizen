import { Search } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"

type Props = {
  placeholder?: string
  newTab?: boolean
  initialQuery?: string
  autoFocus?: boolean
}

export default function SearchBar({
  placeholder = "Search DuckDuckGo...",
  newTab = false,
  initialQuery = "",
  autoFocus = true,
}: Props) {
  return (
    <form
      action="https://duckduckgo.com/"
      method="GET"
      target={newTab ? "_blank" : "_self"}
      role="search"
      aria-label="DuckDuckGo search"
      className="w-full"
    >
      <InputGroup>
        <InputGroupInput
          name="q"
          defaultValue={initialQuery}
          placeholder={placeholder}
          aria-label="Search"
          autoFocus={autoFocus}
        />
        <InputGroupAddon>
          {/* Submit button */}
          <InputGroupButton type="submit" className="rounded-full" size="icon-xs">
            <Search aria-hidden="true" />
            <span className="sr-only">Search</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

