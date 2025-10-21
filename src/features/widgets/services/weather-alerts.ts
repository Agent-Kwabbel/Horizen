import type { WeatherData } from './weather-api'

export type AlertSeverity = 'advisory' | 'watch' | 'warning'

export type WeatherAlert = {
  type: string
  severity: AlertSeverity
  message: string
}

function getClimateZone(latitude: number): 'tropical' | 'subtropical' | 'temperate' | 'cold' | 'polar' {
  const absLat = Math.abs(latitude)
  if (absLat < 23.5) return 'tropical'
  if (absLat < 35) return 'subtropical'
  if (absLat < 50) return 'temperate'
  if (absLat < 66.5) return 'cold'
  return 'polar'
}

function kmhToMs(kmh: number): number {
  return kmh / 3.6
}

function checkWindAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const maxGust = Math.max(data.current.wind_gusts_10m, data.daily.wind_gusts_10m_max)
  const maxWind = Math.max(data.current.wind_speed_10m, data.daily.wind_speed_10m_max)
  const max = Math.max(maxGust, maxWind)

  if (max >= kmhToMs(90)) {
    alerts.push({
      type: 'dangerous_storm',
      severity: 'warning',
      message: 'DANGEROUS STORM WARNING! Avoid all travel and stay indoors. Secure loose objects.'
    })
  } else if (max >= kmhToMs(65)) {
    alerts.push({
      type: 'gale',
      severity: 'watch',
      message: 'Gale watch. Strong winds expected. Secure outdoor objects and avoid unnecessary travel.'
    })
  } else if (max >= kmhToMs(50)) {
    alerts.push({
      type: 'wind',
      severity: 'advisory',
      message: 'Strong wind advisory. Gusty conditions expected.'
    })
  }

  return alerts
}

function checkTemperatureAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const zone = getClimateZone(data.latitude)
  const temp = data.current.temperature_2m
  const apparent = data.current.apparent_temperature
  const maxApparent = Math.max(apparent, data.daily.apparent_temperature_max)
  const maxTemp = Math.max(temp, data.daily.temperature_2m_max)
  const maxHeat = Math.max(maxApparent, maxTemp)

  const heatThresholds = {
    tropical: { warning: 43, watch: 40, advisory: 38 },
    subtropical: { warning: 40, watch: 37, advisory: 35 },
    temperate: { warning: 38, watch: 35, advisory: 32 },
    cold: { warning: 33, watch: 30, advisory: 28 },
    polar: { warning: 30, watch: 27, advisory: 25 }
  }

  const coldThresholds = {
    tropical: { warning: null, watch: null, advisory: null },
    subtropical: { warning: null, watch: null, advisory: 5 },
    temperate: { warning: -15, watch: -10, advisory: -5 },
    cold: { warning: -25, watch: -20, advisory: -15 },
    polar: { warning: -40, watch: -35, advisory: -30 }
  }

  const heat = heatThresholds[zone]
  if (maxHeat >= heat.warning) {
    alerts.push({
      type: 'extreme_heat',
      severity: 'warning',
      message: 'EXTREME HEAT WARNING! Stay indoors, drink plenty of water, and check on vulnerable individuals.'
    })
  } else if (maxHeat >= heat.watch) {
    alerts.push({
      type: 'excessive_heat',
      severity: 'watch',
      message: 'Excessive heat watch. Limit outdoor activities and stay hydrated.'
    })
  } else if (maxHeat >= heat.advisory) {
    alerts.push({
      type: 'heat',
      severity: 'advisory',
      message: 'Heat advisory. Stay hydrated and limit outdoor activities during peak hours.'
    })
  }

  const coldAlert = checkColdDurationAlert(data, zone, coldThresholds)
  if (coldAlert) {
    alerts.push(coldAlert)
  }

  return alerts
}

