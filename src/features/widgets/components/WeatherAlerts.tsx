import { useRef, useEffect, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { WeatherAlert } from "../services/weather-alerts"
import { getAlertColor, getHighestSeverity } from "../services/weather-alerts"

type WeatherAlertsProps = {
  alerts: WeatherAlert[]
}

export default function WeatherAlerts({ alerts }: WeatherAlertsProps) {
  if (alerts.length === 0) return null

  const highestSeverity = getHighestSeverity(alerts)
  if (!highestSeverity) return null

  const alertColor = getAlertColor(highestSeverity)
  const alertMessages = alerts.map(a => a.message)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(25)

  useEffect(() => {
    if (scrollRef.current) {
      const width = scrollRef.current.scrollWidth / 2
      const pixelsPerSecond = 50
      const calculatedDuration = width / pixelsPerSecond
      setDuration(calculatedDuration)
    }
  }, [alertMessages])

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={`${alertColor} text-white text-xs px-3 py-1.5 overflow-hidden relative`}>
            <div
              ref={scrollRef}
              className="animate-scroll-alert whitespace-nowrap inline-block"
              style={{ animationDuration: `${duration}s` }}
            >
              {alertMessages.map((msg, idx) => (
                <span key={idx}>
                  {msg}
                  {idx < alertMessages.length - 1 && <span style={{ margin: '0 8px' }}>•</span>}
                </span>
              ))}
              <span style={{ margin: '0 8px' }}>•</span>
              {alertMessages.map((msg, idx) => (
                <span key={`dup-${idx}`}>
                  {msg}
                  {idx < alertMessages.length - 1 && <span style={{ margin: '0 8px' }}>•</span>}
                </span>
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-black/90 border-white/20 text-white text-xs px-3 py-2 max-w-xs">
          <p className="font-semibold mb-1">Automated Weather Alerts</p>
          <p>These alerts are automatically generated based on current weather, historical data, and forecasts. They are not official warnings from meteorological organizations or government agencies.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
