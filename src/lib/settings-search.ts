export type SearchableItem = {
  id: string
  type: 'section' | 'setting'
  title: string
  aliases: string[]
  keywords: string[]
  section?: string
  description?: string
  path: string[]
  requiresWidget?: string
  requiresSecurity?: 'enabled' | 'unlocked' | 'locked'
}

export type SearchResult = SearchableItem & {
  score: number
  matchType: 'exact' | 'alias' | 'keyword' | 'fuzzy'
  matchedText?: string
}

export const SEARCHABLE_ITEMS: SearchableItem[] = [
  {
    id: 'search-engine',
    type: 'section',
    title: 'Search Engine',
    aliases: ['search', 'engine', 'default search', 'google', 'duckduckgo'],
    keywords: ['browser', 'lookup', 'find', 'web'],
    path: ['Search Engine'],
  },
  {
    id: 'custom-search-engine',
    type: 'setting',
    title: 'Custom Search Engine',
    section: 'search-engine',
    aliases: ['custom', 'url', 'custom url'],
    keywords: ['personalize', 'own'],
    path: ['Search Engine', 'Custom Search Engine'],
    description: 'Add your own search engine URL',
  },
  {
    id: 'widgets',
    type: 'section',
    title: 'Widgets',
    aliases: ['widget', 'components', 'modules', 'blocks'],
    keywords: ['weather', 'clock', 'notes', 'ticker', 'pomodoro', 'habit'],
    path: ['Widgets'],
  },
  {
    id: 'chat',
    type: 'section',
    title: 'Chat',
    aliases: ['ai', 'assistant', 'conversation', 'chatbot'],
    keywords: ['openai', 'anthropic', 'gemini', 'claude', 'gpt'],
    path: ['Chat'],
  },
  {
    id: 'enable-chat',
    type: 'setting',
    title: 'Enable Chat',
    section: 'chat',
    aliases: ['enable', 'turn on', 'activate'],
    keywords: ['show', 'display'],
    path: ['Chat', 'Enable Chat'],
    description: 'Show or hide the chat feature',
  },
  {
    id: 'api-keys',
    type: 'section',
    title: 'API Keys',
    aliases: ['keys', 'api', 'credentials', 'tokens', 'secrets'],
    keywords: ['openai', 'anthropic', 'gemini', 'authentication'],
    path: ['API Keys'],
  },
  {
    id: 'openai-key',
    type: 'setting',
    title: 'OpenAI API Key',
    section: 'api-keys',
    aliases: ['openai', 'gpt', 'chatgpt'],
    keywords: ['key', 'token'],
    path: ['API Keys', 'OpenAI'],
  },
  {
    id: 'anthropic-key',
    type: 'setting',
    title: 'Anthropic API Key',
    section: 'api-keys',
    aliases: ['anthropic', 'claude'],
    keywords: ['key', 'token'],
    path: ['API Keys', 'Anthropic'],
  },
  {
    id: 'gemini-key',
    type: 'setting',
    title: 'Google Gemini API Key',
    section: 'api-keys',
    aliases: ['gemini', 'google', 'bard'],
    keywords: ['key', 'token'],
    path: ['API Keys', 'Google Gemini'],
  },
  {
    id: 'security',
    type: 'section',
    title: 'Security',
    aliases: ['securety', 'safety', 'protection', 'privacy', 'lock'],
    keywords: ['password', 'encryption', 'unlock', 'secure'],
    path: ['Security'],
  },
  {
    id: 'password-protection',
    type: 'setting',
    title: 'Password Protection',
    section: 'security',
    aliases: ['pass', 'password', 'lock', 'protect'],
    keywords: ['unlock', 'secure', 'encryption'],
    path: ['Security', 'Password Protection'],
    description: 'Protect your data with a password',
  },
  {
    id: 'model-settings',
    type: 'section',
    title: 'Model Settings',
    aliases: ['models', 'ai settings', 'llm', 'parameters'],
    keywords: ['temperature', 'tokens', 'max', 'settings'],
    path: ['Model Settings'],
  },
  {
    id: 'temperature',
    type: 'setting',
    title: 'Temperature',
    section: 'model-settings',
    aliases: ['temp', 'randomness', 'creativity'],
    keywords: ['control', 'generation'],
    path: ['Model Settings', 'Temperature'],
    description: 'Control response randomness',
  },
  {
    id: 'max-tokens',
    type: 'setting',
    title: 'Max Tokens',
    section: 'model-settings',
    aliases: ['tokens', 'length', 'limit', 'maximum'],
    keywords: ['response', 'output'],
    path: ['Model Settings', 'Max Tokens'],
    description: 'Maximum response length',
  },
  {
    id: 'danger-zone',
    type: 'section',
    title: 'Danger Zone',
    aliases: ['reset', 'clear', 'delete', 'danger', 'erase'],
    keywords: ['remove', 'wipe', 'factory'],
    path: ['Danger Zone'],
  },
  {
    id: 'clear-all-data',
    type: 'setting',
    title: 'Clear All Data',
    section: 'danger-zone',
    aliases: ['clear', 'delete', 'remove', 'reset', 'wipe'],
    keywords: ['factory', 'erase', 'all'],
    path: ['Danger Zone', 'Clear All Data'],
    description: 'Delete all stored data',
  },
  {
    id: 'import-export',
    type: 'section',
    title: 'Import & Export',
    aliases: ['backup', 'restore', 'import', 'export', 'data', 'transfer'],
    keywords: ['save', 'load', 'file'],
    path: ['Import & Export'],
  },
  {
    id: 'export-data',
    type: 'setting',
    title: 'Export Data',
    section: 'import-export',
    aliases: ['export', 'backup', 'save', 'download'],
    keywords: ['file', 'json'],
    path: ['Import & Export', 'Export'],
  },
  {
    id: 'import-data',
    type: 'setting',
    title: 'Import Data',
    section: 'import-export',
    aliases: ['import', 'restore', 'load', 'upload'],
    keywords: ['file', 'json'],
    path: ['Import & Export', 'Import'],
  },
  {
    id: 'keyboard-shortcuts',
    type: 'section',
    title: 'Keyboard Shortcuts',
    aliases: ['shortcuts', 'hotkeys', 'keys', 'keybinds', 'bindings'],
    keywords: ['keyboard', 'commands'],
    path: ['Keyboard Shortcuts'],
  },
  {
    id: 'quick-links',
    type: 'section',
    title: 'Quick Links',
    aliases: ['links', 'bookmarks', 'favorites', 'shortcuts'],
    keywords: ['url', 'website', 'bookmark'],
    path: ['Quick Links'],
  },
  {
    id: 'about',
    type: 'section',
    title: 'About',
    aliases: ['info', 'information', 'version', 'license', 'about'],
    keywords: ['horizen', 'credits', 'github'],
    path: ['About'],
  },
  {
    id: 'manage-widgets',
    type: 'setting',
    title: 'Manage Widgets',
    section: 'widgets',
    aliases: ['widget settings', 'configure widgets', 'widget config'],
    keywords: ['add', 'remove', 'enable', 'disable', 'reorder'],
    path: ['Widgets', 'Manage Widgets'],
    description: 'Add, remove, and configure widgets',
  },
  {
    id: 'quick-jot-mode',
    type: 'setting',
    title: 'Quick Jot Mode',
    section: 'widgets',
    aliases: ['quick jot', 'editor mode', 'notes mode'],
    keywords: ['notes', 'editor', 'markdown', 'preview'],
    path: ['Widgets', 'Notes', 'Quick Jot Mode'],
    description: 'Always show editor without markdown preview',
    requiresWidget: 'notes',
  },
  {
    id: 'unlimited-height',
    type: 'setting',
    title: 'Unlimited Height',
    section: 'widgets',
    aliases: ['unlimited', 'height', 'expand', 'full height'],
    keywords: ['notes', 'expand', 'scrolling'],
    path: ['Widgets', 'Notes', 'Unlimited Height'],
    description: 'Remove height limit for notes widget',
    requiresWidget: 'notes',
  },
  {
    id: 'unit-system',
    type: 'setting',
    title: 'Unit System',
    section: 'widgets',
    aliases: ['units', 'metric', 'imperial', 'scientific'],
    keywords: ['weather', 'temperature', 'celsius', 'fahrenheit', 'kelvin'],
    path: ['Widgets', 'Weather', 'Unit System'],
    description: 'Choose measurement unit system',
    requiresWidget: 'weather',
  },
  {
    id: 'moon-information',
    type: 'setting',
    title: 'Moon Information',
    section: 'widgets',
    aliases: ['moon', 'moon phase', 'lunar'],
    keywords: ['weather', 'phase', 'illumination', 'moonrise', 'moonset'],
    path: ['Widgets', 'Weather', 'Moon Information'],
    description: 'Display moon phase, rise/set times, and illumination',
    requiresWidget: 'weather',
  },
  {
    id: 'temperature-unit',
    type: 'setting',
    title: 'Temperature Unit',
    section: 'widgets',
    aliases: ['temp', 'celsius', 'fahrenheit', 'kelvin'],
    keywords: ['weather', 'custom units', 'temperature'],
    path: ['Widgets', 'Weather', 'Temperature Unit'],
    description: 'Customize temperature display unit',
    requiresWidget: 'weather',
  },
  {
    id: 'wind-speed-unit',
    type: 'setting',
    title: 'Wind Speed Unit',
    section: 'widgets',
    aliases: ['wind', 'speed', 'kmh', 'mph', 'ms', 'knots', 'beaufort'],
    keywords: ['weather', 'custom units', 'wind force'],
    path: ['Widgets', 'Weather', 'Wind Speed Unit'],
    description: 'Customize wind speed display unit',
    requiresWidget: 'weather',
  },
  {
    id: 'precipitation-unit',
    type: 'setting',
    title: 'Precipitation Unit',
    section: 'widgets',
    aliases: ['precip', 'rain', 'mm', 'inch', 'millimeter'],
    keywords: ['weather', 'custom units', 'rainfall'],
    path: ['Widgets', 'Weather', 'Precipitation Unit'],
    description: 'Customize precipitation display unit',
    requiresWidget: 'weather',
  },
  {
    id: 'pomodoro-duration',
    type: 'setting',
    title: 'Pomodoro Duration',
    section: 'widgets',
    aliases: ['timer', 'work duration', 'focus time'],
    keywords: ['pomodoro', 'minutes', 'session length'],
    path: ['Widgets', 'Pomodoro', 'Pomodoro Duration'],
    description: 'Set work session length in minutes',
    requiresWidget: 'pomodoro',
  },
  {
    id: 'short-break-duration',
    type: 'setting',
    title: 'Short Break Duration',
    section: 'widgets',
    aliases: ['break', 'short break', 'rest time'],
    keywords: ['pomodoro', 'minutes', 'break length'],
    path: ['Widgets', 'Pomodoro', 'Short Break Duration'],
    description: 'Set short break length in minutes',
    requiresWidget: 'pomodoro',
  },
  {
    id: 'long-break-duration',
    type: 'setting',
    title: 'Long Break Duration',
    section: 'widgets',
    aliases: ['break', 'long break', 'rest time'],
    keywords: ['pomodoro', 'minutes', 'break length'],
    path: ['Widgets', 'Pomodoro', 'Long Break Duration'],
    description: 'Set long break length in minutes',
    requiresWidget: 'pomodoro',
  },
  {
    id: 'notification-sound',
    type: 'setting',
    title: 'Notification Sound',
    section: 'widgets',
    aliases: ['sound', 'alert', 'audio', 'beep'],
    keywords: ['pomodoro', 'notification', 'complete'],
    path: ['Widgets', 'Pomodoro', 'Notification Sound'],
    description: 'Play sound when timer completes',
    requiresWidget: 'pomodoro',
  },
  {
    id: 'browser-notifications',
    type: 'setting',
    title: 'Browser Notifications',
    section: 'widgets',
    aliases: ['notifications', 'alerts', 'browser alerts'],
    keywords: ['pomodoro', 'notification', 'permission'],
    path: ['Widgets', 'Pomodoro', 'Browser Notifications'],
    description: 'Show browser notifications when timer completes',
    requiresWidget: 'pomodoro',
  },
  {
    id: 'ticker-symbols',
    type: 'setting',
    title: 'Ticker Symbols',
    section: 'widgets',
    aliases: ['stocks', 'crypto', 'symbols', 'tickers'],
    keywords: ['market', 'add', 'remove', 'configure'],
    path: ['Widgets', 'Ticker', 'Symbols'],
    description: 'Manage stock and crypto symbols',
    requiresWidget: 'ticker',
  },
  {
    id: 'habit-tracker-habits',
    type: 'setting',
    title: 'Habit Management',
    section: 'widgets',
    aliases: ['habits', 'add habit', 'track habits'],
    keywords: ['habit', 'tracker', 'daily', 'weekly'],
    path: ['Widgets', 'Habit Tracker', 'Habits'],
    description: 'Add and manage habits to track',
    requiresWidget: 'habitTracker',
  },
  {
    id: 'lock-session',
    type: 'setting',
    title: 'Lock Session',
    section: 'security',
    aliases: ['lock', 'secure', 'logout'],
    keywords: ['password', 'protect', 'session'],
    path: ['Security', 'Lock Session'],
    description: 'Lock your session to protect API keys',
    requiresSecurity: 'unlocked',
  },
  {
    id: 'unlock-session',
    type: 'setting',
    title: 'Unlock Session',
    section: 'security',
    aliases: ['unlock', 'login', 'access'],
    keywords: ['password', 'session', 'enter'],
    path: ['Security', 'Unlock Session'],
    description: 'Unlock session to access API keys',
    requiresSecurity: 'locked',
  },
  {
    id: 'change-password',
    type: 'setting',
    title: 'Change Password',
    section: 'security',
    aliases: ['password', 'update password', 'new password'],
    keywords: ['security', 'change', 'update'],
    path: ['Security', 'Change Password'],
    description: 'Update your security password',
    requiresSecurity: 'unlocked',
  },
  {
    id: 'enable-password-protection',
    type: 'setting',
    title: 'Enable Password Protection',
    section: 'security',
    aliases: ['enable', 'activate', 'turn on', 'setup password'],
    keywords: ['security', 'protect', 'encryption'],
    path: ['Security', 'Enable Password Protection'],
    description: 'Enable password protection for API keys',
  },
  {
    id: 'disable-password-protection',
    type: 'setting',
    title: 'Disable Password Protection',
    section: 'security',
    aliases: ['disable', 'turn off', 'remove password'],
    keywords: ['security', 'unprotect'],
    path: ['Security', 'Disable Password Protection'],
    description: 'Disable password protection',
    requiresSecurity: 'unlocked',
  },
  {
    id: 'manage-shortcuts',
    type: 'setting',
    title: 'Manage Keyboard Shortcuts',
    section: 'keyboard-shortcuts',
    aliases: ['shortcuts', 'keybinds', 'hotkeys', 'customize keys'],
    keywords: ['keyboard', 'configure', 'commands'],
    path: ['Keyboard Shortcuts', 'Manage Shortcuts'],
    description: 'Customize keyboard shortcuts',
  },
]

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

