import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { PrefsProvider, usePrefs, type Prefs, type QuickLink } from '@/lib/prefs'
import { DEFAULT_WIDGETS } from '@/lib/widgets'

const DEFAULT_PREFS: Prefs = {
  widgets: DEFAULT_WIDGETS,
  showChat: true,
  showQuickLinks: true,
  showVerifiedOrgModels: false,
  links: [
    { id: "1", label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { id: "2", label: "GitHub", href: "https://github.com", icon: "github" },
    { id: "3", label: "Proton Mail", href: "https://mail.proton.me", icon: "mail" },
    { id: "4", label: "Drive", href: "https://drive.google.com", icon: "drive" },
  ],
  chatModel: { provider: "openai", model: "gpt-4o" },
  conversations: [],
  searchEngineId: "duckduckgo",
  customSearchEngines: [],
}

describe('PrefsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should provide default preferences when localStorage is empty', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    expect(result.current.prefs).toEqual(DEFAULT_PREFS)
  })

  it('should load preferences from localStorage', () => {
    const customPrefs: Prefs = {
      ...DEFAULT_PREFS,
      widgets: [],
      links: [{ id: "test", label: "Test", href: "https://test.com", icon: "globe" }],
    }

    localStorage.setItem('startpage:prefs', JSON.stringify(customPrefs))

    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    expect(result.current.prefs.widgets).toEqual([])
    expect(result.current.prefs.links).toEqual(customPrefs.links)
  })

  it('should persist preferences to localStorage when changed', async () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        widgets: [],
      }))
    })

    await waitFor(() => {
      const stored = localStorage.getItem('startpage:prefs')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.widgets).toEqual([])
    })
  })

  it('should update showChat preference', async () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        showChat: false,
      }))
    })

    expect(result.current.prefs.showChat).toBe(false)

    await waitFor(() => {
      const stored = localStorage.getItem('startpage:prefs')
      const parsed = JSON.parse(stored!)
      expect(parsed.showChat).toBe(false)
    })
  })

  it('should add a new quick link', async () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    const newLink: QuickLink = {
      id: "5",
      label: "GitHub",
      href: "https://github.com",
      icon: "github",
    }

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        links: [...prev.links, newLink],
      }))
    })

    expect(result.current.prefs.links).toHaveLength(5)
    expect(result.current.prefs.links[4]).toEqual(newLink)
  })

  it('should remove a quick link', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        links: prev.links.filter(link => link.id !== "1"),
      }))
    })

    expect(result.current.prefs.links).toHaveLength(3)
    expect(result.current.prefs.links.find(l => l.id === "1")).toBeUndefined()
  })

  it('should update an existing quick link', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    const updatedLink: QuickLink = {
      id: "1",
      label: "My YouTube",
      href: "https://youtube.com/feed/subscriptions",
      icon: "youtube",
    }

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        links: prev.links.map(link =>
          link.id === "1" ? updatedLink : link
        ),
      }))
    })

    const link = result.current.prefs.links.find(l => l.id === "1")
    expect(link?.label).toBe("My YouTube")
    expect(link?.href).toBe("https://youtube.com/feed/subscriptions")
  })

  it('should change chat model', async () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        chatModel: { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
      }))
    })

    expect(result.current.prefs.chatModel.provider).toBe("anthropic")
    expect(result.current.prefs.chatModel.model).toBe("claude-sonnet-4-5-20250929")
  })

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('startpage:prefs', 'invalid-json{')

    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    expect(result.current.prefs).toEqual(DEFAULT_PREFS)
  })

  it('should sync preferences across tabs via storage event', async () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    const newPrefs: Prefs = {
      ...DEFAULT_PREFS,
      widgets: [],
      showChat: false,
    }

    // Simulate storage event from another tab
    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'startpage:prefs',
        newValue: JSON.stringify(newPrefs),
        oldValue: JSON.stringify(DEFAULT_PREFS),
        storageArea: localStorage,
      })
      window.dispatchEvent(storageEvent)
    })

    await waitFor(() => {
      expect(result.current.prefs.widgets).toEqual([])
      expect(result.current.prefs.showChat).toBe(false)
    })
  })

  it('should ignore storage events with invalid JSON', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    const initialPrefs = result.current.prefs

    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'startpage:prefs',
        newValue: 'invalid-json{',
        storageArea: localStorage,
      })
      window.dispatchEvent(storageEvent)
    })

    expect(result.current.prefs).toEqual(initialPrefs)
  })

  it('should ignore storage events for other keys', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    const initialPrefs = result.current.prefs

    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify({ foo: 'bar' }),
        storageArea: localStorage,
      })
      window.dispatchEvent(storageEvent)
    })

    expect(result.current.prefs).toEqual(initialPrefs)
  })

  it('should throw error when usePrefs is used outside PrefsProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => usePrefs())
    }).toThrow('usePrefs must be used within <PrefsProvider>')

    consoleSpy.mockRestore()
  })

  it('should handle adding conversations', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    const newConversation = {
      id: "conv-1",
      title: "Test Conversation",
      model: { provider: "openai" as const, model: "gpt-4o" as const },
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        conversations: [...prev.conversations, newConversation],
      }))
    })

    expect(result.current.prefs.conversations).toHaveLength(1)
    expect(result.current.prefs.conversations[0]).toEqual(newConversation)
  })

  it('should toggle showVerifiedOrgModels preference', () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    expect(result.current.prefs.showVerifiedOrgModels).toBe(false)

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        showVerifiedOrgModels: true,
      }))
    })

    expect(result.current.prefs.showVerifiedOrgModels).toBe(true)
  })

  describe('Search Engines', () => {
    it('should have default search engine as duckduckgo', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      expect(result.current.prefs.searchEngineId).toBe('duckduckgo')
    })

    it('should change search engine', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          searchEngineId: 'google',
        }))
      })

      expect(result.current.prefs.searchEngineId).toBe('google')
    })

    it('should persist search engine preference', async () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          searchEngineId: 'brave',
        }))
      })

      await waitFor(() => {
        const stored = localStorage.getItem('startpage:prefs')
        const parsed = JSON.parse(stored!)
        expect(parsed.searchEngineId).toBe('brave')
      })
    })

    it('should load search engine from localStorage', () => {
      const customPrefs = {
        ...DEFAULT_PREFS,
        searchEngineId: 'ecosia',
      }

      localStorage.setItem('startpage:prefs', JSON.stringify(customPrefs))

      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      expect(result.current.prefs.searchEngineId).toBe('ecosia')
    })

    it('should support all built-in search engines', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const builtInEngines = ['duckduckgo', 'google', 'bing', 'brave', 'startpage', 'ecosia', 'qwant']

      builtInEngines.forEach(engineId => {
        act(() => {
          result.current.setPrefs(prev => ({
            ...prev,
            searchEngineId: engineId,
          }))
        })

        expect(result.current.prefs.searchEngineId).toBe(engineId)
      })
    })

    it('should initialize customSearchEngines as empty array', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      expect(result.current.prefs.customSearchEngines).toEqual([])
    })

    it('should add custom search engine', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const customEngine = {
        id: 'custom-1',
        name: 'My Custom Search',
        url: 'https://custom.com/search?q={searchTerms}',
        isCustom: true,
      }

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: [...prev.customSearchEngines, customEngine],
        }))
      })

      expect(result.current.prefs.customSearchEngines).toHaveLength(1)
      expect(result.current.prefs.customSearchEngines[0]).toEqual(customEngine)
    })

    it('should remove custom search engine', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const customEngine1 = {
        id: 'custom-1',
        name: 'Custom 1',
        url: 'https://custom1.com/search?q={searchTerms}',
        isCustom: true,
      }

      const customEngine2 = {
        id: 'custom-2',
        name: 'Custom 2',
        url: 'https://custom2.com/search?q={searchTerms}',
        isCustom: true,
      }

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: [customEngine1, customEngine2],
        }))
      })

      expect(result.current.prefs.customSearchEngines).toHaveLength(2)

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: prev.customSearchEngines.filter(e => e.id !== 'custom-1'),
        }))
      })

      expect(result.current.prefs.customSearchEngines).toHaveLength(1)
      expect(result.current.prefs.customSearchEngines[0].id).toBe('custom-2')
    })

    it('should edit custom search engine', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const customEngine = {
        id: 'custom-1',
        name: 'Original Name',
        url: 'https://original.com/search?q={searchTerms}',
        isCustom: true,
      }

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: [customEngine],
        }))
      })

      const updatedEngine = {
        ...customEngine,
        name: 'Updated Name',
        url: 'https://updated.com/search?q={searchTerms}',
      }

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: prev.customSearchEngines.map(e =>
            e.id === 'custom-1' ? updatedEngine : e
          ),
        }))
      })

      expect(result.current.prefs.customSearchEngines[0].name).toBe('Updated Name')
      expect(result.current.prefs.customSearchEngines[0].url).toBe('https://updated.com/search?q={searchTerms}')
    })

    it('should persist custom search engines to localStorage', async () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const customEngine = {
        id: 'custom-1',
        name: 'Custom',
        url: 'https://custom.com/search?q={searchTerms}',
        isCustom: true,
      }

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: [customEngine],
        }))
      })

      await waitFor(() => {
        const stored = localStorage.getItem('startpage:prefs')
        const parsed = JSON.parse(stored!)
        expect(parsed.customSearchEngines).toHaveLength(1)
        expect(parsed.customSearchEngines[0]).toEqual(customEngine)
      })
    })

    it('should switch to custom search engine', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const customEngine = {
        id: 'my-custom',
        name: 'My Search',
        url: 'https://mysearch.com/search?q={searchTerms}',
        isCustom: true,
      }

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: [customEngine],
          searchEngineId: 'my-custom',
        }))
      })

      expect(result.current.prefs.searchEngineId).toBe('my-custom')
      expect(result.current.prefs.customSearchEngines[0].id).toBe('my-custom')
    })

    it('should handle multiple custom search engines', () => {
      const { result } = renderHook(() => usePrefs(), {
        wrapper: PrefsProvider,
      })

      const engines = [
        { id: 'custom-1', name: 'Engine 1', url: 'https://1.com?q={searchTerms}', isCustom: true },
        { id: 'custom-2', name: 'Engine 2', url: 'https://2.com?q={searchTerms}', isCustom: true },
        { id: 'custom-3', name: 'Engine 3', url: 'https://3.com?q={searchTerms}', isCustom: true },
      ]

      act(() => {
        result.current.setPrefs(prev => ({
          ...prev,
          customSearchEngines: engines,
        }))
      })

      expect(result.current.prefs.customSearchEngines).toHaveLength(3)
    })
  })
})
