import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { usePrefs } from "@/lib/prefs"
import type { ChatMessage as ChatMessageType, ChatConversation, ChatModel } from "@/lib/prefs"
import { sendChatMessage } from "@/lib/chat-api"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import ChatHeader from "./ChatHeader"
import ChatConversationList from "./ChatConversationList"
import ChatMessage from "./ChatMessage"
import ChatInput, { type ChatInputRef } from "./ChatInput"
import ImageLightbox from "./ImageLightbox"
import { resizeImage } from "./image-utils"

export type ChatSidebarRef = {
  focusInput: () => void
  triggerFileUpload: () => void
  selectConversation: (id: string) => void
  toggleGhostMode: () => void
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

const ChatSidebar = forwardRef<ChatSidebarRef, Props>(({ open, onOpenChange }, ref) => {
  const { prefs, setPrefs } = usePrefs()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingControllers, setStreamingControllers] = useState<Map<string, AbortController>>(new Map())
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState("")
  const [editingMessageImages, setEditingMessageImages] = useState<string[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatInputRef = useRef<ChatInputRef>(null)

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus()
    },
    triggerFileUpload: () => {
      chatInputRef.current?.triggerFileUpload()
    },
    selectConversation: (id: string) => {
      setCurrentConversationId(id)
    },
    toggleGhostMode: () => {
      toggleGhostMode()
    },
  }))

  const currentConversation = prefs.conversations.find((c) => c.id === currentConversationId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
    }

    adjustHeight()
    textarea.addEventListener('input', adjustHeight)
    return () => textarea.removeEventListener('input', adjustHeight)
  }, [inputMessage])

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

  useEffect(() => {
    if (!open) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.filter((c) => c.messages.length > 0),
      }))
    }
  }, [open, setPrefs])

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

  useEffect(() => {
    if (open && !currentConversationId) {
      createNewConversation()
    }
  }, [open, currentConversationId])

  const createNewConversation = () => {
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

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))

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

  const toggleGhostMode = () => {
    if (!currentConversation) return
    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId ? { ...c, isGhostMode: !c.isGhostMode } : c
      ),
    }))
  }

  const stopStream = (convId: string) => {
    const controller = streamingControllers.get(convId)
    if (controller) {
      controller.abort()
      setStreamingControllers((prev) => {
        const next = new Map(prev)
        next.delete(convId)
        return next
      })
      setIsLoading(false)
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

  const startEditingMessage = (msg: ChatMessageType) => {
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

    const updatedMessage: ChatMessageType = {
      ...conv.messages[messageIndex],
      content: editingMessageText,
      images: editingMessageImages.length > 0 ? editingMessageImages : undefined,
    }

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

    if (updatedMessage.role === "user") {
      await regenerateAssistantResponse(newMessages, conv.model)
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

  const regenerateAssistantResponse = async (messages: ChatMessageType[], model: ChatModel) => {
    if (!currentConversationId) return

    setIsLoading(true)

    const assistantMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: [...messages, assistantMessage], updatedAt: Date.now() }
          : c
      ),
    }))

    const controller = new AbortController()
    setStreamingControllers((prev) => new Map(prev).set(currentConversationId, controller))

    try {
      const stream = sendChatMessage(messages, model, controller.signal)

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
      if (error instanceof Error && error.name === 'AbortError') {
      } else {
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
      }
    } finally {
      setStreamingControllers((prev) => {
        const next = new Map(prev)
        next.delete(currentConversationId)
        return next
      })
      setIsLoading(false)
    }
  }

  const retryMessage = async (messageId: string, modifier?: string, newModel?: ChatModel) => {
    if (!currentConversationId || isLoading) return
    const conv = prefs.conversations.find((c) => c.id === currentConversationId)
    if (!conv) return

    const messageIndex = conv.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1 || conv.messages[messageIndex].role !== "assistant") return

    const messagesToRetry = conv.messages.slice(0, messageIndex)

    let finalMessages = [...messagesToRetry]
    if (modifier && finalMessages.length > 0) {
      const lastUserMsgIndex = finalMessages.length - 1
      const lastMsg = finalMessages[lastUserMsgIndex]
      finalMessages[lastUserMsgIndex] = {
        ...lastMsg,
        content: `${lastMsg.content}\n\n[${modifier}]`
      }
    }

    const modelToUse = newModel || conv.model
    if (newModel) {
      setPrefs((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === currentConversationId ? { ...c, model: newModel } : c
        ),
      }))
    }

    setPrefs((p) => ({
      ...p,
      conversations: p.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: messagesToRetry, updatedAt: Date.now() }
          : c
      ),
    }))

    await regenerateAssistantResponse(finalMessages, modelToUse)
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

    const userMessage: ChatMessageType = {
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

    await regenerateAssistantResponse([...conv.messages, userMessage], conv.model)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          data-testid="chat-sidebar"
          data-open={open}
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
            <ChatConversationList
              conversations={prefs.conversations}
              currentConversationId={currentConversationId}
              editingConvId={editingConvId}
              editingTitle={editingTitle}
              onCreateNew={createNewConversation}
              onSelectConversation={setCurrentConversationId}
              onDeleteConversation={deleteConversation}
              onStartEditingTitle={startEditingTitle}
              onSaveEditingTitle={saveEditingTitle}
              onCancelEditingTitle={cancelEditingTitle}
              onEditingTitleChange={setEditingTitle}
            />

            <div className="flex-1 min-w-0 flex flex-col">
              {currentConversation ? (
                <>
                  <ChatHeader
                    conversation={currentConversation}
                    showVerifiedOrgModels={prefs.showVerifiedOrgModels}
                    onModelChange={updateChatModel}
                    onToggleGhostMode={toggleGhostMode}
                  />

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
                          <ChatMessage
                            key={msg.id}
                            message={msg}
                            conversation={currentConversation}
                            isLoading={isLoading}
                            isLastMessage={msgIdx === currentConversation.messages.length - 1}
                            isEditing={editingMessageId === msg.id}
                            editingText={editingMessageText}
                            editingImages={editingMessageImages}
                            copiedMessageId={copiedMessageId}
                            showVerifiedOrgModels={prefs.showVerifiedOrgModels}
                            onStartEditing={() => startEditingMessage(msg)}
                            onCancelEditing={cancelEditingMessage}
                            onSaveEditing={saveEditedMessage}
                            onEditingTextChange={setEditingMessageText}
                            onEditImageUpload={handleEditImageUpload}
                            onRemoveEditImage={removeEditImage}
                            onImageClick={setLightboxImage}
                            onRetry={retryMessage}
                            onCopy={copyToClipboard}
                          />
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <ChatInput
                    ref={chatInputRef}
                    inputMessage={inputMessage}
                    attachedImages={attachedImages}
                    isLoading={isLoading}
                    hasActiveStream={currentConversationId !== null && streamingControllers.has(currentConversationId)}
                    onInputChange={setInputMessage}
                    onSend={sendMessage}
                    onStopStream={() => currentConversationId && stopStream(currentConversationId)}
                    onImageUpload={handleImageUpload}
                    onRemoveImage={removeImage}
                    onPaste={handlePaste}
                    onImageClick={setLightboxImage}
                    inputRef={inputRef}
                  />
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

      <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </>
  )
})

ChatSidebar.displayName = "ChatSidebar"

export default ChatSidebar
