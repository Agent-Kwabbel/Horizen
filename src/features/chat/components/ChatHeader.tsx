import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Ghost } from "lucide-react"
import type { ChatConversation, ChatModel, OpenAIModel, AnthropicModel, GeminiModel } from "@/lib/prefs"
import { OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS } from "./chat-constants"

type ChatHeaderProps = {
  conversation: ChatConversation
  showVerifiedOrgModels: boolean
  onModelChange: (model: ChatModel) => void
  onToggleGhostMode: () => void
}

export default function ChatHeader({
  conversation,
  showVerifiedOrgModels,
  onModelChange,
  onToggleGhostMode,
}: ChatHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-white/10">
      <TooltipProvider>
        <div className="flex gap-4 items-end">
          <div className="min-w-0">
            <Label className="text-xs text-white/60 mb-1 block">Provider</Label>
            <Select
              value={conversation.model.provider}
              onValueChange={(provider: "openai" | "anthropic" | "gemini") =>
                onModelChange({
                  provider,
                  model: provider === "openai" ? "gpt-4o" : provider === "anthropic" ? "claude-sonnet-4-5-20250929" : "gemini-2.5-flash",
                })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-white/10">
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0">
            <Label className="text-xs text-white/60 mb-1 block">Model</Label>
            <Select
              value={conversation.model.model}
              onValueChange={(model) =>
                onModelChange({ ...conversation.model, model: model as OpenAIModel | AnthropicModel | GeminiModel })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-white/10">
                {conversation.model.provider === "openai"
                  ? OPENAI_MODELS.filter((m) =>
                      showVerifiedOrgModels || (m.key !== "gpt-5" && m.key !== "gpt-5-mini")
                    ).map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))
                  : conversation.model.provider === "anthropic"
                  ? ANTHROPIC_MODELS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))
                  : GEMINI_MODELS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleGhostMode}
                disabled={conversation.messages.length > 0}
                className={`h-8 w-8 shrink-0 transition-colors ${
                  conversation.messages.length > 0
                    ? "text-white/30 cursor-not-allowed opacity-50"
                    : conversation.isGhostMode
                    ? "text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30"
                    : "text-white/50 hover:text-white/70 hover:bg-white/10"
                }`}
              >
                <Ghost className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] bg-black/95 border-white/10 text-white">
              {conversation.messages.length > 0 ? (
                <>
                  <p className="font-semibold mb-1">Ghost Mode Locked</p>
                  <p className="text-sm">
                    Ghost mode can only be toggled on new conversations before any messages are sent.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold mb-1">Ghost Mode {conversation.isGhostMode ? "(Active)" : "(Inactive)"}</p>
                  <p className="text-sm mb-2">
                    {conversation.isGhostMode
                      ? "This conversation is ephemeral and will not be saved."
                      : "Enable to create an ephemeral conversation that won't be saved."}
                  </p>
                  <p className="text-xs text-white/70">
                    Ghost mode chats are only sent to the LLM API and disappear when you refresh the page.
                  </p>
                </>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
