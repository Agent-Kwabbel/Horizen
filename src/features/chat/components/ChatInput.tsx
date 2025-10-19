import { useRef, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Send, Square, X } from "lucide-react"

export type ChatInputRef = {
  triggerFileUpload: () => void
}

type ChatInputProps = {
  inputMessage: string
  attachedImages: string[]
  isLoading: boolean
  hasActiveStream: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  onStopStream: () => void
  onImageUpload: (files: FileList | null) => void
  onRemoveImage: (index: number) => void
  onPaste: (e: React.ClipboardEvent) => void
  onImageClick: (imageUrl: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({
  inputMessage,
  attachedImages,
  isLoading,
  hasActiveStream,
  onInputChange,
  onSend,
  onStopStream,
  onImageUpload,
  onRemoveImage,
  onPaste,
  onImageClick,
  inputRef,
}, ref) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    triggerFileUpload: () => {
      fileInputRef.current?.click()
    },
  }))

  return (
    <div className="p-2 border-t border-white/10 shrink-0">
      {attachedImages.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt={`Attachment ${idx + 1}`}
                className="w-16 h-16 object-cover rounded border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onImageClick(img)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveImage(idx)
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onImageUpload(e.target.files)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="text-white/70 hover:text-white hover:bg-white/10 shrink-0 h-9 w-9"
          disabled={isLoading}
          title="Attach image"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Textarea
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          onPaste={onPaste}
          placeholder="Type your message or paste an image... (Shift+Enter for new line)"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/50 flex-1 min-w-0 min-h-[2.25rem] max-h-32 resize-none overflow-y-auto"
          disabled={isLoading}
          rows={1}
        />
        {hasActiveStream ? (
          <Button
            onClick={onStopStream}
            className="bg-red-600 hover:bg-red-700 text-white shrink-0 h-9 w-9 p-0"
            size="icon"
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={onSend}
            disabled={(!inputMessage.trim() && attachedImages.length === 0) || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-9 w-9 p-0"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
})

export default ChatInput
