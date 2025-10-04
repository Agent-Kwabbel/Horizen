import { Youtube, MessageCircle, Mail, HardDrive } from "lucide-react"

const links = [
  { href: "https://youtube.com", label: "YouTube", icon: Youtube },
  { href: "https://chat.openai.com", label: "ChatGPT", icon: MessageCircle },
  { href: "https://mail.proton.me", label: "Proton Mail", icon: Mail },
  { href: "https://drive.google.com", label: "Google Drive", icon: HardDrive },
]

export default function QuickLinks() {
  return (
    <nav className="absolute bottom-10 inset-x-0 flex justify-center gap-10">
      {links.map(({ href, label, icon: Icon }) => (
        <a
          key={label}
          href={href}
          rel="noopener noreferrer"
          className="
            text-white/60 hover:text-white
            transition-colors duration-200
            flex flex-col items-center gap-1
          "
        >
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.6} />
          <span className="text-xs sm:text-sm font-medium opacity-70">{label}</span>
        </a>
      ))}
    </nav>
  )
}

