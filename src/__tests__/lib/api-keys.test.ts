import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getApiKeys,
  saveApiKeys,
  updateApiKey,
  clearApiKey,
  reencryptApiKeys,
  hasApiKeys,
  getLegacyEncryptionKey,
  clearLegacyEncryptionKey,
  migrateFromPlaintext,
  type ApiKeys,
} from '@/lib/api-keys'
import {
  setupPassword,
  lockSession,
  unlockWithPassword,
  disablePasswordProtection,
  getDerivedKey,
  isPasswordProtectionEnabled,
} from '@/lib/password'

describe('api-keys module', () => {
  beforeEach(() => {
    localStorage.clear()
    lockSession()
    vi.clearAllMocks()
  })

  describe('saveApiKeys and getApiKeys (no password)', () => {
    beforeEach(async () => {
      await disablePasswordProtection()
    })

    it('should save and retrieve API keys', async () => {
      const keys: ApiKeys = {
        openai: 'sk-test-openai-key',
        anthropic: 'sk-ant-test-anthropic-key',
      }

      await saveApiKeys(keys)
      const retrieved = await getApiKeys()

      expect(retrieved).toEqual(keys)
    })

    it('should encrypt API keys in localStorage', async () => {
      const keys: ApiKeys = {
        openai: 'sk-secret-key',
      }

      await saveApiKeys(keys)

      const stored = localStorage.getItem('startpage:api:keys:encrypted')
      expect(stored).toBeTruthy()
      expect(stored).not.toContain('sk-secret-key')
    })

    it('should return empty object when no keys exist', async () => {
      const keys = await getApiKeys()
      expect(keys).toEqual({})
    })

    it('should overwrite existing keys', async () => {
      await saveApiKeys({ openai: 'old-key' })
      await saveApiKeys({ openai: 'new-key' })

      const keys = await getApiKeys()
      expect(keys.openai).toBe('new-key')
    })
  })

  describe('saveApiKeys and getApiKeys (with password)', () => {
    beforeEach(async () => {
      await setupPassword('testpassword123')
    })

    it('should save and retrieve API keys with password protection', async () => {
      const keys: ApiKeys = {
        openai: 'sk-test-openai-key',
        anthropic: 'sk-ant-test-anthropic-key',
      }

      await saveApiKeys(keys)
      const retrieved = await getApiKeys()

      expect(retrieved).toEqual(keys)
    })

    it('should throw error when session is locked', async () => {
      lockSession()

      await expect(getApiKeys()).rejects.toThrow('Session locked')
    })

    it('should throw error when saving with locked session', async () => {
      lockSession()

      await expect(saveApiKeys({ openai: 'test' })).rejects.toThrow('Session locked')
    })

    it('should allow access after unlocking', async () => {
      const keys: ApiKeys = { openai: 'test-key' }
      await saveApiKeys(keys)

      lockSession()
      await unlockWithPassword('testpassword123')

      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(keys)
    })
  })

  describe('updateApiKey', () => {
    beforeEach(async () => {
      await disablePasswordProtection()
    })

    it('should update OpenAI key', async () => {
      await saveApiKeys({ anthropic: 'existing-key' })
      await updateApiKey('openai', 'new-openai-key')

      const keys = await getApiKeys()
      expect(keys.openai).toBe('new-openai-key')
      expect(keys.anthropic).toBe('existing-key')
    })

    it('should update Anthropic key', async () => {
      await saveApiKeys({ openai: 'existing-key' })
      await updateApiKey('anthropic', 'new-anthropic-key')

      const keys = await getApiKeys()
      expect(keys.anthropic).toBe('new-anthropic-key')
      expect(keys.openai).toBe('existing-key')
    })

    it('should overwrite existing key', async () => {
      await saveApiKeys({ openai: 'old-key' })
      await updateApiKey('openai', 'new-key')

      const keys = await getApiKeys()
      expect(keys.openai).toBe('new-key')
    })
  })

  describe('clearApiKey', () => {
    beforeEach(async () => {
      await disablePasswordProtection()
      await saveApiKeys({
        openai: 'openai-key',
        anthropic: 'anthropic-key',
      })
    })

    it('should clear OpenAI key', async () => {
      await clearApiKey('openai')

      const keys = await getApiKeys()
      expect(keys.openai).toBeUndefined()
      expect(keys.anthropic).toBe('anthropic-key')
    })

    it('should clear Anthropic key', async () => {
      await clearApiKey('anthropic')

      const keys = await getApiKeys()
      expect(keys.anthropic).toBeUndefined()
      expect(keys.openai).toBe('openai-key')
    })
  })

  describe('hasApiKeys', () => {
    beforeEach(async () => {
      await disablePasswordProtection()
    })

    it('should return false when no keys exist', async () => {
      expect(await hasApiKeys()).toBe(false)
    })

    it('should return true when OpenAI key exists', async () => {
      await saveApiKeys({ openai: 'test-key' })
      expect(await hasApiKeys()).toBe(true)
    })

    it('should return true when Anthropic key exists', async () => {
      await saveApiKeys({ anthropic: 'test-key' })
      expect(await hasApiKeys()).toBe(true)
    })

    it('should return false when session is locked', async () => {
      await setupPassword('testpassword123')
      await saveApiKeys({ openai: 'test-key' })
      lockSession()

      expect(await hasApiKeys()).toBe(false)
    })
  })

  describe('reencryptApiKeys', () => {
    it('should re-encrypt from legacy to password-based', async () => {
      // Setup with legacy (no password)
      await disablePasswordProtection()
      const keys: ApiKeys = { openai: 'test-key', anthropic: 'test-key-2' }
      await saveApiKeys(keys)

      // Get legacy key
      const legacyKey = await getLegacyEncryptionKey()
      expect(legacyKey).toBeTruthy()

      // Enable password protection
      await setupPassword('newpassword123')
      const passwordKey = getDerivedKey()

      // Re-encrypt: legacy → password
      await reencryptApiKeys(legacyKey!, passwordKey!)

      // Verify data preserved after re-encryption
      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(keys)
    })

    it('should re-encrypt from password to legacy', async () => {
      // Setup with password
      await setupPassword('testpassword123')
      const keys: ApiKeys = { openai: 'test-key' }
      await saveApiKeys(keys)

      const passwordKey = getDerivedKey()

      // Disable password protection
      await disablePasswordProtection()
      const legacyKey = await getLegacyEncryptionKey()

      // Re-encrypt: password → legacy
      await reencryptApiKeys(passwordKey!, legacyKey!)

      // Verify data preserved
      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(keys)
    })

    it('should handle empty keys gracefully', async () => {
      await disablePasswordProtection()

      // No error should be thrown
      await expect(reencryptApiKeys()).resolves.not.toThrow()
    })

    it('should throw error on decryption failure', async () => {
      // Setup with password
      await setupPassword('testpassword123')
      await saveApiKeys({ openai: 'test-key' })

      // Try to re-encrypt with wrong key
      const wrongKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      await expect(reencryptApiKeys(wrongKey)).rejects.toThrow()
    })

    it('should preserve data during re-encryption', async () => {
      await disablePasswordProtection()
      const originalKeys: ApiKeys = {
        openai: 'sk-complex-key-with-special-chars-!@#$%',
        anthropic: 'sk-ant-another-complex-key-12345',
      }
      await saveApiKeys(originalKeys)

      const legacyKey = await getLegacyEncryptionKey()

      await setupPassword('newpassword123')
      const passwordKey = getDerivedKey()

      await reencryptApiKeys(legacyKey!, passwordKey!)

      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(originalKeys)
    })
  })

  describe('getLegacyEncryptionKey', () => {
    it('should return null when no legacy key exists', async () => {
      const key = await getLegacyEncryptionKey()
      expect(key).toBeNull()
    })

    it('should retrieve legacy key after disabling protection', async () => {
      await disablePasswordProtection()
      await saveApiKeys({ openai: 'test' })

      const key = await getLegacyEncryptionKey()
      expect(key).toBeTruthy()
      expect(key).toBeInstanceOf(CryptoKey)
    })

    it('should handle corrupted legacy key', async () => {
      localStorage.setItem('startpage:crypto:key', 'invalid-base64')

      const key = await getLegacyEncryptionKey()
      expect(key).toBeNull()
    })
  })

  describe('clearLegacyEncryptionKey', () => {
    it('should remove legacy key from localStorage', async () => {
      await disablePasswordProtection()
      await saveApiKeys({ openai: 'test' })

      expect(localStorage.getItem('startpage:crypto:key')).toBeTruthy()

      clearLegacyEncryptionKey()

      expect(localStorage.getItem('startpage:crypto:key')).toBeNull()
    })
  })

  describe('migrateFromPlaintext', () => {
    it('should migrate from old plaintext storage', async () => {
      await disablePasswordProtection()

      const oldKeys: ApiKeys = {
        openai: 'old-plaintext-key',
        anthropic: 'old-plaintext-key-2',
      }

      localStorage.setItem('startpage:api:keys', JSON.stringify(oldKeys))

      await migrateFromPlaintext()

      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(oldKeys)

      // Old plaintext should be removed
      expect(localStorage.getItem('startpage:api:keys')).toBeNull()
    })

    it('should not overwrite existing encrypted data', async () => {
      await disablePasswordProtection()

      const newKeys: ApiKeys = { openai: 'new-encrypted-key' }
      await saveApiKeys(newKeys)

      const oldKeys: ApiKeys = { openai: 'old-plaintext-key' }
      localStorage.setItem('startpage:api:keys', JSON.stringify(oldKeys))

      await migrateFromPlaintext()

      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(newKeys)
    })

    it('should handle missing old data gracefully', async () => {
      await expect(migrateFromPlaintext()).resolves.not.toThrow()
    })

    it('should handle corrupted old data gracefully', async () => {
      localStorage.setItem('startpage:api:keys', 'invalid json')

      await expect(migrateFromPlaintext()).resolves.not.toThrow()
    })
  })

  describe('encryption security', () => {
    beforeEach(async () => {
      await disablePasswordProtection()
    })

    it('should use AES-GCM encryption', async () => {
      await saveApiKeys({ openai: 'test-key' })

      const encrypted = localStorage.getItem('startpage:api:keys:encrypted')
      expect(encrypted).toBeTruthy()

      // Should be base64 encoded
      expect(() => atob(encrypted!)).not.toThrow()
    })

    it('should use unique IV for each encryption', async () => {
      await saveApiKeys({ openai: 'test-key' })
      const encrypted1 = localStorage.getItem('startpage:api:keys:encrypted')

      await saveApiKeys({ openai: 'test-key' })
      const encrypted2 = localStorage.getItem('startpage:api:keys:encrypted')

      // Same data but different ciphertext (due to random IV)
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should not store plaintext in localStorage', async () => {
      const secretKey = 'sk-very-secret-key-12345'
      await saveApiKeys({ openai: secretKey })

      const allStorage = JSON.stringify(localStorage)
      expect(allStorage).not.toContain(secretKey)
    })

    it('should handle decryption errors without deleting data', async () => {
      await saveApiKeys({ openai: 'test-key' })

      // Corrupt the encrypted data
      const encrypted = localStorage.getItem('startpage:api:keys:encrypted')!
      localStorage.setItem('startpage:api:keys:encrypted', encrypted.slice(0, -10))

      await expect(getApiKeys()).rejects.toThrow()

      // Data should still be in localStorage (not deleted)
      expect(localStorage.getItem('startpage:api:keys:encrypted')).toBeTruthy()
    })
  })

  describe('password protection integration', () => {
    it('should switch from no password to password protection', async () => {
      // Start without password
      await disablePasswordProtection()
      const keys: ApiKeys = { openai: 'test-key' }
      await saveApiKeys(keys)

      // Enable password protection
      const legacyKey = await getLegacyEncryptionKey()
      await setupPassword('newpassword123')
      const passwordKey = getDerivedKey()

      // Re-encrypt
      await reencryptApiKeys(legacyKey!, passwordKey!)

      // Verify still accessible
      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(keys)
    })

    it('should switch from password protection to no password', async () => {
      // Start with password
      await setupPassword('testpassword123')
      const keys: ApiKeys = { openai: 'test-key' }
      await saveApiKeys(keys)

      const passwordKey = getDerivedKey()

      // Disable password protection
      await disablePasswordProtection()
      const legacyKey = await getLegacyEncryptionKey()

      // Re-encrypt
      await reencryptApiKeys(passwordKey!, legacyKey!)

      // Verify still accessible
      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(keys)
    })

    it('should handle password change', async () => {
      // Setup with first password
      await setupPassword('password1')
      const keys: ApiKeys = { openai: 'test-key' }
      await saveApiKeys(keys)

      const oldKey = getDerivedKey()

      // Change password
      await setupPassword('password2')
      const newKey = getDerivedKey()

      // Re-encrypt
      await reencryptApiKeys(oldKey!, newKey!)

      // Verify accessible with new password
      lockSession()
      await unlockWithPassword('password2')
      const retrieved = await getApiKeys()
      expect(retrieved).toEqual(keys)
    })
  })

  describe('error handling', () => {
    it('should throw descriptive error for locked session', async () => {
      await setupPassword('testpassword123')
      lockSession()

      await expect(getApiKeys()).rejects.toThrow('Session locked')
    })

    it('should throw error for wrong decryption key', async () => {
      await setupPassword('password1')
      await saveApiKeys({ openai: 'test' })

      lockSession()
      await setupPassword('password2')

      await expect(getApiKeys()).rejects.toThrow()
    })

    it('should not delete data on error', async () => {
      await setupPassword('testpassword123')
      await saveApiKeys({ openai: 'test-key' })

      // Corrupt the data
      const encrypted = localStorage.getItem('startpage:api:keys:encrypted')!
      localStorage.setItem('startpage:api:keys:encrypted', 'corrupted-data')

      try {
        await getApiKeys()
      } catch (e) {
        // Expected to fail
      }

      // Data should still exist
      expect(localStorage.getItem('startpage:api:keys:encrypted')).toBe('corrupted-data')
    })
  })
})
