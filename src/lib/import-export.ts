import type { Prefs, ChatConversation } from "./prefs"
import { getApiKeys } from "./api-keys"
import { getShortcuts } from "./shortcuts"
import type { ShortcutBinding } from "./shortcuts"
import { deriveKeyFromPassword } from "./password"

export type ExportOptions = {
  includePreferences: boolean
  includeApiKeys: boolean
  includeChats: boolean
}

export type WeatherLocation = {
  name: string
  lat: number
  lon: number
  country?: string
  state?: string
}

export type ExportData = {
  version: string // For future compatibility
  timestamp: number
  encrypted?: boolean // Indicates if this export is password-encrypted
  salt?: string // Salt for password encryption (base64)
  iv?: string // IV for AES-GCM encryption (base64)
  data?: string // Encrypted data (base64)
  preferences?: Partial<Prefs>
  apiKeys?: {
    openai?: string
    anthropic?: string
  }
  conversations?: ChatConversation[]
  weatherLocation?: WeatherLocation
  shortcuts?: ShortcutBinding[]
}

export type ImportMode = "add" | "replace"

async function encryptExportData(jsonData: string, password: string): Promise<ExportData> {
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const saltBase64 = btoa(String.fromCharCode(...salt))

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

  return {
    version: "1.0.0",
    timestamp: Date.now(),
    encrypted: true,
    salt: saltBase64,
    iv: ivBase64,
    data: encryptedBase64,
  }
}

async function decryptExportData(exportData: ExportData, password: string): Promise<ExportData> {
  if (!exportData.encrypted || !exportData.salt || !exportData.iv || !exportData.data) {
    throw new Error("Invalid encrypted export data")
  }

  const salt = Uint8Array.from(atob(exportData.salt), c => c.charCodeAt(0))
  const iv = Uint8Array.from(atob(exportData.iv), c => c.charCodeAt(0))

  const key = await deriveKeyFromPassword(password, salt, 600000)

  const encryptedData = Uint8Array.from(atob(exportData.data), c => c.charCodeAt(0))

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    )

    const decoder = new TextDecoder()
    const jsonData = decoder.decode(decrypted)

    return JSON.parse(jsonData) as ExportData
  } catch (err) {
    throw new Error("Incorrect password or corrupted data")
  }
}

export async function exportData(
  prefs: Prefs,
  options: ExportOptions,
  password?: string
): Promise<string> {
  const data: ExportData = {
    version: "1.0.0",
    timestamp: Date.now(),
  }

  if (options.includePreferences) {
    const { conversations, ...prefsWithoutConversations } = prefs
    data.preferences = prefsWithoutConversations

    const weatherLocationStr = localStorage.getItem("wx:location")
    if (weatherLocationStr) {
      try {
        data.weatherLocation = JSON.parse(weatherLocationStr)
      } catch (err) {
        console.error("Failed to parse weather location:", err)
      }
    }

    data.shortcuts = getShortcuts()
  }

  if (options.includeApiKeys) {
    data.apiKeys = await getApiKeys()
  }

  if (options.includeChats) {
    data.conversations = prefs.conversations.filter((c) => !c.isGhostMode)
  }

  const jsonData = JSON.stringify(data, null, 2)

  if (password) {
    const encryptedData = await encryptExportData(jsonData, password)
    return JSON.stringify(encryptedData, null, 2)
  }

  return jsonData
}

export function downloadExportFile(jsonData: string): void {
  const blob = new Blob([jsonData], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0]
  const filename = `horizen-backup-${timestamp}.json`

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

export function validateImportData(data: unknown): data is ExportData {
  if (typeof data !== "object" || data === null) return false

  const d = data as ExportData

  if (typeof d.version !== "string" || typeof d.timestamp !== "number") {
    return false
  }

  if (d.preferences !== undefined && typeof d.preferences !== "object") {
    return false
  }

  if (d.apiKeys !== undefined) {
    if (typeof d.apiKeys !== "object") return false
    const keys = d.apiKeys as Record<string, unknown>
    if (
      keys.openai !== undefined &&
      typeof keys.openai !== "string"
    ) {
      return false
    }
    if (
      keys.anthropic !== undefined &&
      typeof keys.anthropic !== "string"
    ) {
      return false
    }
  }

  if (d.conversations !== undefined) {
    if (!Array.isArray(d.conversations)) return false
    for (const conv of d.conversations) {
      if (
        typeof conv.id !== "string" ||
        typeof conv.title !== "string" ||
        !Array.isArray(conv.messages)
      ) {
        return false
      }
    }
  }

  if (d.weatherLocation !== undefined) {
    if (typeof d.weatherLocation !== "object") return false
    const loc = d.weatherLocation as Record<string, unknown>
    if (
      typeof loc.name !== "string" ||
      typeof loc.lat !== "number" ||
      typeof loc.lon !== "number"
    ) {
      return false
    }
  }

  if (d.shortcuts !== undefined) {
    if (!Array.isArray(d.shortcuts)) return false
  }

  return true
}

export async function parseImportFile(file: File, password?: string): Promise<ExportData> {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!validateImportData(data)) {
    throw new Error("Invalid import file format")
  }

  if (data.encrypted) {
    if (!password) {
      throw new Error("This backup is password-protected. Please provide the password.")
    }
    return await decryptExportData(data, password)
  }

  return data
}

export function isEncryptedExport(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false
  const d = data as ExportData
  return d.encrypted === true
}

export { decryptExportData }
