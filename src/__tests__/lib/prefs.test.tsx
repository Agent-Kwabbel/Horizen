import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { PrefsProvider, usePrefs, type Prefs, type QuickLink } from '@/lib/prefs'

const DEFAULT_PREFS: Prefs = {
  showWeather: true,
  showChat: true,
  showVerifiedOrgModels: false,
  links: [
    { id: "1", label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { id: "2", label: "ChatGPT", href: "https://chat.openai.com", icon: "chat" },
    { id: "3", label: "Proton Mail", href: "https://mail.proton.me", icon: "mail" },
    { id: "4", label: "Drive", href: "https://drive.google.com", icon: "drive" },
  ],
  chatModel: { provider: "openai", model: "gpt-4o" },
  conversations: [],
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
      showWeather: false,
      links: [{ id: "test", label: "Test", href: "https://test.com", icon: "globe" }],
    }

    localStorage.setItem('startpage:prefs', JSON.stringify(customPrefs))

    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    expect(result.current.prefs.showWeather).toBe(false)
    expect(result.current.prefs.links).toEqual(customPrefs.links)
  })

  it('should persist preferences to localStorage when changed', async () => {
    const { result } = renderHook(() => usePrefs(), {
      wrapper: PrefsProvider,
    })

    act(() => {
      result.current.setPrefs(prev => ({
        ...prev,
        showWeather: false,
      }))
    })

    await waitFor(() => {
      const stored = localStorage.getItem('startpage:prefs')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.showWeather).toBe(false)
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
      showWeather: false,
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
      expect(result.current.prefs.showWeather).toBe(false)
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
})
