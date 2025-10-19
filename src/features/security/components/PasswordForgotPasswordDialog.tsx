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

type PasswordForgotPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  loading?: boolean
}

export default function PasswordForgotPasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: PasswordForgotPasswordDialogProps) {
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (open) {
      setAccepted(false)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!accepted) return
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-black/95 text-white border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Forgot Password - Reset Security
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            This action cannot be undone. All your encrypted API keys will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
            <p className="text-sm text-red-200 font-semibold">Data Loss Warning</p>
            <ul className="text-xs text-red-200/90 space-y-1 list-disc list-inside">
              <li>All stored API keys will be permanently deleted</li>
              <li>Password protection will be disabled</li>
              <li>You will need to re-enter your API keys manually</li>
              <li>This action cannot be reversed</li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-200">
              <strong>What happens next:</strong> After confirming, you'll be returned to settings where you can enter your API keys again and optionally set up a new password.
            </p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="forgot-password-warning"
                checked={accepted}
                onCheckedChange={(checked: boolean | 'indeterminate') => setAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="forgot-password-warning" className="text-sm font-normal cursor-pointer text-white">
                I understand that all my API keys will be permanently deleted and I cannot recover them
              </Label>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onOpenChange(false)
              setAccepted(false)
            }}
            className="bg-gray-700 hover:bg-gray-800 text-white"
            disabled={loading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!accepted || loading}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Delete Keys & Reset Security"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
