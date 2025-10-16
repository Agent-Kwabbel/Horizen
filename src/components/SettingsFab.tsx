import { useId, useState, useEffect } from "react"
import { usePrefs } from "@/lib/prefs"
import type { QuickLink, IconKey } from "@/lib/prefs"
import { getApiKeys, saveApiKeys, migrateFromPlaintext } from "@/lib/api-keys"
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
import { Plus, Trash2, Settings, Eye, EyeOff, HelpCircle, Keyboard } from "lucide-react"

const ICON_CHOICES: { key: IconKey; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "chat", label: "Chat" },
  { key: "mail", label: "Mail" },
  { key: "drive", label: "Drive" },
  { key: "github", label: "GitHub" },
  { key: "globe", label: "Globe" },
]

type SettingsFabProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onOpenShortcuts?: () => void
}

export default function SettingsFab({ open, onOpenChange, onOpenShortcuts }: SettingsFabProps = {}) {
  const { prefs, setPrefs } = usePrefs()
  const newId = useId()

  const [apiKeys, setApiKeys] = useState<{ openai?: string; anthropic?: string }>({})
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)

  // Load API keys on mount and migrate from plaintext if needed
  useEffect(() => {
    let mounted = true
    ;(async () => {
      await migrateFromPlaintext()
      const keys = await getApiKeys()
      if (mounted) {
        setApiKeys(keys)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Save API keys when they change
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
                  Required for chat functionality. Keys are stored locally.
                </p>
              </div>

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
                <h4 className="text-sm font-medium">Keyboard Shortcuts</h4>
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
                <h3 className="text-lg font-semibold">Quick Links</h3>
                <p className="text-xs text-white/60 mt-1">
                  Customize your quick access links.
                </p>
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

            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold">About Horizen</h3>
              </div>

              <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm text-white/80">
                <p>
                  Horizen is a privacy-first AI chat interface built as a browser start page with DuckDuckGo search, customizable quick links, and weather.
                </p>
                <p>
                  <strong className="text-white/90">Data Storage:</strong> All data is stored locally in your browser using localStorage. Your API keys are encrypted with AES-GCM 256-bit encryption before storage. Chat conversations, preferences, and encrypted keys persist across browser restarts but are permanently deleted when you clear browser data.
                </p>
                <p>
                  <strong className="text-white/90">Privacy:</strong> No data is sent to any servers except your chosen AI providers (OpenAI or Anthropic) when you send chat messages. Weather data is fetched from Open-Meteo's free API. Search queries go directly to DuckDuckGo.
                </p>
              </div>
            </div>
            </div>
          </div>

          <SheetFooter className="text-xs text-white/50 px-5 pb-5 shrink-0">
            Changes are saved automatically.
          </SheetFooter>
          </TooltipProvider>
        </SheetContent>
      </Sheet>
    </div>
  )
}
