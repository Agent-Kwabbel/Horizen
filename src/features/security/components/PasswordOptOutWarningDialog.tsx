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

type PasswordOptOutWarningDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  loading?: boolean
}

export default function PasswordOptOutWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: PasswordOptOutWarningDialogProps) {
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
            Disable Password Protection?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            This will significantly reduce the security of your API keys.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
            <p className="text-sm text-red-200 font-semibold">Security Risks:</p>
            <ul className="text-xs text-red-200/90 space-y-1 list-disc list-inside">
              <li>Encryption key stored in localStorage (same as encrypted data)</li>
              <li>Vulnerable to XSS attacks and malicious scripts</li>
              <li>Browser extensions can access your API keys</li>
              <li>Anyone with DevTools access can decrypt your keys</li>
              <li>No protection against local malware</li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="opt-out-warning"
                checked={accepted}
                onCheckedChange={(checked: boolean | 'indeterminate') => setAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="opt-out-warning" className="text-sm font-normal cursor-pointer text-white">
                I understand the security risks and want to disable password protection
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
            {loading ? "Processing..." : "Disable Protection"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
