import { describe, it, expect } from 'vitest'
import { searchSettings, highlightMatch, SEARCHABLE_ITEMS } from '@/lib/settings-search'

describe('Settings Search', () => {
  describe('searchSettings', () => {
    describe('Query Validation', () => {
      it('should return empty array for empty query', () => {
        const results = searchSettings('')
        expect(results).toEqual([])
      })

      it('should return empty array for whitespace query', () => {
        const results = searchSettings('   ')
        expect(results).toEqual([])
      })

      it('should return empty array for single character query', () => {
        const results = searchSettings('a')
        expect(results).toEqual([])
      })

      it('should return results for 2+ character query', () => {
        const results = searchSettings('se')
        expect(results.length).toBeGreaterThan(0)
      })
    })

    describe('Exact Matches', () => {
      it('should find exact section match', () => {
        const results = searchSettings('Security')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].title).toBe('Security')
        expect(results[0].matchType).toBe('exact')
      })

      it('should find exact setting match', () => {
        const results = searchSettings('Temperature')
        expect(results.some(r => r.title === 'Temperature')).toBe(true)
      })

      it('should be case insensitive', () => {
        const results = searchSettings('SECURITY')
        expect(results.some(r => r.title === 'Security')).toBe(true)
      })

      it('should score exact match highest', () => {
        const results = searchSettings('chat')
        const chatSection = results.find(r => r.title === 'Chat')
        expect(chatSection).toBeDefined()
        expect(chatSection!.score).toBeGreaterThan(90)
      })
    })

    describe('Partial Matches', () => {
      it('should find partial match in title', () => {
        const results = searchSettings('key')
        expect(results.some(r => r.title.toLowerCase().includes('key'))).toBe(true)
      })

      it('should find match at start of word', () => {
        const results = searchSettings('api')
        expect(results.some(r => r.title === 'API Keys')).toBe(true)
      })

      it('should score earlier matches higher', () => {
        const results = searchSettings('key')
        const apiKeys = results.find(r => r.title === 'API Keys')
        expect(apiKeys).toBeDefined()
        expect(apiKeys!.score).toBeGreaterThan(50)
      })
    })

    describe('Alias Matching', () => {
      it('should match by alias', () => {
        const results = searchSettings('hotkeys')
        expect(results.some(r => r.id === 'keyboard-shortcuts')).toBe(true)
      })

      it('should match security typo alias', () => {
        const results = searchSettings('securety')
        expect(results.some(r => r.title === 'Security')).toBe(true)
      })

      it('should match chat alias "ai"', () => {
        const results = searchSettings('ai')
        expect(results.some(r => r.title === 'Chat')).toBe(true)
      })

      it('should match OpenAI aliases', () => {
        const results = searchSettings('gpt')
        expect(results.some(r => r.title === 'OpenAI API Key')).toBe(true)
      })

      it('should match Anthropic aliases', () => {
        const results = searchSettings('claude')
        expect(results.some(r => r.title === 'Anthropic API Key')).toBe(true)
      })

      it('should match Gemini aliases', () => {
        const results = searchSettings('bard')
        expect(results.some(r => r.title === 'Google Gemini API Key')).toBe(true)
      })
    })

    describe('Keyword Matching', () => {
      it('should match by keyword', () => {
        const results = searchSettings('encryption')
        expect(results.some(r => r.title === 'Security')).toBe(true)
      })

      it('should match widget keywords', () => {
        const results = searchSettings('weather')
        expect(results.some(r => r.title === 'Widgets')).toBe(true)
      })

      it('should score keywords lower than aliases', () => {
        const results = searchSettings('temperature')
        const exactMatch = results.find(r => r.title === 'Temperature')
        expect(exactMatch).toBeDefined()
        expect(exactMatch!.matchType).toBe('exact')
      })
    })

    describe('Fuzzy Matching', () => {
      it('should find fuzzy matches for typos', () => {
        const results = searchSettings('secrty')
        expect(results.some(r => r.title === 'Security')).toBe(true)
      })

      it('should find fuzzy matches with transposed letters', () => {
        const results = searchSettings('caht')
        expect(results.some(r => r.title === 'Chat')).toBe(true)
      })

      it('should not match very different words', () => {
        const results = searchSettings('xyz')
        expect(results.length).toBe(0)
      })
    })

    describe('Result Scoring and Ordering', () => {
      it('should order results by relevance', () => {
        const results = searchSettings('search')
        expect(results.length).toBeGreaterThan(0)
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
        }
      })

      it('should prefer sections over settings for broad queries', () => {
        const results = searchSettings('widget')
        const widgetsSection = results.find(r => r.id === 'widgets')
        expect(widgetsSection).toBeDefined()
        expect(results.indexOf(widgetsSection!)).toBe(0)
      })

      it('should limit results to 8 items', () => {
        const results = searchSettings('se')
        expect(results.length).toBeLessThanOrEqual(8)
      })

      it('should deduplicate section and child settings intelligently', () => {
        const results = searchSettings('api')
        const sectionIds = results.map(r => r.id)
        const uniqueIds = new Set(sectionIds)
        expect(sectionIds.length).toBe(uniqueIds.size)
      })
    })

    describe('Visibility Context Filtering', () => {
      describe('Widget Requirements', () => {
        it('should hide widget-specific settings when widget is disabled', () => {
          const results = searchSettings('quick jot', {
            widgets: [{ type: 'notes', enabled: false }],
          })
          expect(results.some(r => r.id === 'quick-jot-mode')).toBe(false)
        })

        it('should show widget-specific settings when widget is enabled', () => {
          const results = searchSettings('quick jot', {
            widgets: [{ type: 'notes', enabled: true }],
          })
          expect(results.some(r => r.id === 'quick-jot-mode')).toBe(true)
        })

        it('should filter weather widget settings', () => {
          const resultsWithoutWidget = searchSettings('moon', {
            widgets: [{ type: 'weather', enabled: false }],
          })
          expect(resultsWithoutWidget.some(r => r.id === 'moon-information')).toBe(false)

          const resultsWithWidget = searchSettings('moon', {
            widgets: [{ type: 'weather', enabled: true }],
          })
          expect(resultsWithWidget.some(r => r.id === 'moon-information')).toBe(true)
        })

        it('should filter pomodoro widget settings', () => {
          const results = searchSettings('notification sound', {
            widgets: [{ type: 'pomodoro', enabled: true }],
          })
          expect(results.some(r => r.id === 'notification-sound')).toBe(true)
        })

        it('should filter ticker widget settings', () => {
          const results = searchSettings('ticker symbols', {
            widgets: [{ type: 'ticker', enabled: true }],
          })
          expect(results.some(r => r.id === 'ticker-symbols')).toBe(true)
        })

        it('should filter habit tracker widget settings', () => {
          const results = searchSettings('habit management', {
            widgets: [{ type: 'habitTracker', enabled: true }],
          })
          expect(results.some(r => r.id === 'habit-tracker-habits')).toBe(true)
        })
      })

      describe('Security Requirements', () => {
        it('should show lock session when security is enabled and unlocked', () => {
          const results = searchSettings('lock session', {
            securityEnabled: true,
            securityUnlocked: true,
          })
          expect(results.some(r => r.id === 'lock-session')).toBe(true)
        })

        it('should hide lock session when security is disabled', () => {
          const results = searchSettings('lock session', {
            securityEnabled: false,
            securityUnlocked: false,
          })
          expect(results.some(r => r.id === 'lock-session')).toBe(false)
        })

        it('should show unlock session when security is enabled and locked', () => {
          const results = searchSettings('unlock session', {
            securityEnabled: true,
            securityUnlocked: false,
          })
          expect(results.some(r => r.id === 'unlock-session')).toBe(true)
        })

        it('should hide unlock session when already unlocked', () => {
          const results = searchSettings('unlock', {
            securityEnabled: true,
            securityUnlocked: true,
          })
          expect(results.some(r => r.id === 'unlock-session')).toBe(false)
        })

        it('should show change password when unlocked', () => {
          const results = searchSettings('change password', {
            securityEnabled: true,
            securityUnlocked: true,
          })
          expect(results.some(r => r.id === 'change-password')).toBe(true)
        })

        it('should hide change password when locked', () => {
          const results = searchSettings('change password', {
            securityEnabled: true,
            securityUnlocked: false,
          })
          expect(results.some(r => r.id === 'change-password')).toBe(false)
        })

        it('should show disable password when unlocked', () => {
          const results = searchSettings('disable', {
            securityEnabled: true,
            securityUnlocked: true,
          })
          expect(results.some(r => r.id === 'disable-password-protection')).toBe(true)
        })
      })
    })

    describe('Comprehensive Search Coverage', () => {
      it('should find search engine settings', () => {
        const results = searchSettings('search engine')
        expect(results.some(r => r.id === 'search-engine')).toBe(true)
      })

      it('should find custom search engine setting', () => {
        const results = searchSettings('custom search')
        expect(results.some(r => r.id === 'custom-search-engine')).toBe(true)
      })

      it('should find import/export section', () => {
        const results = searchSettings('backup')
        expect(results.some(r => r.id === 'import-export')).toBe(true)
      })

      it('should find danger zone', () => {
        const results = searchSettings('delete')
        expect(results.some(r => r.id === 'danger-zone' || r.id === 'clear-all-data')).toBe(true)
      })

      it('should find quick links section', () => {
        const results = searchSettings('bookmarks')
        expect(results.some(r => r.id === 'quick-links')).toBe(true)
      })

      it('should find keyboard shortcuts', () => {
        const results = searchSettings('keybinds')
        expect(results.some(r => r.id === 'keyboard-shortcuts')).toBe(true)
      })

      it('should find about section', () => {
        const results = searchSettings('version')
        expect(results.some(r => r.id === 'about')).toBe(true)
      })
    })
  })

  describe('highlightMatch', () => {
    it('should highlight exact match', () => {
      const result = highlightMatch('Security', 'secu')
      expect(result).toEqual([
        { text: 'Secu', highlighted: true },
        { text: 'rity', highlighted: false },
      ])
    })

    it('should highlight match in middle', () => {
      const result = highlightMatch('API Keys', 'key')
      expect(result).toEqual([
        { text: 'API ', highlighted: false },
        { text: 'Key', highlighted: true },
        { text: 's', highlighted: false },
      ])
    })

    it('should highlight match at end', () => {
      const result = highlightMatch('About', 'out')
      expect(result).toEqual([
        { text: 'Ab', highlighted: false },
        { text: 'out', highlighted: true },
      ])
    })

    it('should return unhighlighted text when no match', () => {
      const result = highlightMatch('Security', 'xyz')
      expect(result).toEqual([{ text: 'Security', highlighted: false }])
    })

    it('should be case insensitive', () => {
      const result = highlightMatch('Security', 'SECU')
      expect(result[0].highlighted).toBe(true)
    })

    it('should preserve original case in result', () => {
      const result = highlightMatch('Security', 'secu')
      expect(result[0].text).toBe('Secu')
    })

    it('should handle full match', () => {
      const result = highlightMatch('Chat', 'chat')
      expect(result).toEqual([{ text: 'Chat', highlighted: true }])
    })

    it('should handle empty query', () => {
      const result = highlightMatch('Security', '')
      // Empty query matches at index 0, creates an empty highlighted part and the full text unhighlighted
      expect(result).toEqual([
        { text: '', highlighted: true },
        { text: 'Security', highlighted: false }
      ])
    })
  })

  describe('SEARCHABLE_ITEMS data integrity', () => {
    it('should have unique IDs', () => {
      const ids = SEARCHABLE_ITEMS.map(item => item.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size)
    })

    it('should have valid types', () => {
      const validTypes = ['section', 'setting']
      SEARCHABLE_ITEMS.forEach(item => {
        expect(validTypes).toContain(item.type)
      })
    })

    it('should have all settings reference valid sections', () => {
      const sectionIds = SEARCHABLE_ITEMS
        .filter(item => item.type === 'section')
        .map(item => item.id)

      SEARCHABLE_ITEMS
        .filter(item => item.type === 'setting' && item.section)
        .forEach(item => {
          expect(sectionIds).toContain(item.section!)
        })
    })

    it('should have all items with non-empty paths', () => {
      SEARCHABLE_ITEMS.forEach(item => {
        expect(item.path.length).toBeGreaterThan(0)
        item.path.forEach(segment => {
          expect(segment.trim().length).toBeGreaterThan(0)
        })
      })
    })

    it('should have all items with at least one alias or keyword', () => {
      SEARCHABLE_ITEMS.forEach(item => {
        const hasAlias = item.aliases.length > 0
        const hasKeyword = item.keywords.length > 0
        expect(hasAlias || hasKeyword).toBe(true)
      })
    })

    it('should have valid widget requirements', () => {
      const validWidgets = ['notes', 'weather', 'pomodoro', 'ticker', 'habitTracker']
      SEARCHABLE_ITEMS
        .filter(item => item.requiresWidget)
        .forEach(item => {
          expect(validWidgets).toContain(item.requiresWidget!)
        })
    })

    it('should have valid security requirements', () => {
      const validSecurityStates = ['enabled', 'unlocked', 'locked']
      SEARCHABLE_ITEMS
        .filter(item => item.requiresSecurity)
        .forEach(item => {
          expect(validSecurityStates).toContain(item.requiresSecurity!)
        })
    })
  })
})
