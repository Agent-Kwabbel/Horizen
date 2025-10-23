export interface MoonPhaseData {
  phase: string
  phaseIcon: string
  illumination: number
  moonrise: string | null
  moonset: string | null
}

interface USNORiseSetData {
  properties: {
    data: {
      fracillum?: string
      curphase?: string
      moondata?: Array<{
        phen: string
        time: string
      }>
    }
  }
}

const CACHE_DURATION = 6 * 60 * 60 * 1000
const cache = new Map<string, { data: MoonPhaseData; timestamp: number }>()

function getMoonPhaseIcon(phaseName: string): string {
  const phase = phaseName.toLowerCase()
  if (phase.includes('new moon')) return 'moon-new'
  if (phase.includes('waxing crescent')) return 'moon-waxing-crescent'
  if (phase.includes('first quarter')) return 'moon-first-quarter'
  if (phase.includes('waxing gibbous')) return 'moon-waxing-gibbous'
  if (phase.includes('full moon')) return 'moon-full'
  if (phase.includes('waning gibbous')) return 'moon-waning-gibbous'
  if (phase.includes('last quarter') || phase.includes('third quarter')) return 'moon-last-quarter'
  if (phase.includes('waning crescent')) return 'moon-waning-crescent'
  return 'moon-new'
}

export async function fetchMoonData(lat: number, lon: number): Promise<MoonPhaseData> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  const timezoneOffset = -today.getTimezoneOffset() / 60

  const url = `https://aa.usno.navy.mil/api/rstt/oneday?date=${dateStr}&coords=${lat},${lon}&tz=${timezoneOffset}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`USNO API error: ${response.status}`)
    }

    const data: USNORiseSetData = await response.json()
    const properties = data.properties?.data

    if (!properties) {
      throw new Error('Invalid USNO API response format')
    }

    let illumination = 0
    if (properties.fracillum) {
      const value = parseFloat(properties.fracillum)
      illumination = value > 1 ? Math.round(value) : Math.round(value * 100)
    }

    const phaseName = properties.curphase || 'New Moon'
    const phaseIcon = getMoonPhaseIcon(phaseName)

    let moonrise: string | null = null
    let moonset: string | null = null

    if (properties.moondata && Array.isArray(properties.moondata)) {
      for (const event of properties.moondata) {
        if (event.phen === 'R' || event.phen === 'Rise') {
          moonrise = event.time
        } else if (event.phen === 'S' || event.phen === 'Set') {
          moonset = event.time
        }
      }
    }

    const moonData: MoonPhaseData = {
      phase: phaseName,
      phaseIcon,
      illumination,
      moonrise,
      moonset
    }

    cache.set(cacheKey, { data: moonData, timestamp: Date.now() })
    return moonData
  } catch (error) {
    console.error('Failed to fetch moon data:', error)
    throw error
  }
}
