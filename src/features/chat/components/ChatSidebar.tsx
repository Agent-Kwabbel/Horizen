import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { usePrefs } from "@/lib/prefs"
import type { ChatMessage as ChatMessageType, ChatModel } from "@/lib/prefs"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare } from "lucide-react"
import ChatHeader from "./ChatHeader"
import ChatConversationList from "./ChatConversationList"
import ChatMessage from "./ChatMessage"
import ChatInput, { type ChatInputRef } from "./ChatInput"
import ImageLightbox from "./ImageLightbox"
import { useConversations } from "../hooks/useConversations"
import { useImageAttachments } from "../hooks/useImageAttachments"
import { useMessageEditing } from "../hooks/useMessageEditing"
import { useChatStreaming } from "../hooks/useChatStreaming"

export type ChatSidebarRef = {
  focusInput: () => void
  triggerFileUpload: () => void
  selectConversation: (id: string) => void
  toggleGhostMode: () => void
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

const ChatSidebar = forwardRef<ChatSidebarRef, Props>(({ open, onOpenChange }, ref) => {
  const { prefs, setPrefs } = usePrefs()
  const [inputMessage, setInputMessage] = useState("")
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatInputRef = useRef<ChatInputRef>(null)

  const {
    currentConversationId,
    setCurrentConversationId,
    currentConversation,
    editingConvId,
    editingTitle,
    setEditingTitle,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
    startEditingTitle,
    saveEditingTitle,
    cancelEditingTitle,
  } = useConversations()

  const { attachedImages, handleImageUpload, handlePaste, removeImage, clearImages } = useImageAttachments()

  const { isLoading, streamingControllers, stopStream, regenerateAssistantResponse, retryMessage } = useChatStreaming({
    currentConversationId,
  })

  const {
    editingMessageId,
    editingMessageText,
    editingMessageImages,
    setEditingMessageText,
    startEditingMessage,
    cancelEditingMessage,
    saveEditedMessage,
    handleEditImageUpload,
    removeEditImage,
  } = useMessageEditing({
    currentConversationId,
    onRegenerateResponse: regenerateAssistantResponse,
  })

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
  }, [open, currentConversationId, createNewConversation])

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

  const copyToClipboard = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

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
      id: `msg-${Date.now()}-user`,
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
    clearImages()

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
                            onStartEditing={startEditingMessage}
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
