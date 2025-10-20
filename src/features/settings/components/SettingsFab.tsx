import { useId, useState, useEffect } from "react"
import { usePrefs, BUILTIN_SEARCH_ENGINES } from "@/lib/prefs"
import type { QuickLink, SearchEngine } from "@/lib/prefs"
import { getApiKeys, saveApiKeys, migrateFromPlaintext, reencryptApiKeys } from "@/lib/api-keys"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2, Settings, HelpCircle, Keyboard, Download, Upload, Shield, Blocks } from "lucide-react"
import ExportDialog from "@/features/security/components/ExportDialog"
import ImportDialog from "@/features/security/components/ImportDialog"
import PasswordDialog from "@/features/security/components/PasswordDialog"
import ChangePasswordDialog from "@/features/security/components/ChangePasswordDialog"
import WidgetSettings from "./WidgetSettings"
import SettingsAbout from "./SettingsAbout"
import SettingsApiKeys from "./SettingsApiKeys"
import SettingsSecurity from "./SettingsSecurity"
import SettingsQuickLinks from "./SettingsQuickLinks"
import { isSessionUnlocked, lockSession, isPasswordProtectionEnabled, disablePasswordProtection, getDerivedKey } from "@/lib/password"
import { toast } from "sonner"

type SettingsFabProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onOpenShortcuts?: () => void
}

