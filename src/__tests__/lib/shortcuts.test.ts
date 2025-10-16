import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getShortcuts,
  saveShortcuts,
  resetShortcuts,
  matchesShortcut,
  formatShortcutKey,
  getActionLabel,
  DEFAULT_SHORTCUTS,
  type ShortcutBinding,
  type ShortcutKey,
} from '@/lib/shortcuts'

describe('shortcuts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getShortcuts', () => {
    it('should return default shortcuts when nothing is stored', () => {
      const shortcuts = getShortcuts()
      expect(shortcuts).toEqual(DEFAULT_SHORTCUTS)
    })

    it('should return stored shortcuts when they exist', () => {
      const customShortcuts: ShortcutBinding[] = DEFAULT_SHORTCUTS.map(s =>
        s.action === 'openChat'
          ? { ...s, key: { key: 'c', ctrlKey: true }, description: 'Custom chat shortcut' }
          : s
      )
      localStorage.setItem('startpage:shortcuts', JSON.stringify(customShortcuts))

      const shortcuts = getShortcuts()
      expect(shortcuts).toHaveLength(DEFAULT_SHORTCUTS.length)
      const openChatShortcut = shortcuts.find(s => s.action === 'openChat')
      expect(openChatShortcut?.key.key).toBe('c')
      expect(openChatShortcut?.description).toBe('Custom chat shortcut')
    })

    it('should merge missing default actions when stored shortcuts are incomplete', () => {
      const incompleteShortcuts: ShortcutBinding[] = [
        {
          action: 'openChat',
          key: { key: 'c', ctrlKey: true },
          description: 'Custom chat shortcut',
          category: 'chat',
        },
      ]
      localStorage.setItem('startpage:shortcuts', JSON.stringify(incompleteShortcuts))

      const shortcuts = getShortcuts()
      expect(shortcuts.length).toBeGreaterThan(1)

      // Should have the custom shortcut
      const openChatShortcut = shortcuts.find(s => s.action === 'openChat')
      expect(openChatShortcut?.key.key).toBe('c')

      // Should have all default actions
      const actions = shortcuts.map(s => s.action)
      DEFAULT_SHORTCUTS.forEach(defaultShortcut => {
        expect(actions).toContain(defaultShortcut.action)
      })
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('startpage:shortcuts', 'invalid json{')

      const shortcuts = getShortcuts()
      expect(shortcuts).toEqual(DEFAULT_SHORTCUTS)
    })
  })

  describe('saveShortcuts', () => {
    it('should save shortcuts to localStorage', () => {
      const customShortcuts: ShortcutBinding[] = [
        {
          action: 'openChat',
          key: { key: 'c', ctrlKey: true },
          description: 'Custom chat shortcut',
          category: 'chat',
        },
      ]

      saveShortcuts(customShortcuts)

      const stored = localStorage.getItem('startpage:shortcuts')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!)).toEqual(customShortcuts)
    })

    it('should overwrite existing shortcuts', () => {
      const firstShortcuts: ShortcutBinding[] = [
        {
          action: 'openChat',
          key: { key: 'c', ctrlKey: true },
          description: 'First',
          category: 'chat',
        },
      ]
      const secondShortcuts: ShortcutBinding[] = [
        {
          action: 'openSettings',
          key: { key: 's', ctrlKey: true },
          description: 'Second',
          category: 'interface',
        },
      ]

      saveShortcuts(firstShortcuts)
      saveShortcuts(secondShortcuts)

      const stored = JSON.parse(localStorage.getItem('startpage:shortcuts')!)
      expect(stored).toEqual(secondShortcuts)
    })
  })

  describe('resetShortcuts', () => {
    it('should remove shortcuts from localStorage', () => {
      const customShortcuts: ShortcutBinding[] = [
        {
          action: 'openChat',
          key: { key: 'c', ctrlKey: true },
          description: 'Custom',
          category: 'chat',
        },
      ]
      localStorage.setItem('startpage:shortcuts', JSON.stringify(customShortcuts))

      resetShortcuts()

      expect(localStorage.getItem('startpage:shortcuts')).toBeNull()
    })

    it('should allow getShortcuts to return defaults after reset', () => {
      const customShortcuts: ShortcutBinding[] = [
        {
          action: 'openChat',
          key: { key: 'c', ctrlKey: true },
          description: 'Custom',
          category: 'chat',
        },
      ]
      saveShortcuts(customShortcuts)
      resetShortcuts()

      const shortcuts = getShortcuts()
      expect(shortcuts).toEqual(DEFAULT_SHORTCUTS)
    })
  })

  describe('matchesShortcut', () => {
    it('should match exact key without modifiers', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' })
      const shortcutKey: ShortcutKey = { key: 'a' }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })

    it('should match key with Ctrl modifier', () => {
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
      const shortcutKey: ShortcutKey = { key: 'k', ctrlKey: true }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })

    it('should match key with multiple modifiers', () => {
      const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, shiftKey: true })
      const shortcutKey: ShortcutKey = { key: 'n', ctrlKey: true, shiftKey: true }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })

    it('should not match when key is different', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' })
      const shortcutKey: ShortcutKey = { key: 'b' }

      expect(matchesShortcut(event, shortcutKey)).toBe(false)
    })

    it('should not match when modifiers are different', () => {
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
      const shortcutKey: ShortcutKey = { key: 'k', altKey: true }

      expect(matchesShortcut(event, shortcutKey)).toBe(false)
    })

    it('should be case-insensitive for keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'K' })
      const shortcutKey: ShortcutKey = { key: 'k' }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })

    it('should handle Escape key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      const shortcutKey: ShortcutKey = { key: 'Escape' }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })

    it('should match Ctrl+I', () => {
      const event = new KeyboardEvent('keydown', { key: 'i', ctrlKey: true })
      const shortcutKey: ShortcutKey = { key: 'i', ctrlKey: true }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })

    it('should match Ctrl+U', () => {
      const event = new KeyboardEvent('keydown', { key: 'u', ctrlKey: true })
      const shortcutKey: ShortcutKey = { key: 'u', ctrlKey: true }

      expect(matchesShortcut(event, shortcutKey)).toBe(true)
    })
  })

  describe('formatShortcutKey', () => {
    it('should format simple key', () => {
      const key: ShortcutKey = { key: 'a' }
      const formatted = formatShortcutKey(key)
      expect(formatted).toBe('A')
    })

    it('should format Escape key', () => {
      const key: ShortcutKey = { key: 'Escape' }
      const formatted = formatShortcutKey(key)
      expect(formatted).toBe('Esc')
    })

    it('should format key with modifiers', () => {
      const key: ShortcutKey = { key: 'k', ctrlKey: true }
      const formatted = formatShortcutKey(key)
      // Should contain the key K and either Ctrl or ⌘
      expect(formatted).toMatch(/K/)
      expect(formatted.length).toBeGreaterThan(1)
    })

    it('should format key with Shift', () => {
      const key: ShortcutKey = { key: 'n', ctrlKey: true, shiftKey: true }
      const formatted = formatShortcutKey(key)
      expect(formatted).toMatch(/N/)
      expect(formatted).toMatch(/Shift|⇧/)
    })

    it('should handle slash key', () => {
      const key: ShortcutKey = { key: '/' }
      const formatted = formatShortcutKey(key)
      expect(formatted).toBe('/')
    })
  })

  describe('getActionLabel', () => {
    it('should return label for openChat', () => {
      expect(getActionLabel('openChat')).toBe('Toggle Chat')
    })

    it('should return label for openSettings', () => {
      expect(getActionLabel('openSettings')).toBe('Open Settings')
    })

    it('should return label for openShortcuts', () => {
      expect(getActionLabel('openShortcuts')).toBe('Keyboard Shortcuts')
    })

    it('should return label for focusSearch', () => {
      expect(getActionLabel('focusSearch')).toBe('Focus Search')
    })

    it('should return label for toggleWeather', () => {
      expect(getActionLabel('toggleWeather')).toBe('Toggle Weather')
    })

    it('should return label for newChat', () => {
      expect(getActionLabel('newChat')).toBe('New Chat')
    })

    it('should return label for focusChatPrompt', () => {
      expect(getActionLabel('focusChatPrompt')).toBe('Focus Chat Input')
    })

    it('should return label for uploadFile', () => {
      expect(getActionLabel('uploadFile')).toBe('Upload File')
    })

    it('should return label for escape', () => {
      expect(getActionLabel('escape')).toBe('Close/Unfocus')
    })
  })

  describe('DEFAULT_SHORTCUTS', () => {
    it('should contain all required shortcut actions', () => {
      const actions = DEFAULT_SHORTCUTS.map(s => s.action)

      expect(actions).toContain('openChat')
      expect(actions).toContain('openSettings')
      expect(actions).toContain('openShortcuts')
      expect(actions).toContain('focusSearch')
      expect(actions).toContain('toggleWeather')
      expect(actions).toContain('newChat')
      expect(actions).toContain('focusChatPrompt')
      expect(actions).toContain('uploadFile')
      expect(actions).toContain('escape')
    })

    it('should have unique actions', () => {
      const actions = DEFAULT_SHORTCUTS.map(s => s.action)
      const uniqueActions = new Set(actions)

      expect(actions.length).toBe(uniqueActions.size)
    })

    it('should have proper categories', () => {
      DEFAULT_SHORTCUTS.forEach(shortcut => {
        expect(['navigation', 'chat', 'interface']).toContain(shortcut.category)
      })
    })

    it('should have descriptions for all shortcuts', () => {
      DEFAULT_SHORTCUTS.forEach(shortcut => {
        expect(shortcut.description).toBeTruthy()
        expect(shortcut.description.length).toBeGreaterThan(0)
      })
    })

    it('should have valid key bindings', () => {
      DEFAULT_SHORTCUTS.forEach(shortcut => {
        expect(shortcut.key.key).toBeTruthy()
        expect(shortcut.key.key.length).toBeGreaterThan(0)
      })
    })

    it('should have Ctrl+K for openChat', () => {
      const openChat = DEFAULT_SHORTCUTS.find(s => s.action === 'openChat')
      expect(openChat?.key).toEqual({ key: 'k', ctrlKey: true })
    })

    it('should have Ctrl+Shift+N for newChat', () => {
      const newChat = DEFAULT_SHORTCUTS.find(s => s.action === 'newChat')
      expect(newChat?.key).toEqual({ key: 'n', ctrlKey: true, shiftKey: true })
    })

    it('should have Ctrl+I for focusChatPrompt', () => {
      const focusChatPrompt = DEFAULT_SHORTCUTS.find(s => s.action === 'focusChatPrompt')
      expect(focusChatPrompt?.key).toEqual({ key: 'i', ctrlKey: true })
    })

    it('should have Ctrl+U for uploadFile', () => {
      const uploadFile = DEFAULT_SHORTCUTS.find(s => s.action === 'uploadFile')
      expect(uploadFile?.key).toEqual({ key: 'u', ctrlKey: true })
    })

    it('should have / for focusSearch', () => {
      const focusSearch = DEFAULT_SHORTCUTS.find(s => s.action === 'focusSearch')
      expect(focusSearch?.key).toEqual({ key: '/' })
    })

    it('should have Escape for escape action', () => {
      const escape = DEFAULT_SHORTCUTS.find(s => s.action === 'escape')
      expect(escape?.key).toEqual({ key: 'Escape' })
    })
  })
})
