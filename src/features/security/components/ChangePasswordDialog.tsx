import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Eye, EyeOff } from "lucide-react"
import { validatePassword } from "@/lib/password"

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function ChangePasswordDialog({ open, onOpenChange, onSuccess }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; message?: string; isStrong?: boolean }>({ valid: true })

  useEffect(() => {
    if (open) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswords(false)
      setError("")
      setValidation({ valid: true })
    }
  }, [open])

  useEffect(() => {
    if (newPassword.length > 0) {
      setValidation(validatePassword(newPassword))
    } else {
      setValidation({ valid: true })
    }
  }, [newPassword])

  const handleChangePassword = async () => {
    setError("")

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    setLoading(true)
    try {
      const { getDerivedKey } = await import("@/lib/password")
      const { reencryptApiKeys } = await import("@/lib/api-keys")

      const oldPasswordKey = getDerivedKey()
      if (!oldPasswordKey) {
        setError("Session is locked. Please unlock first.")
        setLoading(false)
        return
      }

      const { changePassword } = await import("@/lib/password")
      const success = await changePassword(currentPassword, newPassword)
      if (success) {
        const newPasswordKey = getDerivedKey()
        if (!newPasswordKey) {
          throw new Error("Failed to get new password key")
        }

        await reencryptApiKeys(oldPasswordKey, newPasswordKey)

        onSuccess()
        onOpenChange(false)
      } else {
        setError("Current password is incorrect")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleChangePassword()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-black/95 text-white border-white/10 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Change Password
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            Enter your current password and choose a new one. Your API keys will be re-encrypted with the new password.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="current-password" className="text-sm font-normal text-white/80 mb-2 block">
              Current Password
            </Label>
            <div className="flex gap-2">
              <Input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter current password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setShowPasswords(!showPasswords)}
                type="button"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="new-password" className="text-sm font-normal text-white/80 mb-2 block">
              New Password
            </Label>
            <Input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter new password (min 6 characters)"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
            {validation.message && (
              <p className={`text-xs mt-1 ${
                !validation.valid
                  ? "text-red-400"
                  : validation.isStrong
                    ? "text-green-400"
                    : "text-yellow-400"
              }`}>
                {validation.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm-new-password" className="text-sm font-normal text-white/80 mb-2 block">
              Confirm New Password
            </Label>
            <Input
              id="confirm-new-password"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Re-enter new password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-700 hover:bg-gray-800 text-white">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
