import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, RefreshCw } from "lucide-react"
import { usePrefs } from "@/lib/prefs"
import type { WeatherUnits } from "@/lib/prefs"

type Coords = { lat: number; lon: number; name: string }
type CurrentWx = {
  temperature_2m: number
  apparent_temperature: number
  wind_speed_10m: number
  precipitation_probability: number
  precipitation: number
  is_day: 0 | 1
  weather_code: number
}
type WxCache = { t: number; data: CurrentWx }

const TTL_MS = 15 * 60 * 1000 // 15 min
const LS_LOC = "wx:location"

const storeLoc = (c: Coords) => localStorage.setItem(LS_LOC, JSON.stringify(c))
const loadLoc = (): Coords | null => {
  try {
    return JSON.parse(localStorage.getItem(LS_LOC) || "null")
  } catch {
    return null
  }
}

const wxKey = (lat: number, lon: number) => `wx:cache:${lat.toFixed(3)},${lon.toFixed(3)}`
const getCache = (k: string): CurrentWx | null => {
  try {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WxCache
    if (Date.now() - parsed.t > TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}
const setCache = (k: string, data: CurrentWx) =>
  localStorage.setItem(k, JSON.stringify({ t: Date.now(), data } satisfies WxCache))

async function fetchCurrent(
  lat: number,
  lon: number,
  units: WeatherUnits
): Promise<CurrentWx> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,precipitation,precipitation_probability"
  )
  url.searchParams.set("timezone", "auto")

  url.searchParams.set("temperature_unit", units.temperature === "fahrenheit" ? "fahrenheit" : "celsius")

  const apiWindUnit = units.windSpeed === "knots" ? "kmh" : units.windSpeed
  url.searchParams.set("wind_speed_unit", apiWindUnit)

  url.searchParams.set("precipitation_unit", units.precipitation)

  const res = await fetch(url.toString())
  const j = await res.json()
  const data = j.current as CurrentWx

  if (units.temperature === "kelvin") {
    data.temperature_2m = data.temperature_2m + 273.15
    data.apparent_temperature = data.apparent_temperature + 273.15
  }

  if (units.windSpeed === "knots") {
    data.wind_speed_10m = data.wind_speed_10m * 0.539957
  }

  return data
}

type GeoResult = {
  id: number
  name: string
  country: string
  latitude: number
  longitude: number
  admin1?: string
}

async function searchPlaces(q: string): Promise<GeoResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", q)
  url.searchParams.set("count", "8")
  url.searchParams.set("language", "en")
  url.searchParams.set("format", "json")
  const res = await fetch(url.toString())
  const j = await res.json()
  return (j.results || []) as GeoResult[]
}

function wxGlyph(code: number, isDay: 0 | 1) {
  if (code === 0) return isDay ? "☀️" : "🌙"
  if ([1, 2, 3].includes(code)) return "⛅"
  if ([45, 48].includes(code)) return "☁️"
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️"
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️"
  if ([95, 96, 99].includes(code)) return "⛈️"
  return "🌡️"
}

export default function WeatherWidget() {
  const { prefs } = usePrefs()
  const [coords, setCoords] = useState<Coords | null>(() => loadLoc())
  const [wx, setWx] = useState<CurrentWx | null>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const prevUnitsRef = useRef(prefs.weatherUnits)

  useEffect(() => {
    const run = async () => {
      if (!coords) return
      const key = wxKey(coords.lat, coords.lon)

      const unitsChanged = prevUnitsRef.current !== prefs.weatherUnits &&
        (prevUnitsRef.current.temperature !== prefs.weatherUnits.temperature ||
         prevUnitsRef.current.windSpeed !== prefs.weatherUnits.windSpeed ||
         prevUnitsRef.current.precipitation !== prefs.weatherUnits.precipitation)

      if (unitsChanged) {
        localStorage.removeItem(key)
      }

      prevUnitsRef.current = prefs.weatherUnits

      if (!unitsChanged) {
        const cached = getCache(key)
        if (cached) {
          setWx(cached)
          return
        }
      }

      const data = await fetchCurrent(coords.lat, coords.lon, prefs.weatherUnits).catch(() => null)
      if (data) {
        setWx(data)
        setCache(key, data)
      }
    }
    run()
  }, [coords, prefs.weatherUnits])

  useEffect(() => {
    if (q.length < 2) {
      setResults(null)
      return
    }
    let active = true
    searchPlaces(q)
      .then((r) => active && setResults(r))
      .catch(() => void 0)
    return () => {
      active = false
    }
  }, [q])

  const pick = (r: GeoResult) => {
    const c: Coords = {
      lat: r.latitude,
      lon: r.longitude,
      name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    }
    setCoords(c)
    storeLoc(c)
    setOpen(false)
  }

  const refresh = () => {
    if (!coords) return
    const key = wxKey(coords.lat, coords.lon)
    localStorage.removeItem(key)
    setCoords({ ...coords }) // retriggers effect to refetch
  }

  const title = coords ? coords.name : "Select location"

  return (
    <div className="absolute top-4 right-4 z-10 pointer-events-auto">
      <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] py-3">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-white/70 truncate" title={title}>
                {title}
              </div>

              {wx && coords ? (
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-3xl leading-none mr-2">{wxGlyph(wx.weather_code, wx.is_day)}</div>

                  <div className="leading-tight">
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl sm:text-[1.6rem] font-semibold tabular-nums">
                        {Math.round(wx.temperature_2m)}{prefs.weatherUnits.temperature === "kelvin" ? "K" : `°${prefs.weatherUnits.temperature === "fahrenheit" ? "F" : "C"}`}
                      </div>
                      <div className="text-sm text-white/70 whitespace-nowrap tabular-nums">
                        Feels&nbsp;{Math.round(wx.apparent_temperature)}{prefs.weatherUnits.temperature === "kelvin" ? "K" : `°${prefs.weatherUnits.temperature === "fahrenheit" ? "F" : "C"}`}
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-white/70 tabular-nums">
                      💨 {Math.round(wx.wind_speed_10m)} {
                        prefs.weatherUnits.windSpeed === "ms" ? "m/s" :
                        prefs.weatherUnits.windSpeed === "kmh" ? "km/h" :
                        prefs.weatherUnits.windSpeed === "mph" ? "mph" : "kts"
                      } · 🌧️ {wx.precipitation_probability ?? 0}% ({(wx.precipitation ?? 0).toFixed(1)}{prefs.weatherUnits.precipitation})
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
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search city…"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/50 mb-2"
                    autoFocus
                  />
                  <div className="max-h-64 overflow-auto space-y-1">
                    {results?.length
                      ? results.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => pick(r)}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10"
                          >
                            <div className="text-sm">{r.name}</div>
                            <div className="text-xs text-white/60">
                              {[r.admin1, r.country].filter(Boolean).join(", ")}
                            </div>
                          </button>
                        ))
                      : q.length >= 2
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
    </div>
  )
}
