import { generateSalt, deriveKeyFromPassword } from "./password-crypto"
import { getSecurityConfig, saveSecurityConfig, updateSessionState, getSessionState } from "./password-session"
import type { SecurityConfig } from "./password-session"

export async function setupPassword(password: string): Promise<void> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  const salt = generateSalt()
  const saltBase64 = btoa(String.fromCharCode(...salt))

  const config: SecurityConfig = {
    enabled: true,
    salt: saltBase64,
    iterations: 600000,
    sessionTimeout: 30,
  }

  saveSecurityConfig(config)

  const key = await deriveKeyFromPassword(password, salt, config.iterations)

  const verificationText = "password_verification_token"
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(verificationText)
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  const verificationBase64 = btoa(String.fromCharCode(...combined))
  localStorage.setItem("startpage:security:verification", verificationBase64)

  updateSessionState({
    unlocked: true,
    unlockedAt: Date.now(),
    derivedKey: key,
  })
}

export async function unlockWithPassword(password: string): Promise<boolean> {
  const config = getSecurityConfig()
  if (!config || !config.enabled) {
    return false
  }

  try {
    const salt = Uint8Array.from(atob(config.salt), c => c.charCodeAt(0))
    const key = await deriveKeyFromPassword(password, salt, config.iterations)

    const tempSession = getSessionState()
    updateSessionState({
      unlocked: true,
      unlockedAt: Date.now(),
      derivedKey: key,
    })

    try {
      const encrypted = localStorage.getItem("startpage:api:keys:encrypted")
      if (encrypted) {
        const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
        const iv = combined.slice(0, 12)
        const encryptedData = combined.slice(12)

        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          encryptedData
        )
      } else {
        const verificationData = localStorage.getItem("startpage:security:verification")
        if (verificationData) {
          const combined = Uint8Array.from(atob(verificationData), c => c.charCodeAt(0))
          const iv = combined.slice(0, 12)
          const encryptedData = combined.slice(12)

          await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedData
          )
        } else {
          updateSessionState(tempSession)
          return false
        }
      }

      return true
    } catch (decryptErr) {
      updateSessionState(tempSession)
      return false
    }
  } catch (err) {
    console.error("Unlock failed:", err)
    return false
  }
}

export async function disablePasswordProtection(): Promise<void> {
  let config = getSecurityConfig()

  if (!config) {
    const salt = generateSalt()
    const saltBase64 = btoa(String.fromCharCode(...salt))
    config = {
      enabled: false,
      salt: saltBase64,
      iterations: 600000,
      sessionTimeout: 30,
    }
  } else {
    config.enabled = false
  }

  saveSecurityConfig(config)

  updateSessionState({
    unlocked: true,
    unlockedAt: Date.now(),
  })
}

export async function enablePasswordProtection(password: string): Promise<void> {
  await setupPassword(password)
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const verified = await unlockWithPassword(oldPassword)
  if (!verified) {
    return false
  }

  await setupPassword(newPassword)
  return true
}

export function isPasswordProtectionEnabled(): boolean {
  const config = getSecurityConfig()
  return config !== null && config.enabled
}

export function validatePassword(password: string): { valid: boolean; message?: string; isStrong?: boolean } {
  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters", isStrong: false }
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  const isStrong = password.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial

  if (isStrong) {
    return { valid: true, message: "Strong password", isStrong: true }
  }

  const missing: string[] = []

  if (password.length < 8) {
    missing.push("8+ characters")
  }
  if (!hasUpper) {
    missing.push("uppercase letter")
  }
  if (!hasLower) {
    missing.push("lowercase letter")
  }
  if (!hasNumber) {
    missing.push("number")
  }
  if (!hasSpecial) {
    missing.push("special symbol")
  }

  if (missing.length > 0) {
    return {
      valid: true,
      message: `Weak password. For strong security, add: ${missing.join(", ")}`,
      isStrong: false
    }
  }

  return { valid: true, isStrong: false }
}
