import type { WeatherUnits } from "@/lib/prefs"

export type CurrentWeather = {
  temperature_2m: number
  apparent_temperature: number
  wind_speed_10m: number
  precipitation_probability: number
  precipitation: number
  rain: number
  showers: number
  snowfall: number
  cloud_cover: number
  is_day: 0 | 1
  weather_code: number
}

export type DailyWeather = {
  temperature_2m_max: number
  temperature_2m_min: number
}

export type WeatherData = {
  current: CurrentWeather
  daily: DailyWeather
}

type WeatherCache = {
  t: number
  data: WeatherData
}

const TTL_MS = 15 * 60 * 1000

export function createCacheKey(lat: number, lon: number): string {
  return `wx:cache:${lat.toFixed(3)},${lon.toFixed(3)}`
}

export function getCachedWeather(key: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeatherCache
    if (Date.now() - parsed.t > TTL_MS) return null

    // Validate the data structure has current and daily
    if (!parsed.data || !parsed.data.current || !parsed.data.daily) {
      localStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

export function setCachedWeather(key: string, data: WeatherData): void {
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
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,precipitation,precipitation_probability,rain,showers,snowfall,cloud_cover"
  )
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min")
  url.searchParams.set("forecast_days", "1")
  url.searchParams.set("timezone", "auto")

  url.searchParams.set("temperature_unit", units.temperature === "fahrenheit" ? "fahrenheit" : "celsius")

  // For API, always fetch in m/s and convert later if needed
  const apiWindUnit = units.windSpeed === "knots" || units.windSpeed === "beaufort" ? "ms" : units.windSpeed
  url.searchParams.set("wind_speed_unit", apiWindUnit)

  url.searchParams.set("precipitation_unit", units.precipitation)

  const res = await fetch(url.toString())
  const j = await res.json()
  const current = j.current as CurrentWeather
  const daily: DailyWeather = {
    temperature_2m_max: j.daily.temperature_2m_max[0],
    temperature_2m_min: j.daily.temperature_2m_min[0]
  }

  if (units.temperature === "kelvin") {
    current.temperature_2m = current.temperature_2m + 273.15
    current.apparent_temperature = current.apparent_temperature + 273.15
    daily.temperature_2m_max = daily.temperature_2m_max + 273.15
    daily.temperature_2m_min = daily.temperature_2m_min + 273.15
  }

  if (units.windSpeed === "knots") {
    current.wind_speed_10m = current.wind_speed_10m * 0.539957
  } else if (units.windSpeed === "beaufort") {
    // Convert m/s to Beaufort scale
    current.wind_speed_10m = getBeaufortScale(current.wind_speed_10m)
  }

  return { current, daily }
}

export function getWeatherIcon(weather: CurrentWeather): string {
  const { weather_code, is_day, temperature_2m, snowfall, rain, showers, cloud_cover } = weather
  const isDay = is_day === 1

  if ([95, 96, 99].includes(weather_code)) {
    if (snowfall > 0 || temperature_2m < 2) {
      if (isDay) return "thunderstorms-day-snow"
      return "thunderstorms-night-snow"
    }
    if (rain > 0 || showers > 0) {
      if (isDay) return "thunderstorms-day-rain"
      return "thunderstorms-night-rain"
    }
    if (isDay) return "thunderstorms-day"
    return "thunderstorms-night"
  }

  if (snowfall > 0 || [71, 73, 75, 77, 85, 86].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-snow"
      return "partly-cloudy-night-snow"
    }
    return "snow"
  }

  if ([56, 57, 66, 67].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-sleet"
      return "partly-cloudy-night-sleet"
    }
    return "sleet"
  }

  if ([96, 99].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-hail"
      return "partly-cloudy-night-hail"
    }
    return "hail"
  }

  if (showers > 0 || [80, 81, 82].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-rain"
      return "partly-cloudy-night-rain"
    }
    return "rain"
  }

  if (rain > 0 || [61, 63, 65].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-rain"
      return "partly-cloudy-night-rain"
    }
    return "rain"
  }

  if ([51, 53, 55].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-drizzle"
      return "partly-cloudy-night-drizzle"
    }
    return "drizzle"
  }

  if ([45, 48].includes(weather_code)) {
    if (cloud_cover < 50) {
      if (isDay) return "partly-cloudy-day-fog"
      return "partly-cloudy-night-fog"
    }
    if (isDay) return "fog-day"
    return "fog-night"
  }

  if (cloud_cover > 90) {
    if (isDay) return "overcast-day"
    return "overcast-night"
  }

  if (cloud_cover >= 50) {
    return "cloudy"
  }

  if (cloud_cover >= 10 || [1, 2, 3].includes(weather_code)) {
    if (isDay) return "partly-cloudy-day"
    return "partly-cloudy-night"
  }

  if (isDay) return "clear-day"
  return "clear-night"
}

export function formatTemperature(temp: number, unit: WeatherUnits["temperature"]): string {
  if (unit === "kelvin") return `${Math.round(temp)}K`
  return `${Math.round(temp)}°${unit === "fahrenheit" ? "F" : "C"}`
}

