import { describe, it, expect, beforeEach } from 'vitest'
import { getApiKeys, saveApiKeys, updateApiKey, clearApiKey, hasApiKeys } from '@/lib/api-keys'

describe('api-keys gemini integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Gemini API key storage', () => {
    it('should save and retrieve Gemini API key', async () => {
      await saveApiKeys({ gemini: 'AIzaTest123' })

      const keys = await getApiKeys()
      expect(keys.gemini).toBe('AIzaTest123')
    })

    it('should save all three provider keys together', async () => {
      await saveApiKeys({
        openai: 'sk-test',
        anthropic: 'sk-ant-test',
        gemini: 'AIzaTest'
      })

      const keys = await getApiKeys()
      expect(keys.openai).toBe('sk-test')
      expect(keys.anthropic).toBe('sk-ant-test')
      expect(keys.gemini).toBe('AIzaTest')
    })

    it('should update Gemini API key', async () => {
      await saveApiKeys({ gemini: 'AIzaOld' })
      await updateApiKey('gemini', 'AIzaNew')

      const keys = await getApiKeys()
      expect(keys.gemini).toBe('AIzaNew')
    })

    it('should clear Gemini API key', async () => {
      await saveApiKeys({ gemini: 'AIzaTest', openai: 'sk-test' })
      await clearApiKey('gemini')

      const keys = await getApiKeys()
      expect(keys.gemini).toBeUndefined()
      expect(keys.openai).toBe('sk-test')
    })

    it('should detect Gemini API key in hasApiKeys', async () => {
      expect(await hasApiKeys()).toBe(false)

      await saveApiKeys({ gemini: 'AIzaTest' })

      expect(await hasApiKeys()).toBe(true)
    })

    it('should handle mixed provider keys', async () => {
      await saveApiKeys({ openai: 'sk-test' })
      await updateApiKey('gemini', 'AIzaTest')

      const keys = await getApiKeys()
      expect(keys.openai).toBe('sk-test')
      expect(keys.gemini).toBe('AIzaTest')
    })

    it('should encrypt Gemini API key', async () => {
      const testKey = 'AIzaSensitiveKey123'
      await saveApiKeys({ gemini: testKey })

      // Check that raw localStorage doesn't contain the plaintext key
      const rawStorage = localStorage.getItem('startpage:api:keys:encrypted')
      expect(rawStorage).toBeTruthy()
      expect(rawStorage).not.toContain(testKey)
    })
  })
})