function checkColdDurationAlert(
  data: WeatherData,
  zone: ReturnType<typeof getClimateZone>,
  coldThresholds: Record<string, { warning: number | null, watch: number | null, advisory: number | null }>
): WeatherAlert | null {
  const cold = coldThresholds[zone]
  if (cold.warning === null && cold.watch === null && cold.advisory === null) {
    return null
  }

  const hourlyTemps = data.hourly.apparent_temperature

  for (let i = 0; i <= hourlyTemps.length - 6; i++) {
    const window = hourlyTemps.slice(i, i + 6)
    let maxSeverity: 'warning' | 'watch' | 'advisory' | null = null

    for (const temp of window) {
      if (cold.warning !== null && temp <= cold.warning) {
        maxSeverity = 'warning'
        break
      } else if (cold.watch !== null && temp <= cold.watch && maxSeverity === null) {
        maxSeverity = 'watch'
      } else if (cold.advisory !== null && temp <= cold.advisory && maxSeverity === null) {
        maxSeverity = 'advisory'
      }
    }

    if (maxSeverity === 'warning') {
      return {
        type: 'extreme_cold',
        severity: 'warning',
        message: 'EXTREME COLD WARNING! Avoid prolonged exposure. Frostbite and hypothermia risk.'
      }
    } else if (maxSeverity === 'watch') {
      return {
        type: 'extreme_cold',
        severity: 'watch',
        message: 'Extreme cold watch. Dress warmly and limit time outdoors.'
      }
    } else if (maxSeverity === 'advisory') {
      return {
        type: 'cold_weather',
        severity: 'advisory',
        message: 'Cold weather advisory. Dress in layers and protect exposed skin.'
      }
    }
  }

  return null
}

function checkWindChillAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const zone = getClimateZone(data.latitude)

  if (zone === 'tropical' || zone === 'subtropical') {
    return alerts
  }

  const windChillDiff = data.current.apparent_temperature - data.current.temperature_2m
  const windSpeed = data.current.wind_speed_10m

  if (windChillDiff < -15 && windSpeed >= kmhToMs(20)) {
    alerts.push({
      type: 'wind_chill',
      severity: 'warning',
      message: 'Wind chill warning. Dangerous wind chill values. Cover all exposed skin.'
    })
  } else if (windChillDiff < -10 && windSpeed >= kmhToMs(20)) {
    alerts.push({
      type: 'wind_chill',
      severity: 'advisory',
      message: 'Wind chill advisory. Cold wind chill values expected.'
    })
  }

  return alerts
}

function checkPrecipitationAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const hourlyPrecip = data.hourly.precipitation

  const maxHourlyPrecip = Math.max(...hourlyPrecip)

  let max3HourPrecip = 0
  for (let i = 0; i < hourlyPrecip.length - 2; i++) {
    const sum = hourlyPrecip[i] + hourlyPrecip[i + 1] + hourlyPrecip[i + 2]
    if (sum > max3HourPrecip) {
      max3HourPrecip = sum
    }
  }

  const dailyPrecip = data.daily.precipitation_sum

  let highestSeverity: 'warning' | 'watch' | 'advisory' | null = null
  let highestTimeframe: 'hourly' | '3hour' | 'daily' = 'daily'

  if (maxHourlyPrecip >= 40 && (highestSeverity === null || highestSeverity !== 'warning')) {
    highestSeverity = 'warning'
    highestTimeframe = 'hourly'
  } else if (maxHourlyPrecip >= 20 && (highestSeverity === null || (highestSeverity !== 'warning' && highestSeverity !== 'watch'))) {
    highestSeverity = 'watch'
    highestTimeframe = 'hourly'
  } else if (maxHourlyPrecip >= 10 && highestSeverity === null) {
    highestSeverity = 'advisory'
    highestTimeframe = 'hourly'
  }

  if (max3HourPrecip >= 75 && (highestSeverity === null || highestSeverity !== 'warning')) {
    highestSeverity = 'warning'
    highestTimeframe = '3hour'
  } else if (max3HourPrecip >= 50) {
    if (highestSeverity === null || highestSeverity === 'advisory') {
      highestSeverity = 'watch'
      highestTimeframe = '3hour'
    }
  }

  if (dailyPrecip >= 125 && (highestSeverity === null || highestSeverity !== 'warning')) {
    highestSeverity = 'warning'
    highestTimeframe = 'daily'
  } else if (dailyPrecip >= 75 && (highestSeverity === null || (highestSeverity !== 'warning' && highestSeverity !== 'watch'))) {
    if (highestTimeframe === 'daily' || highestSeverity === null) {
      highestSeverity = 'watch'
      highestTimeframe = 'daily'
    }
  } else if (dailyPrecip >= 40 && highestSeverity === null) {
    highestSeverity = 'advisory'
    highestTimeframe = 'daily'
  }

  if (highestSeverity === 'warning') {
    alerts.push({
      type: 'flood',
      severity: 'warning',
      message: highestTimeframe === 'hourly'
        ? 'Flood warning. Intense rainfall expected. Avoid low-lying areas and flooded roads.'
        : highestTimeframe === '3hour'
        ? 'Flood warning. Heavy rainfall accumulation. Avoid low-lying areas and flooded roads.'
        : 'Flood warning. Extreme daily rainfall. Avoid low-lying areas and flooded roads.'
    })
  } else if (highestSeverity === 'watch') {
    alerts.push({
      type: 'flood',
      severity: 'watch',
      message: highestTimeframe === 'hourly'
        ? 'Flood watch. Heavy rainfall possible. Monitor conditions.'
        : highestTimeframe === '3hour'
        ? 'Flood watch. Significant rainfall may cause localized flooding.'
        : 'Flood watch. Heavy daily rainfall may cause flooding.'
    })
  } else if (highestSeverity === 'advisory') {
    alerts.push({
      type: 'heavy_rain',
      severity: 'advisory',
      message: 'Heavy rain advisory. Expect wet conditions and reduced visibility.'
    })
  }

  return alerts
}

function getSnowZoneType(latitude: number): 'rare' | 'regular' | 'extreme' {
  const zone = getClimateZone(latitude)
  if (zone === 'tropical' || zone === 'subtropical') return 'rare'
  if (zone === 'temperate') return 'regular'
  return 'extreme'
}

function checkWinterWeatherAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const temp = data.current.temperature_2m
  const snowfall = data.current.snowfall
  const hasSnowCode = [71, 73, 75, 77, 85, 86].includes(data.current.weather_code)
  const hasFreezingRainCode = [56, 57, 66, 67].includes(data.current.weather_code)
  const wind = data.current.wind_speed_10m
  const visibility = data.current.visibility

  const snowZone = getSnowZoneType(data.latitude)

  const snowThresholds = {
    rare: { warning: 20, watch: 10, advisory: 2 },
    regular: { warning: 40, watch: 20, advisory: 10 },
    extreme: { warning: 50, watch: 30, advisory: 15 }
  }

  const thresholds = snowThresholds[snowZone]

  if (hasSnowCode && wind >= kmhToMs(56) && visibility < 400) {
    alerts.push({
      type: 'blizzard',
      severity: 'warning',
      message: 'BLIZZARD WARNING! Life-threatening conditions. Do not travel.'
    })
  } else if (snowfall >= thresholds.warning) {
    alerts.push({
      type: 'heavy_snow',
      severity: 'warning',
      message: 'Heavy snow warning. Significant snow accumulation expected. Travel not recommended.'
    })
  } else if (snowfall >= thresholds.watch) {
    alerts.push({
      type: 'heavy_snow',
      severity: 'watch',
      message: 'Heavy snow watch. Snow accumulation possible. Prepare for winter conditions.'
    })
  } else if (snowfall >= thresholds.advisory) {
    alerts.push({
      type: 'winter_weather',
      severity: 'advisory',
      message: 'Winter weather advisory. Snow accumulation expected.'
    })
  }

  if (temp >= -2 && temp <= 2 && snowfall > 10) {
    alerts.push({
      type: 'wet_snow',
      severity: 'warning',
      message: 'Wet snow warning. Heavy, sticky snow expected. Power outages and tree damage possible.'
    })
  }

  if (hasFreezingRainCode && temp <= 0) {
    if (data.current.rain > 5 || data.current.precipitation > 5) {
      alerts.push({
        type: 'ice_storm',
        severity: 'warning',
        message: 'ICE STORM WARNING! Dangerous ice accumulation. Power outages possible. Stay indoors.'
      })
    } else {
      alerts.push({
        type: 'freezing_rain',
        severity: 'warning',
        message: 'Freezing rain warning. Icy conditions expected. Roads will be treacherous.'
      })
    }
  }

  return alerts
}

function checkThunderstormAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const hasThunderstorm = [95, 96, 99].includes(data.current.weather_code)
  const wind = data.current.wind_speed_10m
  const gusts = data.current.wind_gusts_10m
  const maxWind = Math.max(wind, gusts)

  if (hasThunderstorm && maxWind >= kmhToMs(80)) {
    alerts.push({
      type: 'severe_thunderstorm',
      severity: 'warning',
      message: 'SEVERE THUNDERSTORM WARNING! Damaging winds and heavy rain. Seek shelter immediately.'
    })
  } else if (hasThunderstorm && maxWind >= kmhToMs(50)) {
    alerts.push({
      type: 'thunderstorm',
      severity: 'watch',
      message: 'Thunderstorm watch. Strong winds, lightning and heavy rain possible.'
    })
  } else if (hasThunderstorm) {
    alerts.push({
      type: 'thunderstorm',
      severity: 'advisory',
      message: 'Thunderstorm advisory. Lightning and heavy rain possible.'
    })
  }

  if ([96, 99].includes(data.current.weather_code)) {
    alerts.push({
      type: 'hail',
      severity: 'warning',
      message: 'Hail warning. Large hail possible. Seek shelter and protect vehicles.'
    })
  }

  return alerts
}

function checkVisibilityAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const visibility = data.current.visibility
  const hasFog = [45, 48].includes(data.current.weather_code)

  if ((hasFog || visibility < 400) && visibility > 0) {
    alerts.push({
      type: 'extreme_fog',
      severity: 'warning',
      message: 'Extreme fog warning. Near-zero visibility. Avoid all travel if possible.'
    })
  } else if (hasFog || visibility < 1000) {
    alerts.push({
      type: 'dense_fog',
      severity: 'watch',
      message: 'Dense fog watch. Significantly reduced visibility. Drive with caution.'
    })
  } else if (visibility < 5000) {
    alerts.push({
      type: 'fog',
      severity: 'advisory',
      message: 'Fog advisory. Reduced visibility in some areas.'
    })
  }

  return alerts
}

function checkUVAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const maxUV = data.daily.uv_index_max

  if (maxUV >= 11) {
    alerts.push({
      type: 'high_uv',
      severity: 'watch',
      message: 'High UV watch. Extreme UV index. Minimize sun exposure and wear protection.'
    })
  } else if (maxUV >= 8) {
    alerts.push({
      type: 'high_uv',
      severity: 'advisory',
      message: 'High UV advisory. Very high UV index. Use sunscreen and seek shade.'
    })
  }

  return alerts
}

function checkRapidHeatChangeAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const hourlyTemps = data.hourly.temperature_2m
  const currentTemp = data.current.temperature_2m

  if (hourlyTemps.length < 12) return alerts

  const temps12h = hourlyTemps.slice(0, 12)
  const maxTemp12h = Math.max(currentTemp, ...temps12h)
  const minTemp12h = Math.min(currentTemp, ...temps12h)
  const change12h = Math.abs(maxTemp12h - minTemp12h)

  const temps24h = hourlyTemps
  const maxTemp24h = Math.max(currentTemp, ...temps24h)
  const minTemp24h = Math.min(currentTemp, ...temps24h)
  const change24h = Math.abs(maxTemp24h - minTemp24h)

  if (change12h >= 20) {
    alerts.push({
      type: 'rapid_temp_change',
      severity: 'warning',
      message: 'Rapid temperature change warning. Extreme temperature swing expected. Adjust clothing and plans accordingly.'
    })
  } else if (change24h >= 25) {
    alerts.push({
      type: 'rapid_temp_change',
      severity: 'watch',
      message: 'Rapid temperature change watch. Significant temperature swing expected over 24 hours.'
    })
  } else if (change24h >= 15) {
    alerts.push({
      type: 'rapid_temp_change',
      severity: 'advisory',
      message: 'Temperature change advisory. Notable temperature variation expected.'
    })
  }

  return alerts
}

function checkAirQualityAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = []

  if (!data.airQuality) return alerts

  const pm25 = data.airQuality.pm2_5
  const ozone = data.airQuality.ozone

  if (pm25 >= 150 || ozone >= 200) {
    alerts.push({
      type: 'air_quality',
      severity: 'warning',
      message: 'Air quality warning. Hazardous air quality. Avoid outdoor activities and stay indoors.'
    })
  } else if (pm25 >= 55 || ozone >= 150) {
    alerts.push({
      type: 'air_quality',
      severity: 'watch',
      message: 'Air quality watch. Unhealthy air quality. Limit outdoor activities, especially for sensitive groups.'
    })
  } else if (pm25 >= 35 || ozone >= 100) {
    alerts.push({
      type: 'air_quality',
      severity: 'advisory',
      message: 'Air quality advisory. Moderate air quality. Sensitive individuals should limit prolonged outdoor exertion.'
    })
  }

  return alerts
}

export function detectWeatherAlerts(data: WeatherData): WeatherAlert[] {
  const allAlerts: WeatherAlert[] = []

  allAlerts.push(...checkWindAlerts(data))
  allAlerts.push(...checkTemperatureAlerts(data))
  allAlerts.push(...checkWindChillAlerts(data))
  allAlerts.push(...checkPrecipitationAlerts(data))
  allAlerts.push(...checkWinterWeatherAlerts(data))
  allAlerts.push(...checkThunderstormAlerts(data))
  allAlerts.push(...checkVisibilityAlerts(data))
  allAlerts.push(...checkUVAlerts(data))
  allAlerts.push(...checkRapidHeatChangeAlerts(data))
  allAlerts.push(...checkAirQualityAlerts(data))

  return allAlerts
}

export function getAlertColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'warning':
      return 'bg-red-600/90'
    case 'watch':
      return 'bg-orange-500/90'
    case 'advisory':
      return 'bg-yellow-500/90'
  }
}

export function getHighestSeverity(alerts: WeatherAlert[]): AlertSeverity | null {
  if (alerts.length === 0) return null

  const severityOrder: AlertSeverity[] = ['warning', 'watch', 'advisory']
  for (const severity of severityOrder) {
    if (alerts.some(alert => alert.severity === severity)) {
      return severity
    }
  }

  return null
}

export type AlertLevel = 'none' | 'warnings-only' | 'watch-and-warnings' | 'all'

export function filterAlertsByLevel(alerts: WeatherAlert[], level: AlertLevel): WeatherAlert[] {
  if (level === 'none') return []
  if (level === 'all') return alerts

  if (level === 'warnings-only') {
    return alerts.filter(alert => alert.severity === 'warning')
  }

  if (level === 'watch-and-warnings') {
    return alerts.filter(alert => alert.severity === 'warning' || alert.severity === 'watch')
  }

  return alerts
}
