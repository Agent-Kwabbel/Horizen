import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import {
  validateExportDataV2,
  verifyImportHash,
  isEncryptedExportV2,
  getAvailableSections,
  decryptSection,
  type ExportDataV2,
  type SelectionTree,
} from "@/lib/import-export-v2"
import { importDataV2, createBackup, type ImportResult } from "@/lib/import-handler"
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
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileJson, Lock, Shield } from "lucide-react"
import ImportPreviewTree from "./ImportPreviewTree"

type ImportDialogV2Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportStep = "upload" | "password" | "preview" | "importing" | "complete"

export default function ImportDialogV2({ open, onOpenChange }: ImportDialogV2Props) {
  const { prefs, setPrefs } = usePrefs()
  const [step, setStep] = useState<ImportStep>("upload")
  const [exportData, setExportData] = useState<ExportDataV2 | null>(null)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [selection, setSelection] = useState<SelectionTree>({})
  const [mergeStrategies, setMergeStrategies] = useState<{
    chats?: "append" | "replace"
    quickLinks?: "merge" | "replace"
    widgets?: "merge" | "replace"
  }>({
    chats: "append",
    quickLinks: "merge",
    widgets: "merge",
  })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [backupKey, setBackupKey] = useState<string>("")
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type === "application/json") {
      handleFileSelect(file)
    } else {
      setError("Please drop a valid JSON backup file")
    }
  }

  const selectAllItems = (tree: SelectionTree) => {
    // Select all parent sections
    if (tree.apiKeys) tree.apiKeys.selected = true
    if (tree.chats) {
      tree.chats.selected = true
      Object.keys(tree.chats.items).forEach(id => {
        tree.chats!.items[id] = true
      })
    }
    if (tree.settings) {
      tree.settings.selected = true
      tree.settings.items.searchEngine = true
      tree.settings.items.quickLinks = true
      tree.settings.items.keyboardShortcuts = true
      tree.settings.items.chatPreferences = true
    }
    if (tree.widgets) {
      tree.widgets.selected = true
      Object.keys(tree.widgets.items).forEach(id => {
        tree.widgets!.items[id] = true
      })
    }
    setSelection(tree)
  }

  const handleFileSelect = async (selectedFile: File) => {
    setError("")

    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text) as ExportDataV2

      if (!validateExportDataV2(data)) {
        setError("Invalid import file format")
        return
      }

      // Verify hash
      const hashValid = await verifyImportHash(data)
      if (!hashValid) {
        setError("File integrity check failed. The file may have been modified.")
        return
      }

      setExportData(data)

      if (isEncryptedExportV2(data)) {
        setStep("password")
      } else {
        const availableSections = getAvailableSections(data)
        selectAllItems(availableSections)
        setStep("preview")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file")
    }
  }

  const handlePasswordSubmit = async () => {
    if (!exportData || !password) return

    setPasswordError("")

    try {
      const decrypted: ExportDataV2 = { ...exportData, contents: {}, encryptedSections: undefined }

      if (exportData.encryptedSections && exportData.salt) {
        const saltBytes = Uint8Array.from(atob(exportData.salt), c => c.charCodeAt(0))

        // Decrypt each encrypted section
        if (exportData.encryptedSections.apiKeys) {
          const apiKeys = await decryptSection(
            exportData.encryptedSections.apiKeys.data,
            exportData.encryptedSections.apiKeys.iv,
            password,
            saltBytes
          )
          decrypted.contents!.apiKeys = apiKeys
        }

        if (exportData.encryptedSections.chats) {
          const chats = await decryptSection(
            exportData.encryptedSections.chats.data,
            exportData.encryptedSections.chats.iv,
            password,
            saltBytes
          )
          decrypted.contents!.chats = chats
        }

        if (exportData.encryptedSections.settings) {
          const settings = await decryptSection(
            exportData.encryptedSections.settings.data,
            exportData.encryptedSections.settings.iv,
            password,
            saltBytes
          )
          decrypted.contents!.settings = settings
        }

        if (exportData.encryptedSections.widgets) {
          const widgets = await decryptSection(
            exportData.encryptedSections.widgets.data,
            exportData.encryptedSections.widgets.iv,
            password,
            saltBytes
          )
          decrypted.contents!.widgets = widgets
        }

        // Clear encrypted flag and sections since data is now decrypted
        decrypted.encrypted = false
      }

      // Use the decrypted data to build selection tree
      const availableSections = getAvailableSections(decrypted)
      selectAllItems(availableSections)
      setExportData(decrypted)
      setStep("preview")
    } catch (err) {
      setPasswordError("Incorrect password or corrupted data")
    }
  }

  const handleImport = async () => {
    if (!exportData) return

    setStep("importing")

    try {
      // Create backup before import
      const backup = createBackup(prefs)
      setBackupKey(backup)

      // Perform import
      const result = await importDataV2(
        exportData,
        prefs,
        {
          selection,
          mergeStrategies,
          createBackup: true,
        },
        password || undefined
      )

      // Apply imported data to prefs
      const newPrefs = { ...prefs }

      // Apply conversations
      if ((result as any).newConversations) {
        newPrefs.conversations = (result as any).newConversations
      }

      // Apply settings
      if ((result as any).searchEngine) {
        newPrefs.searchEngineId = (result as any).searchEngine.engineId
        newPrefs.customSearchEngines = (result as any).searchEngine.customEngines
      }

      if ((result as any).quickLinks) {
        newPrefs.links = (result as any).quickLinks
      }

      if ((result as any).chatPreferences) {
        newPrefs.showChat = (result as any).chatPreferences.showChat
        newPrefs.showVerifiedOrgModels = (result as any).chatPreferences.showVerifiedOrgModels
        if ((result as any).chatPreferences.chatModel) {
          newPrefs.chatModel = (result as any).chatPreferences.chatModel
        }
      }

      // Apply widgets
      if ((result as any).widgetsToMerge) {
        const widgetsToMerge = (result as any).widgetsToMerge
        for (const widget of widgetsToMerge) {
          const existingIndex = newPrefs.widgets.findIndex(w => w.id === widget.id)
          if (existingIndex >= 0) {
            newPrefs.widgets[existingIndex] = widget
          } else {
            newPrefs.widgets.push(widget)
          }
        }
      }

      if ((result as any).widgetsToAdd) {
        newPrefs.widgets.push(...(result as any).widgetsToAdd)
      }

      if ((result as any).widgetsToReplace) {
        for (const { index, widget } of (result as any).widgetsToReplace) {
          newPrefs.widgets[index] = widget
        }
      }

      setPrefs(newPrefs)
      setImportResult(result)
      setStep("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      setStep("preview")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state
    setTimeout(() => {
      setStep("upload")
      setExportData(null)
      setPassword("")
      setPasswordError("")
      setSelection({})
      setMergeStrategies({ chats: "append", quickLinks: "merge", widgets: "merge" })
      setImportResult(null)
      setBackupKey("")
      setError("")
    }, 300)
  }

  const hasSelection = selection.apiKeys?.selected ||
                       selection.chats?.selected ||
                       selection.settings?.selected ||
                       selection.widgets?.selected

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 text-white border-white/10 max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription className="text-white/70">
            {step === "upload" && "Select a Horizen backup file to import"}
            {step === "password" && "This backup is encrypted. Enter password to continue."}
            {step === "preview" && "Choose what to import and how to merge with existing data"}
            {step === "importing" && "Importing your data..."}
            {step === "complete" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/20"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-sm text-white/70 mb-4">
                  Drop a backup file here or click to browse
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="file-input"
                />
                <Button asChild>
                  <label htmlFor="file-input" className="cursor-pointer">
                    <FileJson className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                </Button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-300">Error</p>
                      <p className="text-xs text-red-200/90 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Password Step */}
          {step === "password" && exportData && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-300">Encrypted Backup</p>
                    <p className="text-xs text-blue-200/90 mt-1">
                      This backup was created on {new Date(exportData.exportedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-200/90 mt-1">
                      Enter the password used during export to decrypt.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="import-password" className="text-sm mb-2 block">
                  Password
                </Label>
                <Input
                  id="import-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                />
                {passwordError && (
                  <p className="text-xs text-red-400 mt-1">{passwordError}</p>
                )}
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && exportData && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-300">File Verified</p>
                    <p className="text-xs text-green-200/90 mt-1">
                      Backup created on {new Date(exportData.exportedAt).toLocaleString()}
                    </p>
                    {exportData.hash && (
                      <p className="text-xs text-green-200/90 mt-1">
                        SHA-256 hash verified ✓
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-300">Automatic Backup</p>
                    <p className="text-xs text-blue-200/90 mt-1">
                      Your current data will be backed up before import
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Select what to import</Label>
                <ImportPreviewTree
                  exportData={exportData}
                  currentPrefs={prefs}
                  selection={selection}
                  onSelectionChange={setSelection}
                  mergeStrategies={mergeStrategies}
                  onMergeStrategyChange={(section, strategy) => {
                    setMergeStrategies(prev => ({ ...prev, [section]: strategy as any }))
                  }}
                />
              </div>

              {!hasSelection && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-sm text-yellow-200">
                    Please select at least one item to import.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === "importing" && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Importing your data...</p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && importResult && (
            <div className="space-y-4">
              {importResult.success && Object.keys(importResult.imported).length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-300">Successfully Imported</p>
                      <ul className="text-xs text-green-200/90 mt-2 space-y-1">
                        {importResult.imported.apiKeys && (
                          <li>✓ {importResult.imported.apiKeys.count} API key(s): {importResult.imported.apiKeys.items.join(", ")}</li>
                        )}
                        {importResult.imported.chats && (
                          <li>✓ {importResult.imported.chats.count} chat conversation(s) ({importResult.imported.chats.mode}ed)</li>
                        )}
                        {importResult.imported.settings && (
                          <li>✓ Settings: {importResult.imported.settings.items.join(", ")}</li>
                        )}
                        {importResult.imported.widgets && (
                          <li>✓ {importResult.imported.widgets.count} widget(s): {importResult.imported.widgets.items.join(", ")}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-300">Partial Import</p>
                      <p className="text-xs text-yellow-200/90 mt-1">
                        Some items could not be imported:
                      </p>
                      <ul className="text-xs text-yellow-200/90 mt-2 space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {backupKey && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-200/90">
                    Your previous data has been backed up and can be restored from Settings if needed.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          )}

          {step === "password" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep("upload")}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={!password}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Decrypt
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!hasSelection}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
