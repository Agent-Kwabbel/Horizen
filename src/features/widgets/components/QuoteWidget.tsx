import type { QuoteWidgetConfig } from "@/lib/widgets"
import { Quote } from "lucide-react"
import { useQuoteRotation } from "../hooks/useQuoteRotation"

type QuoteWidgetProps = {
  config: QuoteWidgetConfig
}

export default function QuoteWidget({ config }: QuoteWidgetProps) {
  const quote = useQuoteRotation(
    config.settings.autoRotate,
    config.settings.rotateInterval
  )

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 text-white w-[18rem] shrink-0">
      <div className="flex items-start gap-3">
        <Quote className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
        <div>
          <p className="text-sm italic leading-relaxed mb-3">
            "{quote.text}"
          </p>
          <p className="text-xs text-white/60">
            — {quote.author}
          </p>
        </div>
      </div>
    </div>
  )
}
