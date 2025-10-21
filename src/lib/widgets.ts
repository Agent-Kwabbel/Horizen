import { z } from "zod"

export const WidgetTypeSchema = z.enum(["weather", "notes", "quote", "ticker"])
export type WidgetType = z.infer<typeof WidgetTypeSchema>

export const BaseWidgetConfigSchema = z.object({
  id: z.string(),
  type: WidgetTypeSchema,
  enabled: z.boolean(),
  order: z.number(),
})

export const WeatherWidgetSettingsSchema = z.object({
  location: z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  unitSystem: z.enum(["metric", "imperial", "scientific", "custom"]).default("metric"),
  units: z.object({
    temperature: z.enum(["celsius", "fahrenheit", "kelvin"]).default("celsius"),
    windSpeed: z.enum(["ms", "kmh", "mph", "knots", "beaufort", "fts"]).default("kmh"),
    precipitation: z.enum(["mm", "inch"]).default("mm"),
    visibility: z.enum(["km", "miles"]).default("km"),
    pressure: z.enum(["hpa", "mb", "inhg", "atm"]).default("hpa"),
  }).optional(),
  alertLevel: z.enum(["none", "warnings-only", "watch-and-warnings", "all"]).default("all"),
  alertTypes: z.object({
    wind: z.boolean().default(true),
    temperature: z.boolean().default(true),
    precipitation: z.boolean().default(true),
    snow: z.boolean().default(true),
    thunderstorm: z.boolean().default(true),
    visibility: z.boolean().default(true),
    uv: z.boolean().default(true),
    airQuality: z.boolean().default(true),
  }).optional(),
})

export const NotesWidgetSettingsSchema = z.object({
  content: z.string().default(""),
  maxLength: z.number().default(500),
  quickJot: z.boolean().default(false),
})

export const QuoteWidgetSettingsSchema = z.object({
  autoRotate: z.boolean().default(true),
  rotateInterval: z.number().default(86400000), // 24 hours in ms
})

export const TickerSymbolSchema = z.object({
  symbol: z.string(),
  type: z.enum(["stock", "crypto"]),
})

export const TickerWidgetSettingsSchema = z.object({
  symbols: z.array(TickerSymbolSchema).default([]),
})

export type TickerSymbol = z.infer<typeof TickerSymbolSchema>

export const WeatherWidgetConfigSchema = BaseWidgetConfigSchema.extend({
  type: z.literal("weather"),
  settings: WeatherWidgetSettingsSchema,
})

export const NotesWidgetConfigSchema = BaseWidgetConfigSchema.extend({
  type: z.literal("notes"),
  settings: NotesWidgetSettingsSchema,
})

export const QuoteWidgetConfigSchema = BaseWidgetConfigSchema.extend({
  type: z.literal("quote"),
  settings: QuoteWidgetSettingsSchema,
})

export const TickerWidgetConfigSchema = BaseWidgetConfigSchema.extend({
  type: z.literal("ticker"),
  settings: TickerWidgetSettingsSchema,
})

export const WidgetConfigSchema = z.discriminatedUnion("type", [
  WeatherWidgetConfigSchema,
  NotesWidgetConfigSchema,
  QuoteWidgetConfigSchema,
  TickerWidgetConfigSchema,
])

export type WeatherWidgetConfig = z.infer<typeof WeatherWidgetConfigSchema>
export type NotesWidgetConfig = z.infer<typeof NotesWidgetConfigSchema>
export type QuoteWidgetConfig = z.infer<typeof QuoteWidgetConfigSchema>
export type TickerWidgetConfig = z.infer<typeof TickerWidgetConfigSchema>
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>

export type UnitSystem = "metric" | "imperial" | "scientific" | "custom"

export function getUnitsForSystem(system: UnitSystem): WeatherWidgetConfig["settings"]["units"] {
  switch (system) {
    case "metric":
      return {
        temperature: "celsius",
        windSpeed: "kmh",
        precipitation: "mm",
        visibility: "km",
        pressure: "hpa",
      }
    case "imperial":
      return {
        temperature: "fahrenheit",
        windSpeed: "mph",
        precipitation: "inch",
        visibility: "miles",
        pressure: "inhg",
      }
    case "scientific":
      return {
        temperature: "kelvin",
        windSpeed: "ms",
        precipitation: "mm",
        visibility: "km",
        pressure: "hpa",
      }
    case "custom":
      return {
        temperature: "celsius",
        windSpeed: "kmh",
        precipitation: "mm",
        visibility: "km",
        pressure: "hpa",
      }
  }
}

