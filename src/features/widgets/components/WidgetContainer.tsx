import { usePrefs } from "@/lib/prefs"
import { getEnabledWidgets } from "@/lib/widgets"
import type { WidgetConfig } from "@/lib/widgets"
import WeatherWidget from "./WeatherWidget"
import NotesWidget from "./NotesWidget"
import QuoteWidget from "./QuoteWidget"
import TickerWidget from "./TickerWidget"
import PomodoroWidget from "./PomodoroWidget"

type WidgetRendererProps = {
  widget: WidgetConfig
}

function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case "weather":
      return <WeatherWidget config={widget} />
    case "notes":
      return <NotesWidget config={widget} />
    case "quote":
      return <QuoteWidget config={widget} />
    case "ticker":
      return <TickerWidget config={widget} />
    case "pomodoro":
      return <PomodoroWidget config={widget} />
    default:
      return null
  }
}

export default function WidgetContainer() {
  const { prefs } = usePrefs()
  const enabledWidgets = getEnabledWidgets(prefs.widgets)

  if (enabledWidgets.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 bottom-24 z-10 flex flex-col items-end pointer-events-none">
      <div className="flex flex-col items-end gap-4 h-full overflow-y-auto scrollbar-hide pointer-events-auto pr-1 pb-4">
        {enabledWidgets.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  )
}
