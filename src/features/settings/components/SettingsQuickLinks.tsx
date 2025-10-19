import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { QuickLink, IconKey } from "@/lib/prefs"

const ICON_CHOICES: { key: IconKey; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "chat", label: "Chat" },
  { key: "mail", label: "Mail" },
  { key: "drive", label: "Drive" },
  { key: "github", label: "GitHub" },
  { key: "globe", label: "Globe" },
]

type SettingsQuickLinksProps = {
  links: QuickLink[]
  onAddLink: () => void
  onUpdateLink: (id: string, patch: Partial<QuickLink>) => void
  onRemoveLink: (id: string) => void
}

export default function SettingsQuickLinks({
  links,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
}: SettingsQuickLinksProps) {
  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div key={link.id} className="flex gap-2 items-start">
          <div className="flex-1 space-y-2">
            <Input
              value={link.label}
              onChange={(e) => onUpdateLink(link.id, { label: e.target.value })}
              placeholder="Label"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
            <Input
              value={link.href}
              onChange={(e) => onUpdateLink(link.id, { href: e.target.value })}
              placeholder="URL"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
            <Select
              value={link.icon}
              onValueChange={(icon) => onUpdateLink(link.id, { icon: icon as IconKey })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-white/10">
                {ICON_CHOICES.map((ic) => (
                  <SelectItem key={ic.key} value={ic.key}>
                    {ic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveLink(link.id)}
            className="text-white/70 hover:text-red-300 hover:bg-red-500/20 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        onClick={onAddLink}
        variant="outline"
        size="sm"
        className="w-full border-white/10 text-white hover:bg-white/10"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Link
      </Button>
    </div>
  )
}
