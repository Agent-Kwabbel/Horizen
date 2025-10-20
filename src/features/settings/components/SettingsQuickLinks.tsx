import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.id} className="bg-white/5 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor={`name-${link.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                Name
              </Label>
              <Input
                id={`name-${link.id}`}
                value={link.label}
                onChange={(e) => onUpdateLink(link.id, { label: e.target.value })}
                placeholder="YouTube"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <Label htmlFor={`icon-${link.id}`} className="text-xs font-normal text-white/70 mb-1 block">
                Icon
              </Label>
              <Select
                value={link.icon}
                onValueChange={(icon) => onUpdateLink(link.id, { icon: icon as IconKey })}
              >
                <SelectTrigger id={`icon-${link.id}`} className="bg-white/5 border-white/10 text-white w-[120px]">
                  <SelectValue placeholder="Icon" />
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
            <div className="pt-5">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => onRemoveLink(link.id)}
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor={`url-${link.id}`} className="text-xs font-normal text-white/70 mb-1 block">
              URL
            </Label>
            <Input
              id={`url-${link.id}`}
              value={link.href}
              onChange={(e) => onUpdateLink(link.id, { href: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
              placeholder="https://youtube.com"
            />
          </div>
        </div>
      ))}
      <Button onClick={onAddLink} className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white">
        <Plus className="w-4 h-4 mr-2" /> Add link
      </Button>
    </div>
  )
}
