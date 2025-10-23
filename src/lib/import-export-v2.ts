import type { Prefs, ChatConversation } from "./prefs"
import type { HabitTrackerWidgetConfig } from "./widgets"
import { getApiKeys } from "./api-keys"
import { getShortcuts } from "./shortcuts"
import type { ShortcutBinding } from "./shortcuts"
import { deriveKeyFromPassword } from "./password"

// Export format version 2.0
export const EXPORT_VERSION = "2.0.0"
export const APP_VERSION = "1.5.0"

export type ExportableSection =
  | "apiKeys"
  | "chats"
  | "settings"
  | "widgets"

export type WidgetDataType = "weather" | "notes" | "ticker" | "pomodoro" | "habitTracker" | "quote"

export type SelectionTree = {
  apiKeys?: {
    selected: boolean
    items: {
      openai: boolean
      anthropic: boolean
      gemini: boolean
    }
  }
  chats?: {
    selected: boolean
    items: Record<string, boolean> // chatId -> selected
  }
  settings?: {
    selected: boolean
    items: {
      searchEngine: boolean
      quickLinks: boolean
      keyboardShortcuts: boolean
      chatPreferences: boolean
    }
  }
  widgets?: {
    selected: boolean
    items: Record<string, boolean> // widgetId -> selected
  }
}

export type ExportDataV2 = {
  version: string
  appVersion: string
  exportedAt: string
  encrypted: boolean
  hash?: string
  salt?: string
  encryptedSections?: {
    apiKeys?: { data: string; iv: string }
    chats?: { data: string; iv: string }
    settings?: { data: string; iv: string }
    widgets?: { data: string; iv: string }
  }
  contents?: {
    apiKeys?: {
      openai?: string
      anthropic?: string
      gemini?: string
    }
    chats?: ChatConversation[]
    settings?: {
      searchEngine?: {
        engineId: string
        customEngines: any[]
      }
      quickLinks?: any[]
      keyboardShortcuts?: ShortcutBinding[]
      chatPreferences?: {
        showChat: boolean
        showVerifiedOrgModels: boolean
        chatModel: any
      }
    }
    widgets?: {
      type: string
      id: string
      enabled: boolean
      order: number
      settings: any
      data?: {
        notes?: string
        habits?: any[]
        symbols?: any[]
        location?: any
      }
    }[]
  }
}

export type ImportResult = {
  success: boolean
  imported: {
    apiKeys?: { count: number; items: string[] }
    chats?: { count: number; mode: "added" | "replaced" }
    settings?: { items: string[] }
    widgets?: { count: number; items: string[] }
  }
  failed: {
    apiKeys?: string[]
    chats?: { count: number; error: string }
    settings?: { items: string[]; errors: Record<string, string> }
    widgets?: { items: string[]; errors: Record<string, string> }
  }
  errors: string[]
}

export type MergeStrategy = "replace" | "merge" | "skip"

export type ImportOptions = {
  selection: SelectionTree
  mergeStrategies: {
    chats?: "append" | "replace"
    quickLinks?: "merge" | "replace"
    widgets?: "merge" | "replace"
  }
  createBackup: boolean
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  return `sha256:${hashHex}`
}

async function encryptSection(data: any, password: string, salt: Uint8Array): Promise<{ encrypted: string; iv: string }> {
  const jsonData = JSON.stringify(data)

  const key = await deriveKeyFromPassword(password, salt, 600000)

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ivBase64 = btoa(String.fromCharCode(...iv))

  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonData)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    dataBuffer
  )

  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))

  return { encrypted: encryptedBase64, iv: ivBase64 }
}

export async function decryptSection(encryptedData: string, iv: string, password: string, salt: Uint8Array): Promise<any> {
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
  const key = await deriveKeyFromPassword(password, salt, 600000)
  const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  )

  const decoder = new TextDecoder()
  const jsonData = decoder.decode(decrypted)
  return JSON.parse(jsonData)
}

