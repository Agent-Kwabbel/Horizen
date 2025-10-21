import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, RefreshCw } from "lucide-react"
import type { WeatherWidgetConfig } from "@/lib/widgets"
import { useWeatherData } from "../hooks/useWeatherData"
import { useLocationSearch } from "../hooks/useLocationSearch"
import WeatherIcon from "./WeatherIcon"
import WeatherAlerts from "./WeatherAlerts"
import {
  getWeatherIcon,
  getWindBeaufortIcon,
  getPrecipitationIcon,
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation
} from "../services/weather-api"
import { detectWeatherAlerts, filterAlertsByLevel, filterAlertsByType } from "../services/weather-alerts"

const DEFAULT_UNITS = {
  temperature: "celsius" as const,
  windSpeed: "ms" as const,
  precipitation: "mm" as const,
}

type WeatherWidgetProps = {
  config: WeatherWidgetConfig
}

export default function WeatherWidget({ config }: WeatherWidgetProps) {
  const units = config.settings.units || DEFAULT_UNITS
  const alertLevel = config.settings.alertLevel || "all"
  const alertTypes = config.settings.alertTypes
  const {
    coords,
    setLocation,
    open,
    setOpen,
    query,
    setQuery,
    results
  } = useLocationSearch(config.settings.location)

  const { weather, refresh } = useWeatherData(coords, units)

  const title = coords ? coords.name : "Select location"
  const allAlerts = weather ? detectWeatherAlerts(weather) : []
  const filteredByLevel = filterAlertsByLevel(allAlerts, alertLevel)
  const alerts = filterAlertsByType(filteredByLevel, alertTypes)

  return (
    <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] overflow-hidden py-0">
      <CardContent className={`p-4 ${alerts.length > 0 ? 'pb-0' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/70 truncate" title={title}>
              {title}
            </div>

            {weather && weather.current && weather.daily && coords ? (
              <div className="mt-1">
                <div className="flex items-center gap-2">
                  <div className="mr-1">
                    <WeatherIcon icon={getWeatherIcon(weather.current)} size={56} />
                  </div>

                  <div className="leading-tight">
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl sm:text-[1.6rem] font-semibold tabular-nums">
                        {formatTemperature(weather.current.temperature_2m, units.temperature)}
                      </div>
                      <div className="text-sm text-white/70 whitespace-nowrap tabular-nums">
                        Feels&nbsp;{formatTemperature(weather.current.apparent_temperature, units.temperature)}
                      </div>
                    </div>

                    <div className="mt-0.5 text-xs text-white/70 tabular-nums">
                      H: {formatTemperature(weather.daily.temperature_2m_max, units.temperature)} · L: {formatTemperature(weather.daily.temperature_2m_min, units.temperature)}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/70 tabular-nums flex items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <WeatherIcon icon={getWindBeaufortIcon(weather.current.wind_speed_10m, units.windSpeed)} size={16} />
                    {formatWindSpeed(weather.current.wind_speed_10m, units.windSpeed)}
                  </span>
                  <span className="mx-2">·</span>
                  <span className="inline-flex items-center gap-1">
                    <WeatherIcon icon={getPrecipitationIcon(weather.current)} size={16} />
                    {formatPrecipitation(weather.current.precipitation_probability, weather.current.precipitation, units.precipitation)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <div className="flex items-center gap-2">
                  <div className="mr-1">
                    <Skeleton className="h-14 w-14 rounded-full bg-white/10" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-7 w-16 rounded bg-white/10" />
                      <Skeleton className="h-4 flex-1 rounded bg-white/10" />
                    </div>
                    <Skeleton className="h-3 w-full rounded bg-white/10" />
                  </div>
                </div>
                <div className="mt-2">
                  <Skeleton className="h-4 w-full rounded bg-white/10" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end justify-center gap-2 shrink-0 self-stretch">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              title="Refresh"
              onClick={coords ? refresh : undefined}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  title="Change location"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-black/80 backdrop-blur border-white/10 text-white">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search city…"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50 mb-2"
                  autoFocus
                />
                <div className="max-h-64 overflow-auto space-y-1">
                  {results?.length
                    ? results.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setLocation(r)}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10"
                        >
                          <div className="text-sm">{r.name}</div>
                          <div className="text-xs text-white/60">
                            {[r.admin1, r.country].filter(Boolean).join(", ")}
                          </div>
                        </button>
                      ))
                    : query.length >= 2
                      ? <div className="text-xs text-white/60 px-1 py-2">No results</div>
                      : <div className="text-xs text-white/60 px-1 py-2">Type at least 2 characters…</div>
                  }
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
      <WeatherAlerts alerts={alerts} />
    </Card>
  )
}
