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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Unlock, AlertTriangle, Shield, Eye, EyeOff, Info } from "lucide-react"
import {
  setupPassword,
  unlockWithPassword,
  validatePassword,
  disablePasswordProtection,
  getDerivedKey,
} from "@/lib/password"
import { clearLegacyEncryptionKey, reencryptApiKeys, getLegacyEncryptionKey } from "@/lib/api-keys"
import PasswordOptOutWarningDialog from "./PasswordOptOutWarningDialog"
import PasswordForgotPasswordDialog from "./PasswordForgotPasswordDialog"

type PasswordDialogProps = {
  mode: "setup" | "unlock"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function PasswordDialog({ mode, open, onOpenChange, onSuccess }: PasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validation, setValidation] = useState<{ valid: boolean; message?: string; isStrong?: boolean }>({ valid: true })
  const [showOptOutWarning, setShowOptOutWarning] = useState(false)
  const [showForgotPasswordWarning, setShowForgotPasswordWarning] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword("")
      setConfirmPassword("")
      setShowPassword(false)
      setError("")
      setValidation({ valid: true })
    }
  }, [open])

  useEffect(() => {
    if (mode === "setup" && password.length > 0) {
      const result = validatePassword(password)
      setValidation(result)
    } else {
      setValidation({ valid: true })
    }
  }, [password, mode])

  const handleSetup = async () => {
    setError("")

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const legacyKey = await getLegacyEncryptionKey()

      await setupPassword(password)

      const newPasswordKey = getDerivedKey()

      if (!newPasswordKey) {
        throw new Error("Failed to get password-derived key")
      }

      try {
        await reencryptApiKeys(legacyKey || undefined, newPasswordKey)
      } catch (err) {
        console.log("No API keys to re-encrypt:", err)
      }

      clearLegacyEncryptionKey()

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup password")
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setError("")
    setLoading(true)

    try {
      const success = await unlockWithPassword(password)
      if (success) {
        onSuccess()
        onOpenChange(false)
      } else {
        setError("Incorrect password")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock")
    } finally {
      setLoading(false)
    }
  }

  const handleOptOut = async () => {
    setLoading(true)
    try {
      await disablePasswordProtection()

      onSuccess()
      onOpenChange(false)
      setShowOptOutWarning(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable protection")
    } finally {
      setLoading(false)
      setShowOptOutWarning(false)
    }
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    try {
      await disablePasswordProtection()

      const { saveApiKeys } = await import("@/lib/api-keys")
      await saveApiKeys({})

      localStorage.removeItem("horizen:encrypted-api-keys")

      onSuccess()
      onOpenChange(false)
      setShowForgotPasswordWarning(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset security")
    } finally {
      setLoading(false)
      setShowForgotPasswordWarning(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      if (mode === "setup") {
        handleSetup()
      } else {
        handleUnlock()
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black/95 text-white border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "setup" ? (
                <>
                  <Shield className="w-5 h-5 text-blue-400" />
                  Setup Password Protection (BETA)
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-yellow-400" />
                  Unlock Session
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {mode === "setup" ? (
                <>
                  Protect your API keys with a password. Your encryption key will be derived from this
                  password and never stored.
                </>
              ) : (
                <>
                  Enter your password to unlock your session and access encrypted API keys.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {mode === "setup" && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-300 text-sm">BETA Feature Warning</p>
                  <p className="text-xs text-yellow-200/90 mt-1">
                    Password protection is in beta. Some encryption/decryption features may not work correctly.
                    <strong className="block mt-1">Keep a secure backup copy of your API keys elsewhere.</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pb-4 pt-0">
            {mode === "setup" && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-blue-200 font-semibold">Enhanced Security</p>
                  <ul className="text-xs text-blue-200/90 space-y-1 list-disc list-inside">
                    <li>Password never stored - only you know it</li>
                    <li>Encryption key derived using PBKDF2 (600,000 iterations)</li>
                    <li>API keys protected by AES-GCM 256-bit encryption</li>
                    <li>Auto-lock after 30 minutes of inactivity</li>
                  </ul>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-300 text-sm">Security Considerations</p>
                      <p className="text-xs text-orange-200/90 mt-1">
                        Password protection secures your API keys from unauthorized access via browser storage.
                        However, it <strong className="text-orange-200">cannot protect against</strong>:
                      </p>
                      <ul className="text-xs text-orange-200/90 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>Malicious browser extensions</strong> with storage permissions</li>
                        <li><strong>Malware or spyware</strong> on your computer</li>
                        <li><strong>Keyloggers</strong> that capture your password</li>
                        <li><strong>Physical access</strong> to your unlocked device</li>
                      </ul>
                      <p className="text-xs text-orange-200/90 mt-2">
                        <strong>Recommendation:</strong> Only install trusted browser extensions and keep your computer secure with antivirus software.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="password" className="text-sm font-normal text-white/80 mb-2 block">
                Password
              </Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === "setup" ? "Enter password (min 6 characters)" : "Enter your password"}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {mode === "setup" && validation.message && (
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

            {mode === "setup" && (
              <div>
                <Label htmlFor="confirm-password" className="text-sm font-normal text-white/80 mb-2 block">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Re-enter password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

          </div>

          <DialogFooter className="flex-row justify-between gap-2">
            <div className="flex gap-2">
              {mode === "setup" && (
                <Button
                  variant="ghost"
                  onClick={() => setShowOptOutWarning(true)}
                  className="text-white/50 hover:text-white/70 hover:bg-white/5"
                >
                  Skip (not recommended)
                </Button>
              )}
              {mode === "unlock" && (
                <Button
                  variant="ghost"
                  onClick={() => setShowForgotPasswordWarning(true)}
                  className="text-white/50 hover:text-white/70 hover:bg-white/5"
                >
                  Forgot Password?
                </Button>
              )}
            </div>
            <Button
              onClick={mode === "setup" ? handleSetup : handleUnlock}
              disabled={loading || password.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {loading ? (
                "Processing..."
              ) : mode === "setup" ? (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Protection
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PasswordOptOutWarningDialog
        open={showOptOutWarning}
        onOpenChange={setShowOptOutWarning}
        onConfirm={handleOptOut}
        loading={loading}
      />

      <PasswordForgotPasswordDialog
        open={showForgotPasswordWarning}
        onOpenChange={setShowForgotPasswordWarning}
        onConfirm={handleForgotPassword}
        loading={loading}
      />
    </>
  )
}
