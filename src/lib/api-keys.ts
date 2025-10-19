// Encrypted storage for API keys using password-derived encryption
import { getDerivedKey, isPasswordProtectionEnabled, isSessionUnlocked } from "./password"

const API_KEYS_LS = "startpage:api:keys:encrypted"
const LEGACY_ENCRYPTION_KEY_LS = "startpage:crypto:key"
const LEGACY_API_KEYS_LS_PLAIN = "startpage:api:keys"

export type ApiKeys = {
  openai?: string
  anthropic?: string
  gemini?: string
}

export async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (typeof window === "undefined") {
    throw new Error("Cannot use crypto in non-browser environment")
  }

  if (isPasswordProtectionEnabled()) {
    const derivedKey = getDerivedKey()
    if (!derivedKey) {
      throw new Error("Session locked. Please unlock with your password.")
    }
    return derivedKey
  }

  const storedKey = localStorage.getItem(LEGACY_ENCRYPTION_KEY_LS)

  if (storedKey) {
    try {
      const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0))
      return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )
    } catch {
    }
  }

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )

  const exportedKey = await crypto.subtle.exportKey("raw", key)
  const keyArray = new Uint8Array(exportedKey)
  const keyBase64 = btoa(String.fromCharCode(...keyArray))
  localStorage.setItem(LEGACY_ENCRYPTION_KEY_LS, keyBase64)

  return key
}

async function encryptData(data: string): Promise<string> {
  const key = await getEncryptionKey()
  if (!key) {
    throw new Error("No encryption key available")
  }

  const iv = crypto.getRandomValues(new Uint8Array(12)) // 12 bytes for AES-GCM
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(data)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

async function decryptData(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey()
  if (!key) {
    throw new Error("No encryption key available")
  }

  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

export async function getApiKeys(): Promise<ApiKeys> {
  if (typeof window === "undefined") return {}

  if (isPasswordProtectionEnabled() && !isSessionUnlocked()) {
    throw new Error("Session locked. Please unlock with your password.")
  }

  try {
    const encrypted = localStorage.getItem(API_KEYS_LS)
    if (!encrypted) return {}

    const decrypted = await decryptData(encrypted)
    return JSON.parse(decrypted) as ApiKeys
  } catch (err) {
    if (err instanceof Error && (err.message.includes("Session locked") || err.message.includes("No encryption key"))) {
      throw err
    }

    console.error("Failed to decrypt API keys:", err)
    throw new Error("Failed to decrypt API keys. The encryption key may be incorrect.")
  }
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  if (typeof window === "undefined") return

  if (isPasswordProtectionEnabled() && !isSessionUnlocked()) {
    throw new Error("Session locked. Please unlock with your password.")
  }

  try {
    const json = JSON.stringify(keys)
    const encrypted = await encryptData(json)
    localStorage.setItem(API_KEYS_LS, encrypted)
  } catch (err) {
    console.error("Failed to encrypt and save API keys:", err)
    throw err
  }
}

export async function updateApiKey(provider: "openai" | "anthropic" | "gemini", key: string): Promise<void> {
  const current = await getApiKeys()
  await saveApiKeys({ ...current, [provider]: key })
}

export async function clearApiKey(provider: "openai" | "anthropic" | "gemini"): Promise<void> {
  const current = await getApiKeys()
  delete current[provider]
  await saveApiKeys(current)
}

export async function reencryptApiKeys(oldEncryptionKey?: CryptoKey, newEncryptionKey?: CryptoKey): Promise<void> {
  try {
    const encrypted = localStorage.getItem(API_KEYS_LS)
    if (!encrypted) {
      console.info("No API keys to re-encrypt")
      return
    }

    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const encryptedData = combined.slice(12)

    const decryptKey = oldEncryptionKey || (await getEncryptionKey())
    if (!decryptKey) {
      throw new Error("No decryption key available")
    }

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      decryptKey,
      encryptedData
    )

    const decoder = new TextDecoder()
    const json = decoder.decode(decrypted)
    const keys = JSON.parse(json) as ApiKeys

    if (newEncryptionKey) {
      const newIv = crypto.getRandomValues(new Uint8Array(12))
      const encoder = new TextEncoder()
      const encodedData = encoder.encode(json)

      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: newIv },
        newEncryptionKey,
        encodedData
      )

      const newCombined = new Uint8Array(newIv.length + encrypted.byteLength)
      newCombined.set(newIv, 0)
      newCombined.set(new Uint8Array(encrypted), newIv.length)

      const newEncrypted = btoa(String.fromCharCode(...newCombined))
      localStorage.setItem(API_KEYS_LS, newEncrypted)
    } else {
      await saveApiKeys(keys)
    }

    console.info("Successfully re-encrypted API keys")
  } catch (err) {
    console.error("Failed to re-encrypt API keys:", err)
    throw new Error("Failed to re-encrypt API keys. Your data is safe but encryption switch failed.")
  }
}

export async function migrateFromPlaintext(): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const oldData = localStorage.getItem(LEGACY_API_KEYS_LS_PLAIN)
    if (!oldData) return

    const hasNewData = localStorage.getItem(API_KEYS_LS)
    if (hasNewData) {
      localStorage.removeItem(LEGACY_API_KEYS_LS_PLAIN)
      return
    }

    const oldKeys = JSON.parse(oldData) as ApiKeys

    await saveApiKeys(oldKeys)

    localStorage.removeItem(LEGACY_API_KEYS_LS_PLAIN)

    console.info("Successfully migrated API keys to encrypted storage")
  } catch (err) {
    console.error("Failed to migrate API keys:", err)
  }
}

export async function hasApiKeys(): Promise<boolean> {
  try {
    const keys = await getApiKeys()
    return !!(keys.openai || keys.anthropic || keys.gemini)
  } catch (err) {
    return false
  }
}

export async function getLegacyEncryptionKey(): Promise<CryptoKey | null> {
  const storedKey = localStorage.getItem(LEGACY_ENCRYPTION_KEY_LS)
  if (!storedKey) return null

  try {
    const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0))
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    )
  } catch (err) {
    console.error("Failed to import legacy key:", err)
    return null
  }
}

export function clearLegacyEncryptionKey(): void {
  localStorage.removeItem(LEGACY_ENCRYPTION_KEY_LS)
}