export default function SettingsFab({ open, onOpenChange, onOpenShortcuts }: SettingsFabProps = {}) {
  const { prefs, setPrefs } = usePrefs()
  const newId = useId()

  const [apiKeys, setApiKeys] = useState<{ openai?: string; anthropic?: string; gemini?: string }>({})
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false)
  const [passwordUnlockOpen, setPasswordUnlockOpen] = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [passwordDisableOpen, setPasswordDisableOpen] = useState(false)
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(false)
  const [keysLocked, setKeysLocked] = useState(false)
  const [securityStatus, setSecurityStatus] = useState<{enabled: boolean; unlocked: boolean}>({
    enabled: isPasswordProtectionEnabled(),
    unlocked: isSessionUnlocked()
  })

  const loadApiKeys = async () => {
    try {
      await migrateFromPlaintext()
      const keys = await getApiKeys()
      setApiKeys(keys)
      setKeysLocked(false)
    } catch (err) {
      if (err instanceof Error && err.message.includes("Session locked")) {
        setKeysLocked(true)
        setApiKeys({})
      } else {
        console.error("Failed to load API keys:", err)
        setApiKeys({})
      }
    }
  }

  const updateSecurityStatus = () => {
    setSecurityStatus({
      enabled: isPasswordProtectionEnabled(),
      unlocked: isSessionUnlocked()
    })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (mounted) {
        await loadApiKeys()
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (open) {
      updateSecurityStatus()
      loadApiKeys()
    }
  }, [open])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (mounted) {
        await saveApiKeys(apiKeys)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKeys])

  const updateLink = (id: string, patch: Partial<QuickLink>) =>
    setPrefs((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))

  const addLink = () =>
    setPrefs((p) => ({
      ...p,
      links: [...p.links, { id: `${newId}-${Date.now()}`, label: "New", href: "https://", icon: "globe" }],
    }))

  const removeLink = (id: string) =>
    setPrefs((p) => ({ ...p, links: p.links.filter((l) => l.id !== id) }))

  const addCustomSearchEngine = () => {
    const newEngine: SearchEngine = {
      id: `custom-${Date.now()}`,
      name: "Custom Search",
      url: "https://example.com/search?q={searchTerms}",
      isCustom: true,
    }
    setPrefs((p) => ({ ...p, customSearchEngines: [...p.customSearchEngines, newEngine] }))
  }

  const updateCustomSearchEngine = (id: string, patch: Partial<SearchEngine>) =>
    setPrefs((p) => ({
      ...p,
      customSearchEngines: p.customSearchEngines.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))

  const removeCustomSearchEngine = (id: string) =>
    setPrefs((p) => ({ ...p, customSearchEngines: p.customSearchEngines.filter((e) => e.id !== id) }))

  const allSearchEngines = [...BUILTIN_SEARCH_ENGINES, ...prefs.customSearchEngines]

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/30 hover:bg-black/40 text-white/80 hover:text-white shadow"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-[92vw] sm:w-[480px] max-w-[520px] bg-black/85 text-white border-white/10 backdrop-blur p-0 flex flex-col"
        >
          <TooltipProvider>
          <SheetHeader className="mb-2 px-5 pt-5 shrink-0">
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="space-y-6">
            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Search Engine</h3>
                <p className="text-xs text-white/60 mt-1">
                  DuckDuckGo bang operators work with all search engines.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="search-engine" className="text-xs font-normal text-white/70 mb-2 block">
                    Default Search Engine
                  </Label>
                  <Select
                    value={prefs.searchEngineId}
                    onValueChange={(v) => setPrefs({ ...prefs, searchEngineId: v })}
                  >
                    <SelectTrigger id="search-engine" className="bg-white/5 border-white/10 text-white w-full">
                      <SelectValue placeholder="Select search engine" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 text-white border-white/10">
                      {allSearchEngines.map((engine) => (
                        <SelectItem key={engine.id} value={engine.id}>
                          {engine.name}
                          {engine.isCustom && " (Custom)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {prefs.customSearchEngines.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-white/70">Custom Search Engines</Label>
                    {prefs.customSearchEngines.map((engine) => (
                      <div key={engine.id} className="bg-white/5 rounded-lg p-3 space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor={`engine-name-${engine.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                              Name
                            </Label>
                            <Input
                              id={`engine-name-${engine.id}`}
                              value={engine.name}
                              onChange={(e) => updateCustomSearchEngine(engine.id, { name: e.target.value })}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                              placeholder="My Search Engine"
                            />
                          </div>
                          <div className="pt-5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white/70 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => removeCustomSearchEngine(engine.id)}
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`engine-url-${engine.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                            Search URL (use {"{searchTerms}"} as placeholder)
                          </Label>
                          <Input
                            id={`engine-url-${engine.id}`}
                            value={engine.url}
                            onChange={(e) => updateCustomSearchEngine(engine.id, { url: e.target.value })}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/50 font-mono text-xs"
                            placeholder="https://example.com/search?q={searchTerms}"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={addCustomSearchEngine}
                  className="w-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Custom Search Engine
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Widgets</h3>
                <p className="text-xs text-white/60 mt-1">
                  Manage and configure your dashboard widgets.
                </p>
              </div>

              <Button
                onClick={() => setWidgetSettingsOpen(true)}
                className="w-full bg-white/10 hover:bg-white/20 text-white"
              >
                <Blocks className="w-4 h-4 mr-2" />
                Manage Widgets
              </Button>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Chat</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="chat" className="font-normal">Show chat</Label>
                    <p className="text-xs text-white/60">Hides and disables all chat functionality.</p>
                  </div>
                  <Switch
                    id="chat"
                    checked={prefs.showChat}
                    onCheckedChange={(v) => setPrefs({ ...prefs, showChat: v })}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h4 className="text-sm font-medium">API Keys</h4>
                <p className="text-xs text-white/60 mt-1">
                  Required for chat functionality. Keys are stored locally and encrypted.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-200">
                  <strong>Important:</strong> Always keep a secure backup copy of your API keys in a password manager or secure notes app.
                  Encryption features are in beta and may not work perfectly.
                </p>
              </div>

              <SettingsApiKeys
                apiKeys={apiKeys}
                keysLocked={keysLocked}
                onApiKeysChange={setApiKeys}
              />
            </div>

            <div>
              <div className="mb-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security (BETA)
                </h4>
                <p className="text-xs text-white/60 mt-1">
                  Protect your API keys with password-based encryption.
                </p>
              </div>

              <SettingsSecurity
                securityStatus={securityStatus}
                onEnableProtection={() => setPasswordSetupOpen(true)}
                onLockSession={() => {
                  lockSession()
                  updateSecurityStatus()
                  setKeysLocked(true)
                  setApiKeys({})
                }}
                onUnlockSession={() => setPasswordUnlockOpen(true)}
                onChangePassword={() => setPasswordChangeOpen(true)}
                onDisableProtection={() => setPasswordDisableOpen(true)}
              />
            </div>

            <div>
              <div className="mb-3">
                <h4 className="text-sm font-medium">Model Settings</h4>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="verified-org" className="font-normal">
                      Show verified org models
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-white/50 hover:text-white/80 transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p className="font-semibold mb-1">Verified Organization Models</p>
                        <p className="mb-2">Enables GPT-5 and GPT-5 Mini models in the chat interface.</p>
                        <p className="font-semibold mb-1">Requirements:</p>
                        <p>• Verified OpenAI organization account</p>
                        <p>• Access granted by OpenAI</p>
                        <p className="mt-2 text-white/70">Only enable if you have verified org access, otherwise API calls will fail.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-white/60">
                    Display GPT-5 and GPT-5 Mini (requires verified OpenAI organization)
                  </p>
                </div>
                <Switch
                  id="verified-org"
                  checked={prefs.showVerifiedOrgModels}
                  onCheckedChange={(v) => setPrefs({ ...prefs, showVerifiedOrgModels: v })}
                />
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h4 className="text-sm font-medium">Danger Zone</h4>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All Chats
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle><i>Highway to the dangerzone</i></AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your chat conversations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => setPrefs({ ...prefs, conversations: [] })}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete All Chats
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Import & Export (BETA)</h3>
                <p className="text-xs text-white/60 mt-1">
                  Backup or restore your data, preferences, and conversations.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => setExportDialogOpen(true)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button
                  onClick={() => setImportDialogOpen(true)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                <p className="text-xs text-white/60 mt-1">
                  Customize keyboard shortcuts for quick access.
                </p>
              </div>

              <Button
                onClick={onOpenShortcuts}
                className="w-full bg-white/10 hover:bg-white/20 text-white"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Manage Keyboard Shortcuts
              </Button>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Quick Links</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quick-links" className="font-normal">Show quick links</Label>
                    <p className="text-xs text-white/60">Display quick access links at the bottom.</p>
                  </div>
                  <Switch
                    id="quick-links"
                    checked={prefs.showQuickLinks}
                    onCheckedChange={(v) => setPrefs({ ...prefs, showQuickLinks: v })}
                  />
                </div>

                <SettingsQuickLinks
                  links={prefs.links}
                  onAddLink={addLink}
                  onUpdateLink={updateLink}
                  onRemoveLink={removeLink}
                />
              </div>
            </div>

            <SettingsAbout />
            </div>
          </div>

          <SheetFooter className="text-xs text-white/50 px-5 pb-5 shrink-0">
            Changes are saved automatically.
          </SheetFooter>
          </TooltipProvider>
        </SheetContent>
      </Sheet>

      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <WidgetSettings open={widgetSettingsOpen} onOpenChange={setWidgetSettingsOpen} />

      <PasswordDialog
        mode="setup"
        open={passwordSetupOpen}
        onOpenChange={setPasswordSetupOpen}
        onSuccess={async () => {
          setPasswordSetupOpen(false)
          updateSecurityStatus()
          await loadApiKeys()
          toast.success("Password protection enabled", {
            description: "Your API keys are now protected with password-based encryption"
          })
        }}
      />

      <PasswordDialog
        mode="unlock"
        open={passwordUnlockOpen}
        onOpenChange={setPasswordUnlockOpen}
        onSuccess={async () => {
          setPasswordUnlockOpen(false)
          updateSecurityStatus()
          await loadApiKeys()
          toast.success("Session unlocked", {
            description: "You can now access your encrypted API keys"
          })
        }}
      />

      <ChangePasswordDialog
        open={passwordChangeOpen}
        onOpenChange={setPasswordChangeOpen}
        onSuccess={async () => {
          setPasswordChangeOpen(false)
          toast.success("Password changed", {
            description: "Your API keys have been re-encrypted with the new password"
          })
        }}
      />

      <AlertDialog open={passwordDisableOpen} onOpenChange={setPasswordDisableOpen}>
        <AlertDialogContent className="bg-black/95 text-white border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Password Protection?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will switch to less secure localStorage-based encryption. Your API keys will still be encrypted, but the encryption key will be stored in your browser alongside the encrypted data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
            <p className="text-sm text-yellow-200">
              You can re-enable password protection at any time from the Security settings.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 hover:bg-gray-800 text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const passwordKey = getDerivedKey()
                  if (!passwordKey) {
                    toast.error("Session locked", {
                      description: "Please unlock first before disabling protection"
                    })
                    setPasswordDisableOpen(false)
                    return
                  }

                  await disablePasswordProtection()

                  const { getEncryptionKey } = await import("@/lib/api-keys")
                  const newLegacyKey = await getEncryptionKey()
                  if (!newLegacyKey) {
                    throw new Error("Failed to create new legacy encryption key")
                  }

                  await reencryptApiKeys(passwordKey, newLegacyKey)

                  updateSecurityStatus()
                  await loadApiKeys()
                  toast.success("Password protection disabled", {
                    description: "API keys re-encrypted with localStorage-based key"
                  })
                } catch (err) {
                  console.error("Failed to disable password protection:", err)
                  toast.error("Failed to disable password protection", {
                    description: err instanceof Error ? err.message : "Unknown error"
                  })
                }
                setPasswordDisableOpen(false)
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Disable Protection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
