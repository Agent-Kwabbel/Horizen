import { useState, useEffect } from "react"
import type { WeatherUnits } from "@/lib/prefs"
import type { Coordinates } from "../services/geocoding"
import {
  type WeatherData,
  createCacheKey,
  getCachedWeather,
  setCachedWeather,
  clearWeatherCache,
  fetchCurrentWeather
} from "../services/weather-api"

export function useWeatherData(coords: Coordinates | null, _units: WeatherUnits) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const run = async () => {
      if (!coords) return
      const key = createCacheKey(coords.lat, coords.lon)

      // Try cache first (only skip cache if manual refresh)
      if (refreshTrigger === 0) {
        const cached = getCachedWeather(key)
        if (cached) {
          setWeather(cached)
          return
        }
      }

      // Fetch weather data (always in standard units: °C, m/s, mm, meters, hPa)
      const data = await fetchCurrentWeather(coords.lat, coords.lon).catch(() => null)
      if (data) {
        setWeather(data)
        setCachedWeather(key, data)
      }
    }
    run()
  }, [coords, refreshTrigger])

  const refresh = () => {
    if (!coords) return
    const key = createCacheKey(coords.lat, coords.lon)
    clearWeatherCache(key)
    setWeather(null)
    setRefreshTrigger(prev => prev + 1)
  }

  return { weather, refresh }
}
