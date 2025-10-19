import { useId, useState, useEffect } from "react"
import { usePrefs, BUILTIN_SEARCH_ENGINES } from "@/lib/prefs"
import type { QuickLink, IconKey, SearchEngine } from "@/lib/prefs"
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
import { Plus, Trash2, Settings, Eye, EyeOff, HelpCircle, Keyboard, Download, Upload, Shield, Lock, Unlock, AlertTriangle } from "lucide-react"
import ExportDialog from "@/features/security/components/ExportDialog"
import ImportDialog from "@/features/security/components/ImportDialog"
import PasswordDialog from "@/features/security/components/PasswordDialog"
import ChangePasswordDialog from "@/features/security/components/ChangePasswordDialog"
import SettingsAbout from "./SettingsAbout"
import { isSessionUnlocked, lockSession, isPasswordProtectionEnabled, disablePasswordProtection, getDerivedKey } from "@/lib/password"
import { toast } from "sonner"

type SettingsFabProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onOpenShortcuts?: () => void
}

const ICON_CHOICES: { key: IconKey; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "chat", label: "Chat" },
  { key: "mail", label: "Mail" },
  { key: "drive", label: "Drive" },
  { key: "github", label: "GitHub" },
  { key: "globe", label: "Globe" },
]

export default function SettingsFab({ open, onOpenChange, onOpenShortcuts }: SettingsFabProps = {}) {
  const { prefs, setPrefs } = usePrefs()
  const newId = useId()

  const [apiKeys, setApiKeys] = useState<{ openai?: string; anthropic?: string; gemini?: string }>({})
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false)
  const [passwordUnlockOpen, setPasswordUnlockOpen] = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [passwordDisableOpen, setPasswordDisableOpen] = useState(false)
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
                <h3 className="text-lg font-semibold">Weather</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weather" className="font-normal">Show weather</Label>
                    <p className="text-xs text-white/60">Hides and disables all weather fetching.</p>
                  </div>
                  <Switch
                    id="weather"
                    checked={prefs.showWeather}
                    onCheckedChange={(v) => setPrefs({ ...prefs, showWeather: v })}
                  />
                </div>

                {prefs.showWeather && (
                  <>
                    <div>
                      <Label htmlFor="temp-unit" className="text-xs font-normal text-white/70 mb-2 block">
                        Temperature Unit
                      </Label>
                      <Select
                        value={prefs.weatherUnits.temperature}
                        onValueChange={(v: "celsius" | "fahrenheit" | "kelvin") =>
                          setPrefs({ ...prefs, weatherUnits: { ...prefs.weatherUnits, temperature: v } })
                        }
                      >
                        <SelectTrigger id="temp-unit" className="bg-white/5 border-white/10 text-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 text-white border-white/10">
                          <SelectItem value="celsius">Celsius (°C)</SelectItem>
                          <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                          <SelectItem value="kelvin">Kelvin (K)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="wind-unit" className="text-xs font-normal text-white/70 mb-2 block">
                        Wind Speed Unit
                      </Label>
                      <Select
                        value={prefs.weatherUnits.windSpeed}
                        onValueChange={(v: "ms" | "kmh" | "mph" | "knots") =>
                          setPrefs({ ...prefs, weatherUnits: { ...prefs.weatherUnits, windSpeed: v } })
                        }
                      >
                        <SelectTrigger id="wind-unit" className="bg-white/5 border-white/10 text-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 text-white border-white/10">
                          <SelectItem value="ms">Meters per second (m/s)</SelectItem>
                          <SelectItem value="kmh">Kilometers per hour (km/h)</SelectItem>
                          <SelectItem value="mph">Miles per hour (mph)</SelectItem>
                          <SelectItem value="knots">Knots (kts)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="precip-unit" className="text-xs font-normal text-white/70 mb-2 block">
                        Precipitation Unit
                      </Label>
                      <Select
                        value={prefs.weatherUnits.precipitation}
                        onValueChange={(v: "mm" | "inch") =>
                          setPrefs({ ...prefs, weatherUnits: { ...prefs.weatherUnits, precipitation: v } })
                        }
                      >
                        <SelectTrigger id="precip-unit" className="bg-white/5 border-white/10 text-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 text-white border-white/10">
                          <SelectItem value="mm">Millimeters (mm)</SelectItem>
                          <SelectItem value="inch">Inches (in)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

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

              {keysLocked ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Lock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-300">API Keys Locked</p>
                      <p className="text-xs text-yellow-200/90 mt-1">
                        Unlock your session in the Security section below to view and edit your API keys.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="openai-key" className="text-xs font-normal text-white/80">
                        OpenAI API Key
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-white/50 hover:text-white/80 transition-colors">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="font-semibold mb-1">Get your OpenAI API key:</p>
                          <p>1. Visit platform.openai.com</p>
                          <p>2. Sign in or create account</p>
                          <p>3. Go to API keys section</p>
                          <p>4. Create new secret key</p>
                          <p className="mt-1 text-white/70">Required for GPT models. Keys start with "sk-"</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="openai-key"
                        type={showOpenAIKey ? "text" : "password"}
                        value={apiKeys.openai || ""}
                        onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                        placeholder="sk-..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      >
                        {showOpenAIKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="anthropic-key" className="text-xs font-normal text-white/80">
                        Anthropic API Key
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-white/50 hover:text-white/80 transition-colors">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="font-semibold mb-1">Get your Anthropic API key:</p>
                          <p>1. Visit console.anthropic.com</p>
                          <p>2. Sign in or create account</p>
                          <p>3. Go to API keys section</p>
                          <p>4. Create new API key</p>
                          <p className="mt-1 text-white/70">Required for Claude models. Keys start with "sk-ant-"</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="anthropic-key"
                        type={showAnthropicKey ? "text" : "password"}
                        value={apiKeys.anthropic || ""}
                        onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                        placeholder="sk-ant-..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      >
                        {showAnthropicKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="gemini-key" className="text-xs font-normal text-white/80">
                        Gemini API Key
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-white/50 hover:text-white/80 transition-colors">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="font-semibold mb-1">Get your Gemini API key:</p>
                          <p>1. Visit aistudio.google.com/apikey</p>
                          <p>2. Sign in with Google account</p>
                          <p>3. Click "Create API key"</p>
                          <p>4. Copy the generated key</p>
                          <p className="mt-1 text-white/70">Required for Gemini models. Free tier available.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="gemini-key"
                        type={showGeminiKey ? "text" : "password"}
                        value={apiKeys.gemini || ""}
                        onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                        placeholder="AIza..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                      >
                        {showGeminiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-300 text-xs">Beta Feature</p>
                    <p className="text-xs text-yellow-200/90 mt-0.5">
                      Password protection is experimental. Keep a secure backup of your API keys.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Security Status */}
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {securityStatus.enabled ? (
                          <Shield className="w-4 h-4 text-green-400" />
                        ) : (
                          <Shield className="w-4 h-4 text-orange-400" />
                        )}
                        <span className="text-sm font-medium">
                          {securityStatus.enabled ? "Password Protection Enabled" : "Password Protection Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        {securityStatus.enabled
                          ? "API keys encrypted with password-derived key (PBKDF2 + AES-256)"
                          : "API keys encrypted with stored key (less secure)"}
                      </p>
                    </div>
                  </div>

                  {securityStatus.enabled && (
                    <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-white/10">
                      {securityStatus.unlocked ? (
                        <>
                          <Unlock className="w-3 h-3 text-green-400" />
                          <span className="text-green-300">Session Unlocked</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-300">Session Locked</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Security Actions */}
                <div className="space-y-2">
                  {!securityStatus.enabled ? (
                    <Button
                      onClick={() => setPasswordSetupOpen(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Enable Password Protection
                    </Button>
                  ) : (
                    <>
                      {securityStatus.unlocked ? (
                        <>
                          <Button
                            onClick={() => {
                              lockSession()
                              updateSecurityStatus()
                              setKeysLocked(true)
                              setApiKeys({})
                            }}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Lock Session
                          </Button>
                          <Button
                            onClick={() => setPasswordChangeOpen(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Change Password
                          </Button>
                          <Button
                            onClick={() => setPasswordDisableOpen(true)}
                            variant="outline"
                            className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                          >
                            Disable Password Protection
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => setPasswordUnlockOpen(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock Session
                          </Button>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
                            <p className="text-xs text-yellow-200">
                              Unlock your session to change or disable password protection.
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
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

                <div className="space-y-2">
                {prefs.links.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white/5 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`name-${l.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                          Name
                        </Label>
                        <Input
                          id={`name-${l.id}`}
                          value={l.label}
                          onChange={(e) => updateLink(l.id, { label: e.target.value })}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="YouTube"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`icon-${l.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                          Icon
                        </Label>
                        <Select value={l.icon} onValueChange={(v: IconKey) => updateLink(l.id, { icon: v })}>
                          <SelectTrigger id={`icon-${l.id}`} className="bg-white/5 border-white/10 text-white w-[120px]">
                            <SelectValue placeholder="Icon" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 text-white border-white/10">
                            {ICON_CHOICES.map((opt) => (
                              <SelectItem key={opt.key} value={opt.key}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white/70 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => removeLink(l.id)}
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`url-${l.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                        URL
                      </Label>
                      <Input
                        id={`url-${l.id}`}
                        value={l.href}
                        onChange={(e) => updateLink(l.id, { href: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                        placeholder="https://youtube.com"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={addLink} className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add link
              </Button>
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
