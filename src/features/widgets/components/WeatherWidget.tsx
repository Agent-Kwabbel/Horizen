import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, RefreshCw } from "lucide-react"
import type { WeatherWidgetConfig } from "@/lib/widgets"
import { useWeatherData } from "../hooks/useWeatherData"
import { useLocationSearch } from "../hooks/useLocationSearch"
import {
  getWeatherIcon,
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation
} from "../services/weather-api"

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

  return (
    <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] py-2">
      <CardContent className="p-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm text-white/70 truncate" title={title}>
              {title}
            </div>

            {weather && coords ? (
              <div className="mt-1 flex items-center gap-2">
                <div className="text-3xl leading-none mr-2">
                  {getWeatherIcon(weather.weather_code, weather.is_day)}
                </div>

                <div className="leading-tight">
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl sm:text-[1.6rem] font-semibold tabular-nums">
                      {formatTemperature(weather.temperature_2m, units.temperature)}
                    </div>
                    <div className="text-sm text-white/70 whitespace-nowrap tabular-nums">
                      Feels&nbsp;{formatTemperature(weather.apparent_temperature, units.temperature)}
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-white/70 tabular-nums">
                    💨 {formatWindSpeed(weather.wind_speed_10m, units.windSpeed)} · 🌧️ {formatPrecipitation(weather.precipitation_probability, weather.precipitation, units.precipitation)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 bg-white/10" />
                  <Skeleton className="h-3 w-36 bg-white/10" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              title="Refresh"
              onClick={refresh}
              disabled={!coords}
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
    </Card>
  )
}
