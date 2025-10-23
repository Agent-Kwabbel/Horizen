import { z } from "zod"

export const WidgetTypeSchema = z.enum(["weather", "notes", "quote", "ticker", "pomodoro", "habitTracker"])
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
  forecastDisplay: z.enum(["always", "expanded", "never"]).default("expanded"),
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

export const PomodoroWidgetSettingsSchema = z.object({
  pomodoroDuration: z.number().default(25 * 60),
  shortBreakDuration: z.number().default(5 * 60),
  longBreakDuration: z.number().default(15 * 60),
  notificationSound: z.boolean().default(true),
})

export const HabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  checked: z.boolean().default(false),
})

const AVAILABLE_TIMEZONES = [
  "Etc/GMT+12", "Pacific/Pago_Pago", "Pacific/Honolulu", "America/Anchorage",
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Santiago", "America/Sao_Paulo", "Atlantic/South_Georgia", "Atlantic/Azores",
  "UTC", "Europe/Paris", "Africa/Cairo", "Europe/Moscow", "Asia/Dubai", "Asia/Kabul",
  "Asia/Karachi", "Asia/Kolkata", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Yangon",
  "Asia/Bangkok", "Asia/Shanghai", "Asia/Tokyo", "Australia/Adelaide", "Australia/Sydney",
  "Pacific/Noumea", "Pacific/Auckland", "Pacific/Tongatapu", "Pacific/Kiritimati"
]

function getDefaultTimezone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (AVAILABLE_TIMEZONES.includes(detected)) {
    return detected
  }

  const offset = new Date().getTimezoneOffset()
  const hoursOffset = -offset / 60

  const offsetMap: Record<number, string> = {
    [-12]: "Etc/GMT+12",
    [-11]: "Pacific/Pago_Pago",
    [-10]: "Pacific/Honolulu",
    [-9]: "America/Anchorage",
    [-8]: "America/Los_Angeles",
    [-7]: "America/Denver",
    [-6]: "America/Chicago",
    [-5]: "America/New_York",
    [-4]: "America/Santiago",
    [-3]: "America/Sao_Paulo",
    [-2]: "Atlantic/South_Georgia",
    [-1]: "Atlantic/Azores",
    [0]: "UTC",
    [1]: "Europe/Paris",
    [2]: "Africa/Cairo",
    [3]: "Europe/Moscow",
    [4]: "Asia/Dubai",
    [4.5]: "Asia/Kabul",
    [5]: "Asia/Karachi",
    [5.5]: "Asia/Kolkata",
    [5.75]: "Asia/Kathmandu",
    [6]: "Asia/Dhaka",
    [6.5]: "Asia/Yangon",
    [7]: "Asia/Bangkok",
    [8]: "Asia/Shanghai",
    [9]: "Asia/Tokyo",
    [9.5]: "Australia/Adelaide",
    [10]: "Australia/Sydney",
    [11]: "Pacific/Noumea",
    [12]: "Pacific/Auckland",
    [13]: "Pacific/Tongatapu",
    [14]: "Pacific/Kiritimati",
  }

  return offsetMap[hoursOffset] || "UTC"
}

export const HabitTrackerWidgetSettingsSchema = z.object({
  habits: z.array(HabitSchema).default([]),
  lastResetDate: z.string().optional(),
  resetTime: z.string().default("02:00"),
  timezone: z.string().default(getDefaultTimezone()),
  unlimitedHeight: z.boolean().default(false),
})

export type TickerSymbol = z.infer<typeof TickerSymbolSchema>
export type Habit = z.infer<typeof HabitSchema>

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

export const PomodoroWidgetConfigSchema = BaseWidgetConfigSchema.extend({
  type: z.literal("pomodoro"),
  settings: PomodoroWidgetSettingsSchema,
})

export const HabitTrackerWidgetConfigSchema = BaseWidgetConfigSchema.extend({
  type: z.literal("habitTracker"),
  settings: HabitTrackerWidgetSettingsSchema,
})

export const WidgetConfigSchema = z.discriminatedUnion("type", [
  WeatherWidgetConfigSchema,
  NotesWidgetConfigSchema,
  QuoteWidgetConfigSchema,
  TickerWidgetConfigSchema,
  PomodoroWidgetConfigSchema,
  HabitTrackerWidgetConfigSchema,
])

export type WeatherWidgetConfig = z.infer<typeof WeatherWidgetConfigSchema>
export type NotesWidgetConfig = z.infer<typeof NotesWidgetConfigSchema>
export type QuoteWidgetConfig = z.infer<typeof QuoteWidgetConfigSchema>
export type TickerWidgetConfig = z.infer<typeof TickerWidgetConfigSchema>
export type PomodoroWidgetConfig = z.infer<typeof PomodoroWidgetConfigSchema>
export type HabitTrackerWidgetConfig = z.infer<typeof HabitTrackerWidgetConfigSchema>
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
      forecastDisplay: "expanded",
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
  pomodoro: {
    type: "pomodoro",
    name: "Pomodoro Timer",
    description: "Stay focused with the Pomodoro Technique",
    icon: "timer",
    defaultSettings: {
      pomodoroDuration: 25 * 60,
      shortBreakDuration: 5 * 60,
      longBreakDuration: 15 * 60,
      notificationSound: true,
    },
  },
  habitTracker: {
    type: "habitTracker",
    name: "Habit Tracker",
    description: "Track daily habits with automatic reset",
    icon: "check-square",
    defaultSettings: {
      habits: [],
      resetTime: "02:00",
      timezone: getDefaultTimezone(),
      unlimitedHeight: false,
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
    case "pomodoro":
      return {
        id: baseId,
        type: "pomodoro",
        enabled: true,
        order,
        settings: metadata.defaultSettings as PomodoroWidgetConfig["settings"],
      }
    case "habitTracker":
      return {
        id: baseId,
        type: "habitTracker",
        enabled: true,
        order,
        settings: metadata.defaultSettings as HabitTrackerWidgetConfig["settings"],
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
      case "pomodoro":
        return {
          ...widget,
          settings: { ...widget.settings, ...settings },
        } as PomodoroWidgetConfig
      case "habitTracker":
        return {
          ...widget,
          settings: { ...widget.settings, ...settings },
        } as HabitTrackerWidgetConfig
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
      unitSystem: "metric",
      forecastDisplay: "expanded",
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