export function detectUnitSystem(units?: WeatherWidgetConfig["settings"]["units"]): UnitSystem {
  if (!units) return "metric"

  const metricUnits = getUnitsForSystem("metric")
  const imperialUnits = getUnitsForSystem("imperial")
  const scientificUnits = getUnitsForSystem("scientific")

  if (
    units.temperature === metricUnits?.temperature &&
    units.windSpeed === metricUnits?.windSpeed &&
    units.precipitation === metricUnits?.precipitation &&
    units.visibility === metricUnits?.visibility &&
    units.pressure === metricUnits?.pressure
  ) {
    return "metric"
  }

  if (
    units.temperature === imperialUnits?.temperature &&
    units.windSpeed === imperialUnits?.windSpeed &&
    units.precipitation === imperialUnits?.precipitation &&
    units.visibility === imperialUnits?.visibility &&
    units.pressure === imperialUnits?.pressure
  ) {
    return "imperial"
  }

  if (
    units.temperature === scientificUnits?.temperature &&
    units.windSpeed === scientificUnits?.windSpeed &&
    units.precipitation === scientificUnits?.precipitation &&
    units.visibility === scientificUnits?.visibility &&
    units.pressure === scientificUnits?.pressure
  ) {
    return "scientific"
  }

  return "custom"
}

export const WidgetsSchema = z.array(WidgetConfigSchema)

export type WidgetMetadata = {
  type: WidgetType
  name: string
  description: string
  icon: string
  defaultSettings: Record<string, any>
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetMetadata> = {
  weather: {
    type: "weather",
    name: "Weather",
    description: "Display current weather conditions",
    icon: "cloud",
    defaultSettings: {
      unitSystem: "metric",
      alertLevel: "all",
      alertTypes: {
        wind: true,
        temperature: true,
        precipitation: true,
        snow: true,
        thunderstorm: true,
        visibility: true,
        uv: true,
        airQuality: true,
      },
    },
  },
  notes: {
    type: "notes",
    name: "Quick Notes",
    description: "Jot down quick notes",
    icon: "sticky-note",
    defaultSettings: {
      content: "",
      maxLength: 500,
      quickJot: false,
    },
  },
  quote: {
    type: "quote",
    name: "Random Quote",
    description: "Display random inspiring quotes",
    icon: "quote",
    defaultSettings: {
      autoRotate: true,
      rotateInterval: 86400000,
    },
  },
  ticker: {
    type: "ticker",
    name: "Market Tracker",
    description: "Track stocks and crypto prices",
    icon: "trending-up",
    defaultSettings: {
      symbols: [],
    },
  },
}

export function createDefaultWidget(type: WidgetType, order: number = 0): WidgetConfig {
  const metadata = WIDGET_REGISTRY[type]
  const baseId = `${type}-${Date.now()}`

  switch (type) {
    case "weather":
      return {
        id: baseId,
        type: "weather",
        enabled: true,
        order,
        settings: metadata.defaultSettings as WeatherWidgetConfig["settings"],
      }
    case "notes":
      return {
        id: baseId,
        type: "notes",
        enabled: true,
        order,
        settings: metadata.defaultSettings as NotesWidgetConfig["settings"],
      }
    case "quote":
      return {
        id: baseId,
        type: "quote",
        enabled: true,
        order,
        settings: metadata.defaultSettings as QuoteWidgetConfig["settings"],
      }
    case "ticker":
      return {
        id: baseId,
        type: "ticker",
        enabled: true,
        order,
        settings: metadata.defaultSettings as TickerWidgetConfig["settings"],
      }
  }
}

export function getEnabledWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order)
}

export function reorderWidgets(
  widgets: WidgetConfig[],
  sourceId: string,
  destinationIndex: number
): WidgetConfig[] {
  const sourceIndex = widgets.findIndex((w) => w.id === sourceId)
  if (sourceIndex === -1) return widgets

  const reordered = [...widgets]
  const [removed] = reordered.splice(sourceIndex, 1)
  reordered.splice(destinationIndex, 0, removed)

  return reordered.map((widget, index) => ({
    ...widget,
    order: index,
  }))
}

export function toggleWidget(widgets: WidgetConfig[], id: string): WidgetConfig[] {
  return widgets.map((widget) =>
    widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
  )
}

export function updateWidgetSettings(
  widgets: WidgetConfig[],
  id: string,
  settings: Record<string, any>
): WidgetConfig[] {
  return widgets.map((widget) => {
    if (widget.id !== id) return widget

    // Type-safe update based on widget type
    switch (widget.type) {
      case "weather":
        return {
          ...widget,
          settings: { ...widget.settings, ...settings },
        } as WeatherWidgetConfig
      case "notes":
        return {
          ...widget,
          settings: { ...widget.settings, ...settings },
        } as NotesWidgetConfig
      case "quote":
        return {
          ...widget,
          settings: { ...widget.settings, ...settings },
        } as QuoteWidgetConfig
      case "ticker":
        return {
          ...widget,
          settings: { ...widget.settings, ...settings },
        } as TickerWidgetConfig
      default:
        return widget
    }
  })
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: "weather-default",
    type: "weather",
    enabled: true,
    order: 0,
    settings: {
      alertLevel: "all",
    },
  },
  {
    id: "notes-default",
    type: "notes",
    enabled: true,
    order: 1,
    settings: {
      content: "",
      maxLength: 500,
      quickJot: false,
    },
  },
]
