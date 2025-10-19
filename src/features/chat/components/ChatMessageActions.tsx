import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Pencil, RotateCcw, Copy, Check, Maximize2, Minimize2, Sparkles, Zap } from "lucide-react"
import type { ChatModel, ChatConversation, OpenAIModel, AnthropicModel, GeminiModel } from "@/lib/prefs"
import { OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS } from "./chat-constants"

type ChatMessageActionsProps = {
  messageId: string
  messageRole: "user" | "assistant"
  messageContent: string
  copiedMessageId: string | null
  conversation: ChatConversation | undefined
  showVerifiedOrgModels: boolean
  onEdit: () => void
  onRetry: (messageId: string, modifier?: string, newModel?: ChatModel) => void
  onCopy: (messageId: string, content: string) => void
}

export default function ChatMessageActions({
  messageId,
  messageRole,
  messageContent,
  copiedMessageId,
  conversation,
  showVerifiedOrgModels,
  onEdit,
  onRetry,
  onCopy,
}: ChatMessageActionsProps) {
  return (
    <div className="flex gap-2 mt-1">
      {messageRole === "user" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
          title="Edit message"
        >
          <Pencil className="w-3 h-3 mr-1" />
          Edit
        </Button>
      )}

      {messageRole === "assistant" && messageContent && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
              title="Retry response"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-black/95 border-white/10 text-white p-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRetry(messageId)}
                className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Retry
              </Button>

              <div className="border-t border-white/10 pt-1 mt-1">
                <div className="text-[10px] text-white/40 px-2 py-1">Adjust Response</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(messageId, "Please provide more detail and expand on your answer")}
                  className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Maximize2 className="w-3 h-3 mr-2" />
                  More Detail
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(messageId, "Please make this more concise and brief")}
                  className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Minimize2 className="w-3 h-3 mr-2" />
                  More Concise
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(messageId, "Please simplify your explanation and make it easier to understand")}
                  className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Sparkles className="w-3 h-3 mr-2" />
                  Simplify
                </Button>
              </div>

              {conversation && (
                <div className="border-t border-white/10 pt-1 mt-1">
                  <div className="text-[10px] text-white/40 px-2 py-1">Switch Model</div>
                  {conversation.model.provider === "openai" ? (
                    <>
                      {OPENAI_MODELS.filter((m) =>
                        showVerifiedOrgModels || (m.key !== "gpt-5" && m.key !== "gpt-5-mini")
                      ).filter(m => m.key !== conversation.model.model).map((model) => (
                        <Button
                          key={model.key}
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(messageId, undefined, { provider: "openai", model: model.key as OpenAIModel })}
                          className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Zap className="w-3 h-3 mr-2" />
                          {model.label}
                        </Button>
                      ))}
                    </>
                  ) : conversation.model.provider === "anthropic" ? (
                    <>
                      {ANTHROPIC_MODELS.filter(m => m.key !== conversation.model.model).slice(0, 2).map((model) => (
                        <Button
                          key={model.key}
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(messageId, undefined, { provider: "anthropic", model: model.key as AnthropicModel })}
                          className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Zap className="w-3 h-3 mr-2" />
                          {model.label}
                        </Button>
                      ))}
                    </>
                  ) : (
                    <>
                      {GEMINI_MODELS.filter(m => m.key !== conversation.model.model).slice(0, 2).map((model) => (
                        <Button
                          key={model.key}
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(messageId, undefined, { provider: "gemini", model: model.key as GeminiModel })}
                          className="w-full justify-start h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Zap className="w-3 h-3 mr-2" />
                          {model.label}
                        </Button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCopy(messageId, messageContent)}
        className="h-6 px-2 text-xs text-white/50 hover:text-white hover:bg-white/10"
        title="Copy message"
      >
        {copiedMessageId === messageId ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </>
        )}
      </Button>
    </div>
  )
}
