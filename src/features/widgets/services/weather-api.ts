import type { WeatherUnits } from "@/lib/prefs"

export type CurrentWeather = {
  temperature_2m: number
  apparent_temperature: number
  wind_speed_10m: number
  wind_gusts_10m: number
  wind_direction_10m: number
  precipitation_probability: number
  precipitation: number
  rain: number
  showers: number
  snowfall: number
  cloud_cover: number
  is_day: 0 | 1
  weather_code: number
  relative_humidity_2m: number
  surface_pressure: number
  visibility: number
}

export type HourlyWeather = {
  temperature_2m: number[]
  apparent_temperature: number[]
  precipitation_probability: number[]
  precipitation: number[]
  weather_code: number[]
  uv_index: number[]
  wind_speed_10m: number[]
  wind_gusts_10m: number[]
}

export type DailyWeather = {
  temperature_2m_max: number
  temperature_2m_min: number
  apparent_temperature_max: number
  apparent_temperature_min: number
  precipitation_sum: number
  precipitation_hours: number
  weather_code: number
  wind_speed_10m_max: number
  wind_gusts_10m_max: number
  uv_index_max: number
  sunrise: string
  sunset: string
}

export type AirQuality = {
  pm2_5: number
  european_aqi_pm2_5: number
  us_aqi_pm2_5: number
  pm10: number
  european_aqi_pm10: number
  us_aqi_pm10: number
  ozone: number
  european_aqi_o3: number
  us_aqi_o3: number
  european_aqi?: number
  us_aqi?: number
}

export function getOverallAQI(airQuality: AirQuality): number {
  // If direct AQI is available, use it
  if (airQuality.us_aqi != null) {
    return airQuality.us_aqi
  }

  // Otherwise calculate from component AQIs (US AQI is the maximum of all components)
  const componentAQIs = [
    airQuality.us_aqi_pm2_5 || 0,
    airQuality.us_aqi_pm10 || 0,
    airQuality.us_aqi_o3 || 0
  ].filter(val => val > 0)

  return componentAQIs.length > 0 ? Math.max(...componentAQIs) : 0
}

