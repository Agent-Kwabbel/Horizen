import { useState, useEffect } from "react"
import type { MoonPhaseData } from "../services/moon-api"
import { fetchMoonData } from "../services/moon-api"

export function useMoonData(lat: number | undefined, lon: number | undefined, enabled: boolean) {
  const [moonData, setMoonData] = useState<MoonPhaseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || lat === undefined || lon === undefined) {
      setMoonData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    const loadMoonData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchMoonData(lat, lon)
        if (!cancelled) {
          setMoonData(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch moon data")
          setMoonData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMoonData()

    return () => {
      cancelled = true
    }
  }, [lat, lon, enabled])

  return { moonData, loading, error }
}
