import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  exportData,
  parseImportFile,
  validateImportData,
  isEncryptedExport,
  downloadExportFile,
  decryptExportData,
  type ExportData,
  type ExportOptions,
} from '@/lib/import-export'
import type { Prefs } from '@/lib/prefs'
import * as apiKeysModule from '@/lib/api-keys'
import * as shortcutsModule from '@/lib/shortcuts'

vi.mock('@/lib/api-keys')
vi.mock('@/lib/shortcuts')

// Mock File API
globalThis.File = class File extends Blob {
  name: string
  lastModified: number
  private _parts: BlobPart[]

  constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
    super(parts, options)
    this.name = name
    this.lastModified = options?.lastModified ?? Date.now()
    this._parts = parts
  }

  async text(): Promise<string> {
    // Convert parts to string
    const texts: string[] = []
    for (const part of this._parts) {
      if (typeof part === 'string') {
        texts.push(part)
      } else if (part instanceof ArrayBuffer) {
        const decoder = new TextDecoder()
        texts.push(decoder.decode(part))
      } else if (ArrayBuffer.isView(part)) {
        const decoder = new TextDecoder()
        texts.push(decoder.decode(part))
      }
    }
    return texts.join('')
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const text = await this.text()
    const encoder = new TextEncoder()
    return encoder.encode(text).buffer
  }
} as any

// Mock URL.createObjectURL and URL.revokeObjectURL
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn()
}

