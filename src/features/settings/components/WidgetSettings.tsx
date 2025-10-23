import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import type { WidgetType, WeatherWidgetConfig, NotesWidgetConfig, TickerWidgetConfig, PomodoroWidgetConfig, HabitTrackerWidgetConfig, TickerSymbol, UnitSystem } from "@/lib/widgets"
import { WIDGET_REGISTRY, createDefaultWidget, reorderWidgets, updateWidgetSettings, getUnitsForSystem, detectUnitSystem } from "@/lib/widgets"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronUp, ChevronDown, Trash2, Plus, Cloud, StickyNote, Quote, TrendingUp, X, Coins, HelpCircle, Timer, CheckSquare } from "lucide-react"
import { Input } from "@/components/ui/input"

type WidgetSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WIDGET_ICONS = {
  weather: Cloud,
  notes: StickyNote,
  quote: Quote,
  ticker: TrendingUp,
  pomodoro: Timer,
  habitTracker: CheckSquare,
}

export default function WidgetSettings({ open, onOpenChange }: WidgetSettingsProps) {
  const { prefs, setPrefs } = usePrefs()
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null)
  const [tickerType, setTickerType] = useState<"stock" | "crypto">("stock")
  const [notificationRequested, setNotificationRequested] = useState(false)

  const handleDelete = (id: string) => {
    setPrefs((p) => ({
      ...p,
      widgets: p.widgets.map((w) =>
        w.id === id ? { ...w, enabled: false } : w
      ),
    }))
  }

  const handleAddWidget = (type: WidgetType) => {
    const existingWidget = prefs.widgets.find((w) => w.type === type)

    if (existingWidget) {
      setPrefs((p) => ({
        ...p,
        widgets: p.widgets.map((w) =>
          w.type === type ? { ...w, enabled: true } : w
        ),
      }))
    } else {
      const newWidget = createDefaultWidget(type, prefs.widgets.length)
      setPrefs((p) => ({
        ...p,
        widgets: [...p.widgets, newWidget],
      }))
    }
  }

  const handleReorder = (widgetId: string, direction: "up" | "down") => {
    const currentIndex = prefs.widgets.findIndex((w) => w.id === widgetId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= prefs.widgets.length) return

    setPrefs((p) => ({
      ...p,
      widgets: reorderWidgets(p.widgets, widgetId, newIndex),
    }))
  }

  const handleUnitSystemChange = (widgetId: string, system: UnitSystem) => {
    const newUnits = getUnitsForSystem(system)

    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        unitSystem: system,
        units: newUnits,
      }),
    }))
  }

  const handleWeatherUnitsChange = (
    widgetId: string,
    field: "temperature" | "windSpeed" | "precipitation" | "visibility" | "pressure",
    value: string
  ) => {
    const widget = prefs.widgets.find((w) => w.id === widgetId)
    if (!widget || widget.type !== "weather") return

    const currentUnits = widget.settings.units || getUnitsForSystem("metric")

    const newUnits = {
      ...currentUnits,
      [field]: value,
    }

    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        unitSystem: "custom",
        units: newUnits,
      }),
    }))
  }

  const handleWeatherSettingChange = (widgetId: string, field: string, value: string | boolean) => {
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        [field]: value,
      }),
    }))
  }

  const handleWeatherAlertLevelChange = (widgetId: string, value: string) => {
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        alertLevel: value,
      }),
    }))
  }

  const handleWeatherAlertTypeChange = (widgetId: string, alertType: string, enabled: boolean) => {
    const widget = prefs.widgets.find((w) => w.id === widgetId)
    if (!widget || widget.type !== "weather") return

    const currentAlertTypes = widget.settings.alertTypes || {
      wind: true,
      gust: true,
      temperature: true,
      precipitation: true,
      snow: true,
      thunderstorm: true,
      visibility: true,
      uv: true,
      airQuality: true,
    }

    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        alertTypes: {
          ...currentAlertTypes,
          [alertType]: enabled,
        },
      }),
    }))
  }

  const handleNotesQuickJotChange = (widgetId: string, checked: boolean) => {
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        quickJot: checked,
      }),
    }))
  }

  const handleTickerSymbolsChange = (widgetId: string, symbols: TickerSymbol[]) => {
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        symbols,
      }),
    }))
  }

  const availableTypes = Object.keys(WIDGET_REGISTRY) as WidgetType[]
  const disabledWidgets = prefs.widgets.filter((w) => !w.enabled)
  const disabledTypes = new Set(disabledWidgets.map((w) => w.type))
  const enabledTypes = new Set(prefs.widgets.filter((w) => w.enabled).map((w) => w.type))

  // Show disabled widgets and types that have never been added
  const availableToAdd = availableTypes.filter((type) =>
    disabledTypes.has(type) || !enabledTypes.has(type)
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-black/95 text-white border-white/10 w-[400px] sm:w-[540px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-white">Widget Settings</SheetTitle>
          <SheetDescription className="text-white/70">
            Manage and configure your dashboard widgets
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Active Widgets</h3>
            {prefs.widgets.filter((w) => w.enabled).length === 0 ? (
              <div className="text-sm text-white/50 py-8 text-center">
                No widgets added yet. Add one below!
              </div>
            ) : (
              <div className="space-y-2">
                {prefs.widgets.filter((w) => w.enabled).map((widget, index) => {
                  const Icon = WIDGET_ICONS[widget.type]
                  const metadata = WIDGET_REGISTRY[widget.type]
                  const isExpanded = expandedWidget === widget.id

                  return (
                    <div
                      key={widget.id}
                      className="bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/50 hover:text-white hover:bg-white/10 p-0"
                            onClick={() => handleReorder(widget.id, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/50 hover:text-white hover:bg-white/10 p-0"
                            onClick={() => handleReorder(widget.id, "down")}
                            disabled={index === prefs.widgets.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{metadata.name}</div>
                          <div className="text-xs text-white/60 truncate">
                            {metadata.description}
                          </div>
                        </div>

                        {(widget.type === "weather" || widget.type === "notes" || widget.type === "ticker" || widget.type === "pomodoro" || widget.type === "habitTracker") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-white/70 hover:text-white hover:bg-white/10"
                            onClick={() =>
                              setExpandedWidget(isExpanded ? null : widget.id)
                            }
                          >
                            {isExpanded ? "Hide" : "Settings"}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-white/10"
                          onClick={() => handleDelete(widget.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {isExpanded && widget.type === "notes" && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor={`quick-jot-${widget.id}`} className="text-sm font-medium text-white cursor-pointer">
                                Quick Jot Mode
                              </Label>
                              <p className="text-xs text-white/60 mt-1">
                                Always show editor (no markdown preview)
                              </p>
                            </div>
                            <Switch
                              id={`quick-jot-${widget.id}`}
                              checked={(widget as NotesWidgetConfig).settings.quickJot || false}
                              onCheckedChange={(checked) => handleNotesQuickJotChange(widget.id, checked)}
                            />
                          </div>
                        </div>
                      )}

                      {isExpanded && widget.type === "weather" && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-white/10">
                          <div>
                            <Label htmlFor={`unit-system-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              Unit System
                            </Label>
                            <Select
                              value={(widget as WeatherWidgetConfig).settings.unitSystem || detectUnitSystem((widget as WeatherWidgetConfig).settings.units)}
                              onValueChange={(v) => handleUnitSystemChange(widget.id, v as UnitSystem)}
                            >
                              <SelectTrigger id={`unit-system-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 text-white border-white/10">
                                <SelectItem value="metric">Metric (°C, km/h, mm, km, hPa)</SelectItem>
                                <SelectItem value="imperial">Imperial (°F, mph, in, mi, inHg)</SelectItem>
                                <SelectItem value="scientific">Scientific (K, m/s, mm, m, hPa)</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {((widget as WeatherWidgetConfig).settings.unitSystem || detectUnitSystem((widget as WeatherWidgetConfig).settings.units)) === "custom" && (
                            <>
                              <div>
                                <Label htmlFor={`temp-unit-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                                  Temperature
                                </Label>
                                <Select
                                  value={(widget as WeatherWidgetConfig).settings.units?.temperature || "celsius"}
                                  onValueChange={(v) => handleWeatherUnitsChange(widget.id, "temperature", v)}
                                >
                                  <SelectTrigger id={`temp-unit-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 text-white border-white/10">
                                    <SelectItem value="celsius">Celsius (°C)</SelectItem>
                                    <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                                    <SelectItem value="kelvin">Kelvin (K)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`wind-unit-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                                  Wind Speed/Force
                                </Label>
                                <Select
                                  value={(widget as WeatherWidgetConfig).settings.units?.windSpeed || "kmh"}
                                  onValueChange={(v) => handleWeatherUnitsChange(widget.id, "windSpeed", v)}
                                >
                                  <SelectTrigger id={`wind-unit-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 text-white border-white/10">
                                    <SelectItem value="kmh">Kilometers per hour (km/h)</SelectItem>
                                    <SelectItem value="mph">Miles per hour (mph)</SelectItem>
                                    <SelectItem value="ms">Meters per second (m/s)</SelectItem>
                                    <SelectItem value="knots">Knots (kts)</SelectItem>
                                    <SelectItem value="beaufort">Beaufort scale (Bft)</SelectItem>
                                    <SelectItem value="fts">Feet per second (ft/s)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`precip-unit-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                                  Precipitation
                                </Label>
                                <Select
                                  value={(widget as WeatherWidgetConfig).settings.units?.precipitation || "mm"}
                                  onValueChange={(v) => handleWeatherUnitsChange(widget.id, "precipitation", v)}
                                >
                                  <SelectTrigger id={`precip-unit-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 text-white border-white/10">
                                    <SelectItem value="mm">Millimeters (mm)</SelectItem>
                                    <SelectItem value="inch">Inches (")</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`visibility-unit-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                                  Visibility
                                </Label>
                                <Select
                                  value={(widget as WeatherWidgetConfig).settings.units?.visibility || "km"}
                                  onValueChange={(v) => handleWeatherUnitsChange(widget.id, "visibility", v)}
                                >
                                  <SelectTrigger id={`visibility-unit-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 text-white border-white/10">
                                    <SelectItem value="km">Kilometers (km/m)</SelectItem>
                                    <SelectItem value="miles">Miles (mi)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`pressure-unit-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                                  Pressure
                                </Label>
                                <Select
                                  value={(widget as WeatherWidgetConfig).settings.units?.pressure || "hpa"}
                                  onValueChange={(v) => handleWeatherUnitsChange(widget.id, "pressure", v)}
                                >
                                  <SelectTrigger id={`pressure-unit-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 text-white border-white/10">
                                    <SelectItem value="hpa">Hectopascals (hPa)</SelectItem>
                                    <SelectItem value="mb">Millibars (mb)</SelectItem>
                                    <SelectItem value="inhg">Inches of mercury (inHg)</SelectItem>
                                    <SelectItem value="atm">Atmospheres (atm)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}

                          <div>
                            <Label htmlFor={`forecast-display-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              24H Forecast Display
                            </Label>
                            <Select
                              value={(widget as WeatherWidgetConfig).settings.forecastDisplay || "expanded"}
                              onValueChange={(v) => handleWeatherSettingChange(widget.id, "forecastDisplay", v)}
                            >
                              <SelectTrigger id={`forecast-display-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 text-white border-white/10">
                                <SelectItem value="expanded">Show when expanded (default)</SelectItem>
                                <SelectItem value="always">Always visible</SelectItem>
                                <SelectItem value="never">Never show</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor={`moon-info-${widget.id}`} className="text-sm font-medium text-white cursor-pointer">
                                Moon Information
                              </Label>
                              <p className="text-xs text-white/60 mt-1">
                                Display moon phase, rise/set times, and illumination
                              </p>
                            </div>
                            <Switch
                              id={`moon-info-${widget.id}`}
                              checked={(widget as WeatherWidgetConfig).settings.moonInfo || false}
                              onCheckedChange={(checked) => handleWeatherSettingChange(widget.id, "moonInfo", checked)}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Label htmlFor={`alert-level-${widget.id}`} className="text-xs font-medium text-white/70">
                                Weather Alerts
                              </Label>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                BETA
                              </span>
                            </div>
                            <Select
                              value={(widget as WeatherWidgetConfig).settings.alertLevel || "all"}
                              onValueChange={(v) => handleWeatherAlertLevelChange(widget.id, v)}
                            >
                              <SelectTrigger id={`alert-level-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 text-white border-white/10">
                                <SelectItem value="all">All alerts (Advisory, Watch, Warning)</SelectItem>
                                <SelectItem value="watch-and-warnings">Watch and Warnings only</SelectItem>
                                <SelectItem value="warnings-only">Warnings only</SelectItem>
                                <SelectItem value="none">None (disable alerts)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-white/50 mt-2">
                              Weather alerts are automatically detected based on current conditions and forecasts. These are not official warnings from meteorological organizations.
                            </p>
                          </div>

                          {(widget as WeatherWidgetConfig).settings.alertLevel !== "none" && (
                            <div>
                              <Label className="text-xs font-medium text-white/70 mb-3 block">
                                Alert Types
                              </Label>
                              <div className="space-y-2.5">
                                {[
                                  { key: 'wind', label: 'Wind Alerts' },
                                  { key: 'gust', label: 'Gust Alerts' },
                                  { key: 'temperature', label: 'Temperature Alerts' },
                                  { key: 'precipitation', label: 'Rain Alerts' },
                                  { key: 'snow', label: 'Snow Alerts' },
                                  { key: 'thunderstorm', label: 'Thunderstorm Alerts' },
                                  { key: 'visibility', label: 'Visibility Alerts' },
                                  { key: 'uv', label: 'UV Index Alerts' },
                                  { key: 'airQuality', label: 'Air Quality Alerts' },
                                ].map(({ key, label }) => {
                                  const alertTypes = (widget as WeatherWidgetConfig).settings.alertTypes || {
                                    wind: true,
                                    gust: true,
                                    temperature: true,
                                    precipitation: true,
                                    snow: true,
                                    thunderstorm: true,
                                    visibility: true,
                                    uv: true,
                                    airQuality: true,
                                  }
                                  return (
                                    <div key={key} className="flex items-center justify-between">
                                      <Label htmlFor={`alert-${key}-${widget.id}`} className="text-sm font-medium text-white cursor-pointer">
                                        {label}
                                      </Label>
                                      <Switch
                                        id={`alert-${key}-${widget.id}`}
                                        checked={alertTypes[key as keyof typeof alertTypes] !== false}
                                        onCheckedChange={(checked) => handleWeatherAlertTypeChange(widget.id, key, checked)}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isExpanded && widget.type === "pomodoro" && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-white/10">
                          <div>
                            <Label htmlFor={`pomodoro-duration-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              Pomodoro Duration (minutes)
                            </Label>
                            <Input
                              id={`pomodoro-duration-${widget.id}`}
                              type="number"
                              min="1"
                              max="120"
                              value={Math.floor((widget as PomodoroWidgetConfig).settings.pomodoroDuration / 60)}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 25
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    pomodoroDuration: value * 60,
                                  }),
                                }))
                              }}
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`short-break-duration-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              Short Break Duration (minutes)
                            </Label>
                            <Input
                              id={`short-break-duration-${widget.id}`}
                              type="number"
                              min="1"
                              max="60"
                              value={Math.floor((widget as PomodoroWidgetConfig).settings.shortBreakDuration / 60)}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 5
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    shortBreakDuration: value * 60,
                                  }),
                                }))
                              }}
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`long-break-duration-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              Long Break Duration (minutes)
                            </Label>
                            <Input
                              id={`long-break-duration-${widget.id}`}
                              type="number"
                              min="1"
                              max="120"
                              value={Math.floor((widget as PomodoroWidgetConfig).settings.longBreakDuration / 60)}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 15
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    longBreakDuration: value * 60,
                                  }),
                                }))
                              }}
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor={`notification-sound-${widget.id}`} className="text-sm font-medium text-white cursor-pointer">
                              Notification Sound
                            </Label>
                            <Switch
                              id={`notification-sound-${widget.id}`}
                              checked={(widget as PomodoroWidgetConfig).settings.notificationSound !== false}
                              onCheckedChange={(checked) => {
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    notificationSound: checked,
                                  }),
                                }))
                              }}
                            />
                          </div>

                          {"Notification" in window && (
                            <div className="space-y-2">
                              <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium mb-1">
                                      Browser Notifications
                                    </div>
                                    <div className="text-xs text-white/70">
                                      {Notification.permission === "granted" && (
                                        "Notifications are enabled"
                                      )}
                                      {Notification.permission === "denied" && (
                                        "Notifications are blocked. Enable them in your browser settings."
                                      )}
                                      {Notification.permission === "default" && !notificationRequested && (
                                        "Your browser needs permission to show notifications for timer alerts"
                                      )}
                                      {Notification.permission === "default" && notificationRequested && (
                                        "Please allow notifications in your browser prompt"
                                      )}
                                    </div>
                                  </div>
                                  {Notification.permission === "granted" && (
                                    <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                                      <div className="w-2 h-2 rounded-full bg-green-400" />
                                      Enabled
                                    </div>
                                  )}
                                  {Notification.permission === "denied" && (
                                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                                      <div className="w-2 h-2 rounded-full bg-red-400" />
                                      Blocked
                                    </div>
                                  )}
                                  {Notification.permission === "default" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs text-white/70 hover:text-white hover:bg-white/10 h-7 px-2"
                                      onClick={() => {
                                        setNotificationRequested(true)
                                        Notification.requestPermission()
                                      }}
                                    >
                                      Enable
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {notificationRequested && Notification.permission === "default" && (
                                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-xs text-blue-200">
                                  After allowing notifications in your browser, please refresh the page to see the updated status.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {isExpanded && widget.type === "ticker" && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-white/10">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Label htmlFor={`ticker-symbol-${widget.id}`} className="text-xs font-medium text-white/70">
                                Add Ticker Symbol
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="text-white/50 hover:text-white/80 transition-colors">
                                      <HelpCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[320px]">
                                    <p className="font-semibold mb-1">What symbols can I use?</p>
                                    <p className="mb-2"><strong>Stocks:</strong> Standard ticker symbols (AAPL, GOOGL, TSLA, MSFT). Most US stocks work, international availability varies.</p>
                                    <p className="mb-2"><strong>Crypto:</strong> Common symbols like BTC, ETH, SOL or full names like bitcoin, ethereum, solana.</p>
                                    <p className="font-semibold mb-1 mt-2">Where does the data come from?</p>
                                    <p className="mb-1">• Stocks: Yahoo Finance</p>
                                    <p>• Crypto: CoinGecko</p>
                                    <p className="mt-2 text-white/70 text-xs">Prices update every 5 minutes. If a symbol doesn't work, it may not be available from the data source.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex gap-2 mb-3">
                              <Select
                                value={tickerType}
                                onValueChange={(v: "stock" | "crypto") => setTickerType(v)}
                              >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 text-white border-white/10">
                                  <SelectItem value="stock">Stock</SelectItem>
                                  <SelectItem value="crypto">Crypto</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                id={`ticker-symbol-${widget.id}`}
                                placeholder={tickerType === "stock" ? "e.g. AAPL" : "e.g. BTC or bitcoin"}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const input = e.currentTarget
                                    const value = input.value.trim()
                                    if (value && (widget as TickerWidgetConfig).settings.symbols.length < 10) {
                                      const currentSymbols = (widget as TickerWidgetConfig).settings.symbols
                                      if (!currentSymbols.some(s => s.symbol.toLowerCase() === value.toLowerCase())) {
                                        const displaySymbol = tickerType === "stock" ? value.toUpperCase() : value
                                        handleTickerSymbolsChange(widget.id, [...currentSymbols, { symbol: displaySymbol, type: tickerType }])
                                        input.value = ''
                                      }
                                    }
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => {
                                  const input = document.getElementById(`ticker-symbol-${widget.id}`) as HTMLInputElement
                                  const value = input.value.trim()
                                  if (value && (widget as TickerWidgetConfig).settings.symbols.length < 10) {
                                    const currentSymbols = (widget as TickerWidgetConfig).settings.symbols
                                    if (!currentSymbols.some(s => s.symbol.toLowerCase() === value.toLowerCase())) {
                                      const displaySymbol = tickerType === "stock" ? value.toUpperCase() : value
                                      handleTickerSymbolsChange(widget.id, [...currentSymbols, { symbol: displaySymbol, type: tickerType }])
                                      input.value = ''
                                    }
                                  }
                                }}
                                disabled={(widget as TickerWidgetConfig).settings.symbols.length >= 10}
                              >
                                Add
                              </Button>
                            </div>

                            <div className="text-xs text-white/50 mb-2">
                              {(widget as TickerWidgetConfig).settings.symbols.length}/10 symbols
                            </div>

                            {(widget as TickerWidgetConfig).settings.symbols.length === 0 ? (
                              <div className="text-xs text-white/40 py-2 text-center">
                                No symbols added yet
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {(widget as TickerWidgetConfig).settings.symbols.map((item, idx) => (
                                  <div
                                    key={`${item.symbol}-${item.type}`}
                                    className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10"
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 text-white/50 hover:text-white hover:bg-white/10 p-0"
                                        onClick={() => {
                                          const symbols = (widget as TickerWidgetConfig).settings.symbols
                                          if (idx > 0) {
                                            const newSymbols = [...symbols]
                                            ;[newSymbols[idx - 1], newSymbols[idx]] = [newSymbols[idx], newSymbols[idx - 1]]
                                            handleTickerSymbolsChange(widget.id, newSymbols)
                                          }
                                        }}
                                        disabled={idx === 0}
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 text-white/50 hover:text-white hover:bg-white/10 p-0"
                                        onClick={() => {
                                          const symbols = (widget as TickerWidgetConfig).settings.symbols
                                          if (idx < symbols.length - 1) {
                                            const newSymbols = [...symbols]
                                            ;[newSymbols[idx], newSymbols[idx + 1]] = [newSymbols[idx + 1], newSymbols[idx]]
                                            handleTickerSymbolsChange(widget.id, newSymbols)
                                          }
                                        }}
                                        disabled={idx === (widget as TickerWidgetConfig).settings.symbols.length - 1}
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </Button>
                                    </div>

                                    <div className="flex-1 relative">
                                      <div className="text-sm font-medium">
                                        {item.symbol.toUpperCase()}
                                      </div>
                                      {item.type === "stock" ? (
                                        <TrendingUp className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 text-white/10" />
                                      ) : (
                                        <Coins className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 text-white/10" />
                                      )}
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-white/50 hover:text-red-400 hover:bg-white/10"
                                      onClick={() => {
                                        const symbols = (widget as TickerWidgetConfig).settings.symbols
                                        handleTickerSymbolsChange(
                                          widget.id,
                                          symbols.filter((s) => s.symbol !== item.symbol || s.type !== item.type)
                                        )
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {isExpanded && widget.type === "habitTracker" && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-white/10">
                          <div>
                            <Label htmlFor={`reset-time-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              Daily Reset Time
                            </Label>
                            <Input
                              id={`reset-time-${widget.id}`}
                              type="time"
                              value={(widget as HabitTrackerWidgetConfig).settings.resetTime || "02:00"}
                              onChange={(e) => {
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    resetTime: e.target.value,
                                  }),
                                }))
                              }}
                              className="bg-white/5 border-white/10 text-white"
                            />
                            <p className="text-xs text-white/50 mt-2">
                              All habits will be unchecked at this time each day
                            </p>
                          </div>

                          <div>
                            <Label htmlFor={`timezone-${widget.id}`} className="text-xs font-medium text-white/70 mb-2 block">
                              Timezone
                            </Label>
                            <Select
                              value={(widget as HabitTrackerWidgetConfig).settings.timezone || "UTC"}
                              onValueChange={(v) => {
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    timezone: v,
                                  }),
                                }))
                              }}
                            >
                              <SelectTrigger id={`timezone-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 text-white border-white/10 max-h-[300px]">
                                <SelectItem value="Etc/GMT+12">Baker Island (UTC-12)</SelectItem>
                                <SelectItem value="Pacific/Pago_Pago">Pago Pago (UTC-11)</SelectItem>
                                <SelectItem value="Pacific/Honolulu">Honolulu (UTC-10)</SelectItem>
                                <SelectItem value="America/Anchorage">Anchorage (UTC-9)</SelectItem>
                                <SelectItem value="America/Los_Angeles">Los Angeles (UTC-8)</SelectItem>
                                <SelectItem value="America/Denver">Denver (UTC-7)</SelectItem>
                                <SelectItem value="America/Chicago">Chicago (UTC-6)</SelectItem>
                                <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                                <SelectItem value="America/Santiago">Santiago (UTC-4)</SelectItem>
                                <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                                <SelectItem value="Atlantic/South_Georgia">South Georgia (UTC-2)</SelectItem>
                                <SelectItem value="Atlantic/Azores">Azores (UTC-1)</SelectItem>
                                <SelectItem value="UTC">London (UTC+0)</SelectItem>
                                <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                                <SelectItem value="Africa/Cairo">Cairo (UTC+2)</SelectItem>
                                <SelectItem value="Europe/Moscow">Moscow (UTC+3)</SelectItem>
                                <SelectItem value="Asia/Dubai">Dubai (UTC+4)</SelectItem>
                                <SelectItem value="Asia/Kabul">Kabul (UTC+4:30)</SelectItem>
                                <SelectItem value="Asia/Karachi">Karachi (UTC+5)</SelectItem>
                                <SelectItem value="Asia/Kolkata">Mumbai (UTC+5:30)</SelectItem>
                                <SelectItem value="Asia/Kathmandu">Kathmandu (UTC+5:45)</SelectItem>
                                <SelectItem value="Asia/Dhaka">Dhaka (UTC+6)</SelectItem>
                                <SelectItem value="Asia/Yangon">Yangon (UTC+6:30)</SelectItem>
                                <SelectItem value="Asia/Bangkok">Bangkok (UTC+7)</SelectItem>
                                <SelectItem value="Asia/Shanghai">Shanghai (UTC+8)</SelectItem>
                                <SelectItem value="Asia/Tokyo">Tokyo (UTC+9)</SelectItem>
                                <SelectItem value="Australia/Adelaide">Adelaide (UTC+9:30)</SelectItem>
                                <SelectItem value="Australia/Sydney">Sydney (UTC+10)</SelectItem>
                                <SelectItem value="Pacific/Noumea">Noumea (UTC+11)</SelectItem>
                                <SelectItem value="Pacific/Auckland">Auckland (UTC+12)</SelectItem>
                                <SelectItem value="Pacific/Tongatapu">Nuku'alofa (UTC+13)</SelectItem>
                                <SelectItem value="Pacific/Kiritimati">Kiritimati (UTC+14)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor={`unlimited-height-${widget.id}`} className="text-sm font-medium text-white cursor-pointer">
                                Unlimited Height
                              </Label>
                              <p className="text-xs text-white/60 mt-1">
                                Show all habits without scrolling
                              </p>
                            </div>
                            <Switch
                              id={`unlimited-height-${widget.id}`}
                              checked={(widget as HabitTrackerWidgetConfig).settings.unlimitedHeight || false}
                              onCheckedChange={(checked) => {
                                setPrefs((p) => ({
                                  ...p,
                                  widgets: updateWidgetSettings(p.widgets, widget.id, {
                                    unlimitedHeight: checked,
                                  }),
                                }))
                              }}
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {availableToAdd.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Add Widget</h3>
              <div className="space-y-2">
                {availableToAdd.map((type) => {
                  const metadata = WIDGET_REGISTRY[type]
                  const Icon = WIDGET_ICONS[type]

                  return (
                    <button
                      key={type}
                      onClick={() => handleAddWidget(type)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{metadata.name}</div>
                        <div className="text-xs text-white/60 truncate">
                          {metadata.description}
                        </div>
                      </div>
                      <Plus className="w-5 h-5 shrink-0 text-white/50" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
