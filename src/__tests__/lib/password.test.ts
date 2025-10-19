import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setupPassword,
  unlockWithPassword,
  lockSession,
  isSessionUnlocked,
  isPasswordProtectionEnabled,
  getSecurityConfig,
  validatePassword,
  disablePasswordProtection,
  getDerivedKey,
  refreshSession,
  changePassword,
} from '@/lib/password'

describe('password module', () => {
  beforeEach(() => {
    localStorage.clear()
    lockSession()
    vi.clearAllMocks()
  })

  describe('validatePassword', () => {
    it('should reject passwords shorter than 6 characters', () => {
      const result = validatePassword('12345')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('at least 6 characters')
    })

    it('should warn about weak passwords (6-7 characters)', () => {
      const result = validatePassword('123456')
      expect(result.valid).toBe(true)
      expect(result.message?.toLowerCase()).toContain('weak')
    })

    it('should accept passwords with 8+ characters', () => {
      const result = validatePassword('12345678')
      expect(result.valid).toBe(true)
    })

    it('should suggest complexity improvements for simple passwords', () => {
      const result = validatePassword('12345678')
      expect(result.valid).toBe(true)
      expect(result.message).toContain('uppercase')
    })

    it('should accept strong passwords with positive feedback', () => {
      const result = validatePassword('MyP@ssw0rd')
      expect(result.valid).toBe(true)
      expect(result.message).toBe('Strong password')
      expect(result.isStrong).toBe(true)
    })
  })

  describe('setupPassword', () => {
    it('should reject passwords shorter than 6 characters', async () => {
      await expect(setupPassword('12345')).rejects.toThrow('at least 6 characters')
    })

    it('should create security config in localStorage', async () => {
      await setupPassword('testpassword123')

      const config = getSecurityConfig()
      expect(config).toBeTruthy()
      expect(config?.enabled).toBe(true)
      expect(config?.salt).toBeTruthy()
      expect(config?.iterations).toBe(600000)
      expect(config?.sessionTimeout).toBe(30)
    })

    it('should unlock session after setup', async () => {
      await setupPassword('testpassword123')

      expect(isSessionUnlocked()).toBe(true)
      expect(getDerivedKey()).toBeTruthy()
    })

    it('should enable password protection', async () => {
      expect(isPasswordProtectionEnabled()).toBe(false)

      await setupPassword('testpassword123')

      expect(isPasswordProtectionEnabled()).toBe(true)
    })
  })

  describe('unlockWithPassword', () => {
    beforeEach(async () => {
      // Setup a password first
      await setupPassword('testpassword123')
      lockSession()
    })

    it('should unlock with correct password', async () => {
      const result = await unlockWithPassword('testpassword123')

      expect(result).toBe(true)
      expect(isSessionUnlocked()).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const result = await unlockWithPassword('wrongpassword')

      expect(result).toBe(false)
      expect(isSessionUnlocked()).toBe(false)
    })

    it('should return false when password protection is not enabled', async () => {
      await disablePasswordProtection()

      const result = await unlockWithPassword('anypassword')

      expect(result).toBe(false)
    })

    it('should provide derived key after successful unlock', async () => {
      await unlockWithPassword('testpassword123')

      const key = getDerivedKey()
      expect(key).toBeTruthy()
      expect(key).toBeInstanceOf(CryptoKey)
    })
  })

  describe('lockSession', () => {
    it('should lock an unlocked session', async () => {
      await setupPassword('testpassword123')
      expect(isSessionUnlocked()).toBe(true)

      lockSession()

      expect(isSessionUnlocked()).toBe(false)
      expect(getDerivedKey()).toBeNull()
    })

    it('should clear derived key from memory', async () => {
      await setupPassword('testpassword123')
      expect(getDerivedKey()).toBeTruthy()

      lockSession()

      expect(getDerivedKey()).toBeNull()
    })
  })

  describe('isSessionUnlocked', () => {
    it('should return true when protection is disabled', async () => {
      await disablePasswordProtection()

      expect(isSessionUnlocked()).toBe(true)
    })

    it('should return false when session is locked', async () => {
      await setupPassword('testpassword123')
      lockSession()

      expect(isSessionUnlocked()).toBe(false)
    })

    it('should return true when session is unlocked', async () => {
      await setupPassword('testpassword123')

      expect(isSessionUnlocked()).toBe(true)
    })

    it('should auto-lock after session timeout', async () => {
      await setupPassword('testpassword123')

      // Manually set session timestamp to simulate timeout
      const config = getSecurityConfig()
      if (config) {
        // Mock Date.now to simulate 31 minutes passing
        const now = Date.now()
        const futureTime = now + (31 * 60 * 1000) // 31 minutes

        vi.spyOn(Date, 'now').mockReturnValue(futureTime)

        expect(isSessionUnlocked()).toBe(false)

        vi.restoreAllMocks()
      }
    })
  })

  describe('refreshSession', () => {
    it('should update session timestamp', async () => {
      await setupPassword('testpassword123')

      const initialTime = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(initialTime + 1000)

      refreshSession()

      expect(isSessionUnlocked()).toBe(true)

      vi.restoreAllMocks()
    })

    it('should not refresh locked session', async () => {
      await setupPassword('testpassword123')
      lockSession()

      refreshSession()

      expect(isSessionUnlocked()).toBe(false)
    })
  })

  describe('disablePasswordProtection', () => {
    it('should disable password protection', async () => {
      await setupPassword('testpassword123')
      expect(isPasswordProtectionEnabled()).toBe(true)

      await disablePasswordProtection()

      expect(isPasswordProtectionEnabled()).toBe(false)
    })

    it('should unlock session when disabled', async () => {
      await setupPassword('testpassword123')
      lockSession()

      await disablePasswordProtection()

      expect(isSessionUnlocked()).toBe(true)
    })

    it('should create config on first-time opt-out', async () => {
      expect(getSecurityConfig()).toBeNull()

      await disablePasswordProtection()

      const config = getSecurityConfig()
      expect(config).toBeTruthy()
      expect(config?.enabled).toBe(false)
    })
  })

  describe('changePassword', () => {
    beforeEach(async () => {
      await setupPassword('oldpassword123')
    })

    it('should change password with correct old password', async () => {
      const result = await changePassword('oldpassword123', 'newpassword123')

      expect(result).toBe(true)

      // Lock and try to unlock with new password
      lockSession()
      const unlocked = await unlockWithPassword('newpassword123')
      expect(unlocked).toBe(true)
    })

    it('should reject change with incorrect old password', async () => {
      const result = await changePassword('wrongpassword', 'newpassword123')

      expect(result).toBe(false)
    })

    it('should reject new password shorter than 6 characters', async () => {
      await expect(
        changePassword('oldpassword123', '12345')
      ).rejects.toThrow('at least 6 characters')
    })

    it('should invalidate old password after change', async () => {
      await changePassword('oldpassword123', 'newpassword123')

      lockSession()
      const unlockedWithOld = await unlockWithPassword('oldpassword123')
      expect(unlockedWithOld).toBe(false)
    })
  })

  describe('isPasswordProtectionEnabled', () => {
    it('should return false when no config exists', () => {
      expect(isPasswordProtectionEnabled()).toBe(false)
    })

    it('should return true when enabled', async () => {
      await setupPassword('testpassword123')

      expect(isPasswordProtectionEnabled()).toBe(true)
    })

    it('should return false when disabled', async () => {
      await setupPassword('testpassword123')
      await disablePasswordProtection()

      expect(isPasswordProtectionEnabled()).toBe(false)
    })
  })

  describe('getDerivedKey', () => {
    it('should return null when session is locked', async () => {
      await setupPassword('testpassword123')
      lockSession()

      expect(getDerivedKey()).toBeNull()
    })

    it('should return key when session is unlocked', async () => {
      await setupPassword('testpassword123')

      const key = getDerivedKey()
      expect(key).toBeTruthy()
      expect(key).toBeInstanceOf(CryptoKey)
    })

    it('should return null when protection is disabled', async () => {
      await disablePasswordProtection()

      expect(getDerivedKey()).toBeNull()
    })
  })

  describe('getSecurityConfig', () => {
    it('should return null when no config exists', () => {
      expect(getSecurityConfig()).toBeNull()
    })

    it('should return config after setup', async () => {
      await setupPassword('testpassword123')

      const config = getSecurityConfig()
      expect(config).toBeTruthy()
      expect(config?.enabled).toBe(true)
    })

    it('should handle corrupted config gracefully', () => {
      localStorage.setItem('startpage:security:config', 'invalid json')

      expect(getSecurityConfig()).toBeNull()
    })
  })

  describe('security edge cases', () => {
    it('should handle rapid lock/unlock cycles', async () => {
      await setupPassword('testpassword123')

      for (let i = 0; i < 10; i++) {
        lockSession()
        await unlockWithPassword('testpassword123')
      }

      expect(isSessionUnlocked()).toBe(true)
    })

    it('should maintain separate configs for different passwords', async () => {
      await setupPassword('password1')
      const config1 = getSecurityConfig()

      lockSession()
      await changePassword('password1', 'password2')
      const config2 = getSecurityConfig()

      // Configs should be different (different salt)
      expect(config1?.salt).not.toBe(config2?.salt)
    })

    it('should not leak password in memory after setup', async () => {
      const password = 'secretpassword123'
      await setupPassword(password)

      // The password itself should not be stored anywhere
      const config = getSecurityConfig()
      expect(JSON.stringify(config)).not.toContain(password)
    })
  })
})
