import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, EyeOff, HelpCircle, Lock } from "lucide-react"

type SettingsApiKeysProps = {
  apiKeys: { openai?: string; anthropic?: string; gemini?: string }
  keysLocked: boolean
  onApiKeysChange: (keys: { openai?: string; anthropic?: string; gemini?: string }) => void
}

export default function SettingsApiKeys({ apiKeys, keysLocked, onApiKeysChange }: SettingsApiKeysProps) {
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)

  if (keysLocked) {
    return (
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
    )
  }

  return (
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
            onChange={(e) => onApiKeysChange({ ...apiKeys, openai: e.target.value })}
            placeholder="sk-..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
          >
            {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            onChange={(e) => onApiKeysChange({ ...apiKeys, anthropic: e.target.value })}
            placeholder="sk-ant-..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
          >
            {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            onChange={(e) => onApiKeysChange({ ...apiKeys, gemini: e.target.value })}
            placeholder="AIza..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setShowGeminiKey(!showGeminiKey)}
          >
            {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
