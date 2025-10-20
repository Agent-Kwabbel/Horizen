import { useState, useEffect } from "react"
import { usePrefs } from "@/lib/prefs"
import { updateWidgetSettings } from "@/lib/widgets"
import {
  type GeoLocation,
  type Coordinates,
  searchLocations,
  saveLocation,
  loadSavedLocation,
  convertToCoordinates
} from "../services/geocoding"

export function useLocationSearch(configLocation?: { name: string; latitude: number; longitude: number }) {
  const { setPrefs } = usePrefs()
  const [coords, setCoords] = useState<Coordinates | null>(() => {
    if (configLocation) {
      return {
        lat: configLocation.latitude,
        lon: configLocation.longitude,
        name: configLocation.name
      }
    }
    return loadSavedLocation()
  })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeoLocation[] | null>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }
    let active = true
    searchLocations(query)
      .then((r) => active && setResults(r))
      .catch(() => void 0)
    return () => {
      active = false
    }
  }, [query])

  const setLocation = (location: GeoLocation) => {
    const newCoords = convertToCoordinates(location)
    setCoords(newCoords)
    saveLocation(newCoords)
    setOpen(false)

    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, "weather-default", {
        location: {
          name: newCoords.name,
          latitude: newCoords.lat,
          longitude: newCoords.lon
        }
      })
    }))
  }

  return {
    coords,
    setLocation,
    open,
    setOpen,
    query,
    setQuery,
    results
  }
}
