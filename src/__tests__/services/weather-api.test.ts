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
    it('should format celsius temperature (input is always celsius)', () => {
      expect(formatTemperature(22.5, 'celsius')).toBe('23°C')
      expect(formatTemperature(22.4, 'celsius')).toBe('22°C')
      expect(formatTemperature(-5.5, 'celsius')).toBe('-5°C')
    })

    it('should convert celsius to fahrenheit for display', () => {
      expect(formatTemperature(22, 'fahrenheit')).toBe('72°F') // 22°C = 71.6°F ≈ 72°F
      expect(formatTemperature(0, 'fahrenheit')).toBe('32°F')
      expect(formatTemperature(100, 'fahrenheit')).toBe('212°F')
    })

    it('should convert celsius to kelvin for display', () => {
      expect(formatTemperature(22, 'kelvin')).toBe('295K') // 22°C + 273.15 = 295.15K ≈ 295K
      expect(formatTemperature(0, 'kelvin')).toBe('273K')
      expect(formatTemperature(-273.15, 'kelvin')).toBe('0K')
    })
  })

  describe('formatWindSpeed', () => {
    it('should format m/s with "wind" suffix (input is always m/s)', () => {
      expect(formatWindSpeed(15.3, 'ms')).toBe('15 m/s wind')
      expect(formatWindSpeed(5.7, 'ms')).toBe('6 m/s wind')
    })

    it('should convert m/s to km/h for display', () => {
      expect(formatWindSpeed(10, 'kmh')).toBe('36 km/h wind') // 10 m/s × 3.6 = 36 km/h
      expect(formatWindSpeed(5, 'kmh')).toBe('18 km/h wind')
    })

    it('should convert m/s to mph for display', () => {
      expect(formatWindSpeed(10, 'mph')).toBe('22 mph wind') // 10 m/s × 2.237 ≈ 22 mph
      expect(formatWindSpeed(5, 'mph')).toBe('11 mph wind')
    })

    it('should convert m/s to knots for display', () => {
      expect(formatWindSpeed(10, 'knots')).toBe('19 kts wind') // 10 m/s × 1.944 ≈ 19 knots
      expect(formatWindSpeed(5, 'knots')).toBe('10 kts wind')
    })

    it('should convert m/s to ft/s for display', () => {
      expect(formatWindSpeed(10, 'fts')).toBe('33 ft/s wind') // 10 m/s × 3.281 ≈ 33 ft/s
      expect(formatWindSpeed(5, 'fts')).toBe('16 ft/s wind')
    })

    it('should convert m/s to Beaufort scale for display', () => {
      expect(formatWindSpeed(0.3, 'beaufort')).toBe('0 Bft wind force') // Calm
      expect(formatWindSpeed(5.0, 'beaufort')).toBe('3 Bft wind force') // Gentle breeze
      expect(formatWindSpeed(35.0, 'beaufort')).toBe('12 Bft wind force') // Hurricane
    })
  })

  describe('formatPrecipitation', () => {
    it('should format precipitation with probability and amount in mm', () => {
      expect(formatPrecipitation(30, 1.2, 'mm')).toBe('30% rain, 1.2mm')
      expect(formatPrecipitation(75, 5.0, 'mm')).toBe('75% rain, 5.0mm')
      expect(formatPrecipitation(0, 0, 'mm')).toBe('0% rain, 0.0mm')
    })

    it('should convert mm to inches for display', () => {
      expect(formatPrecipitation(50, 25.4, 'inch')).toBe('50% rain, 1.0"') // 25.4mm = 1 inch
      expect(formatPrecipitation(75, 50.8, 'inch')).toBe('75% rain, 2.0"') // 50.8mm = 2 inches
    })

    it('should handle null/undefined probability', () => {
      expect(formatPrecipitation(null as any, 0, 'mm')).toBe('0% rain, 0.0mm')
      expect(formatPrecipitation(undefined as any, 0, 'mm')).toBe('0% rain, 0.0mm')
    })
  })

  describe('getPrecipitationIcon', () => {
    it('should return snowflake for snow', () => {
      const weather: CurrentWeather = {
        temperature_2m: -2,
        apparent_temperature: -5,
        wind_speed_10m: 10,
        wind_gusts_10m: 15,
        precipitation_probability: 80,
        precipitation: 5,
        rain: 0,
        showers: 0,
        snowfall: 3,
        visibility: 5000,
        cloud_cover: 90,
        is_day: 1,
        weather_code: 71,
        relative_humidity_2m: 85,
        surface_pressure: 1013,
      }
      expect(getPrecipitationIcon(weather)).toBe('snowflake')
    })

    it('should return raindrops for heavy rain', () => {
      const weather: CurrentWeather = {
        temperature_2m: 15,
        apparent_temperature: 14,
        wind_speed_10m: 10,
        wind_gusts_10m: 14,
        precipitation_probability: 90,
        precipitation: 8,
        rain: 8,
        showers: 0,
        snowfall: 0,
        visibility: 5000,
        cloud_cover: 95,
        is_day: 1,
        weather_code: 61,
        relative_humidity_2m: 90,
        surface_pressure: 1010,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrops')
    })

    it('should return raindrops for heavy showers', () => {
      const weather: CurrentWeather = {
        temperature_2m: 18,
        apparent_temperature: 17,
        wind_speed_10m: 12,
        wind_gusts_10m: 16,
        precipitation_probability: 85,
        precipitation: 10,
        rain: 0,
        showers: 10,
        snowfall: 0,
        visibility: 5000,
        cloud_cover: 80,
        is_day: 1,
        weather_code: 80,
        relative_humidity_2m: 85,
        surface_pressure: 1011,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrops')
    })

    it('should return raindrop for drizzle', () => {
      const weather: CurrentWeather = {
        temperature_2m: 16,
        apparent_temperature: 15,
        wind_speed_10m: 8,
        wind_gusts_10m: 11,
        precipitation_probability: 40,
        precipitation: 1,
        rain: 1,
        showers: 0,
        snowfall: 0,
        visibility: 8000,
        cloud_cover: 60,
        is_day: 1,
        weather_code: 51,
        relative_humidity_2m: 75,
        surface_pressure: 1015,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrop')
    })

    it('should return raindrop for no rain', () => {
      const weather: CurrentWeather = {
        temperature_2m: 20,
        apparent_temperature: 19,
        wind_speed_10m: 5,
        wind_gusts_10m: 7,
        precipitation_probability: 10,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 20,
        is_day: 1,
        weather_code: 0,
        relative_humidity_2m: 60,
        surface_pressure: 1020,
      }
      expect(getPrecipitationIcon(weather)).toBe('raindrop')
    })
  })

  describe('getWindBeaufortIcon', () => {
    it('should convert m/s to correct Beaufort icon (input always in m/s)', () => {
      expect(getWindBeaufortIcon(0.3, 'ms')).toBe('wind-beaufort-0') // Calm
      expect(getWindBeaufortIcon(1.5, 'ms')).toBe('wind-beaufort-1') // Light air
      expect(getWindBeaufortIcon(3.0, 'ms')).toBe('wind-beaufort-2') // Light breeze
      expect(getWindBeaufortIcon(5.0, 'ms')).toBe('wind-beaufort-3') // Gentle breeze
      expect(getWindBeaufortIcon(10.0, 'ms')).toBe('wind-beaufort-5') // Fresh breeze
      expect(getWindBeaufortIcon(15.3, 'ms')).toBe('wind-beaufort-7') // Near gale
      expect(getWindBeaufortIcon(30.0, 'ms')).toBe('wind-beaufort-11') // Violent storm
      expect(getWindBeaufortIcon(35.0, 'ms')).toBe('wind-beaufort-12') // Hurricane
    })

    it('should work regardless of unit parameter (input is always m/s)', () => {
      // The unit parameter doesn't affect the calculation anymore - input is always m/s
      expect(getWindBeaufortIcon(5.0, 'kmh')).toBe('wind-beaufort-3')
      expect(getWindBeaufortIcon(5.0, 'mph')).toBe('wind-beaufort-3')
      expect(getWindBeaufortIcon(5.0, 'beaufort')).toBe('wind-beaufort-3')
      expect(getWindBeaufortIcon(15.3, 'beaufort')).toBe('wind-beaufort-7')
    })
  })

  describe('getWeatherDescription', () => {
    it('should return "Sunny" for clear day', () => {
      const weather: CurrentWeather = {
        temperature_2m: 22,
        apparent_temperature: 20,
        wind_speed_10m: 5,
        wind_gusts_10m: 7,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 0,
        is_day: 1,
        weather_code: 0,
        relative_humidity_2m: 55,
        surface_pressure: 1018,
      }
      expect(getWeatherDescription(weather)).toBe('Sunny')
    })

    it('should return "Clear night" for clear night', () => {
      const weather: CurrentWeather = {
        temperature_2m: 15,
        apparent_temperature: 13,
        wind_speed_10m: 5,
        wind_gusts_10m: 7,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 0,
        is_day: 0,
        weather_code: 0,
        relative_humidity_2m: 70,
        surface_pressure: 1019,
      }
      expect(getWeatherDescription(weather)).toBe('Clear night')
    })

    it('should return "Rainy" for rain', () => {
      const weather: CurrentWeather = {
        temperature_2m: 16,
        apparent_temperature: 14,
        wind_speed_10m: 10,
        wind_gusts_10m: 14,
        precipitation_probability: 80,
        precipitation: 5,
        rain: 5,
        showers: 0,
        snowfall: 0,
        visibility: 5000,
        cloud_cover: 95,
        is_day: 1,
        weather_code: 61,
        relative_humidity_2m: 90,
        surface_pressure: 1010,
      }
      expect(getWeatherDescription(weather)).toBe('Rainy')
    })

    it('should return "Snowy" for snow', () => {
      const weather: CurrentWeather = {
        temperature_2m: -3,
        apparent_temperature: -6,
        wind_speed_10m: 15,
        wind_gusts_10m: 20,
        precipitation_probability: 90,
        precipitation: 8,
        rain: 0,
        showers: 0,
        snowfall: 8,
        visibility: 3000,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 71,
        relative_humidity_2m: 95,
        surface_pressure: 1005,
      }
      expect(getWeatherDescription(weather)).toBe('Snowy')
    })

    it('should return "Thunderstorm" for thunderstorm', () => {
      const weather: CurrentWeather = {
        temperature_2m: 20,
        apparent_temperature: 18,
        wind_speed_10m: 25,
        wind_gusts_10m: 35,
        precipitation_probability: 95,
        precipitation: 15,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 4000,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 95,
        relative_humidity_2m: 95,
        surface_pressure: 1008,
      }
      expect(getWeatherDescription(weather)).toBe('Thunderstorm')
    })

    it('should return "Foggy" for fog', () => {
      const weather: CurrentWeather = {
        temperature_2m: 12,
        apparent_temperature: 11,
        wind_speed_10m: 3,
        wind_gusts_10m: 4,
        precipitation_probability: 5,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 2000,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 45,
        relative_humidity_2m: 98,
        surface_pressure: 1016,
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
        wind_gusts_10m: 7,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 5,
        is_day: 1,
        weather_code: 0,
        relative_humidity_2m: 60,
        surface_pressure: 1018,
      }
      expect(getWeatherIcon(weather)).toBe('clear-day')
    })

    it('should return clear-night for clear night conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 12,
        apparent_temperature: 10,
        wind_speed_10m: 3,
        wind_gusts_10m: 4,
        precipitation_probability: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 5,
        is_day: 0,
        weather_code: 0,
        relative_humidity_2m: 75,
        surface_pressure: 1019,
      }
      expect(getWeatherIcon(weather)).toBe('clear-night')
    })

    it('should return rain for rainy conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 15,
        apparent_temperature: 13,
        wind_speed_10m: 12,
        wind_gusts_10m: 16,
        precipitation_probability: 80,
        precipitation: 5,
        rain: 5,
        showers: 0,
        snowfall: 0,
        visibility: 5000,
        cloud_cover: 90,
        is_day: 1,
        weather_code: 61,
        relative_humidity_2m: 90,
        surface_pressure: 1010,
      }
      expect(getWeatherIcon(weather)).toBe('rain')
    })

    it('should return snow for snowy conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: -2,
        apparent_temperature: -5,
        wind_speed_10m: 10,
        wind_gusts_10m: 14,
        precipitation_probability: 85,
        precipitation: 8,
        rain: 0,
        showers: 0,
        snowfall: 8,
        visibility: 3000,
        cloud_cover: 100,
        is_day: 1,
        weather_code: 71,
        relative_humidity_2m: 90,
        surface_pressure: 1010,
      }
      expect(getWeatherIcon(weather)).toBe('snow')
    })

    it('should return partly-cloudy-day for partly cloudy day', () => {
      const weather: CurrentWeather = {
        temperature_2m: 18,
        apparent_temperature: 17,
        wind_speed_10m: 8,
        wind_gusts_10m: 11,
        precipitation_probability: 20,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 40,
        is_day: 1,
        weather_code: 2,
        relative_humidity_2m: 65,
        surface_pressure: 1016,
      }
      expect(getWeatherIcon(weather)).toBe('partly-cloudy-day')
    })

    it('should return cloudy for cloudy conditions', () => {
      const weather: CurrentWeather = {
        temperature_2m: 16,
        apparent_temperature: 15,
        wind_speed_10m: 10,
        wind_gusts_10m: 14,
        precipitation_probability: 30,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        visibility: 10000,
        cloud_cover: 70,
        is_day: 1,
        weather_code: 3,
        relative_humidity_2m: 70,
        surface_pressure: 1014,
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
          wind_gusts_10m: 14,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          visibility: 10000,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
          relative_humidity_2m: 65,
          surface_pressure: 1015,
        },
        hourly: {
          temperature_2m: [22],
          apparent_temperature: [20],
          precipitation_probability: [30],
          precipitation: [1],
          weather_code: [0],
          uv_index: [6],
          wind_speed_10m: [10],
          wind_gusts_10m: [14],
        },
        daily: {
          temperature_2m_max: 25,
          temperature_2m_min: 18,
        },
        airQuality: null,
        latitude: 51.507,
        longitude: -0.128,
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
            wind_gusts_10m: 14,
            precipitation_probability: 30,
            precipitation: 1,
            rain: 1,
            showers: 0,
            snowfall: 0,
            visibility: 10000,
            cloud_cover: 40,
            is_day: 1,
            weather_code: 0,
            relative_humidity_2m: 65,
            surface_pressure: 1015,
          },
          hourly: {
            temperature_2m: [22],
            apparent_temperature: [20],
            precipitation_probability: [30],
            precipitation: [1],
            weather_code: [0],
            uv_index: [6],
            wind_speed_10m: [10],
            wind_gusts_10m: [14],
          },
          daily: {
            temperature_2m_max: 25,
            temperature_2m_min: 18,
          },
          airQuality: null,
          latitude: 51.507,
          longitude: -0.128,
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
          wind_gusts_10m: 14,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          visibility: 10000,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
          relative_humidity_2m: 65,
          surface_pressure: 1015,
        },
        hourly: {
          temperature_2m: [22],
          apparent_temperature: [20],
          precipitation_probability: [30],
          precipitation: [1],
          weather_code: [0],
          uv_index: [6],
          wind_speed_10m: [10],
          wind_gusts_10m: [14],
        },
        daily: {
          temperature_2m_max: 25,
          temperature_2m_min: 18,
        },
        airQuality: null,
        latitude: 51.507,
        longitude: -0.128,
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

    it('should fetch weather data in standard units (Celsius, m/s, mm)', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10,
          wind_gusts_10m: 14,
          wind_direction_10m: 180,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          visibility: 10000,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
          relative_humidity_2m: 65,
          surface_pressure: 1015,
        },
        hourly: {
          temperature_2m: [22, 23, 24],
          apparent_temperature: [20, 21, 22],
          precipitation_probability: [30, 35, 40],
          precipitation: [1, 1.5, 2],
          weather_code: [0, 1, 2],
          uv_index: [6, 7, 6],
          wind_speed_10m: [10, 11, 12],
          wind_gusts_10m: [14, 15, 16],
        },
        daily: {
          temperature_2m_max: [25],
          temperature_2m_min: [18],
          apparent_temperature_max: [23],
          apparent_temperature_min: [16],
          precipitation_sum: [2],
          precipitation_hours: [3],
          weather_code: [0],
          wind_speed_10m_max: [15],
          wind_gusts_10m_max: [20],
          uv_index_max: [7],
          sunrise: ['2024-01-01T07:00:00'],
          sunset: ['2024-01-01T17:00:00'],
        },
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      // Also mock air quality API call
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

      const result = await fetchCurrentWeather(51.5074, -0.1278)

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=51.5074')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('longitude=-0.1278')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('temperature_unit=celsius')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('wind_speed_unit=ms')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('precipitation_unit=mm')
      )

      // Verify data is returned in standard units without conversion
      expect(result.current.temperature_2m).toBe(22) // Celsius
      expect(result.current.wind_speed_10m).toBe(10) // m/s
      expect(result.daily.temperature_2m_max).toBe(25) // Celsius
      expect(result.daily.temperature_2m_min).toBe(18) // Celsius
      expect(result.daily.precipitation_sum).toBe(2) // mm
      expect(result.latitude).toBe(51.5074)
      expect(result.longitude).toBe(-0.1278)
    })

    it('should fetch and include air quality data when available', async () => {
      const mockWeatherResponse = {
        current: {
          temperature_2m: 22,
          apparent_temperature: 20,
          wind_speed_10m: 10,
          wind_gusts_10m: 14,
          wind_direction_10m: 180,
          precipitation_probability: 30,
          precipitation: 1,
          rain: 1,
          showers: 0,
          snowfall: 0,
          visibility: 10000,
          cloud_cover: 40,
          is_day: 1,
          weather_code: 0,
          relative_humidity_2m: 65,
          surface_pressure: 1015,
        },
        hourly: {
          temperature_2m: [22],
          apparent_temperature: [20],
          precipitation_probability: [30],
          precipitation: [1],
          weather_code: [0],
          uv_index: [6],
          wind_speed_10m: [10],
          wind_gusts_10m: [14],
        },
        daily: {
          temperature_2m_max: [25],
          temperature_2m_min: [18],
          apparent_temperature_max: [23],
          apparent_temperature_min: [16],
          precipitation_sum: [2],
          precipitation_hours: [3],
          weather_code: [0],
          wind_speed_10m_max: [15],
          wind_gusts_10m_max: [20],
          uv_index_max: [7],
          sunrise: ['2024-01-01T07:00:00'],
          sunset: ['2024-01-01T17:00:00'],
        },
      }

      const mockAirQualityResponse = {
        current: {
          pm2_5: 35,
          european_aqi_pm2_5: 50,
          us_aqi_pm2_5: 100,
          pm10: 50,
          european_aqi_pm10: 40,
          us_aqi_pm10: 80,
          ozone: 80,
          european_aqi_o3: 60,
          us_aqi_o3: 85,
        },
      }

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWeatherResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAirQualityResponse,
        } as Response)

      const result = await fetchCurrentWeather(51.5074, -0.1278)

      expect(result.airQuality).toEqual(mockAirQualityResponse.current)
      expect(result.airQuality?.pm2_5).toBe(35)
    })
  })
})
