import { useState, useEffect } from "react"
import { usePrefs } from "@/lib/prefs"
import { getApiKeys } from "@/lib/api-keys"
import { exportDataV2, downloadExportFile, type SelectionTree } from "@/lib/import-export-v2"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, AlertTriangle, Lock, CheckCircle2 } from "lucide-react"
import ExportSelectionTree from "./ExportSelectionTree"
import { Switch } from "@/components/ui/switch"

type ExportDialogV2Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Preset = "everything" | "settings" | "chats" | "keys" | "custom"

export default function ExportDialogV2({ open, onOpenChange }: ExportDialogV2Props) {
  const { prefs } = usePrefs()
  const [apiKeys, setApiKeys] = useState<{ openai?: string; anthropic?: string; gemini?: string }>({})
  const [selection, setSelection] = useState<SelectionTree>({})
  const [preset, setPreset] = useState<Preset>("everything")
  const [encryptAll, setEncryptAll] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [apiKeysWarningAccepted, setApiKeysWarningAccepted] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (open) {
      loadApiKeys()
      applyPreset("everything")
    }
  }, [open])

  const loadApiKeys = async () => {
    try {
      const keys = await getApiKeys()
      setApiKeys(keys)
    } catch (err) {
      console.error("Failed to load API keys:", err)
      setApiKeys({})
    }
  }

  const applyPreset = (presetType: Preset) => {
    setPreset(presetType)

    const hasApiKeys = !!(apiKeys.openai || apiKeys.anthropic || apiKeys.gemini)
    const hasChats = prefs.conversations.filter(c => !c.isGhostMode).length > 0
    const hasWidgets = prefs.widgets.filter(w => w.enabled).length > 0

    // Always initialize all available sections
    const newSelection: SelectionTree = {}

    // Initialize API Keys if available
    if (hasApiKeys) {
      newSelection.apiKeys = {
        selected: false,
        items: {
          openai: !!apiKeys.openai,
          anthropic: !!apiKeys.anthropic,
          gemini: !!apiKeys.gemini,
        },
      }
    }

    // Initialize Chats if available
    if (hasChats) {
      const chatItems: Record<string, boolean> = {}
      prefs.conversations.filter(c => !c.isGhostMode).forEach(c => {
        chatItems[c.id] = false
      })
      newSelection.chats = { selected: false, items: chatItems }
    }

    // Initialize Settings
    newSelection.settings = {
      selected: false,
      items: {
        searchEngine: false,
        quickLinks: false,
        keyboardShortcuts: false,
        chatPreferences: false,
      },
    }

    // Initialize Widgets if available
    if (hasWidgets) {
      const widgetItems: Record<string, boolean> = {}
      prefs.widgets.filter(w => w.enabled).forEach(w => {
        widgetItems[w.id] = false
      })
      newSelection.widgets = { selected: false, items: widgetItems }
    }

    // Now apply the preset selections
    switch (presetType) {
      case "everything":
        if (newSelection.apiKeys) {
          newSelection.apiKeys.selected = true
        }
        if (newSelection.chats) {
          newSelection.chats.selected = true
          Object.keys(newSelection.chats.items).forEach(id => {
            newSelection.chats!.items[id] = true
          })
        }
        if (newSelection.settings) {
          newSelection.settings.selected = true
          newSelection.settings.items.searchEngine = true
          newSelection.settings.items.quickLinks = true
          newSelection.settings.items.keyboardShortcuts = true
          newSelection.settings.items.chatPreferences = true
        }
        if (newSelection.widgets) {
          newSelection.widgets.selected = true
          Object.keys(newSelection.widgets.items).forEach(id => {
            newSelection.widgets!.items[id] = true
          })
        }
        setEncryptAll(hasApiKeys)
        break

      case "settings":
        if (newSelection.settings) {
          newSelection.settings.selected = true
          newSelection.settings.items.searchEngine = true
          newSelection.settings.items.quickLinks = true
          newSelection.settings.items.keyboardShortcuts = true
          newSelection.settings.items.chatPreferences = true
        }
        if (newSelection.widgets) {
          newSelection.widgets.selected = true
          Object.keys(newSelection.widgets.items).forEach(id => {
            newSelection.widgets!.items[id] = true
          })
        }
        setEncryptAll(false)
        break

      case "chats":
        if (newSelection.chats) {
          newSelection.chats.selected = true
          Object.keys(newSelection.chats.items).forEach(id => {
            newSelection.chats!.items[id] = true
          })
        }
        setEncryptAll(false)
        break

      case "keys":
        if (newSelection.apiKeys) {
          newSelection.apiKeys.selected = true
        }
        setEncryptAll(true)
        break

      case "custom":
        // Keep current selection
        break
    }

    setSelection(newSelection)
  }

  const handleSelectionChange = (newSelection: SelectionTree) => {
    setSelection(newSelection)
    setPreset("custom")

    // Auto-enable encryption if API keys are selected
    if (newSelection.apiKeys?.selected) {
      setEncryptAll(true)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const exportPassword = (encryptAll || selection.apiKeys?.selected) ? password : undefined
      const jsonData = await exportDataV2(prefs, selection, exportPassword)
      downloadExportFile(jsonData)

      // Reset and close
      onOpenChange(false)
      setSelection({})
      setPreset("everything")
      setPassword("")
      setConfirmPassword("")
      setApiKeysWarningAccepted(false)
      setEncryptAll(false)
    } catch (err) {
      console.error("Export failed:", err)
      if (err instanceof Error && err.message.includes("Session locked")) {
        alert("Cannot export API keys: Session is locked. Please unlock your session in Settings first.")
      } else {
        alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    } finally {
      setExporting(false)
    }
  }

  const hasSelection = selection.apiKeys?.selected ||
                       selection.chats?.selected ||
                       selection.settings?.selected ||
                       selection.widgets?.selected

  const requiresEncryption = selection.apiKeys?.selected || encryptAll
  const passwordValid = !requiresEncryption || (password.length >= 8 && password === confirmPassword)
  const apiKeysOk = !selection.apiKeys?.selected || apiKeysWarningAccepted
  const canExport = hasSelection && passwordValid && apiKeysOk

  const selectedCount = {
    apiKeys: selection.apiKeys?.selected ? Object.values(selection.apiKeys.items).filter(Boolean).length : 0,
    chats: selection.chats?.selected ? Object.values(selection.chats.items).filter(Boolean).length : 0,
    settings: selection.settings?.selected ? Object.values(selection.settings.items).filter(Boolean).length : 0,
    widgets: selection.widgets?.selected ? Object.values(selection.widgets.items).filter(Boolean).length : 0,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 text-white border-white/10 max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription className="text-white/70">
            Select what to export. All exports are verified with SHA-256 hash.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Presets */}
          <div>
            <Label className="text-sm font-semibold text-white mb-2 block">Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={preset === "everything" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("everything")}
                className={preset === "everything" ? "bg-blue-600 hover:bg-blue-700" : "bg-white/5 hover:bg-white/10 border-white/10"}
              >
                Everything
              </Button>
              <Button
                variant={preset === "settings" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("settings")}
                className={preset === "settings" ? "bg-blue-600 hover:bg-blue-700" : "bg-white/5 hover:bg-white/10 border-white/10"}
              >
                Settings Only
              </Button>
              <Button
                variant={preset === "chats" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("chats")}
                className={preset === "chats" ? "bg-blue-600 hover:bg-blue-700" : "bg-white/5 hover:bg-white/10 border-white/10"}
                disabled={prefs.conversations.filter(c => !c.isGhostMode).length === 0}
              >
                Chats Only
              </Button>
              <Button
                variant={preset === "keys" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("keys")}
                className={preset === "keys" ? "bg-blue-600 hover:bg-blue-700" : "bg-white/5 hover:bg-white/10 border-white/10"}
                disabled={!apiKeys.openai && !apiKeys.anthropic && !apiKeys.gemini}
              >
                API Keys Only
              </Button>
            </div>
          </div>

          {/* Selection Tree */}
          <div>
            <Label className="text-sm font-semibold text-white mb-2 block">
              {preset === "custom" ? "Custom Selection" : "Selection"}
            </Label>
            <ExportSelectionTree
              prefs={prefs}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              apiKeys={apiKeys}
            />
          </div>

          {/* Selection Summary */}
          {hasSelection && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300">Selected for export:</p>
                  <ul className="text-xs text-blue-200/90 mt-1 space-y-1">
                    {selectedCount.apiKeys > 0 && <li>• {selectedCount.apiKeys} API key(s)</li>}
                    {selectedCount.chats > 0 && <li>• {selectedCount.chats} chat conversation(s)</li>}
                    {selectedCount.settings > 0 && <li>• {selectedCount.settings} setting section(s)</li>}
                    {selectedCount.widgets > 0 && <li>• {selectedCount.widgets} widget(s)</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Encryption */}
          {!selection.apiKeys?.selected && (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <Label htmlFor="encrypt-all" className="text-sm font-medium">
                  Encrypt entire export
                </Label>
                <p className="text-xs text-white/60 mt-0.5">
                  Optional password protection for all data
                </p>
              </div>
              <Switch
                id="encrypt-all"
                checked={encryptAll}
                onCheckedChange={setEncryptAll}
              />
            </div>
          )}

          {requiresEncryption && (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-3">
                <div className="flex gap-2 items-start">
                  <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-300 text-sm">
                      {selection.apiKeys?.selected ? "Password Required" : "Encryption Enabled"}
                    </p>
                    <p className="text-xs text-blue-200/90 mt-1">
                      {selection.apiKeys?.selected
                        ? "API keys must be encrypted. "
                        : "Optional encryption enabled. "}
                      You'll need this password to import later.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="export-password" className="text-sm font-normal text-white/80 mb-2 block">
                    Password (min 8 characters)
                  </Label>
                  <Input
                    id="export-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50 mb-2"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                  )}
                </div>
              </div>

              {selection.apiKeys?.selected && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-3">
                  <div className="flex gap-2 items-start">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-300 text-sm">Security Warning</p>
                      <p className="text-xs text-red-200/90 mt-1">
                        Store this backup file securely and never share it publicly.
                        Anyone with the file AND password can decrypt your API keys.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 pt-1">
                    <input
                      type="checkbox"
                      id="api-keys-warning"
                      checked={apiKeysWarningAccepted}
                      onChange={(e) => setApiKeysWarningAccepted(e.target.checked)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="api-keys-warning" className="text-sm font-normal cursor-pointer text-white">
                      I understand the risks and will store this file securely
                    </Label>
                  </div>
                </div>
              )}
            </>
          )}

          {!hasSelection && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-200">
                Please select at least one item to export.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
