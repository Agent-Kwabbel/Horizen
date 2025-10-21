import { useState } from "react"
import { usePrefs } from "@/lib/prefs"
import type { WidgetType, WeatherWidgetConfig, NotesWidgetConfig, TickerWidgetConfig, TickerSymbol } from "@/lib/widgets"
import { WIDGET_REGISTRY, createDefaultWidget, reorderWidgets, updateWidgetSettings } from "@/lib/widgets"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronUp, ChevronDown, Trash2, Plus, Cloud, StickyNote, Quote, TrendingUp, X, Coins, HelpCircle } from "lucide-react"
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
}

export default function WidgetSettings({ open, onOpenChange }: WidgetSettingsProps) {
  const { prefs, setPrefs } = usePrefs()
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null)
  const [tickerType, setTickerType] = useState<"stock" | "crypto">("stock")

  const handleDelete = (id: string) => {
    setPrefs((p) => ({
      ...p,
      widgets: p.widgets.filter((w) => w.id !== id),
    }))
  }

  const handleAddWidget = (type: WidgetType) => {
    const newWidget = createDefaultWidget(type, prefs.widgets.length)
    setPrefs((p) => ({
      ...p,
      widgets: [...p.widgets, newWidget],
    }))
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

  const handleWeatherUnitsChange = (
    widgetId: string,
    field: "temperature" | "windSpeed" | "precipitation",
    value: string
  ) => {
    const widget = prefs.widgets.find((w) => w.id === widgetId)
    if (!widget || widget.type !== "weather") return

    const currentUnits = widget.settings.units || {
      temperature: "celsius",
      windSpeed: "ms",
      precipitation: "mm",
    }

    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, widgetId, {
        units: {
          ...currentUnits,
          [field]: value,
        },
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
  const usedTypes = new Set(prefs.widgets.map((w) => w.type))

  // All widgets are singletons - only show types that aren't already added
  const availableToAdd = availableTypes.filter((type) => !usedTypes.has(type))

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
            <h3 className="text-sm font-medium mb-3">Active Widgets</h3>
            {prefs.widgets.length === 0 ? (
              <div className="text-sm text-white/50 py-8 text-center">
                No widgets added yet. Add one below!
              </div>
            ) : (
              <div className="space-y-2">
                {prefs.widgets.map((widget, index) => {
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
                          <div className="font-medium">{metadata.name}</div>
                          <div className="text-xs text-white/60 truncate">
                            {metadata.description}
                          </div>
                        </div>

                        {(widget.type === "weather" || widget.type === "notes" || widget.type === "ticker") && (
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
                              <Label htmlFor={`quick-jot-${widget.id}`} className="text-sm font-normal text-white cursor-pointer">
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
                            <Label htmlFor={`temp-unit-${widget.id}`} className="text-xs font-normal text-white/70 mb-2 block">
                              Temperature Unit
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
                            <Label htmlFor={`wind-unit-${widget.id}`} className="text-xs font-normal text-white/70 mb-2 block">
                              Wind Speed/Force Unit
                            </Label>
                            <Select
                              value={(widget as WeatherWidgetConfig).settings.units?.windSpeed || "ms"}
                              onValueChange={(v) => handleWeatherUnitsChange(widget.id, "windSpeed", v)}
                            >
                              <SelectTrigger id={`wind-unit-${widget.id}`} className="bg-white/5 border-white/10 text-white w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 text-white border-white/10">
                                <SelectItem value="ms">Meters per second (m/s)</SelectItem>
                                <SelectItem value="kmh">Kilometers per hour (km/h)</SelectItem>
                                <SelectItem value="mph">Miles per hour (mph)</SelectItem>
                                <SelectItem value="knots">Knots (kts)</SelectItem>
                                <SelectItem value="beaufort">Beaufort scale (Bft)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`precip-unit-${widget.id}`} className="text-xs font-normal text-white/70 mb-2 block">
                              Precipitation Unit
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
                                <SelectItem value="inch">Inches (in)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Label htmlFor={`alert-level-${widget.id}`} className="text-xs font-normal text-white/70">
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
                              <Label className="text-xs font-normal text-white/70 mb-3 block">
                                Alert Types
                              </Label>
                              <div className="space-y-2.5">
                                {[
                                  { key: 'wind', label: 'Wind Alerts' },
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
                                      <Label htmlFor={`alert-${key}-${widget.id}`} className="text-sm font-normal text-white cursor-pointer">
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

                      {isExpanded && widget.type === "ticker" && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-white/10">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Label htmlFor={`ticker-symbol-${widget.id}`} className="text-xs font-normal text-white/70">
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
                                    if (value && (widget as TickerWidgetConfig).settings.symbols.length < 5) {
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
                                  if (value && (widget as TickerWidgetConfig).settings.symbols.length < 5) {
                                    const currentSymbols = (widget as TickerWidgetConfig).settings.symbols
                                    if (!currentSymbols.some(s => s.symbol.toLowerCase() === value.toLowerCase())) {
                                      const displaySymbol = tickerType === "stock" ? value.toUpperCase() : value
                                      handleTickerSymbolsChange(widget.id, [...currentSymbols, { symbol: displaySymbol, type: tickerType }])
                                      input.value = ''
                                    }
                                  }
                                }}
                                disabled={(widget as TickerWidgetConfig).settings.symbols.length >= 5}
                              >
                                Add
                              </Button>
                            </div>

                            <div className="text-xs text-white/50 mb-2">
                              {(widget as TickerWidgetConfig).settings.symbols.length}/5 symbols
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

                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {availableToAdd.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Add Widget</h3>
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
                        <div className="font-medium">{metadata.name}</div>
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