const mockPrefs: Prefs = {
  showWeather: true,
  showChat: true,
  showQuickLinks: true,
  showVerifiedOrgModels: false,
  links: [
    { id: '1', label: 'GitHub', href: 'https://github.com', icon: 'github' },
  ],
  chatModel: { provider: 'openai', model: 'gpt-4o' },
  conversations: [
    {
      id: 'conv-1',
      title: 'Test Conversation',
      model: { provider: 'openai', model: 'gpt-4o' },
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello' },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'conv-2',
      title: 'Ghost Conversation',
      model: { provider: 'openai', model: 'gpt-4o' },
      messages: [{ id: 'msg-3', role: 'user', content: 'Secret' }],
      isGhostMode: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
}

describe('import-export module', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({})
    vi.mocked(shortcutsModule.getShortcuts).mockReturnValue([])
  })

  describe('exportData', () => {
    it('should export preferences', async () => {
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.version).toBe('1.0.0')
      expect(data.timestamp).toBeTruthy()
      expect(data.preferences).toBeTruthy()
      expect(data.preferences?.showWeather).toBe(true)
      expect(data.preferences?.links).toEqual(mockPrefs.links)
    })

    it('should not include conversations in preferences export', async () => {
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.conversations).toBeUndefined()
      expect((data.preferences as any)?.conversations).toBeUndefined()
    })

    it('should export API keys', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-test-key',
        anthropic: 'sk-ant-test-key',
      })

      const options: ExportOptions = {
        includePreferences: false,
        includeApiKeys: true,
        includeChats: false,
      }

      const result = await exportData(mockPrefs, options, 'password123')
      const data = JSON.parse(result) as ExportData

      // When password is provided, data should be encrypted
      expect(data.encrypted).toBe(true)
      expect(data.salt).toBeTruthy()
      expect(data.iv).toBeTruthy()
      expect(data.data).toBeTruthy()
    })

    it('should export conversations', async () => {
      const options: ExportOptions = {
        includePreferences: false,
        includeApiKeys: false,
        includeChats: true,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.conversations).toBeTruthy()
      expect(data.conversations).toHaveLength(1) // Ghost mode conversation should be filtered
      expect(data.conversations?.[0].title).toBe('Test Conversation')
    })

    it('should filter out ghost mode conversations', async () => {
      const options: ExportOptions = {
        includePreferences: false,
        includeApiKeys: false,
        includeChats: true,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      const ghostConv = data.conversations?.find(c => c.isGhostMode)
      expect(ghostConv).toBeUndefined()
    })

    it('should export keyboard shortcuts', async () => {
      vi.mocked(shortcutsModule.getShortcuts).mockReturnValue([
        { action: 'search', keys: 'mod+k' },
        { action: 'chat', keys: 'mod+/' },
      ])

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.shortcuts).toHaveLength(2)
      expect(data.shortcuts?.[0].action).toBe('search')
    })

    it('should export weather location', async () => {
      localStorage.setItem(
        'wx:location',
        JSON.stringify({
          name: 'San Francisco',
          lat: 37.7749,
          lon: -122.4194,
          country: 'US',
        })
      )

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.weatherLocation).toBeTruthy()
      expect(data.weatherLocation?.name).toBe('San Francisco')
      expect(data.weatherLocation?.lat).toBe(37.7749)
    })

    it('should handle corrupted weather location gracefully', async () => {
      localStorage.setItem('wx:location', 'invalid-json')

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      // Should not throw
      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.weatherLocation).toBeUndefined()
    })

    it('should encrypt export with password', async () => {
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: true,
        includeChats: true,
      }

      const result = await exportData(mockPrefs, options, 'mypassword')
      const data = JSON.parse(result) as ExportData

      expect(data.encrypted).toBe(true)
      expect(data.salt).toBeTruthy()
      expect(data.iv).toBeTruthy()
      expect(data.data).toBeTruthy()
      expect(data.preferences).toBeUndefined() // Should be encrypted
      expect(data.conversations).toBeUndefined() // Should be encrypted
    })

    it('should create unencrypted export without password', async () => {
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: true,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.encrypted).toBeUndefined()
      expect(data.preferences).toBeTruthy()
      expect(data.conversations).toBeTruthy()
    })

    it('should export all data when all options are true', async () => {
      vi.mocked(apiKeysModule.getApiKeys).mockResolvedValue({
        openai: 'sk-test',
      })

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: true,
        includeChats: true,
      }

      const result = await exportData(mockPrefs, options, 'password')
      const data = JSON.parse(result) as ExportData

      expect(data.version).toBe('1.0.0')
      expect(data.encrypted).toBe(true)
    })
  })

  describe('validateImportData', () => {
    it('should validate correct export data', () => {
      const validData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        preferences: mockPrefs,
      }

      expect(validateImportData(validData)).toBe(true)
    })

    it('should reject data without version', () => {
      const invalidData = {
        timestamp: Date.now(),
      }

      expect(validateImportData(invalidData)).toBe(false)
    })

    it('should reject data without timestamp', () => {
      const invalidData = {
        version: '1.0.0',
      }

      expect(validateImportData(invalidData)).toBe(false)
    })

    it('should reject non-object data', () => {
      expect(validateImportData('string')).toBe(false)
      expect(validateImportData(123)).toBe(false)
      expect(validateImportData(null)).toBe(false)
      expect(validateImportData(undefined)).toBe(false)
    })

    it('should validate API keys structure', () => {
      const validData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        apiKeys: {
          openai: 'sk-test',
          anthropic: 'sk-ant-test',
        },
      }

      expect(validateImportData(validData)).toBe(true)
    })

    it('should reject invalid API keys structure', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        apiKeys: {
          openai: 123, // Should be string
        },
      }

      expect(validateImportData(invalidData)).toBe(false)
    })

    it('should validate conversations structure', () => {
      const validData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        conversations: mockPrefs.conversations,
      }

      expect(validateImportData(validData)).toBe(true)
    })

    it('should reject invalid conversations structure', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        conversations: [
          {
            // Missing required fields
            id: '1',
          },
        ],
      }

      expect(validateImportData(invalidData)).toBe(false)
    })

    it('should validate weather location structure', () => {
      const validData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        weatherLocation: {
          name: 'NYC',
          lat: 40.7128,
          lon: -74.006,
        },
      }

      expect(validateImportData(validData)).toBe(true)
    })

    it('should reject invalid weather location', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        weatherLocation: {
          name: 'NYC',
          lat: 'invalid', // Should be number
        },
      }

      expect(validateImportData(invalidData)).toBe(false)
    })

    it('should validate shortcuts structure', () => {
      const validData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        shortcuts: [{ action: 'search', keys: 'mod+k' }],
      }

      expect(validateImportData(validData)).toBe(true)
    })

    it('should reject non-array shortcuts', () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        shortcuts: 'not an array',
      }

      expect(validateImportData(invalidData)).toBe(false)
    })
  })

  describe('isEncryptedExport', () => {
    it('should detect encrypted exports', () => {
      const encryptedData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        encrypted: true,
        salt: 'base64salt',
        iv: 'base64iv',
        data: 'base64data',
      }

      expect(isEncryptedExport(encryptedData)).toBe(true)
    })

    it('should detect unencrypted exports', () => {
      const unencryptedData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        preferences: mockPrefs,
      }

      expect(isEncryptedExport(unencryptedData)).toBe(false)
    })

    it('should return false for invalid data', () => {
      expect(isEncryptedExport(null)).toBe(false)
      expect(isEncryptedExport('string')).toBe(false)
      expect(isEncryptedExport(123)).toBe(false)
    })
  })

  describe('parseImportFile', () => {
    it('should parse unencrypted export file', async () => {
      const exportDataObj: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        preferences: mockPrefs,
      }

      const file = new File([JSON.stringify(exportDataObj)], 'export.json', {
        type: 'application/json',
      })

      const result = await parseImportFile(file)

      expect(result.version).toBe('1.0.0')
      expect(result.preferences).toBeTruthy()
    })

    it('should reject invalid JSON', async () => {
      const file = new File(['invalid json{'], 'export.json', {
        type: 'application/json',
      })

      await expect(parseImportFile(file)).rejects.toThrow()
    })

    it('should reject invalid export format', async () => {
      const invalidData = {
        // Missing version and timestamp
        preferences: {},
      }

      const file = new File([JSON.stringify(invalidData)], 'export.json', {
        type: 'application/json',
      })

      await expect(parseImportFile(file)).rejects.toThrow('Invalid import file format')
    })

    it('should require password for encrypted exports', async () => {
      const encryptedData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        encrypted: true,
        salt: 'salt',
        iv: 'iv',
        data: 'data',
      }

      const file = new File([JSON.stringify(encryptedData)], 'export.json', {
        type: 'application/json',
      })

      await expect(parseImportFile(file)).rejects.toThrow('password-protected')
    })

    it('should decrypt encrypted export with correct password', async () => {
      // Create encrypted export
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const encrypted = await exportData(mockPrefs, options, 'testpassword')
      const file = new File([encrypted], 'export.json', {
        type: 'application/json',
      })

      const result = await parseImportFile(file, 'testpassword')

      expect(result.preferences).toBeTruthy()
      expect(result.preferences?.showWeather).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const encrypted = await exportData(mockPrefs, options, 'correctpassword')
      const file = new File([encrypted], 'export.json', {
        type: 'application/json',
      })

      await expect(parseImportFile(file, 'wrongpassword')).rejects.toThrow(
        'Incorrect password'
      )
    })
  })

  describe('downloadExportFile', () => {
    it('should create download with correct filename format', () => {
      // Save original implementation
      const originalCreateElement = document.createElement.bind(document)

      // Mock DOM APIs
      const createElementSpy = vi.spyOn(document, 'createElement')
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      let clickedElement: HTMLAnchorElement | null = null
      createElementSpy.mockImplementation((tag: string) => {
        const element = originalCreateElement(tag) as HTMLAnchorElement
        const originalClick = element.click.bind(element)
        element.click = () => {
          clickedElement = element
          originalClick()
        }
        return element
      })

      const testData = '{"version":"1.0.0","timestamp":123}'
      downloadExportFile(testData)

      expect(clickedElement).toBeTruthy()
      expect(clickedElement?.download).toMatch(/^horizen-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/)
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('should create blob with correct type', () => {
      // Save original implementation
      const originalCreateElement = document.createElement.bind(document)

      const createElementSpy = vi.spyOn(document, 'createElement')
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL')
      vi.spyOn(URL, 'revokeObjectURL')

      createElementSpy.mockImplementation(() => {
        const element = originalCreateElement('a') as HTMLAnchorElement
        element.click = vi.fn()
        return element
      })

      createObjectURLSpy.mockImplementation((blob: Blob) => {
        expect(blob.type).toBe('application/json')
        return 'blob:url'
      })

      downloadExportFile('{"test":"data"}')

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
    })
  })

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const originalData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        preferences: mockPrefs,
        conversations: mockPrefs.conversations,
      }

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: true,
      }

      const password = 'test-password-123'

      // Export with encryption
      const encrypted = await exportData(mockPrefs, options, password)
      const encryptedData = JSON.parse(encrypted) as ExportData

      expect(encryptedData.encrypted).toBe(true)

      // Decrypt
      const decrypted = await decryptExportData(encryptedData, password)

      expect(decrypted.preferences).toBeTruthy()
      expect(decrypted.conversations).toHaveLength(1)
      expect(decrypted.preferences?.showWeather).toBe(true)
    })

    it('should use unique salt and IV for each encryption', async () => {
      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const encrypted1 = await exportData(mockPrefs, options, 'password')
      const encrypted2 = await exportData(mockPrefs, options, 'password')

      const data1 = JSON.parse(encrypted1) as ExportData
      const data2 = JSON.parse(encrypted2) as ExportData

      // Same data but different salt/IV/ciphertext
      expect(data1.salt).not.toBe(data2.salt)
      expect(data1.iv).not.toBe(data2.iv)
      expect(data1.data).not.toBe(data2.data)
    })

    it('should reject decryption with invalid data', async () => {
      const invalidData: ExportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        encrypted: true,
        // Missing salt, iv, data
      }

      await expect(decryptExportData(invalidData, 'password')).rejects.toThrow(
        'Invalid encrypted export data'
      )
    })

    it('should handle complex data structures', async () => {
      const complexPrefs = {
        ...mockPrefs,
        conversations: [
          {
            id: 'conv-1',
            title: 'Complex Conversation with émojis 🎉 and "quotes"',
            model: { provider: 'anthropic' as const, model: 'claude-sonnet-4-5-20250929' as const },
            messages: [
              {
                id: 'msg-1',
                role: 'user' as const,
                content: 'Special chars: <>&"\'',
              },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: true,
      }

      const encrypted = await exportData(complexPrefs, options, 'password')
      const file = new File([encrypted], 'export.json')
      const decrypted = await parseImportFile(file, 'password')

      expect(decrypted.conversations?.[0].title).toContain('émojis 🎉')
      expect(decrypted.conversations?.[0].messages[0].content).toContain('<>&"\'')
    })
  })

  describe('edge cases', () => {
    it('should handle empty preferences', async () => {
      const emptyPrefs: Prefs = {
        showWeather: false,
        showChat: false,
        showQuickLinks: false,
        showVerifiedOrgModels: false,
        links: [],
        chatModel: { provider: 'openai', model: 'gpt-4o' },
        conversations: [],
      }

      const options: ExportOptions = {
        includePreferences: true,
        includeApiKeys: false,
        includeChats: false,
      }

      const result = await exportData(emptyPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.preferences?.links).toEqual([])
    })

    it('should handle no data selected for export', async () => {
      const options: ExportOptions = {
        includePreferences: false,
        includeApiKeys: false,
        includeChats: false,
      }

      const result = await exportData(mockPrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.version).toBe('1.0.0')
      expect(data.preferences).toBeUndefined()
      expect(data.apiKeys).toBeUndefined()
      expect(data.conversations).toBeUndefined()
    })

    it('should handle large conversations', async () => {
      const largePrefs = {
        ...mockPrefs,
        conversations: Array.from({ length: 100 }, (_, i) => ({
          id: `conv-${i}`,
          title: `Conversation ${i}`,
          model: { provider: 'openai' as const, model: 'gpt-4o' as const },
          messages: Array.from({ length: 50 }, (_, j) => ({
            id: `msg-${i}-${j}`,
            role: (j % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
            content: `Message ${j} in conversation ${i}`,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
      }

      const options: ExportOptions = {
        includePreferences: false,
        includeApiKeys: false,
        includeChats: true,
      }

      const result = await exportData(largePrefs, options)
      const data = JSON.parse(result) as ExportData

      expect(data.conversations).toHaveLength(100)
      expect(data.conversations?.[0].messages).toHaveLength(50)
    })
  })
})
