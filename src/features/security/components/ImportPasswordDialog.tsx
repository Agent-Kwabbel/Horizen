import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

type ImportPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (password: string) => Promise<void>
  onCancel: () => void
}

export default function ImportPasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
}: ImportPasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword("")
      setError("")
      setLoading(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!password) return

    setError("")
    setLoading(true)

    try {
      await onSubmit(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect password")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && password) {
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 text-white border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Password Required
          </DialogTitle>
          <DialogDescription className="text-white/70">
            This backup file is password-protected. Enter the password used during export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="import-password" className="text-sm font-normal text-white/80 mb-2 block">
              Password
            </Label>
            <Input
              id="import-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter backup password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-white/70 hover:text-white hover:bg-white/10"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!password || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading ? "Decrypting..." : "Decrypt & Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
