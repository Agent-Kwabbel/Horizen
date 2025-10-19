import { Youtube, MessageCircle, Mail, HardDrive, Github, Globe } from "lucide-react"
import type { QuickLink } from "@/lib/prefs"

const ICONS = {
  youtube: Youtube,
  chat: MessageCircle,
  mail: Mail,
  drive: HardDrive,
  github: Github,
  globe: Globe,
} as const

export default function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <nav className="absolute bottom-10 inset-x-0 flex justify-center gap-10">
      {links.map(({ id, label, href, icon }) => {
        const Icon = ICONS[icon] ?? Globe
        return (
          <a key={id} href={href} target="_blank" rel="noopener noreferrer"
             className="text-white/60 hover:text-white transition-colors duration-200 flex flex-col items-center gap-1">
            <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.6} />
            <span className="text-xs sm:text-sm font-medium opacity-70">{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
