import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  exportDataV2,
  verifyImportHash,
  getAvailableSections,
  decryptSection,
  isEncryptedExportV2,
  validateExportDataV2,
  type ExportDataV2,
  type SelectionTree,
} from '@/lib/import-export-v2'
import { importDataV2, type ImportResult } from '@/lib/import-handler'
import type { Prefs } from '@/lib/prefs'
import * as apiKeysModule from '@/lib/api-keys'

// Mock the API keys module
vi.mock('@/lib/api-keys', () => ({
  getApiKeys: vi.fn(),
  saveApiKeys: vi.fn(),
}))

// Mock shortcuts module
vi.mock('@/lib/shortcuts', () => ({
  getShortcuts: vi.fn(() => []),
  saveShortcuts: vi.fn(),
}))

describe('Import/Export V2', () => {
  let mockPrefs: Prefs

  beforeEach(() => {
    mockPrefs = {
      widgets: [],
      showChat: true,
      showQuickLinks: true,
      showVerifiedOrgModels: false,
      links: [
        { id: '1', label: 'GitHub', href: 'https://github.com', icon: 'github' },
      ],
      chatModel: { provider: 'openai', model: 'gpt-4o' },
      conversations: [],
      searchEngineId: 'duckduckgo',
      customSearchEngines: [],
    }

    vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({})
    vi.mocked(apiKeysModule.saveApiKeys).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Export Validation', () => {
    it('should validate a correct export', () => {
      const validExport: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {},
      }

      expect(validateExportDataV2(validExport)).toBe(true)
    })

    it('should reject export without version', () => {
      const invalidExport = {
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
      }

      expect(validateExportDataV2(invalidExport)).toBe(false)
    })

    it('should reject non-object exports', () => {
      expect(validateExportDataV2(null)).toBe(false)
      expect(validateExportDataV2('string')).toBe(false)
      expect(validateExportDataV2(123)).toBe(false)
    })
  })

  describe('Export without Encryption', () => {
    it('should export settings without password', async () => {
      const selection: SelectionTree = {
        settings: {
          selected: true,
          items: {
            searchEngine: true,
            quickLinks: true,
            keyboardShortcuts: false,
            chatPreferences: true,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection)
      const exported: ExportDataV2 = JSON.parse(jsonData)

      expect(exported.version).toBe('2.0.0')
      expect(exported.encrypted).toBe(false)
      expect(exported.contents?.settings).toBeDefined()
      expect(exported.contents?.settings?.searchEngine).toBeDefined()
      expect(exported.contents?.settings?.quickLinks).toEqual(mockPrefs.links)
      expect(exported.hash).toBeDefined()
    })

    it('should export chats without password', async () => {
      mockPrefs.conversations = [
        {
          id: 'chat-1',
          title: 'Test Chat',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [
            { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const selection: SelectionTree = {
        chats: {
          selected: true,
          items: {
            'chat-1': true,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection)
      const exported: ExportDataV2 = JSON.parse(jsonData)

      expect(exported.contents?.chats).toHaveLength(1)
      expect(exported.contents?.chats?.[0].title).toBe('Test Chat')
    })

    it('should exclude ghost mode chats', async () => {
      mockPrefs.conversations = [
        {
          id: 'chat-1',
          title: 'Regular Chat',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'chat-2',
          title: 'Ghost Chat',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isGhostMode: true,
        },
      ]

      const selection: SelectionTree = {
        chats: {
          selected: true,
          items: {
            'chat-1': true,
            'chat-2': true,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection)
      const exported: ExportDataV2 = JSON.parse(jsonData)

      expect(exported.contents?.chats).toHaveLength(1)
      expect(exported.contents?.chats?.[0].id).toBe('chat-1')
    })
  })

  describe('Export with Encryption', () => {
    it('should require password for API keys', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-test-key',
      })

      const selection: SelectionTree = {
        apiKeys: {
          selected: true,
          items: {
            openai: true,
            anthropic: false,
            gemini: false,
          },
        },
      }

      await expect(exportDataV2(mockPrefs, selection)).rejects.toThrow(
        'API keys must be exported with encryption'
      )
    })

    it('should encrypt API keys with password', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-test-key',
        anthropic: 'sk-ant-test-key',
      })

      const selection: SelectionTree = {
        apiKeys: {
          selected: true,
          items: {
            openai: true,
            anthropic: true,
            gemini: false,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection, 'test-password')
      const exported: ExportDataV2 = JSON.parse(jsonData)

      expect(exported.encrypted).toBe(true)
      expect(exported.salt).toBeDefined()
      expect(exported.encryptedSections?.apiKeys).toBeDefined()
      expect(exported.encryptedSections?.apiKeys?.data).toBeDefined()
      expect(exported.encryptedSections?.apiKeys?.iv).toBeDefined()
      expect(exported.contents?.apiKeys).toBeUndefined()
    })

    it('should encrypt chats with password', async () => {
      mockPrefs.conversations = [
        {
          id: 'chat-1',
          title: 'Secret Chat',
          model: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
          messages: [
            { id: 'msg-1', role: 'user', content: 'Secret message', timestamp: Date.now() },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const selection: SelectionTree = {
        chats: {
          selected: true,
          items: {
            'chat-1': true,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection, 'test-password')
      const exported: ExportDataV2 = JSON.parse(jsonData)

      expect(exported.encrypted).toBe(true)
      expect(exported.encryptedSections?.chats).toBeDefined()
      expect(exported.encryptedSections?.chats?.data).toBeDefined()
      expect(exported.encryptedSections?.chats?.iv).toBeDefined()
      expect(exported.contents?.chats).toBeUndefined()
    })

    it('should store unique IVs for each section', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-test-key',
      })

      mockPrefs.conversations = [
        {
          id: 'chat-1',
          title: 'Chat',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const selection: SelectionTree = {
        apiKeys: {
          selected: true,
          items: { openai: true, anthropic: false, gemini: false },
        },
        chats: {
          selected: true,
          items: { 'chat-1': true },
        },
        settings: {
          selected: true,
          items: {
            searchEngine: true,
            quickLinks: false,
            keyboardShortcuts: false,
            chatPreferences: false,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection, 'password')
      const exported: ExportDataV2 = JSON.parse(jsonData)

      const apiKeysIV = exported.encryptedSections?.apiKeys?.iv
      const chatsIV = exported.encryptedSections?.chats?.iv
      const settingsIV = exported.encryptedSections?.settings?.iv

      expect(apiKeysIV).toBeDefined()
      expect(chatsIV).toBeDefined()
      expect(settingsIV).toBeDefined()

      // IVs should be unique
      expect(apiKeysIV).not.toBe(chatsIV)
      expect(chatsIV).not.toBe(settingsIV)
      expect(apiKeysIV).not.toBe(settingsIV)
    })
  })

  describe('Decryption', () => {
    it('should decrypt section with correct password', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-original-key',
      })

      const selection: SelectionTree = {
        apiKeys: {
          selected: true,
          items: { openai: true, anthropic: false, gemini: false },
        },
      }

      const password = 'test-password-123'
      const jsonData = await exportDataV2(mockPrefs, selection, password)
      const exported: ExportDataV2 = JSON.parse(jsonData)

      const salt = Uint8Array.from(atob(exported.salt!), c => c.charCodeAt(0))
      const decrypted = await decryptSection(
        exported.encryptedSections!.apiKeys!.data,
        exported.encryptedSections!.apiKeys!.iv,
        password,
        salt
      )

      expect(decrypted.openai).toBe('sk-original-key')
    })

    it('should fail to decrypt with wrong password', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-test-key',
      })

      const selection: SelectionTree = {
        apiKeys: {
          selected: true,
          items: { openai: true, anthropic: false, gemini: false },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection, 'correct-password')
      const exported: ExportDataV2 = JSON.parse(jsonData)

      const salt = Uint8Array.from(atob(exported.salt!), c => c.charCodeAt(0))

      await expect(
        decryptSection(
          exported.encryptedSections!.apiKeys!.data,
          exported.encryptedSections!.apiKeys!.iv,
          'wrong-password',
          salt
        )
      ).rejects.toThrow()
    })
  })

  describe('Hash Verification', () => {
    it('should generate and verify hash correctly', async () => {
      const selection: SelectionTree = {
        settings: {
          selected: true,
          items: {
            searchEngine: true,
            quickLinks: false,
            keyboardShortcuts: false,
            chatPreferences: false,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection)
      const exported: ExportDataV2 = JSON.parse(jsonData)

      const isValid = await verifyImportHash(exported)
      expect(isValid).toBe(true)
    })

    it('should detect tampering', async () => {
      const selection: SelectionTree = {
        settings: {
          selected: true,
          items: {
            searchEngine: true,
            quickLinks: false,
            keyboardShortcuts: false,
            chatPreferences: false,
          },
        },
      }

      const jsonData = await exportDataV2(mockPrefs, selection)
      const exported: ExportDataV2 = JSON.parse(jsonData)

      // Tamper with the data
      exported.contents!.settings!.searchEngine!.engineId = 'tampered'

      const isValid = await verifyImportHash(exported)
      expect(isValid).toBe(false)
    })
  })

  describe('Available Sections Detection', () => {
    it('should detect unencrypted sections', () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {
          settings: {
            searchEngine: {
              engineId: 'google',
              customEngines: [],
            },
            quickLinks: [
              { id: '1', label: 'Test', href: 'https://test.com', icon: 'globe' },
            ],
          },
          chats: [
            {
              id: 'chat-1',
              title: 'Test',
              model: { provider: 'openai', model: 'gpt-4o' },
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      }

      const sections = getAvailableSections(exportData)

      expect(sections.settings).toBeDefined()
      expect(sections.settings?.items.searchEngine).toBe(true)
      expect(sections.settings?.items.quickLinks).toBe(true)
      expect(sections.chats).toBeDefined()
      expect(sections.chats?.items['chat-1']).toBe(false)
    })

    it('should detect encrypted sections', () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: true,
        salt: 'test-salt',
        encryptedSections: {
          apiKeys: {
            data: 'encrypted-data',
            iv: 'test-iv',
          },
        },
      }

      const sections = getAvailableSections(exportData)

      expect(sections.apiKeys).toBeDefined()
      expect(sections.apiKeys?.items.openai).toBe(true)
      expect(sections.apiKeys?.items.anthropic).toBe(true)
      expect(sections.apiKeys?.items.gemini).toBe(true)
    })
  })

  describe('Import with Merge Strategies', () => {
    it('should append chats by default', async () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {
          chats: [
            {
              id: 'new-chat',
              title: 'New Chat',
              model: { provider: 'openai', model: 'gpt-4o' },
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      }

      mockPrefs.conversations = [
        {
          id: 'existing-chat',
          title: 'Existing',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const result = await importDataV2(
        exportData,
        mockPrefs,
        {
          selection: {
            chats: {
              selected: true,
              items: { 'new-chat': true },
            },
          },
          mergeStrategies: { chats: 'append' },
          createBackup: false,
        }
      )

      const newConversations = (result as any).newConversations
      expect(newConversations).toHaveLength(2)
      expect(newConversations.map((c: any) => c.title)).toContain('Existing')
      expect(newConversations.map((c: any) => c.title)).toContain('New Chat')
    })

    it('should replace chats when strategy is replace', async () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {
          chats: [
            {
              id: 'new-chat',
              title: 'New Chat',
              model: { provider: 'openai', model: 'gpt-4o' },
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      }

      mockPrefs.conversations = [
        {
          id: 'existing-chat',
          title: 'Existing',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const result = await importDataV2(
        exportData,
        mockPrefs,
        {
          selection: {
            chats: {
              selected: true,
              items: { 'new-chat': true },
            },
          },
          mergeStrategies: { chats: 'replace' },
          createBackup: false,
        }
      )

      const newConversations = (result as any).newConversations
      expect(newConversations).toHaveLength(1)
      expect(newConversations[0].id).toBe('new-chat')
    })

    it('should handle chat ID conflicts on append', async () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {
          chats: [
            {
              id: 'duplicate-id',
              title: 'Duplicate Chat',
              model: { provider: 'openai', model: 'gpt-4o' },
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      }

      mockPrefs.conversations = [
        {
          id: 'duplicate-id',
          title: 'Existing',
          model: { provider: 'openai', model: 'gpt-4o' },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const result = await importDataV2(
        exportData,
        mockPrefs,
        {
          selection: {
            chats: {
              selected: true,
              items: { 'duplicate-id': true },
            },
          },
          mergeStrategies: { chats: 'append' },
          createBackup: false,
        }
      )

      const newConversations = (result as any).newConversations
      expect(newConversations).toHaveLength(2)

      // Check that the duplicate got a new ID
      const ids = newConversations.map((c: any) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(2)
    })

    it('should merge quick links', async () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {
          settings: {
            quickLinks: [
              { id: 'new-link', label: 'New Link', href: 'https://new.com', icon: 'globe' },
            ],
          },
        },
      }

      const result = await importDataV2(
        exportData,
        mockPrefs,
        {
          selection: {
            settings: {
              selected: true,
              items: {
                searchEngine: false,
                quickLinks: true,
                keyboardShortcuts: false,
                chatPreferences: false,
              },
            },
          },
          mergeStrategies: { quickLinks: 'merge' },
          createBackup: false,
        }
      )

      const quickLinks = (result as any).quickLinks
      expect(quickLinks).toHaveLength(2) // existing + new
      expect(quickLinks.map((l: any) => l.label)).toContain('GitHub')
      expect(quickLinks.map((l: any) => l.label)).toContain('New Link')
    })

    it('should replace quick links when strategy is replace', async () => {
      const exportData: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {
          settings: {
            quickLinks: [
              { id: 'new-link', label: 'New Link', href: 'https://new.com', icon: 'globe' },
            ],
          },
        },
      }

      const result = await importDataV2(
        exportData,
        mockPrefs,
        {
          selection: {
            settings: {
              selected: true,
              items: {
                searchEngine: false,
                quickLinks: true,
                keyboardShortcuts: false,
                chatPreferences: false,
              },
            },
          },
          mergeStrategies: { quickLinks: 'replace' },
          createBackup: false,
        }
      )

      const quickLinks = (result as any).quickLinks
      expect(quickLinks).toHaveLength(1)
      expect(quickLinks[0].label).toBe('New Link')
    })
  })

  describe('Encrypted Detection', () => {
    it('should detect encrypted exports', () => {
      const encrypted: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: true,
        salt: 'test-salt',
        encryptedSections: {
          apiKeys: { data: 'encrypted', iv: 'test-iv' },
        },
      }

      expect(isEncryptedExportV2(encrypted)).toBe(true)
    })

    it('should detect unencrypted exports', () => {
      const unencrypted: ExportDataV2 = {
        version: '2.0.0',
        appVersion: '1.5.0',
        exportedAt: new Date().toISOString(),
        encrypted: false,
        contents: {},
      }

      expect(isEncryptedExportV2(unencrypted)).toBe(false)
    })
  })
})
