import { useState, useCallback } from "react"
import { usePrefs } from "@/lib/prefs"
import { toast } from "sonner"
import { resizeImage } from "../components/image-utils"
import type { ChatMessage as ChatMessageType, ChatModel } from "@/lib/prefs"

type UseMessageEditingProps = {
  currentConversationId: string | null
  onRegenerateResponse: (messages: ChatMessageType[], model: ChatModel) => Promise<void>
}

export function useMessageEditing({ currentConversationId, onRegenerateResponse }: UseMessageEditingProps) {
  const { prefs, setPrefs } = usePrefs()
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState("")
  const [editingMessageImages, setEditingMessageImages] = useState<string[]>([])

  const startEditingMessage = useCallback((messageId: string) => {
    const conv = prefs.conversations.find((c) => c.id === currentConversationId)
    if (!conv) return

    const msg = conv.messages.find((m) => m.id === messageId)
    if (!msg) return

    setEditingMessageId(msg.id)
    setEditingMessageText(msg.content)
    setEditingMessageImages(msg.images || [])
  }, [prefs.conversations, currentConversationId])

  const cancelEditingMessage = useCallback(() => {
    setEditingMessageId(null)
    setEditingMessageText("")
    setEditingMessageImages([])
  }, [])

  const saveEditedMessage = useCallback(async () => {
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
      await onRegenerateResponse(newMessages, conv.model)
    }
  }, [editingMessageId, currentConversationId, prefs.conversations, editingMessageText, editingMessageImages, setPrefs, cancelEditingMessage, onRegenerateResponse])

  const removeEditImage = useCallback((index: number) => {
    setEditingMessageImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleEditImageUpload = useCallback(async (files: FileList | null) => {
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
  }, [editingMessageImages.length])

  return {
    editingMessageId,
    editingMessageText,
    editingMessageImages,
    setEditingMessageText,
    startEditingMessage,
    cancelEditingMessage,
    saveEditedMessage,
    handleEditImageUpload,
    removeEditImage,
  }
}
