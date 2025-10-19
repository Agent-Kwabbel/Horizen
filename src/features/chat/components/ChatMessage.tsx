import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Check, X, Loader2 } from "lucide-react"
import MessageContent from "@/components/MessageContent"
import ChatMessageActions from "./ChatMessageActions"
import type { ChatMessage as ChatMessageType, ChatConversation, ChatModel } from "@/lib/prefs"

type ChatMessageProps = {
  message: ChatMessageType
  conversation: ChatConversation
  isLoading: boolean
  isLastMessage: boolean
  isEditing: boolean
  editingText: string
  editingImages: string[]
  copiedMessageId: string | null
  showVerifiedOrgModels: boolean
  onStartEditing: () => void
  onCancelEditing: () => void
  onSaveEditing: () => void
  onEditingTextChange: (text: string) => void
  onEditImageUpload: (files: FileList | null) => void
  onRemoveEditImage: (index: number) => void
  onImageClick: (imageUrl: string) => void
  onRetry: (messageId: string, modifier?: string, newModel?: ChatModel) => void
  onCopy: (messageId: string, content: string) => void
}

export default function ChatMessage({
  message,
  conversation,
  isLoading,
  isLastMessage,
  isEditing,
  editingText,
  editingImages,
  copiedMessageId,
  showVerifiedOrgModels,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onEditingTextChange,
  onEditImageUpload,
  onRemoveEditImage,
  onImageClick,
  onRetry,
  onCopy,
}: ChatMessageProps) {
  const editFileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
      {isEditing ? (
        <div className="max-w-[95%] w-full rounded-lg px-4 py-2 bg-blue-600/60 text-white">
          <div className="mb-2">
            {editingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {editingImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Editing ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded border border-white/20"
                    />
                    <button
                      onClick={() => onRemoveEditImage(idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={editFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onEditImageUpload(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editFileInputRef.current?.click()}
              className="text-white/70 hover:text-white hover:bg-white/10 h-6 text-xs mb-2"
            >
              <Paperclip className="w-3 h-3 mr-1" />
              Add Image
            </Button>
          </div>

          <Textarea
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm mb-2 min-h-[60px]"
            autoFocus
          />

          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEditing}
              className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveEditing}
              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-3 h-3 mr-1" />
              Save & Regenerate
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`rounded-lg px-4 py-2 max-w-[80%] overflow-x-auto ${
              message.role === "user" ? "bg-blue-600/80 text-white" : "bg-white/10 text-white/90"
            }`}
          >
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Attachment ${idx + 1}`}
                    className="max-w-[200px] max-h-[200px] rounded border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onImageClick(img)}
                  />
                ))}
              </div>
            )}
            {message.content && (
              <MessageContent content={message.content} />
            )}
            {message.role === "assistant" && !message.content && isLoading && isLastMessage && (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isLoading && message.content && (
            <ChatMessageActions
              messageId={message.id}
              messageRole={message.role}
              messageContent={message.content}
              copiedMessageId={copiedMessageId}
              conversation={conversation}
              showVerifiedOrgModels={showVerifiedOrgModels}
              onEdit={onStartEditing}
              onRetry={onRetry}
              onCopy={onCopy}
            />
          )}
        </>
      )}
    </div>
  )
}
