import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { createPortal } from "react-dom"
import { usePrefs } from "@/lib/prefs"
import type { ChatMessage, ChatConversation, ChatModel, OpenAIModel, AnthropicModel } from "@/lib/prefs"
import { sendChatMessage } from "@/lib/chat-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Kbd } from "@/components/ui/kbd"
import { MessageSquare, Plus, Send, Trash2, Loader2, Pencil, Check, X, Paperclip, RotateCcw, Sparkles, Minimize2, Maximize2, Zap, Copy } from "lucide-react"
import { Label } from "./ui/label"
import MessageContent from "./MessageContent"
import { toast } from "sonner"

const OPENAI_MODELS = [
  { key: "gpt-5", label: "GPT-5" },
  { key: "gpt-5-mini", label: "GPT-5 Mini" },
  { key: "gpt-5-nano", label: "GPT-5 Nano" },
  { key: "gpt-4.1", label: "GPT-4.1" },
  { key: "gpt-4o", label: "GPT-4o" },
  { key: "gpt-4o-mini", label: "GPT-4o Mini" },
] as const

const ANTHROPIC_MODELS = [
  { key: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { key: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
  { key: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const

export type ChatSidebarRef = {
  focusInput: () => void
  triggerFileUpload: () => void
  selectConversation: (id: string) => void
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

const ChatSidebar = forwardRef<ChatSidebarRef, Props>(({ open, onOpenChange }, ref) => {
  const { prefs, setPrefs } = usePrefs()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState("")
  const [editingMessageImages, setEditingMessageImages] = useState<string[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus()
    },
    triggerFileUpload: () => {
      fileInputRef.current?.click()
    },
    selectConversation: (id: string) => {
      setCurrentConversationId(id)
    },
  }))

  const currentConversation = prefs.conversations.find((c) => c.id === currentConversationId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px` // max-h-32 = 8rem = 128px
    }

    adjustHeight() // Initial adjustment

    textarea.addEventListener('input', adjustHeight)
    return () => textarea.removeEventListener('input', adjustHeight)
  }, [inputMessage])

  // Close lightbox with Escape key (prevent closing sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxImage) {
        e.preventDefault()
        e.stopPropagation()
        setLightboxImage(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [lightboxImage])

  // Clean up empty conversations when sidebar closes
  useEffect(() => {
    if (!open) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.filter((c) => c.messages.length > 0),
      }))
    }
  }, [open, setPrefs])

  // Clean up old empty conversations when switching to a different one
  useEffect(() => {
    if (currentConversationId) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.filter(
          (c) => c.id === currentConversationId || c.messages.length > 0
        ),
      }))
    }
  }, [currentConversationId, setPrefs])

  // Auto-create a new conversation when sidebar opens with no current conversation
  useEffect(() => {
    if (open && !currentConversationId) {
      createNewConversation()
    }
  }, [open, currentConversationId])


  const createNewConversation = () => {
    // First, clean up any existing empty conversations
    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.filter((c) => c.messages.length > 0),
    }))

    const newConv: ChatConversation = {
      id: `conv-${Date.now()}`,
      title: "New Conversation",
      model: prefs.chatModel,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setPrefs((p) => ({ ...p, conversations: [newConv, ...p.conversations] }))
    setCurrentConversationId(newConv.id)
  }

  const deleteConversation = (id: string) => {
    setPrefs((p) => ({ ...p, conversations: p.conversations.filter((c) => c.id !== id) }))
    if (currentConversationId === id) setCurrentConversationId(null)
  }

  const updateConversationTitle = (id: string, title: string) => {
    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    }))
  }

  const startEditingTitle = (conv: ChatConversation) => {
    setEditingConvId(conv.id)
    setEditingTitle(conv.title)
  }

  const saveEditingTitle = () => {
    if (editingConvId && editingTitle.trim()) updateConversationTitle(editingConvId, editingTitle.trim())
    setEditingConvId(null)
    setEditingTitle("")
  }
  const cancelEditingTitle = () => { setEditingConvId(null); setEditingTitle("") }

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Calculate new dimensions (max 2048px on longest side)
          const MAX_SIZE = 2048
          let width = img.width
          let height = img.height

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width)
              width = MAX_SIZE
            } else {
              width = Math.round((width * MAX_SIZE) / height)
              height = MAX_SIZE
            }
          }

          // Create canvas and resize
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          // Convert to base64 with quality adjustment
          let quality = 0.9
          let dataUrl = canvas.toDataURL('image/jpeg', quality)

          // If still too large (>5MB), reduce quality
          while (dataUrl.length > 5 * 1024 * 1024 && quality > 0.3) {
            quality -= 0.1
            dataUrl = canvas.toDataURL('image/jpeg', quality)
          }

          resolve(dataUrl)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))

    // Limit to 4 images total
    const remainingSlots = 4 - attachedImages.length
    if (remainingSlots <= 0) {
      toast.error("Maximum images reached", {
        description: "You can only attach up to 4 images per message.",
      })
      return
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots)

    for (const file of filesToProcess) {
      try {
        const resizedDataUrl = await resizeImage(file)
        setAttachedImages((prev) => [...prev, resizedDataUrl])
      } catch (error) {
        console.error('Failed to process image:', error)
        toast.error("Failed to process image", {
          description: `Could not process ${file.name}. Please try another image.`,
        })
      }
    }

    if (imageFiles.length > remainingSlots) {
      toast.warning("Some images not added", {
        description: `Only added ${remainingSlots} image(s). Maximum 4 images total.`,
      })
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    // Check image limit
    if (attachedImages.length >= 4) {
      toast.error("Maximum images reached", {
        description: "You can only attach up to 4 images per message.",
      })
      return
    }

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const files = new DataTransfer()
          files.items.add(file)
          handleImageUpload(files.files)
        }
      }
    }
  }

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const updateChatModel = (model: ChatModel) => {
    setPrefs((p) => ({ ...p, chatModel: model }))
    if (currentConversation) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === currentConversationId ? { ...c, model } : c
        ),
      }))
    }
  }

  const copyToClipboard = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const startEditingMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id)
    setEditingMessageText(msg.content)
    setEditingMessageImages(msg.images || [])
  }

  const cancelEditingMessage = () => {
    setEditingMessageId(null)
    setEditingMessageText("")
    setEditingMessageImages([])
  }

  const saveEditedMessage = async () => {
    if (!editingMessageId || !currentConversationId) return
    const conv = prefs.conversations.find((c) => c.id === currentConversationId)
    if (!conv) return

    const messageIndex = conv.messages.findIndex((m) => m.id === editingMessageId)
    if (messageIndex === -1) return

    // Update the message
    const updatedMessage: ChatMessage = {
      ...conv.messages[messageIndex],
      content: editingMessageText,
      images: editingMessageImages.length > 0 ? editingMessageImages : undefined,
    }

    // Remove all messages after this one (including assistant responses)
    const newMessages = conv.messages.slice(0, messageIndex + 1)
    newMessages[messageIndex] = updatedMessage

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: newMessages, updatedAt: Date.now() }
          : c
      ),
    }))

    cancelEditingMessage()

    // If this was a user message, regenerate the assistant response
    if (updatedMessage.role === "user") {
      setIsLoading(true)

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      }

      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === currentConversationId
            ? { ...c, messages: [...newMessages, assistantMessage], updatedAt: Date.now() }
            : c
        ),
      }))

      try {
        const stream = sendChatMessage(newMessages, conv.model)

        for await (const chunk of stream) {
          if (chunk.content) {
            setPrefs((p) => ({
              ...p,
              conversations: p.conversations.map((c) =>
                c.id === currentConversationId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMessage.id ? { ...m, content: m.content + chunk.content } : m
                      ),
                      updatedAt: Date.now(),
                    }
                  : c
              ),
            }))
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
        setPrefs((p) => ({
          ...p,
          conversations: p.conversations.map((c) =>
            c.id === currentConversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: `Error: ${errorMsg}` } : m
                  ),
                }
              : c
          ),
        }))
      } finally {
        setIsLoading(false)
      }
    }
  }

  const removeEditImage = (index: number) => {
    setEditingMessageImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEditImageUpload = async (files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))

    const remainingSlots = 4 - editingMessageImages.length
    if (remainingSlots <= 0) {
      toast.error("Maximum images reached", {
        description: "You can only attach up to 4 images per message.",
      })
      return
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots)

    for (const file of filesToProcess) {
      try {
        const resizedDataUrl = await resizeImage(file)
        setEditingMessageImages((prev) => [...prev, resizedDataUrl])
      } catch (error) {
        console.error('Failed to process image:', error)
        toast.error("Failed to process image", {
          description: `Could not process ${file.name}. Please try another image.`,
        })
      }
    }

    if (imageFiles.length > remainingSlots) {
      toast.warning("Some images not added", {
        description: `Only added ${remainingSlots} image(s). Maximum 4 images total.`,
      })
    }
  }

  const retryMessage = async (messageId: string, modifier?: string, newModel?: ChatModel) => {
    if (!currentConversationId || isLoading) return
    const conv = prefs.conversations.find((c) => c.id === currentConversationId)
    if (!conv) return

    // Find the assistant message to retry
    const messageIndex = conv.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1 || conv.messages[messageIndex].role !== "assistant") return

    // Get the messages up to (but not including) the assistant message we're retrying
    const messagesToRetry = conv.messages.slice(0, messageIndex)

    // If there's a modifier, add it as a system instruction to the last user message
    let finalMessages = [...messagesToRetry]
    if (modifier && finalMessages.length > 0) {
      const lastUserMsgIndex = finalMessages.length - 1
      const lastMsg = finalMessages[lastUserMsgIndex]
      finalMessages[lastUserMsgIndex] = {
        ...lastMsg,
        content: `${lastMsg.content}\n\n[${modifier}]`
      }
    }

    // Update model if provided
    const modelToUse = newModel || conv.model
    if (newModel) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === currentConversationId ? { ...c, model: newModel } : c
        ),
      }))
    }

    // Remove the old assistant message and any messages after it
    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: messagesToRetry, updatedAt: Date.now() }
          : c
      ),
    }))

    setIsLoading(true)

    const newAssistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: [...messagesToRetry, newAssistantMessage], updatedAt: Date.now() }
          : c
      ),
    }))

    try {
      const stream = sendChatMessage(finalMessages, modelToUse)

      for await (const chunk of stream) {
        if (chunk.content) {
          setPrefs((p) => ({
            ...p,
            conversations: p.conversations.map((c) =>
              c.id === currentConversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === newAssistantMessage.id ? { ...m, content: m.content + chunk.content } : m
                    ),
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }))
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === currentConversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newAssistantMessage.id ? { ...m, content: `Error: ${errorMsg}` } : m
                ),
              }
            : c
        ),
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if ((!inputMessage.trim() && attachedImages.length === 0) || isLoading) return

    let convId = currentConversationId

    if (!convId) {
      createNewConversation()
      await new Promise((r) => setTimeout(r, 0))
      convId = prefs.conversations[0]?.id
      if (!convId) return
      setCurrentConversationId(convId)
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputMessage,
      timestamp: Date.now(),
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
          : c
      ),
    }))

    const conv = prefs.conversations.find((c) => c.id === convId)
    if (!conv) return
    if (conv.messages.length === 0) {
      const title = inputMessage.slice(0, 40) + (inputMessage.length > 40 ? "..." : "")
      updateConversationTitle(convId, title)
    }

    setInputMessage("")
    setAttachedImages([])
    setIsLoading(true)

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: Date.now() }
          : c
      ),
    }))

    try {
      const messages = [...conv.messages, userMessage]
      const stream = sendChatMessage(messages, conv.model)

      for await (const chunk of stream) {
        if (chunk.content) {
          setPrefs((p) => ({
            ...p,
            conversations: p.conversations.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: m.content + chunk.content } : m
                    ),
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }))
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessage.id ? { ...m, content: `Error: ${errorMsg}` } : m
                ),
              }
            : c
        ),
      }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="
            sm:max-w-none max-w-none
            w-[95vw] md:w-[900px] lg:w-[1100px] xl:w-[1200px]
            bg-black/85 text-white border-white/10 backdrop-blur
            p-0 flex flex-col h-full
          "
        >
        <div className="px-4 py-2 border-b border-white/10 shrink-0 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="font-semibold text-sm">Chat Assistant</span>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Conversations List */}
          <div className="shrink-0 basis-[20rem] md:basis-[22rem] lg:basis-[24rem] border-r border-white/10 flex flex-col">
            <div className="p-3 border-b border-white/10">
              <Button
                onClick={createNewConversation}
                className="w-full bg-white/10 hover:bg-white/20 text-white text-sm"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" /> New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {prefs.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-white/5 hover:bg-white/10
                              relative ${currentConversationId === conv.id ? "bg-white/15" : ""}`}
                  onClick={() => editingConvId !== conv.id && setCurrentConversationId(conv.id)}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    {editingConvId === conv.id ? (
                      <div
                        className="flex items-center gap-1 w-full min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditingTitle()
                            if (e.key === "Escape") cancelEditingTitle()
                          }}
                          className="h-6 text-sm bg-white/10 border-white/20 text-white w-full min-w-0"
                          autoFocus
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-green-400 hover:text-green-300 shrink-0"
                          onClick={saveEditingTitle}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-red-400 hover:text-red-300 shrink-0"
                          onClick={cancelEditingTitle}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm truncate">{conv.title}</div>
                        {conv.messages.length > 0 && (
                          <div className="text-xs text-white/50">
                            {conv.model.provider === "openai"
                              ? OPENAI_MODELS.find(m => m.key === conv.model.model)?.label
                              : ANTHROPIC_MODELS.find(m => m.key === conv.model.model)?.label}
                            {" · "}
                            {Math.ceil(conv.messages.length / 2)} {Math.ceil(conv.messages.length / 2) === 1 ? "exchange" : "exchanges"}
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
                        onClick={(e) => { e.stopPropagation(); startEditingTitle(conv) }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-white/70 hover:text-red-300 hover:bg-red-500/20"
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {currentConversation ? (
              <>
                {/* Model Selection */}
                <div className="px-3 py-2 border-b border-white/10">
                  <div className="flex gap-4 items-end">
                    <div className="min-w-0">
                      <Label className="text-xs text-white/60 mb-1 block">Provider</Label>
                      <Select
                        value={currentConversation.model.provider}
                        onValueChange={(provider: "openai" | "anthropic") =>
                          updateChatModel({
                            provider,
                            model: provider === "openai" ? "gpt-4o" : "claude-sonnet-4-5-20250929",
                          })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 text-white border-white/10">
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-white/60 mb-1 block">Model</Label>
                      <Select
                        value={currentConversation.model.model}
                        onValueChange={(model) =>
                          updateChatModel({ ...currentConversation.model, model: model as OpenAIModel | AnthropicModel })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 text-white border-white/10">
                          {currentConversation.model.provider === "openai"
                            ? OPENAI_MODELS.filter((m) =>
                                prefs.showVerifiedOrgModels || (m.key !== "gpt-5" && m.key !== "gpt-5-mini")
                              ).map((m) => (
                                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                              ))
                            : ANTHROPIC_MODELS.map((m) => (
                                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {currentConversation.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/50">
                      <div className="text-center">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Start a conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentConversation.messages.map((msg, msgIdx) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          {editingMessageId === msg.id ? (
                            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-blue-600/60 text-white">
                              <div className="mb-2">
                                {editingMessageImages.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {editingMessageImages.map((img, idx) => (
                                      <div key={idx} className="relative group">
                                        <img
                                          src={img}
                                          alt={`Editing ${idx + 1}`}
                                          className="w-20 h-20 object-cover rounded border border-white/20"
                                        />
                                        <button
                                          onClick={() => removeEditImage(idx)}
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
                                  onChange={(e) => handleEditImageUpload(e.target.files)}
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
                                value={editingMessageText}
                                onChange={(e) => setEditingMessageText(e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm mb-2 min-h-[60px]"
                                autoFocus
                              />

                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditingMessage}
                                  className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={saveEditedMessage}
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
                                  msg.role === "user" ? "bg-blue-600/80 text-white" : "bg-white/10 text-white/90"
                                }`}
                              >
                                {msg.images && msg.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {msg.images.map((img, idx) => (
                                      <img
                                        key={idx}
                                        src={img}
                                        alt={`Attachment ${idx + 1}`}
                                        className="max-w-[200px] max-h-[200px] rounded border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setLightboxImage(img)}
                                      />
                                    ))}
                                  </div>
                                )}
                                {msg.content && (
                                  <MessageContent content={msg.content} />
                                )}
                                {msg.role === "assistant" && !msg.content && isLoading && msgIdx === currentConversation.messages.length - 1 && (
                                  <div className="flex items-center gap-2 text-white/60">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Thinking...</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              {!isLoading && msg.content && (
                                <div className="flex gap-2 mt-1">
                                  {msg.role === "user" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditingMessage(msg)}
                                      className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
                                      title="Edit message"
                                    >
                                      <Pencil className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}

                                  {msg.role === "assistant" && msg.content && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
                                          title="Retry response"
                                        >
                                          <RotateCcw className="w-3 h-3 mr-1" />
                                          Retry
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-56 bg-black/95 border-white/10 text-white p-2">
                                        <div className="space-y-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => retryMessage(msg.id)}
                                            className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                          >
                                            <RotateCcw className="w-3 h-3 mr-2" />
                                            Retry
                                          </Button>

                                          <div className="border-t border-white/10 pt-1 mt-1">
                                            <div className="text-[10px] text-white/40 px-2 py-1">Adjust Response</div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => retryMessage(msg.id, "Please provide more detail and expand on your answer")}
                                              className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                            >
                                              <Maximize2 className="w-3 h-3 mr-2" />
                                              More Detail
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => retryMessage(msg.id, "Please make this more concise and brief")}
                                              className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                            >
                                              <Minimize2 className="w-3 h-3 mr-2" />
                                              More Concise
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => retryMessage(msg.id, "Please simplify your explanation and make it easier to understand")}
                                              className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                            >
                                              <Sparkles className="w-3 h-3 mr-2" />
                                              Simplify
                                            </Button>
                                          </div>

                                          {currentConversation && (
                                            <div className="border-t border-white/10 pt-1 mt-1">
                                              <div className="text-[10px] text-white/40 px-2 py-1">Switch Model</div>
                                              {currentConversation.model.provider === "openai" ? (
                                                <>
                                                  {OPENAI_MODELS.filter((m) =>
                                                    prefs.showVerifiedOrgModels || (m.key !== "gpt-5" && m.key !== "gpt-5-mini")
                                                  ).filter(m => m.key !== currentConversation.model.model).map((model) => (
                                                    <Button
                                                      key={model.key}
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => retryMessage(msg.id, undefined, { provider: "openai", model: model.key as OpenAIModel })}
                                                      className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                                    >
                                                      <Zap className="w-3 h-3 mr-2" />
                                                      {model.label}
                                                    </Button>
                                                  ))}
                                                </>
                                              ) : (
                                                <>
                                                  {ANTHROPIC_MODELS.filter(m => m.key !== currentConversation.model.model).slice(0, 2).map((model) => (
                                                    <Button
                                                      key={model.key}
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => retryMessage(msg.id, undefined, { provider: "anthropic", model: model.key as AnthropicModel })}
                                                      className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                                                    >
                                                      <Zap className="w-3 h-3 mr-2" />
                                                      {model.label}
                                                    </Button>
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}

                                  {/* Copy button for both user and assistant */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(msg.id, msg.content)}
                                    className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
                                    title="Copy message"
                                  >
                                    {copiedMessageId === msg.id ? (
                                      <>
                                        <Check className="w-3 h-3 mr-1" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-2 border-t border-white/10 shrink-0">
                  {attachedImages.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {attachedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img}
                            alt={`Attachment ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(img)}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeImage(idx)
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
                      onChange={(e) => handleImageUpload(e.target.files)}
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
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      onPaste={handlePaste}
                      placeholder="Type your message or paste an image... (Shift+Enter for new line)"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/50 flex-1 min-w-0 min-h-[2.25rem] max-h-32 resize-none overflow-y-auto"
                      disabled={isLoading}
                      rows={1}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={(!inputMessage.trim() && attachedImages.length === 0) || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-9 w-9 p-0"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/50">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </SheetContent>
      </Sheet>

      {/* Image Lightbox */}
      {lightboxImage && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur">
              Press <Kbd>Esc</Kbd> to close
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

ChatSidebar.displayName = "ChatSidebar"

export default ChatSidebar
