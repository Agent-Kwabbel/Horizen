export type GeoLocation = {
  id: number
  name: string
  country: string
  latitude: number
  longitude: number
  admin1?: string
}

export type Coordinates = {
  lat: number
  lon: number
  name: string
}

const LS_LOCATION_KEY = "wx:location"

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", query)
  url.searchParams.set("count", "8")
  url.searchParams.set("language", "en")
  url.searchParams.set("format", "json")
  const res = await fetch(url.toString())
  const j = await res.json()
  return (j.results || []) as GeoLocation[]
}

export function formatLocationName(location: GeoLocation): string {
  return [location.name, location.admin1, location.country]
    .filter(Boolean)
    .join(", ")
}

export function saveLocation(coords: Coordinates): void {
  localStorage.setItem(LS_LOCATION_KEY, JSON.stringify(coords))
}

export function loadSavedLocation(): Coordinates | null {
  try {
    return JSON.parse(localStorage.getItem(LS_LOCATION_KEY) || "null")
  } catch {
    return null
  }
}

export function convertToCoordinates(location: GeoLocation): Coordinates {
  return {
    lat: location.latitude,
    lon: location.longitude,
    name: formatLocationName(location)
  }
}
