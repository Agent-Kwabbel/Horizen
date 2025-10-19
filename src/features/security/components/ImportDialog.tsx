import { useState, useRef } from "react"
import { usePrefs } from "@/lib/prefs"
import { saveApiKeys } from "@/lib/api-keys"
import { saveShortcuts } from "@/lib/shortcuts"
import { parseImportFile, isEncryptedExport, type ExportData, type ImportMode } from "@/lib/import-export"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import ImportPasswordDialog from "./ImportPasswordDialog"
import ImportModeDialog from "./ImportModeDialog"
import ImportReplaceWarningDialog from "./ImportReplaceWarningDialog"

type ImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { prefs, setPrefs } = usePrefs()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importData, setImportData] = useState<ExportData | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showChatModeDialog, setShowChatModeDialog] = useState(false)
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const rawData = JSON.parse(text)

      if (isEncryptedExport(rawData)) {
        setPendingFile(file)
        setShowPasswordDialog(true)
        return
      }

      const data = await parseImportFile(file)
      setImportData(data)

      // If importing conversations and user has existing conversations, show mode dialog
      if (data.conversations && data.conversations.length > 0 && prefs.conversations.length > 0) {
        setShowChatModeDialog(true)
      } else {
        // Otherwise just import directly
        await performImport(data, "add")
      }
    } catch (err) {
      console.error("Import failed:", err)
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Invalid file format",
      })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!pendingFile) return

    const data = await parseImportFile(pendingFile, password)
    setImportData(data)
    setShowPasswordDialog(false)
    setPendingFile(null)

    // If importing conversations and user has existing conversations, show mode dialog
    if (data.conversations && data.conversations.length > 0 && prefs.conversations.length > 0) {
      setShowChatModeDialog(true)
    } else {
      // Otherwise just import directly
      await performImport(data, "add")
    }
  }

  const handleChatModeSelection = (mode: ImportMode) => {
    setShowChatModeDialog(false)

    if (mode === "replace") {
      setShowReplaceWarning(true)
    } else {
      performImport(importData!, mode)
    }
  }

  const handleReplaceConfirm = () => {
    setShowReplaceWarning(false)
    performImport(importData!, "replace")
  }

  const performImport = async (data: ExportData, mode: ImportMode) => {
    try {
      if (data.preferences) {
        setPrefs((p) => ({
          ...p,
          ...data.preferences,
        }))
      }

      if (data.weatherLocation) {
        localStorage.setItem("wx:location", JSON.stringify(data.weatherLocation))
      }

      if (data.shortcuts) {
        saveShortcuts(data.shortcuts)
      }

      if (data.apiKeys) {
        await saveApiKeys(data.apiKeys)
      }

      if (data.conversations) {
        if (mode === "replace") {
          setPrefs((p) => ({
            ...p,
            conversations: data.conversations!,
          }))
        } else {
          setPrefs((p) => ({
            ...p,
            conversations: [...p.conversations, ...data.conversations!],
          }))
        }
      }

      const parts: string[] = []
      if (data.preferences) parts.push("preferences")
      if (data.weatherLocation) parts.push("weather location")
      if (data.shortcuts) parts.push("keyboard shortcuts")
      if (data.apiKeys) parts.push("API keys")
      if (data.conversations) {
        parts.push(
          `${data.conversations.length} conversation${data.conversations.length === 1 ? "" : "s"}`
        )
      }

      toast.success("Import successful", {
        description: `Imported ${parts.join(", ")}`,
      })

      onOpenChange(false)
      setImportData(null)
    } catch (err) {
      console.error("Import failed:", err)
      toast.error("Import failed", {
        description: "An error occurred while importing data",
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black/95 text-white border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription className="text-white/70">
              Import data from a previously exported Horizen backup file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-200">
                Select a Horizen backup JSON file to import. You'll be able to choose how to handle
                conversations if the file contains any.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Select File
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onSubmit={handlePasswordSubmit}
        onCancel={() => {
          setShowPasswordDialog(false)
          setPendingFile(null)
        }}
      />

      <ImportModeDialog
        open={showChatModeDialog}
        onOpenChange={setShowChatModeDialog}
        conversationCount={importData?.conversations?.length || 0}
        onSelectMode={handleChatModeSelection}
        onCancel={() => {
          setShowChatModeDialog(false)
          setImportData(null)
        }}
      />

      <ImportReplaceWarningDialog
        open={showReplaceWarning}
        onOpenChange={setShowReplaceWarning}
        currentConversationCount={prefs.conversations.length}
        onConfirm={handleReplaceConfirm}
        onCancel={() => {
          setShowReplaceWarning(false)
          setImportData(null)
        }}
      />
    </>
  )
}
