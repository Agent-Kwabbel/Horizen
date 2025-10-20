import { useState, useEffect, useRef } from "react"
import { toggleCheckbox, autoList } from "@/lib/markdown"

export function useMarkdownEditor(
  initialContent: string,
  onContentChange: (content: string) => void,
  debounceMs: number = 500
) {
  const [localContent, setLocalContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localContent !== initialContent) {
        onContentChange(localContent)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localContent, initialContent, onContentChange, debounceMs])

  const handleCheckboxToggle = (lineIndex: number) => {
    const newContent = toggleCheckbox(localContent, lineIndex)
    setLocalContent(newContent)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart

      const result = autoList(localContent, cursorPos)
      if (result) {
        e.preventDefault()
        setLocalContent(result.text)

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = result.cursorPos
            textareaRef.current.selectionEnd = result.cursorPos
          }
        }, 0)
      }
    }
  }

  return {
    localContent,
    setLocalContent,
    handleCheckboxToggle,
    handleKeyDown,
    textareaRef
  }
}
