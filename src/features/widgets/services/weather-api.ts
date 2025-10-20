import type { WeatherUnits } from "@/lib/prefs"

export type CurrentWeather = {
  temperature_2m: number
  apparent_temperature: number
  wind_speed_10m: number
  precipitation_probability: number
  precipitation: number
  is_day: 0 | 1
  weather_code: number
}

type WeatherCache = {
  t: number
  data: CurrentWeather
}

const TTL_MS = 15 * 60 * 1000

export function createCacheKey(lat: number, lon: number): string {
  return `wx:cache:${lat.toFixed(3)},${lon.toFixed(3)}`
}

export function getCachedWeather(key: string): CurrentWeather | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeatherCache
    if (Date.now() - parsed.t > TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function setCachedWeather(key: string, data: CurrentWeather): void {
  localStorage.setItem(key, JSON.stringify({
    t: Date.now(),
    data
  } satisfies WeatherCache))
}

export function clearWeatherCache(key: string): void {
  localStorage.removeItem(key)
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  units: WeatherUnits
): Promise<CurrentWeather> {
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
  const data = j.current as CurrentWeather

  if (units.temperature === "kelvin") {
    data.temperature_2m = data.temperature_2m + 273.15
    data.apparent_temperature = data.apparent_temperature + 273.15
  }

  if (units.windSpeed === "knots") {
    data.wind_speed_10m = data.wind_speed_10m * 0.539957
  }

  return data
}

export function getWeatherIcon(code: number, isDay: 0 | 1): string {
  if (code === 0) return isDay ? "☀️" : "🌙"
  if ([1, 2, 3].includes(code)) return "⛅"
  if ([45, 48].includes(code)) return "☁️"
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️"
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️"
  if ([95, 96, 99].includes(code)) return "⛈️"
  return "🌡️"
}

export function formatTemperature(temp: number, unit: WeatherUnits["temperature"]): string {
  if (unit === "kelvin") return `${Math.round(temp)}K`
  return `${Math.round(temp)}°${unit === "fahrenheit" ? "F" : "C"}`
}

export function formatWindSpeed(speed: number, unit: WeatherUnits["windSpeed"]): string {
  const unitLabels = {
    ms: "m/s",
    kmh: "km/h",
    mph: "mph",
    knots: "kts"
  }
  return `${Math.round(speed)} ${unitLabels[unit]}`
}

export function formatPrecipitation(
  probability: number,
  amount: number,
  unit: WeatherUnits["precipitation"]
): string {
  return `${probability ?? 0}% (${(amount ?? 0).toFixed(1)}${unit})`
}