export type WeatherData = {
  current: CurrentWeather
  hourly: HourlyWeather
  daily: DailyWeather
  airQuality: AirQuality | null
  latitude: number
  longitude: number
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

    // Validate the data structure has current, hourly, and daily
    if (!parsed.data || !parsed.data.current || !parsed.data.hourly || !parsed.data.daily) {
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
  lon: number
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,precipitation_probability,rain,showers,snowfall,cloud_cover,relative_humidity_2m,surface_pressure,visibility"
  )
  url.searchParams.set(
    "hourly",
    "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,uv_index,wind_speed_10m,wind_gusts_10m"
  )
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_hours,weather_code,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset")
  url.searchParams.set("forecast_days", "3")
  url.searchParams.set("past_hours", "6")
  url.searchParams.set("forecast_hours", "24")
  url.searchParams.set("timezone", "auto")

  // Always fetch in standard units: Celsius, m/s, mm
  url.searchParams.set("temperature_unit", "celsius")
  url.searchParams.set("wind_speed_unit", "ms")
  url.searchParams.set("precipitation_unit", "mm")

  const res = await fetch(url.toString())
  const j = await res.json()
  const current = j.current as CurrentWeather

  const hourly: HourlyWeather = {
    temperature_2m: j.hourly.temperature_2m.slice(0, 30),
    apparent_temperature: j.hourly.apparent_temperature.slice(0, 30),
    precipitation_probability: j.hourly.precipitation_probability.slice(0, 30),
    precipitation: j.hourly.precipitation.slice(0, 30),
    weather_code: j.hourly.weather_code.slice(0, 30),
    uv_index: j.hourly.uv_index.slice(0, 30),
    wind_speed_10m: j.hourly.wind_speed_10m.slice(0, 30),
    wind_gusts_10m: j.hourly.wind_gusts_10m.slice(0, 30),
  }

  const daily: DailyWeather = {
    temperature_2m_max: j.daily.temperature_2m_max[0],
    temperature_2m_min: j.daily.temperature_2m_min[0],
    apparent_temperature_max: j.daily.apparent_temperature_max[0],
    apparent_temperature_min: j.daily.apparent_temperature_min[0],
    precipitation_sum: j.daily.precipitation_sum[0],
    precipitation_hours: j.daily.precipitation_hours[0],
    weather_code: j.daily.weather_code[0],
    wind_speed_10m_max: j.daily.wind_speed_10m_max[0],
    wind_gusts_10m_max: j.daily.wind_gusts_10m_max[0],
    uv_index_max: j.daily.uv_index_max[0],
    sunrise: j.daily.sunrise[0],
    sunset: j.daily.sunset[0],
  }

  // Fetch air quality data
  let airQuality: AirQuality | null = null
  try {
    const aqUrl = new URL("https://air-quality.open-meteo.com/v1/air-quality")
    aqUrl.searchParams.set("latitude", String(lat))
    aqUrl.searchParams.set("longitude", String(lon))
    aqUrl.searchParams.set("current", "pm2_5,european_aqi_pm2_5,us_aqi_pm2_5,pm10,european_aqi_pm10,us_aqi_pm10,ozone,european_aqi_o3,us_aqi_o3,european_aqi,us_aqi")

    const aqRes = await fetch(aqUrl.toString())
    const aqData = await aqRes.json()

    if (aqData.current) {
      airQuality = aqData.current as AirQuality
    }
  } catch {
    // Air quality data is optional, continue without it
  }

  // Return all data in standard units: °C, m/s, mm, meters, hPa
  return {
    current,
    hourly,
    daily,
    airQuality,
    latitude: lat,
    longitude: lon
  }
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

export function formatTemperature(tempCelsius: number, unit: WeatherUnits["temperature"]): string {
  let displayTemp = tempCelsius

  if (unit === "fahrenheit") {
    displayTemp = (tempCelsius * 9 / 5) + 32
  } else if (unit === "kelvin") {
    displayTemp = tempCelsius + 273.15
  }

  const rounded = Math.round(displayTemp)

  if (unit === "kelvin") return `${rounded}K`
  return `${rounded}°${unit === "fahrenheit" ? "F" : "C"}`
}

export function formatWindSpeed(speedMs: number, unit: WeatherUnits["windSpeed"]): string {
  let displaySpeed = speedMs

  switch (unit) {
    case "kmh":
      displaySpeed = speedMs * 3.6
      break
    case "mph":
      displaySpeed = speedMs * 2.237
      break
    case "knots":
      displaySpeed = speedMs * 1.944
      break
    case "fts":
      displaySpeed = speedMs * 3.281
      break
    case "beaufort":
      return `${getBeaufortScale(speedMs)} Bft wind force`
    case "ms":
      // Already in m/s
      break
  }

  const unitLabels = {
    ms: "m/s",
    kmh: "km/h",
    mph: "mph",
    knots: "kts",
    fts: "ft/s"
  }
  return `${Math.round(displaySpeed)} ${unitLabels[unit as keyof typeof unitLabels]} wind`
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
  amountMm: number,
  unit: WeatherUnits["precipitation"]
): string {
  let displayAmount = amountMm

  if (unit === "inch") {
    displayAmount = amountMm / 25.4
  }

  const unitLabel = unit === "inch" ? '"' : "mm"
  return `${probability ?? 0}% rain, ${displayAmount.toFixed(1)}${unitLabel}`
}

export function formatVisibility(meters: number, unit: WeatherUnits["visibility"]): string {
  if (unit === "miles") {
    const miles = meters / 1609.34
    return `${miles.toFixed(1)} mi`
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }

  return `${(meters / 1000).toFixed(1)} km`
}

export function formatPressure(hpa: number, unit: WeatherUnits["pressure"]): string {
  switch (unit) {
    case "mb":
      return `${hpa.toFixed(0)} mb`
    case "inhg":
      return `${(hpa * 0.02953).toFixed(2)} inHg`
    case "atm":
      return `${(hpa / 1013.25).toFixed(3)} atm`
    case "hpa":
    default:
      return `${hpa.toFixed(0)} hPa`
  }
}

export function getWindBeaufortIcon(windSpeedMs: number, _unit: WeatherUnits["windSpeed"]): string {
  // Input is always in m/s (standard units)
  // Convert m/s to Beaufort scale for icon selection

  if (windSpeedMs < 0.5) return "wind-beaufort-0"
  if (windSpeedMs < 1.6) return "wind-beaufort-1"
  if (windSpeedMs < 3.4) return "wind-beaufort-2"
  if (windSpeedMs < 5.5) return "wind-beaufort-3"
  if (windSpeedMs < 8.0) return "wind-beaufort-4"
  if (windSpeedMs < 10.8) return "wind-beaufort-5"
  if (windSpeedMs < 13.9) return "wind-beaufort-6"
  if (windSpeedMs < 17.2) return "wind-beaufort-7"
  if (windSpeedMs < 20.8) return "wind-beaufort-8"
  if (windSpeedMs < 24.5) return "wind-beaufort-9"
  if (windSpeedMs < 28.5) return "wind-beaufort-10"
  if (windSpeedMs < 32.7) return "wind-beaufort-11"
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
