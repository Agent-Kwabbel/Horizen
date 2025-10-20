import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import type { WeatherWidgetConfig } from "@/lib/widgets"
import { updateWidgetSettings } from "@/lib/widgets"
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
  const [overridePrecipProb, setOverridePrecipProb] = useState("")
  const [overridePrecip, setOverridePrecip] = useState("")

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
      temperature_2m: 20,
      apparent_temperature: 18,
      wind_speed_10m: 5,
      precipitation_probability: 0,
      precipitation: 0,
      is_day: 1,
      weather_code: 0,
    }

    if (existingCache) {
      try {
        const parsed = JSON.parse(existingCache)
        weatherData = parsed.data
      } catch {
        // Use defaults
      }
    }

    // Apply overrides
    if (overrideTemp) weatherData.temperature_2m = parseFloat(overrideTemp)
    if (overrideFeelsLike) weatherData.apparent_temperature = parseFloat(overrideFeelsLike)
    if (overrideWind) weatherData.wind_speed_10m = parseFloat(overrideWind)
    if (overridePrecipProb) weatherData.precipitation_probability = parseFloat(overridePrecipProb)
    if (overridePrecip) weatherData.precipitation = parseFloat(overridePrecip)

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
                                Override actual API values for testing
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">Temperature</Label>
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
                                <Label className="text-xs text-white/70">Feels Like</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={overrideFeelsLike}
                                  onChange={(e) => setOverrideFeelsLike(e.target.value)}
                                  placeholder="e.g., 23"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-white/70">Wind Speed</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={overrideWind}
                                  onChange={(e) => setOverrideWind(e.target.value)}
                                  placeholder="e.g., 12"
                                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-white/70">Precip %</Label>
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
                                  <Label className="text-xs text-white/70">Precip Amt</Label>
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
