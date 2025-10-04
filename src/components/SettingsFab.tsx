import { useId } from "react"
import { usePrefs } from "@/lib/prefs"
import type { QuickLink, IconKey } from "@/lib/prefs"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Settings } from "lucide-react"

const ICON_CHOICES: { key: IconKey; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "chat", label: "Chat" },
  { key: "mail", label: "Mail" },
  { key: "drive", label: "Drive" },
  { key: "github", label: "GitHub" },
  { key: "globe", label: "Globe" },
]

export default function SettingsFab() {
  const { prefs, setPrefs } = usePrefs()
  const newId = useId()

  const updateLink = (id: string, patch: Partial<QuickLink>) =>
    setPrefs((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))

  const addLink = () =>
    setPrefs((p) => ({
      ...p,
      links: [...p.links, { id: `${newId}-${Date.now()}`, label: "New", href: "https://", icon: "globe" }],
    }))

  const removeLink = (id: string) =>
    setPrefs((p) => ({ ...p, links: p.links.filter((l) => l.id !== id) }))

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/30 hover:bg-black/40 text-white/80 hover:text-white shadow"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-[92vw] sm:w-[480px] max-w-[520px] bg-black/85 text-white border-white/10 backdrop-blur p-5"
        >
          <SheetHeader className="mb-2">
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weather">Show weather</Label>
                <div className="text-xs text-white/60">Hides and disables all weather fetching.</div>
              </div>
              <Switch
                id="weather"
                checked={prefs.showWeather}
                onCheckedChange={(v) => setPrefs({ ...prefs, showWeather: v })}
              />
            </div>

            <div>
              <Label>Quick links</Label>
              <div className="text-xs text-white/60 mb-2">Name, URL, and icon.</div>

              <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
                {prefs.links.map((l) => (
                  <div
                    key={l.id}
                    className="grid items-center gap-2 bg-white/5 rounded-lg p-2
                               grid-cols-[minmax(8rem,1fr)_minmax(12rem,1.6fr)_112px_36px]"
                  >
                    <Input
                      value={l.label}
                      onChange={(e) => updateLink(l.id, { label: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                      placeholder="Name"
                    />
                    <Input
                      value={l.href}
                      onChange={(e) => updateLink(l.id, { href: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                      placeholder="https://example.com"
                    />
                    <Select value={l.icon} onValueChange={(v: IconKey) => updateLink(l.id, { icon: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Icon" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 text-white border-white/10">
                        {ICON_CHOICES.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-red-300 hover:bg-white/10"
                      onClick={() => removeLink(l.id)}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={addLink} className="mt-3 bg-white/10 hover:bg-white/20 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add link
              </Button>
            </div>
          </div>

          <SheetFooter className="text-xs text-white/50">Changes are saved automatically.</SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
