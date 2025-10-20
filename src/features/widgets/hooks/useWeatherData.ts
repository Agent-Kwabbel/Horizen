import { useState, useEffect, useRef } from "react"
import type { WeatherUnits } from "@/lib/prefs"
import type { Coordinates } from "../services/geocoding"
import {
  type CurrentWeather,
  createCacheKey,
  getCachedWeather,
  setCachedWeather,
  clearWeatherCache,
  fetchCurrentWeather
} from "../services/weather-api"

export function useWeatherData(coords: Coordinates | null, units: WeatherUnits) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const prevUnitsRef = useRef(units)

  useEffect(() => {
    const run = async () => {
      if (!coords) return
      const key = createCacheKey(coords.lat, coords.lon)

      const unitsChanged = prevUnitsRef.current !== units &&
        (prevUnitsRef.current.temperature !== units.temperature ||
         prevUnitsRef.current.windSpeed !== units.windSpeed ||
         prevUnitsRef.current.precipitation !== units.precipitation)

      if (unitsChanged) {
        clearWeatherCache(key)
      }

      prevUnitsRef.current = units

      if (!unitsChanged && refreshTrigger === 0) {
        const cached = getCachedWeather(key)
        if (cached) {
          setWeather(cached)
          return
        }
      }

      const data = await fetchCurrentWeather(coords.lat, coords.lon, units).catch(() => null)
      if (data) {
        setWeather(data)
        setCachedWeather(key, data)
      }
    }
    run()
  }, [coords, units, refreshTrigger])

  const refresh = () => {
    if (!coords) return
    const key = createCacheKey(coords.lat, coords.lon)
    clearWeatherCache(key)
    setWeather(null)
    setRefreshTrigger(prev => prev + 1)
  }

  return { weather, refresh }
}
