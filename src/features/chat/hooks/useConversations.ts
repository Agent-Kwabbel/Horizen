import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import type { ChatConversation } from "@/lib/prefs"

export function useConversations() {
  const { prefs, setPrefs } = usePrefs()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const currentConversation = prefs.conversations.find((c) => c.id === currentConversationId)

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

  const cancelEditingTitle = () => {
    setEditingConvId(null)
    setEditingTitle("")
  }

  return {
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
  }
}
