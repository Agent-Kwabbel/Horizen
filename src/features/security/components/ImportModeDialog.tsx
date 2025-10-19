import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import type { ImportMode } from "@/lib/import-export"

type ImportModeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationCount: number
  onSelectMode: (mode: ImportMode) => void
  onCancel: () => void
}

export default function ImportModeDialog({
  open,
  onOpenChange,
  conversationCount,
  onSelectMode,
  onCancel,
}: ImportModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 text-white border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Conversations</DialogTitle>
          <DialogDescription className="text-white/70 text-base">
            This backup contains {conversationCount} conversation
            {conversationCount === 1 ? "" : "s"}. How would you like to import them?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <button
            onClick={() => onSelectMode("add")}
            className="w-full bg-blue-600/10 hover:bg-blue-600/20 border-2 border-blue-500/50 hover:border-blue-400 rounded-lg p-4 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <Plus className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg text-white mb-1">Add to Existing</div>
                <div className="text-sm text-white/60">
                  Keep current conversations and add imported ones
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectMode("replace")}
            className="w-full bg-red-600/10 hover:bg-red-600/20 border-2 border-red-500/50 hover:border-red-400 rounded-lg p-4 transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="bg-red-500/20 p-2 rounded-lg group-hover:bg-red-500/30 transition-colors">
                <RefreshCw className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg text-white mb-1">Replace All</div>
                <div className="text-sm text-white/60">
                  Delete current conversations and use imported ones
                </div>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
