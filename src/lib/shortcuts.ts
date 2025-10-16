// Keyboard shortcuts management

export type ShortcutAction =
  | "openChat"
  | "openSettings"
  | "openShortcuts"
  | "focusSearch"
  | "toggleWeather"
  | "newChat"
  | "focusChatPrompt"
  | "uploadFile"
  | "escape"

export type ShortcutKey = {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

export type ShortcutBinding = {
  action: ShortcutAction
  key: ShortcutKey
  description: string
  category: "navigation" | "chat" | "interface"
}

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  // Navigation
  {
    action: "focusSearch",
    key: { key: "/" },
    description: "Focus search bar",
    category: "navigation",
  },
  {
    action: "escape",
    key: { key: "Escape" },
    description: "Close dialogs/unfocus",
    category: "navigation",
  },
  // Chat
  {
    action: "openChat",
    key: { key: "k", ctrlKey: true },
    description: "Toggle chat sidebar",
    category: "chat",
  },
  {
    action: "newChat",
    key: { key: "n", ctrlKey: true, shiftKey: true },
    description: "Start new chat",
    category: "chat",
  },
  {
    action: "focusChatPrompt",
    key: { key: "i", ctrlKey: true },
    description: "Focus chat message input",
    category: "chat",
  },
  {
    action: "uploadFile",
    key: { key: "u", ctrlKey: true },
    description: "Upload file to chat",
    category: "chat",
  },
  // Interface
  {
    action: "openSettings",
    key: { key: ",", ctrlKey: true },
    description: "Open settings",
    category: "interface",
  },
  {
    action: "openShortcuts",
    key: { key: "/", ctrlKey: true },
    description: "Open shortcuts settings",
    category: "interface",
  },
  {
    action: "toggleWeather",
    key: { key: "w", ctrlKey: true },
    description: "Toggle weather widget",
    category: "interface",
  },
]

const SHORTCUTS_KEY = "startpage:shortcuts"

// Load shortcuts from localStorage or use defaults
export function getShortcuts(): ShortcutBinding[] {
  try {
    const stored = localStorage.getItem(SHORTCUTS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ShortcutBinding[]
      // Validate that all default actions exist
      const actionSet = new Set(parsed.map((s) => s.action))
      const missingActions = DEFAULT_SHORTCUTS.filter((d) => !actionSet.has(d.action))
      if (missingActions.length > 0) {
        // Merge missing actions
        return [...parsed, ...missingActions]
      }
      return parsed
    }
  } catch (err) {
    console.error("Failed to load shortcuts:", err)
  }
  return DEFAULT_SHORTCUTS
}

// Save shortcuts to localStorage
export function saveShortcuts(shortcuts: ShortcutBinding[]): void {
  try {
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts))
  } catch (err) {
    console.error("Failed to save shortcuts:", err)
  }
}

// Reset shortcuts to defaults
export function resetShortcuts(): void {
  localStorage.removeItem(SHORTCUTS_KEY)
}

// Check if a keyboard event matches a shortcut key
export function matchesShortcut(event: KeyboardEvent, shortcutKey: ShortcutKey): boolean {
  const keyMatches = event.key.toLowerCase() === shortcutKey.key.toLowerCase()
  const ctrlMatches = !!event.ctrlKey === !!shortcutKey.ctrlKey
  const metaMatches = !!event.metaKey === !!shortcutKey.metaKey
  const altMatches = !!event.altKey === !!shortcutKey.altKey
  const shiftMatches = !!event.shiftKey === !!shortcutKey.shiftKey

  return keyMatches && ctrlMatches && metaMatches && altMatches && shiftMatches
}

// Format shortcut key for display
export function formatShortcutKey(key: ShortcutKey): string {
  const parts: string[] = []
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

  if (key.ctrlKey && !isMac) parts.push("Ctrl")
  if (key.metaKey || (key.ctrlKey && isMac)) parts.push("⌘")
  if (key.altKey) parts.push(isMac ? "⌥" : "Alt")
  if (key.shiftKey) parts.push(isMac ? "⇧" : "Shift")

  // Format the main key
  let mainKey = key.key
  if (mainKey === " ") mainKey = "Space"
  else if (mainKey === "Escape") mainKey = "Esc"
  else if (mainKey.length === 1) mainKey = mainKey.toUpperCase()

  parts.push(mainKey)

  return parts.join(isMac ? "" : "+")
}

// Get action label
export function getActionLabel(action: ShortcutAction): string {
  const labels: Record<ShortcutAction, string> = {
    openChat: "Toggle Chat",
    openSettings: "Open Settings",
    openShortcuts: "Keyboard Shortcuts",
    focusSearch: "Focus Search",
    toggleWeather: "Toggle Weather",
    newChat: "New Chat",
    focusChatPrompt: "Focus Chat Input",
    uploadFile: "Upload File",
    escape: "Close/Unfocus",
  }
  return labels[action]
}