export async function exportDataV2(
  prefs: Prefs,
  selection: SelectionTree,
  password?: string
): Promise<string> {
  const exportData: ExportDataV2 = {
    version: EXPORT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    encrypted: !!password,
    contents: {},
  }

  const salt = password ? crypto.getRandomValues(new Uint8Array(32)) : null
  const saltBase64 = salt ? btoa(String.fromCharCode(...salt)) : undefined

  if (password) {
    exportData.salt = saltBase64
    exportData.encryptedSections = {}
  }

  // Export API Keys
  if (selection.apiKeys?.selected) {
    try {
      const allKeys = await getApiKeys()
      const selectedKeys: any = {}

      if (selection.apiKeys.items.openai && allKeys.openai) {
        selectedKeys.openai = allKeys.openai
      }
      if (selection.apiKeys.items.anthropic && allKeys.anthropic) {
        selectedKeys.anthropic = allKeys.anthropic
      }
      if (selection.apiKeys.items.gemini && allKeys.gemini) {
        selectedKeys.gemini = allKeys.gemini
      }

      if (Object.keys(selectedKeys).length > 0) {
        if (password && salt) {
          const encrypted = await encryptSection(selectedKeys, password, salt)
          exportData.encryptedSections!.apiKeys = {
            data: encrypted.encrypted,
            iv: encrypted.iv
          }
        } else {
          // API keys must be encrypted
          throw new Error("API keys must be exported with encryption")
        }
      }
    } catch (err) {
      console.error("Failed to export API keys:", err)
      throw err
    }
  }

  // Export Chats
  if (selection.chats?.selected) {
    const selectedChats = prefs.conversations.filter(
      c => !c.isGhostMode && selection.chats!.items[c.id]
    )

    if (selectedChats.length > 0) {
      if (password && salt) {
        const encrypted = await encryptSection(selectedChats, password, salt)
        exportData.encryptedSections!.chats = {
          data: encrypted.encrypted,
          iv: encrypted.iv
        }
      } else {
        exportData.contents!.chats = selectedChats
      }
    }
  }

  // Export Settings
  if (selection.settings?.selected) {
    const settings: any = {}

    if (selection.settings.items.searchEngine) {
      settings.searchEngine = {
        engineId: prefs.searchEngineId,
        customEngines: prefs.customSearchEngines,
      }
    }

    if (selection.settings.items.quickLinks) {
      settings.quickLinks = prefs.links
    }

    if (selection.settings.items.keyboardShortcuts) {
      settings.keyboardShortcuts = getShortcuts()
    }

    if (selection.settings.items.chatPreferences) {
      settings.chatPreferences = {
        showChat: prefs.showChat,
        showVerifiedOrgModels: prefs.showVerifiedOrgModels,
        chatModel: prefs.chatModel,
      }
    }

    if (Object.keys(settings).length > 0) {
      if (password && salt) {
        const encrypted = await encryptSection(settings, password, salt)
        exportData.encryptedSections!.settings = {
          data: encrypted.encrypted,
          iv: encrypted.iv
        }
      } else {
        exportData.contents!.settings = settings
      }
    }
  }

  // Export Widgets
  if (selection.widgets?.selected) {
    const selectedWidgets = prefs.widgets.filter(w => selection.widgets!.items[w.id])

    const widgetsData = selectedWidgets.map(widget => {
      const baseData: any = {
        type: widget.type,
        id: widget.id,
        enabled: widget.enabled,
        order: widget.order,
        settings: widget.settings,
      }

      // Include widget-specific data
      if (widget.type === "notes") {
        const notesData = localStorage.getItem(`notes:${widget.id}`)
        if (notesData) {
          baseData.data = { notes: notesData }
        }
      }

      if (widget.type === "habitTracker") {
        const habitWidget = widget as HabitTrackerWidgetConfig
        baseData.data = {
          habits: habitWidget.settings.habits || [],
        }
      }

      if (widget.type === "ticker") {
        baseData.data = {
          symbols: widget.settings.symbols || [],
        }
      }

      if (widget.type === "weather") {
        const weatherLocation = localStorage.getItem("wx:location")
        if (weatherLocation) {
          try {
            baseData.data = { location: JSON.parse(weatherLocation) }
          } catch {}
        }
      }

      return baseData
    })

    if (widgetsData.length > 0) {
      if (password && salt) {
        const encrypted = await encryptSection(widgetsData, password, salt)
        exportData.encryptedSections!.widgets = {
          data: encrypted.encrypted,
          iv: encrypted.iv
        }
      } else {
        exportData.contents!.widgets = widgetsData
      }
    }
  }

  // Generate hash
  const dataForHash = JSON.stringify({
    contents: exportData.contents,
    encryptedSections: exportData.encryptedSections,
  })
  exportData.hash = await generateHash(dataForHash)

  return JSON.stringify(exportData, null, 2)
}

