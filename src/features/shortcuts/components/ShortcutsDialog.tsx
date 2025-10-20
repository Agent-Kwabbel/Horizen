import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  getShortcuts,
  saveShortcuts,
  resetShortcuts,
  formatShortcutKey,
  getActionLabel,
  type ShortcutBinding,
  type ShortcutKey,
} from "@/lib/shortcuts"
import { RotateCcw } from "lucide-react"

type ShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>([])
  const [recording, setRecording] = useState<string | null>(null)

  useEffect(() => {
    setShortcuts(getShortcuts())
  }, [open])

  const handleRecordShortcut = (action: string) => {
    setRecording(action)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!recording) return

    event.preventDefault()
    event.stopPropagation()

    if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) return

    if (event.key === "Escape") {
      setRecording(null)
      return
    }

    const newKey: ShortcutKey = {
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
    }

    const updatedShortcuts = shortcuts.map((s) =>
      s.action === recording ? { ...s, key: newKey } : s
    )

    setShortcuts(updatedShortcuts)
    saveShortcuts(updatedShortcuts)
    setRecording(null)
  }

  useEffect(() => {
    if (recording) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [recording, shortcuts])

  const handleReset = () => {
    resetShortcuts()
    setShortcuts(getShortcuts())
  }

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) acc[shortcut.category] = []
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, ShortcutBinding[]>
  )

  const categoryLabels = {
    navigation: "Navigation",
    chat: "Chat",
    interface: "Interface",
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[92vw] sm:w-[540px] max-w-[640px] bg-black/90 text-white border-white/10 backdrop-blur p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
          <SheetTitle className="text-xl">Keyboard Shortcuts</SheetTitle>
          <SheetDescription className="text-white/60">
            Customize keyboard shortcuts or click on a shortcut to record a new key combination.
            Press Escape to cancel recording.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-white/80 mb-3">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{getActionLabel(shortcut.action)}</div>
                        <div className="text-xs text-white/60">{shortcut.description}</div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleRecordShortcut(shortcut.action)}
                        className={`font-mono text-sm ${
                          recording === shortcut.action
                            ? "bg-blue-500/20 text-blue-400 border border-blue-400/50"
                            : "bg-white/10 hover:bg-white/20 text-white/90"
                        }`}
                      >
                        {recording === shortcut.action ? (
                          "Press any key..."
                        ) : (
                          <Kbd>{formatShortcutKey(shortcut.key)}</Kbd>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center px-6 pb-6 pt-4 border-t border-white/10 shrink-0">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)} className="bg-white/10 hover:bg-white/20">
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
