import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  getWeatherIcon,
  getPrecipitationIcon,
  getWindBeaufortIcon,
  getWeatherDescription,
  getBeaufortDescription,
  createCacheKey,
  getCachedWeather,
  setCachedWeather,
  clearWeatherCache,
  fetchCurrentWeather,
} from '@/features/widgets/services/weather-api'
import type { CurrentWeather } from '@/features/widgets/services/weather-api'

describe('weather-api', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('formatTemperature', () => {
    it('should format celsius temperature', () => {
      expect(formatTemperature(22.5, 'celsius')).toBe('23°C')
      expect(formatTemperature(22.4, 'celsius')).toBe('22°C')
      expect(formatTemperature(-5.5, 'celsius')).toBe('-5°C')
    })

    it('should format fahrenheit temperature', () => {
      expect(formatTemperature(72.5, 'fahrenheit')).toBe('73°F')
      expect(formatTemperature(32.0, 'fahrenheit')).toBe('32°F')
    })

    it('should format kelvin temperature', () => {
      expect(formatTemperature(295.5, 'kelvin')).toBe('296K')
      expect(formatTemperature(273.15, 'kelvin')).toBe('273K')
    })
  })

  describe('formatWindSpeed', () => {
    it('should format m/s with "wind" suffix', () => {
      expect(formatWindSpeed(15.3, 'ms')).toBe('15 m/s wind')
      expect(formatWindSpeed(5.7, 'ms')).toBe('6 m/s wind')
    })

    it('should format km/h with "wind" suffix', () => {
      expect(formatWindSpeed(55.0, 'kmh')).toBe('55 km/h wind')
    })

    it('should format mph with "wind" suffix', () => {
      expect(formatWindSpeed(34.2, 'mph')).toBe('34 mph wind')
    })

    it('should format knots with "wind" suffix', () => {
      expect(formatWindSpeed(20.5, 'knots')).toBe('21 kts wind')
    })

    it('should format Beaufort scale with "wind force" suffix', () => {
      expect(formatWindSpeed(0.3, 'beaufort')).toBe('0 Bft wind force') // Calm
      expect(formatWindSpeed(5.0, 'beaufort')).toBe('3 Bft wind force') // Gentle breeze
      expect(formatWindSpeed(35.0, 'beaufort')).toBe('12 Bft wind force') // Hurricane
    })
  })

  describe('formatPrecipitation', () => {
    it('should format precipitation probability as "xx% rain"', () => {
      expect(formatPrecipitation(30, 1.2, 'mm')).toBe('30% rain')
      expect(formatPrecipitation(75, 5.0, 'mm')).toBe('75% rain')
      expect(formatPrecipitation(0, 0, 'mm')).toBe('0% rain')
    })

    it('should handle null/undefined probability', () => {
      expect(formatPrecipitation(null as any, 0, 'mm')).toBe('0% rain')
      expect(formatPrecipitation(undefined as any, 0, 'mm')).toBe('0% rain')
    })

    it('should ignore amount and unit parameters', () => {
      expect(formatPrecipitation(50, 10.5, 'inch')).toBe('50% rain')
    })
  })

  describe('getPrecipitationIcon', () => {
    it('should return snowflake for snow', () => {
      const weather: CurrentWeather = {
        temperature_2m: -2,
        apparent_temperature: -5,
        wind_speed_10m: 10,
        precipitation_probability: 80,
        precipitation: 5,
        rain: 0,
        showers: 0,
        snowfall: 3,
        cloud_cover: 90,
        is_day: 1,
        weather_code: 71,
      }
      expect(getPrecipitationIcon(weather)).toBe('snowflake')
    })

    it('should return raindrops for heavy rain', () => {
      const weather: CurrentWeather = {
        temperature_2m: 15,
        apparent_temperature: 14,
        wind_speed_10m: 10,
        precipitation_probability: 90,
        precipitation: 8,
        rain: 8,
        showers: 0,
        snowfall: 0,
        cloud_cover: 95,
        is_day: 1,
        weather_code: 61,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrops')
    })

    it('should return raindrops for heavy showers', () => {
      const weather: CurrentWeather = {
        temperature_2m: 18,
        apparent_temperature: 17,
        wind_speed_10m: 12,
        precipitation_probability: 85,
        precipitation: 10,
        rain: 0,
        showers: 10,
        snowfall: 0,
        cloud_cover: 80,
        is_day: 1,
        weather_code: 80,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrops')
    })

    it('should return raindrop for drizzle', () => {
      const weather: CurrentWeather = {
        temperature_2m: 16,
        apparent_temperature: 15,
        wind_speed_10m: 8,
        precipitation_probability: 40,
        precipitation: 1,
        rain: 1,
        showers: 0,
        snowfall: 0,
        cloud_cover: 60,
        is_day: 1,
        weather_code: 51,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrop')
    })

    it('should return raindrop for no rain', () => {
      const weather: CurrentWeather = {
        temperature_2m: 20,
        apparent_temperature: 19,
        wind_speed_10m: 5,
        precipitation_probability: 10,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 20,
        is_day: 1,
        weather_code: 0,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrop')
    })
  })

  describe('getWindBeaufortIcon', () => {
    it('should return correct Beaufort icon for m/s', () => {
      expect(getWindBeaufortIcon(0.3, 'ms')).toBe('wind-beaufort-0') // Calm
      expect(getWindBeaufortIcon(1.5, 'ms')).toBe('wind-beaufort-1') // Light air
      expect(getWindBeaufortIcon(3.0, 'ms')).toBe('wind-beaufort-2') // Light breeze
      expect(getWindBeaufortIcon(5.0, 'ms')).toBe('wind-beaufort-3') // Gentle breeze
      expect(getWindBeaufortIcon(10.0, 'ms')).toBe('wind-beaufort-5') // Fresh breeze
      expect(getWindBeaufortIcon(30.0, 'ms')).toBe('wind-beaufort-11') // Violent storm
      expect(getWindBeaufortIcon(35.0, 'ms')).toBe('wind-beaufort-12') // Hurricane
    })

    it('should convert km/h to m/s for Beaufort scale', () => {
      expect(getWindBeaufortIcon(18.0, 'kmh')).toBe('wind-beaufort-3') // 18/3.6 = 5 m/s = Gentle breeze
      expect(getWindBeaufortIcon(36.0, 'kmh')).toBe('wind-beaufort-5') // 36/3.6 = 10 m/s = Fresh breeze
    })

    it('should convert mph to m/s for Beaufort scale', () => {
      expect(getWindBeaufortIcon(11.2, 'mph')).toBe('wind-beaufort-3') // 11.2/2.237 = 5 m/s = Gentle breeze
      expect(getWindBeaufortIcon(22.4, 'mph')).toBe('wind-beaufort-5') // 22.4/2.237 = 10 m/s = Fresh breeze
    })

    it('should convert knots to m/s for Beaufort scale', () => {
      expect(getWindBeaufortIcon(9.7, 'knots')).toBe('wind-beaufort-3') // 9.7/1.944 = 5 m/s = Gentle breeze
      expect(getWindBeaufortIcon(19.4, 'knots')).toBe('wind-beaufort-5') // 19.4/1.944 = 10 m/s = Fresh breeze
    })

    it('should use Beaufort value directly when unit is beaufort', () => {
      expect(getWindBeaufortIcon(0, 'beaufort')).toBe('wind-beaufort-0')
      expect(getWindBeaufortIcon(6, 'beaufort')).toBe('wind-beaufort-6')
      expect(getWindBeaufortIcon(12, 'beaufort')).toBe('wind-beaufort-12')
    })
  })

  describe('getWeatherDescription', () => {
    it('should return "Sunny" for clear day', () => {
      const weather: CurrentWeather = {
        temperature_2m: 22,
        apparent_temperature: 20,
        wind_speed_10m: 5,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 0,
        is_day: 1,
        weather_code: 0,
      }
      expect(getWeatherDescription(weather)).toBe('Sunny')
    })

    it('should return "Clear night" for clear night', () => {
      const weather: CurrentWeather = {
        temperature_2m: 15,
        apparent_temperature: 13,
        wind_speed_10m: 5,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 0,
        is_day: 0,
        weather_code: 0,
      }
      expect(getWeatherDescription(weather)).toBe('Clear night')
    })

    it('should return "Rainy" for rain', () => {
      const weather: CurrentWeather = {
        temperature_2m: 16,
        apparent_temperature: 14,
        wind_speed_10m: 10,
        precipitation_probability: 80,
        precipitation: 5,
        rain: 5,
        showers: 0,
        snowfall: 0,
        cloud_cover: 95,
        is_day: 1,
        weather_code: 61,
      }
      expect(getWeatherDescription(weather)).toBe('Rainy')
    })

    it('should return "Snowy" for snow', () => {
      const weather: CurrentWeather = {
        temperature_2m: -3,
        apparent_temperature: -6,
        wind_speed_10m: 15,
        precipitation_probability: 90,
        precipitation: 8,
        rain: 0,
        showers: 0,
        snowfall: 8,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 71,
      }
      expect(getWeatherDescription(weather)).toBe('Snowy')
    })

    it('should return "Thunderstorm" for thunderstorm', () => {
      const weather: CurrentWeather = {
        temperature_2m: 20,
        apparent_temperature: 18,
        wind_speed_10m: 25,
        precipitation_probability: 95,
        precipitation: 15,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 95,
      }
      expect(getWeatherDescription(weather)).toBe('Thunderstorm')
    })

    it('should return "Foggy" for fog', () => {
      const weather: CurrentWeather = {
        temperature_2m: 12,
        apparent_temperature: 11,
        wind_speed_10m: 3,
        precipitation_probability: 5,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 45,
      }
      expect(getWeatherDescription(weather)).toBe('Foggy')
    })
  })

  describe('getBeaufortDescription', () => {
    it('should return correct descriptions for Beaufort scale', () => {
      expect(getBeaufortDescription(0.3)).toBe('Calm')
      expect(getBeaufortDescription(1.0)).toBe('Light air')
      expect(getBeaufortDescription(2.5)).toBe('Light breeze')
      expect(getBeaufortDescription(4.5)).toBe('Gentle breeze')
      expect(getBeaufortDescription(6.5)).toBe('Moderate breeze')
      expect(getBeaufortDescription(9.5)).toBe('Fresh breeze')
      expect(getBeaufortDescription(12.0)).toBe('Strong breeze')
      expect(getBeaufortDescription(15.5)).toBe('Near gale')
      expect(getBeaufortDescription(19.0)).toBe('Gale')
      expect(getBeaufortDescription(22.5)).toBe('Strong gale')
      expect(getBeaufortDescription(26.5)).toBe('Storm')
      expect(getBeaufortDescription(30.5)).toBe('Violent storm')
      expect(getBeaufortDescription(35.0)).toBe('Hurricane force')
    })
  })

  describe('getWeatherIcon', () => {
    it('should return clear-day for clear day conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 20,
        apparent_temperature: 19,
        wind_speed_10m: 5,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 5,
        is_day: 1,
        weather_code: 0,
      }
      expect(getWeatherIcon(weather)).toBe('clear-day')
    })

    it('should return clear-night for clear night conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 12,
        apparent_temperature: 10,
        wind_speed_10m: 3,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 5,
        is_day: 0,
        weather_code: 0,
      }
      expect(getWeatherIcon(weather)).toBe('clear-night')
    })

    it('should return rain for rainy conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 15,
        apparent_temperature: 13,
        wind_speed_10m: 12,
        precipitation_probability: 80,
        precipitation: 5,
        rain: 5,
        showers: 0,
        snowfall: 0,
        cloud_cover: 90,
        is_day: 1,
        weather_code: 61,
      }
      expect(getWeatherIcon(weather)).toBe('rain')
    })

    it('should return snow for snowy conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: -2,
        apparent_temperature: -5,
        wind_speed_10m: 10,
        precipitation_probability: 85,
        precipitation: 8,
        rain: 0,
        showers: 0,
        snowfall: 8,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 71,
      }
      expect(getWeatherIcon(weather)).toBe('snow')
    })

    it('should return partly-cloudy-day for partly cloudy day', () => {
      const weather: CurrentWeather = {
        temperature_2m: 18,
        apparent_temperature: 17,
        wind_speed_10m: 8,
        precipitation_probability: 20,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 40,
        is_day: 1,
        weather_code: 2,
      }
      expect(getWeatherIcon(weather)).toBe('partly-cloudy-day')
    })

    it('should return cloudy for cloudy conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 16,
        apparent_temperature: 15,
        wind_speed_10m: 10,
        precipitation_probability: 30,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        cloud_cover: 70,
        is_day: 1,
        weather_code: 3,
      }
      expect(getWeatherIcon(weather)).toBe('cloudy')
    })
  })

  describe('Cache functions', () => {
    it('should create correct cache key', () => {
      expect(createCacheKey(51.5074, -0.1278)).toBe('wx:cache:51.507,-0.128')
      expect(createCacheKey(40.7128, -74.006)).toBe('wx:cache:40.713,-74.006')
    })

    it('should set and get cached weather data', () => {
      const key = 'wx:cache:51.507,-0.128'
      const data = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
        },
        daily: {
          temperature_2m_max: 25,
          temperature_2m_min: 18,
        },
      }

      setCachedWeather(key, data)
      const retrieved = getCachedWeather(key)

      expect(retrieved).toEqual(data)
    })

    it('should return null for expired cache', () => {
      const key = 'wx:cache:51.507,-0.128'
      const expiredData = {
        t: Date.now() - 20 * 60 * 1000, // 20 minutes ago (expired)
        data: {
          current: {
            temperature_2m: 22,
            apparent_temperature: 20,
            wind_speed_10m: 10,
            precipitation_probability: 30,
            precipitation: 1,
            rain: 1,
            showers: 0,
            snowfall: 0,
            cloud_cover: 40,
            is_day: 1,
            weather_code: 0,
          },
          daily: {
            temperature_2m_max: 25,
            temperature_2m_min: 18,
          },
        },
      }

      localStorage.setItem(key, JSON.stringify(expiredData))
      const retrieved = getCachedWeather(key)

      expect(retrieved).toBeNull()
    })

    it('should return null for non-existent cache', () => {
      const retrieved = getCachedWeather('wx:cache:0.000,0.000')
      expect(retrieved).toBeNull()
    })

    it('should clear cached weather data', () => {
      const key = 'wx:cache:51.507,-0.128'
      const data = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
        },
        daily: {
          temperature_2m_max: 25,
          temperature_2m_min: 18,
        },
      }

      setCachedWeather(key, data)
      clearWeatherCache(key)
      const retrieved = getCachedWeather(key)

      expect(retrieved).toBeNull()
    })

    it('should handle invalid cache data gracefully', () => {
      const key = 'wx:cache:51.507,-0.128'
      localStorage.setItem(key, 'invalid json')

      const retrieved = getCachedWeather(key)
      expect(retrieved).toBeNull()
    })

    it('should remove cache with missing data structure', () => {
      const key = 'wx:cache:51.507,-0.128'
      const invalidData = {
        t: Date.now(),
        data: { current: null }, // Missing daily
      }

      localStorage.setItem(key, JSON.stringify(invalidData))
      const retrieved = getCachedWeather(key)

      expect(retrieved).toBeNull()
      expect(localStorage.getItem(key)).toBeNull()
    })
  })

  describe('fetchCurrentWeather', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('should fetch weather data with correct parameters', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
        },
        daily: {
          temperature_2m_max: [25],
          temperature_2m_min: [18],
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const units = {
        temperature: 'celsius' as const,
        windSpeed: 'ms' as const,
        precipitation: 'mm' as const,
      }

      const result = await fetchCurrentWeather(51.5074, -0.1278, units)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=51.5074')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('longitude=-0.1278')
      )
      expect(result.current.temperature_2m).toBe(22)
      expect(result.daily.temperature_2m_max).toBe(25)
      expect(result.daily.temperature_2m_min).toBe(18)
    })

    it('should convert to Kelvin when requested', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
        },
        daily: {
          temperature_2m_max: [25],
          temperature_2m_min: [18],
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const units = {
        temperature: 'kelvin' as const,
        windSpeed: 'ms' as const,
        precipitation: 'mm' as const,
      }

      const result = await fetchCurrentWeather(51.5074, -0.1278, units)

      expect(result.current.temperature_2m).toBe(22 + 273.15)
      expect(result.current.apparent_temperature).toBe(20 + 273.15)
      expect(result.daily.temperature_2m_max).toBe(25 + 273.15)
      expect(result.daily.temperature_2m_min).toBe(18 + 273.15)
    })

    it('should convert to Beaufort scale when requested', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10, // ~5 on Beaufort scale
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
        },
        daily: {
          temperature_2m_max: [25],
          temperature_2m_min: [18],
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const units = {
        temperature: 'celsius' as const,
        windSpeed: 'beaufort' as const,
        precipitation: 'mm' as const,
      }

      const result = await fetchCurrentWeather(51.5074, -0.1278, units)

      expect(result.current.wind_speed_10m).toBe(5) // Beaufort 5
    })

    it('should convert to knots when requested', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10, // m/s
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
        },
        daily: {
          temperature_2m_max: [25],
          temperature_2m_min: [18],
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const units = {
        temperature: 'celsius' as const,
        windSpeed: 'knots' as const,
        precipitation: 'mm' as const,
      }

      const result = await fetchCurrentWeather(51.5074, -0.1278, units)

      expect(result.current.wind_speed_10m).toBeCloseTo(10 * 0.539957, 2)
    })
  })
})