export async function verifyImportHash(data: ExportDataV2): Promise<boolean> {
  if (!data.hash) return true // Old exports without hash

  const dataForHash = JSON.stringify({
    contents: data.contents,
    encryptedSections: data.encryptedSections,
  })

  const computedHash = await generateHash(dataForHash)
  return computedHash === data.hash
}

export function getAvailableSections(data: ExportDataV2): SelectionTree {
  const tree: SelectionTree = {}

  // Check API Keys
  if (data.encryptedSections?.apiKeys) {
    tree.apiKeys = {
      selected: false,
      items: {
        openai: true, // We don't know which keys until decrypted
        anthropic: true,
        gemini: true,
      }
    }
  } else if (data.contents?.apiKeys) {
    tree.apiKeys = {
      selected: false,
      items: {
        openai: !!data.contents.apiKeys.openai,
        anthropic: !!data.contents.apiKeys.anthropic,
        gemini: !!data.contents.apiKeys.gemini,
      }
    }
  }

  // Check Chats
  const chats = data.encryptedSections?.chats ? [] : (data.contents?.chats || [])
  if (chats.length > 0 || data.encryptedSections?.chats) {
    tree.chats = {
      selected: false,
      items: chats.reduce((acc, chat) => {
        acc[chat.id] = false
        return acc
      }, {} as Record<string, boolean>)
    }
  }

  // Check Settings
  if (data.encryptedSections?.settings || data.contents?.settings) {
    const settings = data.contents?.settings
    tree.settings = {
      selected: false,
      items: {
        searchEngine: !!settings?.searchEngine || !!data.encryptedSections?.settings,
        quickLinks: !!settings?.quickLinks || !!data.encryptedSections?.settings,
        keyboardShortcuts: !!settings?.keyboardShortcuts || !!data.encryptedSections?.settings,
        chatPreferences: !!settings?.chatPreferences || !!data.encryptedSections?.settings,
      }
    }
  }

  // Check Widgets
  const widgets = data.encryptedSections?.widgets ? [] : (data.contents?.widgets || [])
  if (widgets.length > 0 || data.encryptedSections?.widgets) {
    tree.widgets = {
      selected: false,
      items: widgets.reduce((acc, widget) => {
        acc[widget.id] = false
        return acc
      }, {} as Record<string, boolean>)
    }
  }

  return tree
}

export function downloadExportFile(jsonData: string): void {
  const blob = new Blob([jsonData], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0]
  const filename = `horizen-backup-v2-${timestamp}.json`

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

export function isEncryptedExportV2(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false
  const d = data as ExportDataV2
  return d.encrypted === true && !!d.encryptedSections
}

export function validateExportDataV2(data: unknown): data is ExportDataV2 {
  if (typeof data !== "object" || data === null) return false

  const d = data as ExportDataV2

  if (typeof d.version !== "string") return false
  if (typeof d.exportedAt !== "string") return false
  if (typeof d.encrypted !== "boolean") return false

  return true
}
