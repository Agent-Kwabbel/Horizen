import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import type { WeatherWidgetConfig, TickerWidgetConfig } from "@/lib/widgets"
import { updateWidgetSettings } from "@/lib/widgets"
import { createCacheKey } from "@/features/widgets/services/ticker-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Code, X, ChevronDown, ChevronRight } from "lucide-react"

export default function DevModeOverlay() {
  const { prefs, setPrefs } = usePrefs()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null)

  // Weather widget dev controls
  const [weatherLat, setWeatherLat] = useState("")
  const [weatherLon, setWeatherLon] = useState("")
  const [weatherName, setWeatherName] = useState("")

  // Weather override controls
  const [overrideTemp, setOverrideTemp] = useState("")
  const [overrideFeelsLike, setOverrideFeelsLike] = useState("")
  const [overrideWind, setOverrideWind] = useState("")
  const [overrideWindGusts, setOverrideWindGusts] = useState("")
  const [overrideVisibility, setOverrideVisibility] = useState("")
  const [overridePrecipProb, setOverridePrecipProb] = useState("")
  const [overridePrecip, setOverridePrecip] = useState("")
  const [overrideSnowfall, setOverrideSnowfall] = useState("")
  const [overrideWeatherCode, setOverrideWeatherCode] = useState("")
  const [overrideTempMax, setOverrideTempMax] = useState("")
  const [overrideTempMin, setOverrideTempMin] = useState("")
  const [overrideUVIndex, setOverrideUVIndex] = useState("")
  const [overridePM25, setOverridePM25] = useState("")
  const [overrideOzone, setOverrideOzone] = useState("")

  // Ticker widget dev controls
  const [tickerIndex, setTickerIndex] = useState("")
  const [tickerName, setTickerName] = useState("")
  const [tickerPrice, setTickerPrice] = useState("")
  const [tickerChange, setTickerChange] = useState("")

  const handleSetWeatherLocation = (widgetId: string) => {
    const lat = parseFloat(weatherLat)
    const lon = parseFloat(weatherLon)

    if (isNaN(lat) || isNaN(lon)) {
      alert("Invalid latitude or longitude")
      return
    }

    // Set location in widget settings
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        location: {
          name: weatherName || "Custom Location",
          latitude: lat,
          longitude: lon,
        },
      }),
    }))

    // Also update localStorage for weather widget
    localStorage.setItem("wx:location", JSON.stringify({
      lat,
      lon,
      name: weatherName || "Custom Location",
    }))

    // Clear cache to force refetch
    const cacheKey = `wx:cache:${lat.toFixed(3)},${lon.toFixed(3)}`
    localStorage.removeItem(cacheKey)

    setWeatherLat("")
    setWeatherLon("")
    setWeatherName("")
  }

  const handleOverrideWeatherData = (widgetId: string) => {
    const widget = prefs.widgets.find((w) => w.id === widgetId)
    if (!widget || widget.type !== "weather") return

    const location = (widget as WeatherWidgetConfig).settings.location
    if (!location) {
      alert("Set a location first")
      return
    }

    const cacheKey = `wx:cache:${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`

    // Get existing cache or create new data
    const existingCache = localStorage.getItem(cacheKey)
    let weatherData: any = {
      current: {
        temperature_2m: 20,
        apparent_temperature: 18,
        wind_speed_10m: 5,
        wind_gusts_10m: 8,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 0,
        is_day: 1,
        weather_code: 0,
        relative_humidity_2m: 50,
        surface_pressure: 1013,
        visibility: 10000,
      },
      hourly: {
        temperature_2m: Array(30).fill(20),
        apparent_temperature: Array(30).fill(18),
        precipitation_probability: Array(30).fill(0),
        precipitation: Array(30).fill(0),
        weather_code: Array(30).fill(0),
        uv_index: Array(30).fill(3),
        wind_speed_10m: Array(30).fill(5),
        wind_gusts_10m: Array(30).fill(8),
      },
      daily: {
        temperature_2m_max: 25,
        temperature_2m_min: 15,
        apparent_temperature_max: 23,
        apparent_temperature_min: 13,
        precipitation_sum: 0,
        precipitation_hours: 0,
        weather_code: 0,
        wind_speed_10m_max: 10,
        wind_gusts_10m_max: 15,
        uv_index_max: 5,
      },
      airQuality: {
        pm2_5: 10,
        european_aqi_pm2_5: 15,
        us_aqi_pm2_5: 20,
        pm10: 15,
        european_aqi_pm10: 20,
        us_aqi_pm10: 25,
        ozone: 50,
        european_aqi_o3: 60,
        us_aqi_o3: 70,
      },
      latitude: location.latitude,
      longitude: location.longitude,
    }

    if (existingCache) {
      try {
        const parsed = JSON.parse(existingCache)
        weatherData = parsed.data
      } catch {
        // Use defaults
      }
    }

    // Apply overrides to current weather
    if (overrideTemp) weatherData.current.temperature_2m = parseFloat(overrideTemp)
    if (overrideFeelsLike) weatherData.current.apparent_temperature = parseFloat(overrideFeelsLike)
    if (overrideWind) weatherData.current.wind_speed_10m = parseFloat(overrideWind)
    if (overrideWindGusts) weatherData.current.wind_gusts_10m = parseFloat(overrideWindGusts)
    if (overrideVisibility) weatherData.current.visibility = parseFloat(overrideVisibility)
    if (overridePrecipProb) weatherData.current.precipitation_probability = parseFloat(overridePrecipProb)
    if (overridePrecip) weatherData.current.precipitation = parseFloat(overridePrecip)
    if (overrideSnowfall) weatherData.current.snowfall = parseFloat(overrideSnowfall)
    if (overrideWeatherCode) weatherData.current.weather_code = parseInt(overrideWeatherCode)

    // Apply overrides to daily weather
    if (overrideTempMax) weatherData.daily.temperature_2m_max = parseFloat(overrideTempMax)
    if (overrideTempMin) weatherData.daily.temperature_2m_min = parseFloat(overrideTempMin)
    if (overrideWindGusts) weatherData.daily.wind_gusts_10m_max = parseFloat(overrideWindGusts)
    if (overrideUVIndex) weatherData.daily.uv_index_max = parseFloat(overrideUVIndex)

    // Apply overrides to air quality
    if (overridePM25) weatherData.airQuality.pm2_5 = parseFloat(overridePM25)
    if (overrideOzone) weatherData.airQuality.ozone = parseFloat(overrideOzone)

    // Save to cache
    localStorage.setItem(cacheKey, JSON.stringify({
      t: Date.now(),
      data: weatherData,
    }))

    // Force reload
    window.location.reload()
  }


  const handleResetPrefs = () => {
    if (confirm("Reset all preferences to default? This will reload the page.")) {
      localStorage.clear()
      window.location.reload()
    }
  }

  const handleExportPrefs = () => {
    const dataStr = JSON.stringify(prefs, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "horizen-prefs.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleOverrideTickerData = (widgetId: string) => {
    const widget = prefs.widgets.find((w) => w.id === widgetId)
    if (!widget || widget.type !== "ticker") return

    const config = widget as TickerWidgetConfig
    if (config.settings.symbols.length === 0) {
      alert("Add at least one ticker symbol first")
      return
    }

    const index = parseInt(tickerIndex) || 0
    if (index < 0 || index >= config.settings.symbols.length) {
      alert(`Index must be between 0 and ${config.settings.symbols.length - 1}`)
      return
    }

    const price = parseFloat(tickerPrice) || 100
    const change = parseFloat(tickerChange) || 0
    const changePercent = (change / price) * 100
    const name = tickerName || config.settings.symbols[index].symbol.toUpperCase()

    const cacheKey = createCacheKey(config.settings.symbols)

    const mockData = config.settings.symbols.map((item, idx) => ({
      symbol: idx === index ? name : item.symbol.toUpperCase(),
      price: idx === index ? price : 100,
      change24h: idx === index ? change : 0,
      changePercent24h: idx === index ? changePercent : 0,
      name: idx === index ? name : item.symbol.toUpperCase(),
    }))

    localStorage.setItem(cacheKey, JSON.stringify({
      t: Date.now(),
      data: mockData,
    }))

    setTickerIndex("")
    setTickerName("")
    setTickerPrice("")
    setTickerChange("")

    window.location.reload()
  }

  const handleClearTickerCache = (widgetId: string) => {
    const widget = prefs.widgets.find((w) => w.id === widgetId)
    if (!widget || widget.type !== "ticker") return

    const config = widget as TickerWidgetConfig
    const cacheKey = createCacheKey(config.settings.symbols)

    localStorage.removeItem(cacheKey)
    window.location.reload()
  }


  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 bg-yellow-500 hover:bg-yellow-600 text-black font-mono font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        title="Open Dev Mode (Development Only)"
      >
        <Code className="w-4 h-4" />
        DEV MODE
      </button>
    )
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/95 backdrop-blur-xl border border-yellow-500/50 rounded-lg shadow-2xl w-[420px] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-yellow-500 text-black px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono font-bold">
          <Code className="w-5 h-5" />
          DEV MODE
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-yellow-600 p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-4 space-y-4 flex-1">
        {/* Global Controls */}
        <div className="space-y-2">
          <h3 className="text-yellow-500 font-mono font-bold text-sm">GLOBAL</h3>
          <div className="space-y-2">
            <Button
              onClick={handleResetPrefs}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50"
            >
              Reset All Preferences
            </Button>
            <Button
              onClick={handleExportPrefs}
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50"
            >
              Export Preferences JSON
            </Button>
          </div>
        </div>

        {/* Widget Controls */}
        <div className="space-y-2">
          <h3 className="text-yellow-500 font-mono font-bold text-sm">WIDGETS</h3>

          {prefs.widgets.length === 0 ? (
            <div className="text-white/50 text-sm font-mono">No widgets configured</div>
          ) : (
            <div className="space-y-2">
              {prefs.widgets.map((widget) => {
                const isExpanded = expandedWidget === widget.id

                return (
                  <div
                    key={widget.id}
                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedWidget(isExpanded ? null : widget.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-white/70" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/70" />
                        )}
                        <span className="font-mono text-sm text-white font-medium">
                          {widget.type.toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            widget.enabled
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {widget.enabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-white/10 space-y-3">
                        {/* Weather Widget Controls */}
                        {widget.type === "weather" && (
                          <div className="space-y-4">
                            {/* Location Section */}
                            <div className="space-y-3 pb-3 border-b border-white/10">
                              <div className="text-xs font-mono text-yellow-500">LOCATION</div>
                              <div className="text-xs text-white/50 font-mono">
                                Current: {(widget as WeatherWidgetConfig).settings.location?.name || "Auto-detect"}
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">Location Name</Label>
                                <Input
                                  value={weatherName}
                                  onChange={(e) => setWeatherName(e.target.value)}
                                  placeholder="e.g., New York"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Latitude</Label>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    value={weatherLat}
                                    onChange={(e) => setWeatherLat(e.target.value)}
                                    placeholder="40.7128"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Longitude</Label>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    value={weatherLon}
                                    onChange={(e) => setWeatherLon(e.target.value)}
                                    placeholder="-74.0060"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <Button
                                onClick={() => handleSetWeatherLocation(widget.id)}
                                className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 h-8 text-sm"
                              >
                                Set Location
                              </Button>
                            </div>

                            {/* Weather Data Override Section */}
                            <div className="space-y-3">
                              <div className="text-xs font-mono text-yellow-500">OVERRIDE WEATHER DATA</div>
                              <div className="text-xs text-white/40">
                                Override actual API values for testing. All values use base units (Celsius, m/s, mm, etc.)
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Temperature (°C)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideTemp}
                                    onChange={(e) => setOverrideTemp(e.target.value)}
                                    placeholder="e.g., 25"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Feels Like (°C)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideFeelsLike}
                                    onChange={(e) => setOverrideFeelsLike(e.target.value)}
                                    placeholder="e.g., 23"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">High Temp (°C)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideTempMax}
                                    onChange={(e) => setOverrideTempMax(e.target.value)}
                                    placeholder="e.g., 28"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Low Temp (°C)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideTempMin}
                                    onChange={(e) => setOverrideTempMin(e.target.value)}
                                    placeholder="e.g., 15"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">Weather Code (WMO)</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  value={overrideWeatherCode}
                                  onChange={(e) => setOverrideWeatherCode(e.target.value)}
                                  placeholder="0-99 (e.g., 0=clear, 95=thunderstorm)"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Wind Speed (m/s)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideWind}
                                    onChange={(e) => setOverrideWind(e.target.value)}
                                    placeholder="e.g., 12"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Wind Gusts (m/s)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideWindGusts}
                                    onChange={(e) => setOverrideWindGusts(e.target.value)}
                                    placeholder="e.g., 20"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Precip Prob (%)</Label>
                                  <Input
                                    type="number"
                                    step="1"
                                    value={overridePrecipProb}
                                    onChange={(e) => setOverridePrecipProb(e.target.value)}
                                    placeholder="0-100"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Precip Amt (mm)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overridePrecip}
                                    onChange={(e) => setOverridePrecip(e.target.value)}
                                    placeholder="e.g., 2.5"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Snowfall (cm)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideSnowfall}
                                    onChange={(e) => setOverrideSnowfall(e.target.value)}
                                    placeholder="e.g., 10"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Visibility (m)</Label>
                                  <Input
                                    type="number"
                                    step="100"
                                    value={overrideVisibility}
                                    onChange={(e) => setOverrideVisibility(e.target.value)}
                                    placeholder="e.g., 10000"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">UV Index (0-15)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={overrideUVIndex}
                                  onChange={(e) => setOverrideUVIndex(e.target.value)}
                                  placeholder="e.g., 8"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">PM2.5 (µg/m³)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overridePM25}
                                    onChange={(e) => setOverridePM25(e.target.value)}
                                    placeholder="e.g., 35"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Ozone (µg/m³)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={overrideOzone}
                                    onChange={(e) => setOverrideOzone(e.target.value)}
                                    placeholder="e.g., 100"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <Button
                                onClick={() => handleOverrideWeatherData(widget.id)}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 h-8 text-sm"
                              >
                                Apply Override (Reloads Page)
                              </Button>
                            </div>

                            <div className="text-xs text-white/40 font-mono space-y-1 pt-2 border-t border-white/10">
                              <div>Location examples:</div>
                              <div>• Tokyo: 35.6762, 139.6503</div>
                              <div>• London: 51.5074, -0.1278</div>
                              <div>• Sydney: -33.8688, 151.2093</div>
                            </div>
                          </div>
                        )}

                        {/* Notes Widget - No Dev Controls Needed */}
                        {widget.type === "notes" && (
                          <div className="space-y-3">
                            <div className="text-xs text-white/50 font-mono">
                              No dev controls needed - just type in the widget directly!
                            </div>
                          </div>
                        )}

                        {/* Quote Widget - No Dev Controls Needed */}
                        {widget.type === "quote" && (
                          <div className="space-y-3">
                            <div className="text-xs text-white/50 font-mono">
                              No dev controls needed - quotes rotate automatically!
                            </div>
                          </div>
                        )}

                        {/* Ticker Widget Controls */}
                        {widget.type === "ticker" && (
                          <div className="space-y-4">
                            {/* Current Symbols */}
                            <div className="space-y-2">
                              <div className="text-xs font-mono text-yellow-500">CONFIGURED SYMBOLS</div>
                              <div className="text-xs text-white/50 font-mono">
                                {(widget as TickerWidgetConfig).settings.symbols.length === 0 ? (
                                  <span>No symbols configured</span>
                                ) : (
                                  <div className="space-y-1">
                                    {(widget as TickerWidgetConfig).settings.symbols.map((sym, idx) => (
                                      <div key={idx}>
                                        [Index {idx}] {sym.symbol.toUpperCase()} ({sym.type})
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Override Data Section */}
                            <div className="space-y-3 pt-3 border-t border-white/10">
                              <div className="text-xs font-mono text-yellow-500">OVERRIDE TICKER DATA</div>
                              <div className="text-xs text-white/40">
                                Override ticker values for testing
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">Index</Label>
                                <Input
                                  type="number"
                                  value={tickerIndex}
                                  onChange={(e) => setTickerIndex(e.target.value)}
                                  placeholder="0"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">Name</Label>
                                <Input
                                  value={tickerName}
                                  onChange={(e) => setTickerName(e.target.value)}
                                  placeholder="Optional override name"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Price ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={tickerPrice}
                                    onChange={(e) => setTickerPrice(e.target.value)}
                                    placeholder="100"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Change ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={tickerChange}
                                    onChange={(e) => setTickerChange(e.target.value)}
                                    placeholder="5.00"
                                    className="bg-white/5 border-white/10 text-white text-sm h-8"
                                  />
                                </div>
                              </div>

                              <Button
                                onClick={() => handleOverrideTickerData(widget.id)}
                                className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 h-8 text-sm"
                              >
                                Override Data
                              </Button>

                              <Button
                                onClick={() => handleClearTickerCache(widget.id)}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 h-8 text-sm"
                              >
                                Clear Cache
                              </Button>
                            </div>

                            <div className="text-xs text-white/40 font-mono space-y-1 pt-2 border-t border-white/10">
                              <div>After override, refresh the widget to see changes</div>
                              <div>Clear cache to fetch real data again</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-white/40 font-mono pt-2 border-t border-white/10">
          This overlay is only available in development mode and will not appear in production builds.
        </div>
      </div>
    </div>
  )
}
