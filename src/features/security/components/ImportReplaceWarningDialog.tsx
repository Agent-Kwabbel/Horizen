import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"

type ImportReplaceWarningDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConversationCount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function ImportReplaceWarningDialog({
  open,
  onOpenChange,
  currentConversationCount,
  onConfirm,
  onCancel,
}: ImportReplaceWarningDialogProps) {
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (open) {
      setAccepted(false)
    }
  }, [open])

  const handleConfirm = () => {
    if (!accepted) return
    onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-black/95 text-white border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Confirm Replace
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            This will permanently delete all your current conversations ({currentConversationCount}{" "}
            total) and replace them with the imported ones. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="replace-warning"
              checked={accepted}
              onCheckedChange={(checked: boolean | 'indeterminate') => setAccepted(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="replace-warning" className="text-sm font-normal cursor-pointer text-white">
              I understand this will delete all my current conversations
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-gray-700 hover:bg-gray-800 text-white"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!accepted}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Replace All Conversations
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
