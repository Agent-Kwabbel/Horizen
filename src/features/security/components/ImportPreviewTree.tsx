import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronDown, ChevronRight, Key, MessageSquare, Settings as SettingsIcon, Blocks, Lock } from "lucide-react"
import type { SelectionTree, ExportDataV2 } from "@/lib/import-export-v2"
import type { Prefs } from "@/lib/prefs"

type ImportPreviewTreeProps = {
  exportData: ExportDataV2
  currentPrefs: Prefs
  selection: SelectionTree
  onSelectionChange: (selection: SelectionTree) => void
  mergeStrategies: {
    chats?: "append" | "replace"
    quickLinks?: "merge" | "replace"
    widgets?: "merge" | "replace"
  }
  onMergeStrategyChange: (section: string, strategy: string) => void
}

export default function ImportPreviewTree({
  exportData,
  currentPrefs,
  selection,
  onSelectionChange,
  mergeStrategies,
  onMergeStrategyChange,
}: ImportPreviewTreeProps) {
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
      const items = { ...newSelection.apiKeys!.items }
      Object.keys(items).forEach(key => {
        items[key as "openai" | "anthropic" | "gemini"] = !currentValue
      })
      newSelection.apiKeys!.items = items
    } else if (section === "chats") {
      const items: Record<string, boolean> = {}
      Object.keys(newSelection.chats!.items).forEach(id => {
        items[id] = !currentValue
      })
      newSelection.chats!.items = items
    } else if (section === "settings") {
      const items = { ...newSelection.settings!.items }
      Object.keys(items).forEach(key => {
        items[key as keyof typeof items] = !currentValue
      })
      newSelection.settings!.items = items
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

      const someSelected = Object.values(newSelection.apiKeys!.items).some(v => v)
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

  const currentChats = currentPrefs.conversations.filter(c => !c.isGhostMode)
  const hasCurrentChats = currentChats.length > 0
  const hasCurrentQuickLinks = currentPrefs.links.length > 0

  return (
    <div className="space-y-2">
      {/* API Keys Section */}
      {selection.apiKeys && (
        <div className="border border-white/10 rounded-lg bg-white/5">
          <div className="flex items-center gap-2 p-3">
            <Checkbox
              id="import-api-keys"
              checked={selection.apiKeys.selected}
              onCheckedChange={() => toggleSection("apiKeys")}
            />

            <div className="flex-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" />
              <Label htmlFor="import-api-keys" className="font-medium cursor-pointer flex-1">
                API Keys
              </Label>
              <Lock className="w-3 h-3 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Chats Section */}
      {selection.chats && exportData.contents?.chats && (
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
              id="import-chats"
              checked={selection.chats.selected}
              onCheckedChange={() => toggleSection("chats")}
            />

            <div className="flex-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <Label htmlFor="import-chats" className="font-medium cursor-pointer">
                Chat Conversations ({exportData.contents.chats.length})
              </Label>
            </div>
          </div>

          {expanded.chats && (
            <>
              {hasCurrentChats && (
                <div className="px-3 pb-2 border-t border-white/10 pt-3 ml-9">
                  <Label className="text-xs font-medium text-white/80 mb-2 block">
                    Import Strategy
                  </Label>
                  <RadioGroup
                    value={mergeStrategies.chats || "append"}
                    onValueChange={(v: string) => onMergeStrategyChange("chats", v)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="append" id="chat-append" />
                      <Label htmlFor="chat-append" className="text-sm cursor-pointer">
                        Append ({exportData.contents.chats.length} → {currentChats.length + exportData.contents.chats.length} total)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="replace" id="chat-replace" />
                      <Label htmlFor="chat-replace" className="text-sm cursor-pointer">
                        Replace all (replaces {currentChats.length} existing)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-2 border-t border-white/10 pt-2 ml-9">
                {exportData.contents.chats.map(chat => (
                  <div key={chat.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`import-chat-${chat.id}`}
                      checked={selection.chats!.items[chat.id] || false}
                      onCheckedChange={() => toggleItem("chats", chat.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`import-chat-${chat.id}`} className="text-sm cursor-pointer block truncate">
                        {chat.title}
                      </Label>
                      <p className="text-xs text-white/40">
                        {chat.messages.length} messages
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Settings Section */}
      {selection.settings && (
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
              id="import-settings"
              checked={selection.settings.selected}
              onCheckedChange={() => toggleSection("settings")}
            />

            <div className="flex-1 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-green-400" />
              <Label htmlFor="import-settings" className="font-medium cursor-pointer">
                General Settings
              </Label>
            </div>
          </div>

          {expanded.settings && (
            <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2 ml-9">
              {exportData.contents?.settings?.searchEngine && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="import-search-engine"
                    checked={selection.settings.items.searchEngine}
                    onCheckedChange={() => toggleItem("settings", "searchEngine")}
                  />
                  <Label htmlFor="import-search-engine" className="text-sm cursor-pointer">
                    Search Engine
                  </Label>
                </div>
              )}

              {exportData.contents?.settings?.quickLinks && (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="import-quick-links"
                      checked={selection.settings.items.quickLinks}
                      onCheckedChange={() => toggleItem("settings", "quickLinks")}
                    />
                    <Label htmlFor="import-quick-links" className="text-sm cursor-pointer">
                      Quick Links ({exportData.contents.settings.quickLinks.length})
                    </Label>
                  </div>

                  {hasCurrentQuickLinks && selection.settings.items.quickLinks && (
                    <div className="ml-6 mt-2">
                      <RadioGroup
                        value={mergeStrategies.quickLinks || "merge"}
                        onValueChange={(v: string) => onMergeStrategyChange("quickLinks", v)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="merge" id="links-merge" />
                          <Label htmlFor="links-merge" className="text-xs cursor-pointer">
                            Merge (keep both)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="replace" id="links-replace" />
                          <Label htmlFor="links-replace" className="text-xs cursor-pointer">
                            Replace
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </>
              )}

              {exportData.contents?.settings?.keyboardShortcuts && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="import-shortcuts"
                    checked={selection.settings.items.keyboardShortcuts}
                    onCheckedChange={() => toggleItem("settings", "keyboardShortcuts")}
                  />
                  <Label htmlFor="import-shortcuts" className="text-sm cursor-pointer">
                    Keyboard Shortcuts
                  </Label>
                </div>
              )}

              {exportData.contents?.settings?.chatPreferences && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="import-chat-prefs"
                    checked={selection.settings.items.chatPreferences}
                    onCheckedChange={() => toggleItem("settings", "chatPreferences")}
                  />
                  <Label htmlFor="import-chat-prefs" className="text-sm cursor-pointer">
                    Chat Preferences
                  </Label>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Widgets Section */}
      {selection.widgets && exportData.contents?.widgets && (
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
              id="import-widgets"
              checked={selection.widgets.selected}
              onCheckedChange={() => toggleSection("widgets")}
            />

            <div className="flex-1 flex items-center gap-2">
              <Blocks className="w-4 h-4 text-purple-400" />
              <Label htmlFor="import-widgets" className="font-medium cursor-pointer">
                Widgets ({exportData.contents.widgets.length})
              </Label>
            </div>
          </div>

          {expanded.widgets && (
            <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2 ml-9">
              {exportData.contents.widgets.map(widget => {
                const widgetLabels: Record<string, string> = {
                  weather: "Weather Widget",
                  notes: "Notes Widget",
                  quote: "Quote Widget",
                  ticker: "Ticker Widget",
                  pomodoro: "Pomodoro Widget",
                  habitTracker: "Habit Tracker Widget",
                }

                const existing = currentPrefs.widgets.find(w => w.type === widget.type)

                const getMergeMessage = (widgetType: string) => {
                  switch (widgetType) {
                    case "notes":
                      return "will replace current notes"
                    case "habitTracker":
                      return "will merge habits"
                    case "ticker":
                      return "will merge symbols"
                    case "weather":
                      return "will update location"
                    case "pomodoro":
                      return "will update settings"
                    case "quote":
                      return "will update settings"
                    default:
                      return "will merge"
                  }
                }

                return (
                  <div key={widget.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`import-widget-${widget.id}`}
                        checked={selection.widgets!.items[widget.id] || false}
                        onCheckedChange={() => toggleItem("widgets", widget.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`import-widget-${widget.id}`} className="text-sm cursor-pointer block">
                          {widgetLabels[widget.type] || widget.type}
                          {existing && (
                            <span className="text-xs text-yellow-400 ml-2">({getMergeMessage(widget.type)})</span>
                          )}
                        </Label>
                        <p className="text-xs text-white/40">
                          Includes settings
                          {widget.data?.notes && " + content"}
                          {widget.data?.habits && ` + ${widget.data.habits.length} habits`}
                          {widget.data?.symbols && ` + ${widget.data.symbols.length} symbols`}
                          {widget.data?.location && " + location"}
                        </p>
                      </div>
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
