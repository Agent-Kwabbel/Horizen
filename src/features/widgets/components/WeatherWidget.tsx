import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import type { WeatherWidgetConfig } from "@/lib/widgets"
import { useWeatherData } from "../hooks/useWeatherData"
import { useLocationSearch } from "../hooks/useLocationSearch"
import { useMoonData } from "../hooks/useMoonData"
import WeatherIcon from "./WeatherIcon"
import WeatherAlerts from "./WeatherAlerts"
import {
  getWeatherIcon,
  getPrecipitationIcon,
  formatTemperature,
  getOverallAQI,
  formatVisibility,
  formatPressure
} from "../services/weather-api"
import { detectWeatherAlerts, filterAlertsByLevel, filterAlertsByType } from "../services/weather-alerts"

const DEFAULT_UNITS = {
  temperature: "celsius" as const,
  windSpeed: "kmh" as const,
  precipitation: "mm" as const,
  visibility: "km" as const,
  pressure: "hpa" as const,
}

type WeatherWidgetProps = {
  config: WeatherWidgetConfig
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(((degrees % 360) / 22.5))
  return directions[index % 16]
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getAQILevel(aqi: number): { level: string, color: string } {
  if (aqi <= 50) return { level: 'Good', color: 'text-green-400' }
  if (aqi <= 100) return { level: 'Moderate', color: 'text-yellow-400' }
  if (aqi <= 150) return { level: 'Unhealthy (SG)', color: 'text-orange-400' }
  if (aqi <= 200) return { level: 'Unhealthy', color: 'text-red-400' }
  if (aqi <= 300) return { level: 'Very Unhealthy', color: 'text-purple-400' }
  return { level: 'Hazardous', color: 'text-red-600' }
}

function getUVIcon(uvIndex: number): string {
  const roundedUV = Math.round(uvIndex)
  if (roundedUV >= 1 && roundedUV <= 11) {
    return `uv-index-${roundedUV}`
  }
  return 'uv-index'
}

function formatWindSpeedValue(speedMs: number, units: WeatherWidgetConfig['settings']['units']): string {
  const windUnit = units?.windSpeed || 'kmh'

  // Convert from m/s to target unit
  let displaySpeed = speedMs
  switch (windUnit) {
    case "kmh": displaySpeed = speedMs * 3.6; break
    case "mph": displaySpeed = speedMs * 2.237; break
    case "knots": displaySpeed = speedMs * 1.944; break
    case "fts": displaySpeed = speedMs * 3.281; break
    case "beaufort": {
      // Convert m/s to Beaufort scale (same logic as getWindBeaufortIcon)
      let beaufort = 0
      if (speedMs >= 32.7) beaufort = 12
      else if (speedMs >= 28.5) beaufort = 11
      else if (speedMs >= 24.5) beaufort = 10
      else if (speedMs >= 20.8) beaufort = 9
      else if (speedMs >= 17.2) beaufort = 8
      else if (speedMs >= 13.9) beaufort = 7
      else if (speedMs >= 10.8) beaufort = 6
      else if (speedMs >= 8.0) beaufort = 5
      else if (speedMs >= 5.5) beaufort = 4
      else if (speedMs >= 3.4) beaufort = 3
      else if (speedMs >= 1.6) beaufort = 2
      else if (speedMs >= 0.5) beaufort = 1
      return `${beaufort} Bft`
    }
    case "ms": break
  }

  const unitLabels = {
    ms: "m/s",
    kmh: "km/h",
    mph: "mph",
    knots: "kts",
    fts: "ft/s"
  }
  return `${Math.round(displaySpeed)} ${unitLabels[windUnit as keyof typeof unitLabels]}`
}

function formatPrecipitationValue(probability: number): string {
  return `${probability ?? 0}%`
}

export default function WeatherWidget({ config }: WeatherWidgetProps) {
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem(`weather-expanded-${config.id}`)
    return saved === 'true'
  })

  const toggleExpanded = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    localStorage.setItem(`weather-expanded-${config.id}`, String(newExpanded))
  }
  const units = config.settings.units || DEFAULT_UNITS
  const forecastDisplay = config.settings.forecastDisplay || "expanded"
  const moonInfoEnabled = config.settings.moonInfo || false
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
  const { moonData } = useMoonData(coords?.lat, coords?.lon, moonInfoEnabled)

  const title = coords ? coords.name : "Select location"
  const allAlerts = weather ? detectWeatherAlerts(weather) : []
  const filteredByLevel = filterAlertsByLevel(allAlerts, alertLevel)
  const alerts = filterAlertsByType(filteredByLevel, alertTypes)

  const renderForecast = (showDivider: boolean = false) => {
    if (!weather || forecastDisplay === "never") return null

    const now = new Date()
    const currentHour = now.getHours()
    const todaySunrise = new Date(weather.daily.sunrise)
    const todaySunset = new Date(weather.daily.sunset)

    const hourlyForecast = Array.from({ length: 25 }, (_, i) => {
      const hour = (currentHour + i) % 24
      const isNow = i === 0

      const tempCelsius = isNow ? weather.current.temperature_2m : weather.hourly.temperature_2m[i]
      const formattedTemp = formatTemperature(tempCelsius, units.temperature)
      const temp = formattedTemp.replace('°C', '').replace('°F', '').replace('K', '')
      const degreeSymbol = units.temperature === 'kelvin' ? '' : '°'
      const precipitation = isNow ? weather.current.precipitation_probability : (weather.hourly.precipitation_probability?.[i] || 0)
      const weatherCode = isNow ? weather.current.weather_code : weather.hourly.weather_code[i]

      // Calculate if this hour is during daytime
      const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000)

      // If forecast crosses into next day, add 24 hours to sunrise/sunset
      const sunrise = new Date(todaySunrise)
      const sunset = new Date(todaySunset)
      if (forecastTime.getDate() !== now.getDate()) {
        sunrise.setDate(sunrise.getDate() + 1)
        sunset.setDate(sunset.getDate() + 1)
      }

      const isDayTime = forecastTime >= sunrise && forecastTime <= sunset

      const mockWeather = {
        weather_code: weatherCode,
        is_day: isDayTime ? 1 : 0,
        temperature_2m: isNow ? weather.current.temperature_2m : weather.hourly.temperature_2m[i],
        apparent_temperature: isNow ? weather.current.apparent_temperature : weather.hourly.apparent_temperature[i],
        wind_speed_10m: isNow ? weather.current.wind_speed_10m : weather.hourly.wind_speed_10m[i],
        wind_gusts_10m: isNow ? weather.current.wind_gusts_10m : weather.hourly.wind_gusts_10m[i],
        wind_direction_10m: 0,
        precipitation_probability: precipitation,
        precipitation: isNow ? weather.current.precipitation : weather.hourly.precipitation[i],
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 0,
        relative_humidity_2m: 0,
        surface_pressure: 0,
      }

      return {
        hour,
        temp,
        degreeSymbol,
        precipitation,
        mockWeather,
        isNow,
      }
    })

    return (
      <div className={showDivider ? "mt-3 pt-3 border-t border-white/20" : ""}>
        <div className={`flex gap-3 overflow-x-auto scrollbar-hide ${forecastDisplay === "always" ? "pt-2" : "pb-2"}`}>
          {hourlyForecast.map((forecast, index) => {
            const iconName = getWeatherIcon(forecast.mockWeather as any)
            const showPrecip = forecast.precipitation > 5

            return (
              <div
                key={index}
                className="flex flex-col items-center min-w-[3rem] flex-shrink-0"
              >
                <div className="text-xs text-white/70">
                  {forecast.isNow ? 'Now' : `${forecast.hour.toString().padStart(2, '0')}`}
                </div>

                <div className={`flex flex-col items-center justify-center flex-1 ${showPrecip ? 'gap-0' : ''}`}>
                  <WeatherIcon icon={iconName} size={24} />

                  {showPrecip && (
                    <div className="text-[10px] text-blue-400 -mt-0.5">
                      {forecast.precipitation}%
                    </div>
                  )}
                </div>

                <div className="text-sm font-medium">
                  {forecast.temp}{forecast.degreeSymbol}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] overflow-hidden py-0 shrink-0">
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

          <div className="flex flex-col items-end justify-center gap-2 shrink-0">
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

        {forecastDisplay === "always" && renderForecast(true)}

        {coords && (
          <button
            onClick={toggleExpanded}
            className="mt-2 flex items-center gap-2 w-full text-white/40 hover:text-white/60 transition-colors group"
            title={expanded ? "Show less" : "Show more"}
          >
            <div className="flex-1 h-px bg-white/20" />
            <div className="p-1 rounded-full group-hover:bg-white/5 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <div className="flex-1 h-px bg-white/20" />
          </button>
        )}

        {coords && weather && (
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: expanded ? '1000px' : '0px',
              opacity: expanded ? 1 : 0
            }}
          >
            <div className="mt-2 space-y-2 text-xs">
              {forecastDisplay === "expanded" && renderForecast(false)}

              <div className={`flex flex-col gap-2 ${forecastDisplay === "expanded" ? "mt-3 pt-3 border-t border-white/20" : ""}`}>
              <div className="flex items-center gap-2">
                <WeatherIcon icon="wind" size={18} />
                <span className="text-white/70">Wind Speed/Force</span>
                <span className="ml-auto tabular-nums">{formatWindSpeedValue(weather.current.wind_speed_10m, units)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="windsock" size={18} />
                <span className="text-white/70">Gust Speed/Force</span>
                <span className="ml-auto tabular-nums">{formatWindSpeedValue(weather.current.wind_gusts_10m, units)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="compass" size={18} />
                <span className="text-white/70">Wind Direction</span>
                <span className="ml-auto tabular-nums">{getWindDirection(weather.current.wind_direction_10m)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon={getPrecipitationIcon(weather.current)} size={18} />
                <span className="text-white/70">Rain Chance</span>
                <span className="ml-auto tabular-nums">{formatPrecipitationValue(weather.current.precipitation_probability)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="raindrop-measure" size={18} />
                <span className="text-white/70">Precipitation 24h</span>
                <span className="ml-auto tabular-nums">
                  {weather.hourly.precipitation.slice(0, 24).reduce((a, b) => a + b, 0).toFixed(1)} {units.precipitation}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="humidity" size={18} />
                <span className="text-white/70">Humidity</span>
                <span className="ml-auto tabular-nums">{weather.current.relative_humidity_2m}%</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="mist" size={18} />
                <span className="text-white/70">Visibility</span>
                <span className="ml-auto tabular-nums">{formatVisibility(weather.current.visibility, units.visibility)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="barometer" size={18} />
                <span className="text-white/70">Pressure</span>
                <span className="ml-auto tabular-nums">{formatPressure(weather.current.surface_pressure, units.pressure)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon={getUVIcon(weather.daily.uv_index_max)} size={18} />
                <span className="text-white/70">UV Index</span>
                <span className="ml-auto tabular-nums">{weather.daily.uv_index_max.toFixed(0)}</span>
              </div>

              {weather.airQuality && (
                <div className="flex items-center gap-2">
                  <WeatherIcon icon="smoke-particles" size={18} />
                  <span className="text-white/70">Air Quality</span>
                  <span className={`ml-auto tabular-nums ${getAQILevel(getOverallAQI(weather.airQuality)).color}`}>
                    {Math.round(getOverallAQI(weather.airQuality))} AQI
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <WeatherIcon icon="sunrise" size={18} />
                <span className="text-white/70">Sunrise</span>
                <span className="ml-auto tabular-nums">{formatTime(weather.daily.sunrise)}</span>
              </div>

              <div className="flex items-center gap-2">
                <WeatherIcon icon="sunset" size={18} />
                <span className="text-white/70">Sunset</span>
                <span className="ml-auto tabular-nums">{formatTime(weather.daily.sunset)}</span>
              </div>
            </div>

            {moonInfoEnabled && moonData && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <WeatherIcon icon={moonData.phaseIcon} size={32} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{moonData.phase}</div>
                    <div className="text-xs text-white/50">{moonData.illumination}% illuminated</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs mt-2">
                  {moonData.moonrise && (
                    <div className="flex items-center gap-2">
                      <WeatherIcon icon="moonrise" size={18} />
                      <span className="text-white/70">Moonrise</span>
                      <span className="ml-auto tabular-nums">{moonData.moonrise}</span>
                    </div>
                  )}

                  {moonData.moonset && (
                    <div className="flex items-center gap-2">
                      <WeatherIcon icon="moonset" size={18} />
                      <span className="text-white/70">Moonset</span>
                      <span className="ml-auto tabular-nums">{moonData.moonset}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </CardContent>
      <WeatherAlerts alerts={alerts} />
    </Card>
  )
}
