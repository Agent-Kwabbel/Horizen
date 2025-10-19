import { Button } from "@/components/ui/button"
import { Shield, Lock, Unlock, AlertTriangle } from "lucide-react"

type SettingsSecurityProps = {
  securityStatus: { enabled: boolean; unlocked: boolean }
  onEnableProtection: () => void
  onLockSession: () => void
  onUnlockSession: () => void
  onChangePassword: () => void
  onDisableProtection: () => void
}

export default function SettingsSecurity({
  securityStatus,
  onEnableProtection,
  onLockSession,
  onUnlockSession,
  onChangePassword,
  onDisableProtection,
}: SettingsSecurityProps) {
  return (
    <div className="space-y-3">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-300 text-xs">Beta Feature</p>
            <p className="text-xs text-yellow-200/90 mt-0.5">
              Password protection is experimental. Keep a secure backup of your API keys.
            </p>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {securityStatus.enabled ? (
                <Shield className="w-4 h-4 text-green-400" />
              ) : (
                <Shield className="w-4 h-4 text-orange-400" />
              )}
              <span className="text-sm font-medium">
                {securityStatus.enabled ? "Password Protection Enabled" : "Password Protection Disabled"}
              </span>
            </div>
            <p className="text-xs text-white/60">
              {securityStatus.enabled
                ? "API keys encrypted with password-derived key (PBKDF2 + AES-256)"
                : "API keys encrypted with stored key (less secure)"}
            </p>
          </div>
        </div>

        {securityStatus.enabled && (
          <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-white/10">
            {securityStatus.unlocked ? (
              <>
                <Unlock className="w-3 h-3 text-green-400" />
                <span className="text-green-300">Session Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-300">Session Locked</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {!securityStatus.enabled ? (
          <Button
            onClick={onEnableProtection}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Enable Password Protection
          </Button>
        ) : (
          <>
            {securityStatus.unlocked ? (
              <>
                <Button
                  onClick={onLockSession}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Lock Session
                </Button>
                <Button
                  onClick={onChangePassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Change Password
                </Button>
                <Button
                  onClick={onDisableProtection}
                  variant="outline"
                  className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                >
                  Disable Password Protection
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={onUnlockSession}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock Session
                </Button>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
                  <p className="text-xs text-yellow-200">
                    Unlock your session to change or disable password protection.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
