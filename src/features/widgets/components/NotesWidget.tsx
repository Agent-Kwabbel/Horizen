import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import { updateWidgetSettings } from "@/lib/widgets"
import type { NotesWidgetConfig } from "@/lib/widgets"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote, Edit3, Eye } from "lucide-react"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { useMarkdownEditor } from "../hooks/useMarkdownEditor"

type NotesWidgetProps = {
  config: NotesWidgetConfig
}

export default function NotesWidget({ config }: NotesWidgetProps) {
  const { setPrefs } = usePrefs()
  const [isEditing, setIsEditing] = useState(config.settings.quickJot || false)
  const quickJotMode = config.settings.quickJot || false

  const handleContentChange = (newContent: string) => {
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, config.id, { content: newContent }),
    }))
  }

  const {
    localContent,
    setLocalContent,
    handleCheckboxToggle,
    handleKeyDown,
    textareaRef
  } = useMarkdownEditor(config.settings.content, handleContentChange)

  const toggleMode = () => {
    setIsEditing(!isEditing)
  }

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 text-white w-[18rem]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">Quick Notes</span>
        </div>
        {!quickJotMode && (
          <button
            onClick={toggleMode}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={isEditing ? "View mode" : "Edit mode"}
          >
            {isEditing ? (
              <Eye className="w-4 h-4 text-white/70" />
            ) : (
              <Edit3 className="w-4 h-4 text-white/70" />
            )}
          </button>
        )}
      </div>

      {isEditing || quickJotMode ? (
        <>
          <Textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value.slice(0, config.settings.maxLength))}
            onKeyDown={quickJotMode ? undefined : handleKeyDown}
            placeholder={
              quickJotMode
                ? "Jot down your thoughts..."
                : "Jot down your thoughts... (Simple Markdown support)"
            }
            className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm resize-none h-32 ${quickJotMode ? '' : 'font-mono'}`}
          />
          <div className="text-xs text-white/40 mt-2 text-right">
            {localContent.length} / {config.settings.maxLength}
          </div>
        </>
      ) : (
        <div className="min-h-[8rem] max-h-[12rem] overflow-y-auto">
          {localContent.trim() ? (
            <MarkdownRenderer content={localContent} onCheckboxToggle={handleCheckboxToggle} />
          ) : (
            <div className="text-white/40 text-sm">
              No notes yet. Click the edit icon to start writing.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