function calculateMatchScore(query: string, text: string): { score: number; type: 'exact' | 'fuzzy' | 'none' } {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  if (textLower === queryLower) {
    return { score: 100, type: 'exact' }
  }

  if (textLower.includes(queryLower)) {
    const position = textLower.indexOf(queryLower)
    const score = 90 - position * 2
    return { score: Math.max(score, 50), type: 'exact' }
  }

  const distance = levenshteinDistance(queryLower, textLower)
  const maxLength = Math.max(query.length, text.length)
  const similarity = 1 - distance / maxLength

  if (similarity >= 0.6) {
    return { score: similarity * 40, type: 'fuzzy' }
  }

  return { score: 0, type: 'none' }
}

type VisibilityContext = {
  widgets?: Array<{ type: string; enabled: boolean }>
  securityEnabled?: boolean
  securityUnlocked?: boolean
}

function isItemVisible(item: SearchableItem, context: VisibilityContext): boolean {
  if (item.requiresWidget) {
    const hasWidget = context.widgets?.some(
      w => w.type === item.requiresWidget && w.enabled
    )
    if (!hasWidget) return false
  }

  if (item.requiresSecurity) {
    if (item.requiresSecurity === 'enabled' || item.requiresSecurity === 'unlocked' || item.requiresSecurity === 'locked') {
      if (!context.securityEnabled) return false
    }
    if (item.requiresSecurity === 'unlocked') {
      if (!context.securityUnlocked) return false
    }
    if (item.requiresSecurity === 'locked') {
      if (context.securityUnlocked) return false
    }
  }

  return true
}

