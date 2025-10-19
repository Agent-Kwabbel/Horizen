import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Pencil, Trash2, Check, X, Ghost } from "lucide-react"
import type { ChatConversation } from "@/lib/prefs"
import { OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS } from "./chat-constants"

type ChatConversationListProps = {
  conversations: ChatConversation[]
  currentConversationId: string | null
  editingConvId: string | null
  editingTitle: string
  onCreateNew: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onStartEditingTitle: (conv: ChatConversation) => void
  onSaveEditingTitle: () => void
  onCancelEditingTitle: () => void
  onEditingTitleChange: (title: string) => void
}

export default function ChatConversationList({
  conversations,
  currentConversationId,
  editingConvId,
  editingTitle,
  onCreateNew,
  onSelectConversation,
  onDeleteConversation,
  onStartEditingTitle,
  onSaveEditingTitle,
  onCancelEditingTitle,
  onEditingTitleChange,
}: ChatConversationListProps) {
  return (
    <div className="shrink-0 basis-[20rem] md:basis-[22rem] lg:basis-[24rem] border-r border-white/10 flex flex-col">
      <div className="p-3 border-b border-white/10">
        <Button
          onClick={onCreateNew}
          className="w-full bg-white/10 hover:bg-white/20 text-white text-sm"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-white/5 hover:bg-white/10
                        relative ${currentConversationId === conv.id ? "bg-white/15" : ""}`}
            onClick={() => editingConvId !== conv.id && onSelectConversation(conv.id)}
          >
            <div className="flex-1 min-w-0 pr-1">
              {editingConvId === conv.id ? (
                <div
                  className="flex items-center gap-1 w-full min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={editingTitle}
                    onChange={(e) => onEditingTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveEditingTitle()
                      if (e.key === "Escape") onCancelEditingTitle()
                    }}
                    className="h-6 text-sm bg-white/10 border-white/20 text-white w-full min-w-0"
                    autoFocus
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-green-400 hover:text-green-300 shrink-0"
                    onClick={onSaveEditingTitle}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-red-400 hover:text-red-300 shrink-0"
                    onClick={onCancelEditingTitle}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    {conv.isGhostMode && (
                      <Ghost className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    )}
                    <div className="text-sm truncate">{conv.title}</div>
                  </div>
                  {conv.messages.length > 0 && (
                    <div className="text-xs text-white/50">
                      {conv.model.provider === "openai"
                        ? OPENAI_MODELS.find(m => m.key === conv.model.model)?.label
                        : conv.model.provider === "anthropic"
                        ? ANTHROPIC_MODELS.find(m => m.key === conv.model.model)?.label
                        : GEMINI_MODELS.find(m => m.key === conv.model.model)?.label}
                      {" · "}
                      {Math.ceil(conv.messages.length / 2)} {Math.ceil(conv.messages.length / 2) === 1 ? "exchange" : "exchanges"}
                      {conv.isGhostMode && (
                        <span className="text-purple-400"> · Ghost</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {editingConvId !== conv.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-white/70 hover:text-blue-300 hover:bg-blue-500/20"
                  onClick={(e) => { e.stopPropagation(); onStartEditingTitle(conv) }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-white/70 hover:text-red-300 hover:bg-red-500/20"
                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id) }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}
