// Encrypted storage for API keys using SubtleCrypto API
const API_KEYS_LS = "startpage:api:keys:encrypted"
const ENCRYPTION_KEY_LS = "startpage:crypto:key"

export type ApiKeys = {
  openai?: string
  anthropic?: string
}

// Generate or retrieve encryption key from localStorage
async function getEncryptionKey(): Promise<CryptoKey> {
  if (typeof window === "undefined") {
    throw new Error("Cannot use crypto in non-browser environment")
  }

  // Try to retrieve existing key from localStorage
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_LS)

  if (storedKey) {
    try {
      // Import the stored key
      const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0))
      return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )
    } catch {
      // If import fails, generate new key
    }
  }

  // Generate new encryption key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )

  // Store key in localStorage (persists across browser restarts)
  const exportedKey = await crypto.subtle.exportKey("raw", key)
  const keyArray = new Uint8Array(exportedKey)
  const keyBase64 = btoa(String.fromCharCode(...keyArray))
  localStorage.setItem(ENCRYPTION_KEY_LS, keyBase64)

  return key
}

// Encrypt data using AES-GCM
async function encryptData(data: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 12 bytes for AES-GCM
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(data)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  )

  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

// Decrypt data using AES-GCM
async function decryptData(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey()
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  // Extract IV and encrypted data
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

  try {
    const encrypted = localStorage.getItem(API_KEYS_LS)
    if (!encrypted) return {}

    const decrypted = await decryptData(encrypted)
    return JSON.parse(decrypted) as ApiKeys
  } catch (err) {
    console.error("Failed to decrypt API keys:", err)
    // If decryption fails, clear the corrupted data
    localStorage.removeItem(API_KEYS_LS)
    return {}
  }
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const json = JSON.stringify(keys)
    const encrypted = await encryptData(json)
    localStorage.setItem(API_KEYS_LS, encrypted)
  } catch (err) {
    console.error("Failed to encrypt and save API keys:", err)
  }
}

export async function updateApiKey(provider: "openai" | "anthropic", key: string): Promise<void> {
  const current = await getApiKeys()
  await saveApiKeys({ ...current, [provider]: key })
}

export async function clearApiKey(provider: "openai" | "anthropic"): Promise<void> {
  const current = await getApiKeys()
  delete current[provider]
  await saveApiKeys(current)
}

// Legacy migration: convert old plaintext keys to encrypted format
export async function migrateFromPlaintext(): Promise<void> {
  const OLD_LS_KEY = "startpage:api:keys"

  if (typeof window === "undefined") return

  try {
    const oldData = localStorage.getItem(OLD_LS_KEY)
    if (!oldData) return // No old data to migrate

    // Check if new encrypted data already exists
    const hasNewData = localStorage.getItem(API_KEYS_LS)
    if (hasNewData) {
      // Already migrated, just clean up old data
      localStorage.removeItem(OLD_LS_KEY)
      return
    }

    // Parse old plaintext data
    const oldKeys = JSON.parse(oldData) as ApiKeys

    // Save in encrypted format
    await saveApiKeys(oldKeys)

    // Remove old plaintext data
    localStorage.removeItem(OLD_LS_KEY)

    console.info("Successfully migrated API keys to encrypted storage")
  } catch (err) {
    console.error("Failed to migrate API keys:", err)
  }
}