export function searchSettings(query: string, context: VisibilityContext = {}): SearchResult[] {
  if (!query || query.trim().length < 2) {
    return []
  }

  const results: SearchResult[] = []

  for (const item of SEARCHABLE_ITEMS) {
    if (!isItemVisible(item, context)) {
      continue
    }
    let bestScore = 0
    let matchType: 'exact' | 'alias' | 'keyword' | 'fuzzy' = 'fuzzy'
    let matchedText: string | undefined

    const titleMatch = calculateMatchScore(query, item.title)
    if (titleMatch.score > bestScore) {
      bestScore = titleMatch.score
      matchType = titleMatch.type === 'exact' ? 'exact' : 'fuzzy'
      matchedText = item.title
    }

    for (const alias of item.aliases) {
      const aliasMatch = calculateMatchScore(query, alias)
      if (aliasMatch.score > bestScore) {
        bestScore = aliasMatch.score * 0.95
        matchType = 'alias'
        matchedText = alias
      }
    }

    for (const keyword of item.keywords) {
      const keywordMatch = calculateMatchScore(query, keyword)
      if (keywordMatch.score > bestScore) {
        bestScore = keywordMatch.score * 0.85
        matchType = 'keyword'
        matchedText = keyword
      }
    }

    if (item.description) {
      const descMatch = calculateMatchScore(query, item.description)
      if (descMatch.score > bestScore * 0.7) {
        bestScore = Math.min(bestScore, descMatch.score * 0.7)
      }
    }

    if (bestScore > 20) {
      results.push({
        ...item,
        score: bestScore,
        matchType,
        matchedText,
      })
    }
  }

  const sortedResults = results.sort((a, b) => b.score - a.score)

  const deduplicated: SearchResult[] = []
  const sectionsAdded = new Set<string>()

  for (const result of sortedResults) {
    if (result.type === 'section') {
      if (!sectionsAdded.has(result.id)) {
        const childSettings = sortedResults.filter(
          r => r.type === 'setting' && r.section === result.id
        )

        const hasMuchBetterChild = childSettings.some(
          child => child.score > result.score * 1.3
        )

        if (!hasMuchBetterChild) {
          deduplicated.push(result)
          sectionsAdded.add(result.id)
        }
      }
    } else {
      const parentSection = result.section
      if (parentSection && !sectionsAdded.has(parentSection)) {
        deduplicated.push(result)
      }
    }
  }

  return deduplicated.slice(0, 8)
}

export function highlightMatch(text: string, query: string): { text: string; highlighted: boolean }[] {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(queryLower)

  if (index === -1) {
    return [{ text, highlighted: false }]
  }

  const parts: { text: string; highlighted: boolean }[] = []

  if (index > 0) {
    parts.push({ text: text.slice(0, index), highlighted: false })
  }

  parts.push({ text: text.slice(index, index + query.length), highlighted: true })

  if (index + query.length < text.length) {
    parts.push({ text: text.slice(index + query.length), highlighted: false })
  }

  return parts
}
