import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

type Props = {
  onClick: () => void
}

export default function ChatFab({ onClick }: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-50">
      <Button
        data-testid="chat-fab"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-black/30 hover:bg-black/40 text-white/80 hover:text-white shadow"
        title="Open Chat (Ctrl+K)"
        onClick={onClick}
      >
        <MessageSquare className="w-5 h-5" />
      </Button>
    </div>
  )
}
