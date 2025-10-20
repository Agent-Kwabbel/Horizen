const PASSWORD_CONFIG_LS = "startpage:security:config"

export type SecurityConfig = {
  enabled: boolean
  salt: string
  iterations: number
  sessionTimeout: number
}

export type SessionState = {
  unlocked: boolean
  unlockedAt: number
  derivedKey?: CryptoKey
}

let sessionState: SessionState = {
  unlocked: false,
  unlockedAt: 0,
}

export function getSecurityConfig(): SecurityConfig | null {
  try {
    const stored = localStorage.getItem(PASSWORD_CONFIG_LS)
    if (!stored) return null
    return JSON.parse(stored) as SecurityConfig
  } catch (err) {
    console.error("Failed to load security config:", err)
    return null
  }
}

export function saveSecurityConfig(config: SecurityConfig): void {
  try {
    localStorage.setItem(PASSWORD_CONFIG_LS, JSON.stringify(config))
  } catch (err) {
    console.error("Failed to save security config:", err)
  }
}

export function lockSession(): void {
  sessionState = {
    unlocked: false,
    unlockedAt: 0,
    derivedKey: undefined,
  }
}

export function isSessionUnlocked(): boolean {
  const config = getSecurityConfig()

  if (!config || !config.enabled) {
    return true
  }

  if (!sessionState.unlocked || !sessionState.derivedKey) {
    return false
  }

  const elapsed = Date.now() - sessionState.unlockedAt
  const timeoutMs = config.sessionTimeout * 60 * 1000

  if (elapsed > timeoutMs) {
    lockSession()
    return false
  }

  return true
}

export function getDerivedKey(): CryptoKey | null {
  if (!isSessionUnlocked()) {
    return null
  }
  return sessionState.derivedKey || null
}

export function refreshSession(): void {
  if (sessionState.unlocked) {
    sessionState.unlockedAt = Date.now()
  }
}

export function updateSessionState(newState: Partial<SessionState>): void {
  sessionState = { ...sessionState, ...newState }
}

export function getSessionState(): SessionState {
  return { ...sessionState }
}