export function formatWindSpeed(speed: number, unit: WeatherUnits["windSpeed"]): string {
  if (unit === "beaufort") {
    const beaufortScale = getBeaufortScale(speed)
    return `${beaufortScale} Bft wind force`
  }

  const unitLabels = {
    ms: "m/s",
    kmh: "km/h",
    mph: "mph",
    knots: "kts"
  }
  return `${Math.round(speed)} ${unitLabels[unit as keyof typeof unitLabels]} wind`
}

function getBeaufortScale(speedMs: number): number {
  if (speedMs < 0.5) return 0
  if (speedMs < 1.6) return 1
  if (speedMs < 3.4) return 2
  if (speedMs < 5.5) return 3
  if (speedMs < 8.0) return 4
  if (speedMs < 10.8) return 5
  if (speedMs < 13.9) return 6
  if (speedMs < 17.2) return 7
  if (speedMs < 20.8) return 8
  if (speedMs < 24.5) return 9
  if (speedMs < 28.5) return 10
  if (speedMs < 32.7) return 11
  return 12
}

export function formatPrecipitation(
  probability: number,
  _amount: number,
  _unit: WeatherUnits["precipitation"]
): string {
  return `${probability ?? 0}% rain`
}

export function getWindBeaufortIcon(windSpeed: number, unit: WeatherUnits["windSpeed"]): string {
  let speedMs = windSpeed

  switch (unit) {
    case "kmh":
      speedMs = windSpeed / 3.6
      break
    case "mph":
      speedMs = windSpeed / 2.237
      break
    case "knots":
      speedMs = windSpeed / 1.944
      break
    case "beaufort":
      return `wind-beaufort-${Math.min(12, Math.max(0, Math.round(windSpeed)))}`
  }

  if (speedMs < 0.5) return "wind-beaufort-0"
  if (speedMs < 1.6) return "wind-beaufort-1"
  if (speedMs < 3.4) return "wind-beaufort-2"
  if (speedMs < 5.5) return "wind-beaufort-3"
  if (speedMs < 8.0) return "wind-beaufort-4"
  if (speedMs < 10.8) return "wind-beaufort-5"
  if (speedMs < 13.9) return "wind-beaufort-6"
  if (speedMs < 17.2) return "wind-beaufort-7"
  if (speedMs < 20.8) return "wind-beaufort-8"
  if (speedMs < 24.5) return "wind-beaufort-9"
  if (speedMs < 28.5) return "wind-beaufort-10"
  if (speedMs < 32.7) return "wind-beaufort-11"
  return "wind-beaufort-12"
}

export function getPrecipitationIcon(weather: CurrentWeather): string {
  const { snowfall, rain, showers, precipitation } = weather

  if (snowfall > 0) {
    return "snowflake"
  }

  if (rain > 5 || showers > 5 || precipitation > 5) {
    return "raindrops"
  }

  return "raindrop"
}

export function getWeatherDescription(weather: CurrentWeather): string {
  const { weather_code, is_day, temperature_2m, snowfall, rain, showers } = weather
  const isDay = is_day === 1

  if ([95, 96, 99].includes(weather_code)) {
    if (snowfall > 0 || temperature_2m < 2) return "Thunderstorm with snow"
    if (rain > 0 || showers > 0) return "Rainy thunderstorm"
    return "Thunderstorm"
  }

  if (snowfall > 0 || [71, 73, 75, 77, 85, 86].includes(weather_code)) {
    return "Snowy"
  }

  if ([56, 57, 66, 67].includes(weather_code)) {
    return "Sleet"
  }

  if ([96, 99].includes(weather_code)) {
    return "Hail"
  }

  if (showers > 0 || [80, 81, 82].includes(weather_code)) {
    return "Rain showers"
  }

  if (rain > 0 || [61, 63, 65].includes(weather_code)) {
    return "Rainy"
  }

  if ([51, 53, 55].includes(weather_code)) {
    return "Drizzle"
  }

  if ([45, 48].includes(weather_code)) {
    return "Foggy"
  }

  if ([1, 2, 3].includes(weather_code)) {
    return isDay ? "Partly cloudy" : "Partly cloudy night"
  }

  if (weather_code === 0) {
    return isDay ? "Sunny" : "Clear night"
  }

  return "Cloudy"
}

export function getBeaufortDescription(speedMs: number): string {
  if (speedMs < 0.5) return "Calm"
  if (speedMs < 1.6) return "Light air"
  if (speedMs < 3.4) return "Light breeze"
  if (speedMs < 5.5) return "Gentle breeze"
  if (speedMs < 8.0) return "Moderate breeze"
  if (speedMs < 10.8) return "Fresh breeze"
  if (speedMs < 13.9) return "Strong breeze"
  if (speedMs < 17.2) return "Near gale"
  if (speedMs < 20.8) return "Gale"
  if (speedMs < 24.5) return "Strong gale"
  if (speedMs < 28.5) return "Storm"
  if (speedMs < 32.7) return "Violent storm"
  return "Hurricane force"
}
