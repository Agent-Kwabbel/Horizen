export { generateSalt, deriveKeyFromPassword } from "@/features/security/services/password-crypto"

export {
  type SecurityConfig,
  type SessionState,
  getSecurityConfig,
  saveSecurityConfig,
  lockSession,
  isSessionUnlocked,
  getDerivedKey,
  refreshSession,
} from "@/features/security/services/password-session"

export {
  setupPassword,
  unlockWithPassword,
  disablePasswordProtection,
  enablePasswordProtection,
  changePassword,
  isPasswordProtectionEnabled,
  validatePassword,
} from "@/features/security/services/password-auth"
