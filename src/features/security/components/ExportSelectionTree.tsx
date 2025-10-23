import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronRight, Key, MessageSquare, Settings as SettingsIcon, Blocks, Lock } from "lucide-react"
import type { SelectionTree } from "@/lib/import-export-v2"
import type { Prefs } from "@/lib/prefs"

type ExportSelectionTreeProps = {
  prefs: Prefs
  selection: SelectionTree
  onSelectionChange: (selection: SelectionTree) => void
  apiKeys: { openai?: string; anthropic?: string; gemini?: string }
}

export default function ExportSelectionTree({
  prefs,
  selection,
  onSelectionChange,
  apiKeys,
}: ExportSelectionTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    apiKeys: true,
    chats: false,
    settings: true,
    widgets: true,
  })

  const toggleExpand = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleSection = (section: keyof SelectionTree) => {
    const newSelection = { ...selection }

    if (!newSelection[section]) return

    const currentValue = newSelection[section]!.selected
    newSelection[section]!.selected = !currentValue

    // Toggle all children
    if (section === "apiKeys") {
      newSelection.apiKeys!.items = {
        openai: !currentValue,
        anthropic: !currentValue,
        gemini: !currentValue,
      }
    } else if (section === "chats") {
      const items: Record<string, boolean> = {}
      Object.keys(newSelection.chats!.items).forEach(id => {
        items[id] = !currentValue
      })
      newSelection.chats!.items = items
    } else if (section === "settings") {
      newSelection.settings!.items = {
        searchEngine: !currentValue,
        quickLinks: !currentValue,
        keyboardShortcuts: !currentValue,
        chatPreferences: !currentValue,
      }
    } else if (section === "widgets") {
      const items: Record<string, boolean> = {}
      Object.keys(newSelection.widgets!.items).forEach(id => {
        items[id] = !currentValue
      })
      newSelection.widgets!.items = items
    }

    onSelectionChange(newSelection)
  }

  const toggleItem = (section: keyof SelectionTree, itemId: string) => {
    const newSelection = { ...selection }

    if (!newSelection[section]) return

    if (section === "apiKeys") {
      newSelection.apiKeys!.items = {
        ...newSelection.apiKeys!.items,
        [itemId]: !newSelection.apiKeys!.items[itemId as "openai" | "anthropic" | "gemini"],
      }

      // Update parent based on children
      const items = newSelection.apiKeys!.items
      const someSelected = items.openai || items.anthropic || items.gemini
      newSelection.apiKeys!.selected = someSelected
    } else if (section === "chats") {
      newSelection.chats!.items = {
        ...newSelection.chats!.items,
        [itemId]: !newSelection.chats!.items[itemId],
      }

      const someSelected = Object.values(newSelection.chats!.items).some(v => v)
      newSelection.chats!.selected = someSelected
    } else if (section === "settings") {
      const currentItems = newSelection.settings!.items
      newSelection.settings!.items = {
        ...currentItems,
        [itemId]: !currentItems[itemId as keyof typeof currentItems],
      }

      const someSelected = Object.values(newSelection.settings!.items).some(v => v)
      newSelection.settings!.selected = someSelected
    } else if (section === "widgets") {
      newSelection.widgets!.items = {
        ...newSelection.widgets!.items,
        [itemId]: !newSelection.widgets!.items[itemId],
      }

      const someSelected = Object.values(newSelection.widgets!.items).some(v => v)
      newSelection.widgets!.selected = someSelected
    }

    onSelectionChange(newSelection)
  }

  const hasApiKeys = apiKeys.openai || apiKeys.anthropic || apiKeys.gemini
  const hasChats = prefs.conversations.filter(c => !c.isGhostMode).length > 0
  const hasWidgets = prefs.widgets.filter(w => w.enabled).length > 0

  const apiKeyCount = [apiKeys.openai, apiKeys.anthropic, apiKeys.gemini].filter(Boolean).length
  const chatCount = prefs.conversations.filter(c => !c.isGhostMode).length
  const widgetCount = prefs.widgets.filter(w => w.enabled).length

  return (
    <div className="space-y-2">
      {/* API Keys Section */}
      {hasApiKeys && (
        <div className="border border-white/10 rounded-lg bg-white/5">
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={() => toggleExpand("apiKeys")}
              className="text-white/70 hover:text-white"
            >
              {expanded.apiKeys ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <Checkbox
              id="section-api-keys"
              checked={selection.apiKeys?.selected || false}
              onCheckedChange={() => toggleSection("apiKeys")}
            />

            <div className="flex-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" />
              <Label htmlFor="section-api-keys" className="font-medium cursor-pointer flex-1">
                API Keys ({apiKeyCount})
              </Label>
              <Lock className="w-3 h-3 text-blue-400" />
            </div>
          </div>

          {expanded.apiKeys && (
            <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2 ml-9">
              {apiKeys.openai && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="item-openai"
                    checked={selection.apiKeys?.items.openai || false}
                    onCheckedChange={() => toggleItem("apiKeys", "openai")}
                  />
                  <Label htmlFor="item-openai" className="text-sm cursor-pointer">
                    OpenAI API Key
                  </Label>
                </div>
              )}

              {apiKeys.anthropic && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="item-anthropic"
                    checked={selection.apiKeys?.items.anthropic || false}
                    onCheckedChange={() => toggleItem("apiKeys", "anthropic")}
                  />
                  <Label htmlFor="item-anthropic" className="text-sm cursor-pointer">
                    Anthropic API Key
                  </Label>
                </div>
              )}

              {apiKeys.gemini && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="item-gemini"
                    checked={selection.apiKeys?.items.gemini || false}
                    onCheckedChange={() => toggleItem("apiKeys", "gemini")}
                  />
                  <Label htmlFor="item-gemini" className="text-sm cursor-pointer">
                    Google Gemini API Key
                  </Label>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chats Section */}
      {hasChats && (
        <div className="border border-white/10 rounded-lg bg-white/5">
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={() => toggleExpand("chats")}
              className="text-white/70 hover:text-white"
            >
              {expanded.chats ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <Checkbox
              id="section-chats"
              checked={selection.chats?.selected || false}
              onCheckedChange={() => toggleSection("chats")}
            />

            <div className="flex-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <Label htmlFor="section-chats" className="font-medium cursor-pointer">
                Chat Conversations ({chatCount})
              </Label>
            </div>
          </div>

          {expanded.chats && (
            <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-2 border-t border-white/10 pt-2 ml-9">
              {prefs.conversations.filter(c => !c.isGhostMode).map(chat => (
                <div key={chat.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`chat-${chat.id}`}
                    checked={selection.chats?.items[chat.id] || false}
                    onCheckedChange={() => toggleItem("chats", chat.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`chat-${chat.id}`} className="text-sm cursor-pointer block truncate">
                      {chat.title}
                    </Label>
                    <p className="text-xs text-white/40">
                      {new Date(chat.createdAt).toLocaleDateString()} • {chat.messages.length} messages
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Section */}
      <div className="border border-white/10 rounded-lg bg-white/5">
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={() => toggleExpand("settings")}
            className="text-white/70 hover:text-white"
          >
            {expanded.settings ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <Checkbox
            id="section-settings"
            checked={selection.settings?.selected || false}
            onCheckedChange={() => toggleSection("settings")}
          />

          <div className="flex-1 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-green-400" />
            <Label htmlFor="section-settings" className="font-medium cursor-pointer">
              General Settings
            </Label>
          </div>
        </div>

        {expanded.settings && (
          <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2 ml-9">
            <div className="flex items-center gap-2">
              <Checkbox
                id="setting-search-engine"
                checked={selection.settings?.items.searchEngine || false}
                onCheckedChange={() => toggleItem("settings", "searchEngine")}
              />
              <Label htmlFor="setting-search-engine" className="text-sm cursor-pointer">
                Search Engine & Custom Engines
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="setting-quick-links"
                checked={selection.settings?.items.quickLinks || false}
                onCheckedChange={() => toggleItem("settings", "quickLinks")}
              />
              <Label htmlFor="setting-quick-links" className="text-sm cursor-pointer">
                Quick Links ({prefs.links.length})
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="setting-keyboard-shortcuts"
                checked={selection.settings?.items.keyboardShortcuts || false}
                onCheckedChange={() => toggleItem("settings", "keyboardShortcuts")}
              />
              <Label htmlFor="setting-keyboard-shortcuts" className="text-sm cursor-pointer">
                Keyboard Shortcuts
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="setting-chat-preferences"
                checked={selection.settings?.items.chatPreferences || false}
                onCheckedChange={() => toggleItem("settings", "chatPreferences")}
              />
              <Label htmlFor="setting-chat-preferences" className="text-sm cursor-pointer">
                Chat Preferences
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* Widgets Section */}
      {hasWidgets && (
        <div className="border border-white/10 rounded-lg bg-white/5">
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={() => toggleExpand("widgets")}
              className="text-white/70 hover:text-white"
            >
              {expanded.widgets ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <Checkbox
              id="section-widgets"
              checked={selection.widgets?.selected || false}
              onCheckedChange={() => toggleSection("widgets")}
            />

            <div className="flex-1 flex items-center gap-2">
              <Blocks className="w-4 h-4 text-purple-400" />
              <Label htmlFor="section-widgets" className="font-medium cursor-pointer">
                Widgets ({widgetCount})
              </Label>
            </div>
          </div>

          {expanded.widgets && (
            <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2 ml-9">
              {prefs.widgets.filter(w => w.enabled).map(widget => {
                const widgetLabels: Record<string, string> = {
                  weather: "Weather Widget",
                  notes: "Notes Widget",
                  quote: "Quote Widget",
                  ticker: "Ticker Widget",
                  pomodoro: "Pomodoro Widget",
                  habitTracker: "Habit Tracker Widget",
                }

                return (
                  <div key={widget.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`widget-${widget.id}`}
                      checked={selection.widgets?.items[widget.id] || false}
                      onCheckedChange={() => toggleItem("widgets", widget.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`widget-${widget.id}`} className="text-sm cursor-pointer block">
                        {widgetLabels[widget.type] || widget.type}
                      </Label>
                      <p className="text-xs text-white/40">
                        Includes settings
                        {widget.type === "notes" && " + content"}
                        {widget.type === "habitTracker" && " + habits"}
                        {widget.type === "ticker" && " + symbols"}
                        {widget.type === "weather" && " + location"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
