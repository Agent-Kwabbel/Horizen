import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import { exportData, downloadExportFile, type ExportOptions } from "@/lib/import-export"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Download, AlertTriangle, Lock } from "lucide-react"

type ExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { prefs } = usePrefs()
  const [options, setOptions] = useState<ExportOptions>({
    includePreferences: true,
    includeApiKeys: false,
    includeChats: true,
  })
  const [apiKeysWarningAccepted, setApiKeysWarningAccepted] = useState(false)
  const [exportPassword, setExportPassword] = useState("")
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const password = options.includeApiKeys ? exportPassword : undefined
      const jsonData = await exportData(prefs, options, password)
      downloadExportFile(jsonData)
      onOpenChange(false)
      // Reset state
      setOptions({
        includePreferences: true,
        includeApiKeys: false,
        includeChats: true,
      })
      setApiKeysWarningAccepted(false)
      setExportPassword("")
    } catch (err) {
      console.error("Export failed:", err)
      if (err instanceof Error && err.message.includes("Session locked")) {
        alert("Cannot export API keys: Session is locked. Please unlock your session in Settings first.")
      } else {
        alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    } finally {
      setExporting(false)
    }
  }

  const hasSelection = options.includePreferences || options.includeApiKeys || options.includeChats
  const apiKeysOk = !options.includeApiKeys || apiKeysWarningAccepted
  const passwordOk = !options.includeApiKeys || exportPassword.length >= 6
  const canExport = hasSelection && apiKeysOk && passwordOk

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 text-white border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription className="text-white/70">
            Export your Horizen data to a JSON file for backup or transfer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-prefs"
                checked={options.includePreferences}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setOptions({ ...options, includePreferences: checked === true })
                }
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="export-prefs" className="font-normal cursor-pointer">
                  Preferences
                </Label>
                <p className="text-xs text-white/60 mt-0.5">
                  Settings, quick links, search engine, and display options
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-chats"
                checked={options.includeChats}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setOptions({ ...options, includeChats: checked === true })
                }
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="export-chats" className="font-normal cursor-pointer">
                  Chat Conversations
                </Label>
                <p className="text-xs text-white/60 mt-0.5">
                  All saved chat conversations (ghost mode chats excluded)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-keys"
                checked={options.includeApiKeys}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  setOptions({ ...options, includeApiKeys: checked === true })
                  if (!checked) setApiKeysWarningAccepted(false)
                }}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="export-keys" className="font-normal cursor-pointer">
                  API Keys
                </Label>
                <p className="text-xs text-white/60 mt-0.5">
                  OpenAI and Anthropic API keys (encrypted)
                </p>
              </div>
            </div>
          </div>

          {options.includeApiKeys && (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-3">
                <div className="flex gap-2 items-start">
                  <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-300 text-sm">Password Protection Required</p>
                    <p className="text-xs text-blue-200/90 mt-1">
                      The export file will be encrypted with a password to protect your API keys.
                      You'll need this password to import the file later.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="export-password" className="text-sm font-normal text-white/80 mb-2 block">
                    Export Password (min 6 characters)
                  </Label>
                  <Input
                    id="export-password"
                    type="password"
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    placeholder="Enter password to encrypt export"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-3">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-300 text-sm">Security Warning</p>
                    <p className="text-xs text-red-200/90 mt-1">
                      Even though encrypted, store this backup file securely and never share it publicly.
                      Anyone with the file AND password can decrypt your API keys.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-1">
                  <Checkbox
                    id="api-keys-warning"
                    checked={apiKeysWarningAccepted}
                    onCheckedChange={(checked: boolean | 'indeterminate') => setApiKeysWarningAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="api-keys-warning" className="text-sm font-normal cursor-pointer text-white">
                    I understand the risks and will store this file securely
                  </Label>
                </div>
              </div>
            </>
          )}

          {!hasSelection && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
              <p className="text-sm text-yellow-200">
                Please select at least one option to export.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
