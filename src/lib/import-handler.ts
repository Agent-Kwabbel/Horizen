import type { Prefs } from "./prefs"
import type { ExportDataV2, ImportOptions } from "./import-export-v2"
import { saveApiKeys } from "./api-keys"
import { saveShortcuts } from "./shortcuts"

export type ImportResult = {
  success: boolean
  imported: {
    apiKeys?: { count: number; items: string[] }
    chats?: { count: number; mode?: "append" | "replace" }
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

export async function importDataV2(
  exportData: ExportDataV2,
  currentPrefs: Prefs,
  options: ImportOptions,
  password?: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: {},
    failed: {},
    errors: [],
  }

  const { selection, mergeStrategies } = options

  // Decrypt sections if needed
  if (exportData.encrypted && exportData.encryptedSections && password) {
    // Decrypt will be handled by import dialog before calling this
    // For now, assume data is already decrypted in contents
  }

  // Import API Keys
  if (selection.apiKeys?.selected && exportData.contents?.apiKeys) {
    try {
      const keysToImport: any = {}
      const importedKeys: string[] = []

      if (selection.apiKeys.items.openai && exportData.contents.apiKeys.openai) {
        keysToImport.openai = exportData.contents.apiKeys.openai
        importedKeys.push("OpenAI")
      }

      if (selection.apiKeys.items.anthropic && exportData.contents.apiKeys.anthropic) {
        keysToImport.anthropic = exportData.contents.apiKeys.anthropic
        importedKeys.push("Anthropic")
      }

      if (selection.apiKeys.items.gemini && exportData.contents.apiKeys.gemini) {
        keysToImport.gemini = exportData.contents.apiKeys.gemini
        importedKeys.push("Google Gemini")
      }

      if (Object.keys(keysToImport).length > 0) {
        await saveApiKeys(keysToImport)
        result.imported.apiKeys = {
          count: importedKeys.length,
          items: importedKeys,
        }
      }
    } catch (err) {
      result.failed.apiKeys = ["Failed to import API keys"]
      result.errors.push(`API Keys: ${err instanceof Error ? err.message : "Unknown error"}`)
      result.success = false
    }
  }

  // Import Chats
  if (selection.chats?.selected && exportData.contents?.chats) {
    try {
      const selectedChats = exportData.contents.chats.filter(
        (chat) => selection.chats!.items[chat.id] === true
      )

      if (selectedChats.length > 0) {
        let newConversations = [...currentPrefs.conversations]

        if (mergeStrategies.chats === "replace") {
          newConversations = selectedChats
        } else {
          // Append mode (default)
          // Check for ID conflicts and regenerate IDs if needed
          const existingIds = new Set(currentPrefs.conversations.map(c => c.id))
          const chatsToAppend = selectedChats.map(chat => {
            if (existingIds.has(chat.id)) {
              // Generate new ID
              return {
                ...chat,
                id: `${chat.id}-imported-${Date.now()}`,
              }
            }
            return chat
          })
          newConversations = [...newConversations, ...chatsToAppend]
        }

        // This will be applied by the caller
        if (!result.imported.chats) {
          result.imported.chats = {
            count: selectedChats.length,
            mode: mergeStrategies.chats || "append",
          }
        }

        // Store for caller to apply
        (result as any).newConversations = newConversations
      }
    } catch (err) {
      result.failed.chats = {
        count: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      }
      result.errors.push(`Chats: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  // Import Settings
  if (selection.settings?.selected && exportData.contents?.settings) {
    const importedSettings: string[] = []
    const failedSettings: Record<string, string> = {}

    // Search Engine
    if (selection.settings.items.searchEngine && exportData.contents.settings.searchEngine) {
      try {
        (result as any).searchEngine = exportData.contents.settings.searchEngine
        importedSettings.push("Search Engine")
      } catch (err) {
        failedSettings["Search Engine"] = err instanceof Error ? err.message : "Unknown error"
      }
    }

    // Quick Links
    if (selection.settings.items.quickLinks && exportData.contents.settings.quickLinks) {
      try {
        const strategy = mergeStrategies.quickLinks || "merge"
        if (strategy === "replace") {
          (result as any).quickLinks = exportData.contents.settings.quickLinks
        } else {
          // Merge - combine both
          const existingIds = new Set(currentPrefs.links.map(l => l.id))
          const allImportedLinks: any[] = exportData.contents.settings.quickLinks || []
          const newLinksToAdd: any[] = []
          for (const link of allImportedLinks) {
            if (!existingIds.has(link.id)) {
              newLinksToAdd.push(link)
            }
          }
          (result as any).quickLinks = [...currentPrefs.links, ...newLinksToAdd]
        }
        importedSettings.push("Quick Links")
      } catch (err) {
        failedSettings["Quick Links"] = err instanceof Error ? err.message : "Unknown error"
      }
    }

    // Keyboard Shortcuts
    if (selection.settings.items.keyboardShortcuts && exportData.contents.settings.keyboardShortcuts) {
      try {
        saveShortcuts(exportData.contents.settings.keyboardShortcuts)
        importedSettings.push("Keyboard Shortcuts")
      } catch (err) {
        failedSettings["Keyboard Shortcuts"] = err instanceof Error ? err.message : "Unknown error"
      }
    }

    // Chat Preferences
    if (selection.settings.items.chatPreferences && exportData.contents.settings.chatPreferences) {
      try {
        (result as any).chatPreferences = exportData.contents.settings.chatPreferences
        importedSettings.push("Chat Preferences")
      } catch (err) {
        failedSettings["Chat Preferences"] = err instanceof Error ? err.message : "Unknown error"
      }
    }

    if (importedSettings.length > 0) {
      result.imported.settings = { items: importedSettings }
    }

    if (Object.keys(failedSettings).length > 0) {
      result.failed.settings = {
        items: Object.keys(failedSettings),
        errors: failedSettings,
      }
      result.errors.push(...Object.entries(failedSettings).map(([k, v]) => `${k}: ${v}`))
    }
  }

  // Import Widgets
  if (selection.widgets?.selected && exportData.contents?.widgets) {
    const importedWidgets: string[] = []
    const failedWidgets: Record<string, string> = {}

    const selectedWidgets = exportData.contents.widgets.filter(
      w => selection.widgets!.items[w.id]
    )

    for (const widget of selectedWidgets) {
      try {
        const strategy = mergeStrategies.widgets || "merge"

        if (strategy === "replace") {
          // Replace existing widget with same type
          const existingIndex = currentPrefs.widgets.findIndex(w => w.type === widget.type)
          if (existingIndex >= 0) {
            (result as any).widgetsToReplace = (result as any).widgetsToReplace || []
            ;(result as any).widgetsToReplace.push({ index: existingIndex, widget })
          } else {
            (result as any).widgetsToAdd = (result as any).widgetsToAdd || []
            ;(result as any).widgetsToAdd.push(widget)
          }
        } else {
          // Merge mode - update if exists, add if not
          (result as any).widgetsToMerge = (result as any).widgetsToMerge || []
          ;(result as any).widgetsToMerge.push(widget)
        }

        // Store widget data to localStorage
        if (widget.data) {
          if (widget.type === "notes" && widget.data.notes) {
            localStorage.setItem(`notes:${widget.id}`, widget.data.notes)
          }
          if (widget.type === "weather" && widget.data.location) {
            localStorage.setItem("wx:location", JSON.stringify(widget.data.location))
          }
        }

        importedWidgets.push(widget.type)
      } catch (err) {
        failedWidgets[widget.type] = err instanceof Error ? err.message : "Unknown error"
      }
    }

    if (importedWidgets.length > 0) {
      result.imported.widgets = {
        count: importedWidgets.length,
        items: importedWidgets,
      }
    }

    if (Object.keys(failedWidgets).length > 0) {
      result.failed.widgets = {
        items: Object.keys(failedWidgets),
        errors: failedWidgets,
      }
      result.errors.push(...Object.entries(failedWidgets).map(([k, v]) => `${k}: ${v}`))
    }
  }

  return result
}

export function createBackup(prefs: Prefs): string {
  const backup = {
    timestamp: Date.now(),
    prefs: JSON.stringify(prefs),
  }
  const backupKey = `horizen:backup:${backup.timestamp}`
  localStorage.setItem(backupKey, JSON.stringify(backup))

  // Keep only last 5 backups
  const allBackups = Object.keys(localStorage)
    .filter(key => key.startsWith("horizen:backup:"))
    .sort()
    .reverse()

  if (allBackups.length > 5) {
    allBackups.slice(5).forEach(key => localStorage.removeItem(key))
  }

  return backupKey
}

export function restoreBackup(backupKey: string): Prefs | null {
  const backupData = localStorage.getItem(backupKey)
  if (!backupData) return null

  try {
    const backup = JSON.parse(backupData)
    return JSON.parse(backup.prefs) as Prefs
  } catch {
    return null
  }
}

export function getRecentBackups(): Array<{ key: string; timestamp: number }> {
  return Object.keys(localStorage)
    .filter(key => key.startsWith("horizen:backup:"))
    .map(key => ({
      key,
      timestamp: parseInt(key.split(":")[2]),
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
}
