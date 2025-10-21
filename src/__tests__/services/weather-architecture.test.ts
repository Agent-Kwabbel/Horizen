import { describe, it, expect } from 'vitest'
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  formatVisibility,
  formatPressure,
  getWindBeaufortIcon,
} from '@/features/widgets/services/weather-api'

describe('Weather API - New Architecture Tests', () => {
  describe('Standard Units Storage (Always stored in: °C, m/s, mm, meters, hPa)', () => {
    it('should store temperature in Celsius internally', () => {
      // Test that our format functions expect Celsius input
      expect(formatTemperature(0, 'celsius')).toBe('0°C')
      expect(formatTemperature(100, 'celsius')).toBe('100°C')
      expect(formatTemperature(-40, 'celsius')).toBe('-40°C')
    })

    it('should store wind speed in m/s internally', () => {
      // Test that wind speed is expected in m/s
      expect(formatWindSpeed(10, 'ms')).toContain('10 m/s')
      expect(formatWindSpeed(0, 'ms')).toContain('0 m/s')
    })

    it('should store precipitation in mm internally', () => {
      // Test that precipitation is expected in mm
      expect(formatPrecipitation(50, 10, 'mm')).toContain('10.0mm')
    })

    it('should store visibility in meters internally', () => {
      // Test that visibility is expected in meters
      expect(formatVisibility(1000, 'km')).toBe('1.0 km')
      expect(formatVisibility(500, 'km')).toBe('500 m')
    })

    it('should store pressure in hPa internally', () => {
      // Test that pressure is expected in hPa
      expect(formatPressure(1013, 'hpa')).toBe('1013 hPa')
    })
  })

  describe('Single-Direction Conversion (Standard → Display)', () => {
    describe('Temperature Conversions', () => {
      it('should convert Celsius to Fahrenheit for display', () => {
        expect(formatTemperature(0, 'fahrenheit')).toBe('32°F')
        expect(formatTemperature(100, 'fahrenheit')).toBe('212°F')
        expect(formatTemperature(-40, 'fahrenheit')).toBe('-40°F')
        expect(formatTemperature(37, 'fahrenheit')).toBe('99°F') // Body temp
      })

      it('should convert Celsius to Kelvin for display', () => {
        expect(formatTemperature(0, 'kelvin')).toBe('273K')
        expect(formatTemperature(-273.15, 'kelvin')).toBe('0K')
        expect(formatTemperature(100, 'kelvin')).toBe('373K')
      })

      it('should round temperatures correctly', () => {
        expect(formatTemperature(22.4, 'celsius')).toBe('22°C')
        expect(formatTemperature(22.5, 'celsius')).toBe('23°C')
        expect(formatTemperature(22.6, 'celsius')).toBe('23°C')
      })
    })

    describe('Wind Speed Conversions', () => {
      it('should convert m/s to km/h for display', () => {
        expect(formatWindSpeed(10, 'kmh')).toContain('36 km/h') // 10 * 3.6
        expect(formatWindSpeed(5, 'kmh')).toContain('18 km/h')
        expect(formatWindSpeed(0, 'kmh')).toContain('0 km/h')
      })

      it('should convert m/s to mph for display', () => {
        expect(formatWindSpeed(10, 'mph')).toContain('22 mph') // 10 * 2.237
        expect(formatWindSpeed(5, 'mph')).toContain('11 mph')
      })

      it('should convert m/s to knots for display', () => {
        expect(formatWindSpeed(10, 'knots')).toContain('19 kts') // 10 * 1.944
        expect(formatWindSpeed(5, 'knots')).toContain('10 kts')
      })

      it('should convert m/s to ft/s for display', () => {
        expect(formatWindSpeed(10, 'fts')).toContain('33 ft/s') // 10 * 3.281
        expect(formatWindSpeed(5, 'fts')).toContain('16 ft/s')
      })

      it('should convert m/s to Beaufort scale for display', () => {
        expect(formatWindSpeed(0.3, 'beaufort')).toContain('0 Bft') // Calm
        expect(formatWindSpeed(5.0, 'beaufort')).toContain('3 Bft') // Gentle breeze
        expect(formatWindSpeed(15.3, 'beaufort')).toContain('7 Bft') // Near gale
        expect(formatWindSpeed(35.0, 'beaufort')).toContain('12 Bft') // Hurricane
      })

      it('should keep m/s unchanged when that is the display unit', () => {
        expect(formatWindSpeed(10, 'ms')).toContain('10 m/s')
      })
    })

    describe('Precipitation Conversions', () => {
      it('should convert mm to inches for display', () => {
        expect(formatPrecipitation(50, 25.4, 'inch')).toBe('50% rain, 1.0"')
        expect(formatPrecipitation(75, 50.8, 'inch')).toBe('75% rain, 2.0"')
        expect(formatPrecipitation(100, 2.54, 'inch')).toBe('100% rain, 0.1"')
      })

      it('should keep mm unchanged when that is the display unit', () => {
        expect(formatPrecipitation(30, 5.5, 'mm')).toBe('30% rain, 5.5mm')
      })

      it('should handle zero and null values', () => {
        expect(formatPrecipitation(0, 0, 'mm')).toBe('0% rain, 0.0mm')
        expect(formatPrecipitation(null as any, 0, 'mm')).toBe('0% rain, 0.0mm')
      })
    })

    describe('Visibility Conversions', () => {
      it('should convert meters to km for display', () => {
        expect(formatVisibility(10000, 'km')).toBe('10.0 km')
        expect(formatVisibility(5000, 'km')).toBe('5.0 km')
      })

      it('should show meters for values < 1000m', () => {
        expect(formatVisibility(500, 'km')).toBe('500 m')
        expect(formatVisibility(999, 'km')).toBe('999 m')
      })

      it('should convert meters to miles for display', () => {
        expect(formatVisibility(1609, 'miles')).toBe('1.0 mi')
        expect(formatVisibility(8045, 'miles')).toBe('5.0 mi')
        expect(formatVisibility(500, 'miles')).toBe('0.3 mi')
      })
    })

    describe('Pressure Conversions', () => {
      it('should convert hPa to inHg for display', () => {
        expect(formatPressure(1013, 'inhg')).toBe('29.91 inHg')
        expect(formatPressure(1000, 'inhg')).toBe('29.53 inHg')
      })

      it('should keep hPa unchanged when that is the display unit', () => {
        expect(formatPressure(1013, 'hpa')).toBe('1013 hPa')
      })
    })
  })

  describe('Beaufort Scale Icon Selection', () => {
    it('should always expect m/s input regardless of unit parameter', () => {
      // The unit parameter no longer affects the conversion
      const windSpeedMs = 15.3

      expect(getWindBeaufortIcon(windSpeedMs, 'ms')).toBe('wind-beaufort-7')
      expect(getWindBeaufortIcon(windSpeedMs, 'kmh')).toBe('wind-beaufort-7')
      expect(getWindBeaufortIcon(windSpeedMs, 'mph')).toBe('wind-beaufort-7')
      expect(getWindBeaufortIcon(windSpeedMs, 'beaufort')).toBe('wind-beaufort-7')
    })

    it('should use correct Beaufort scale ranges', () => {
      expect(getWindBeaufortIcon(0.3, 'ms')).toBe('wind-beaufort-0')   // < 0.5
      expect(getWindBeaufortIcon(1.0, 'ms')).toBe('wind-beaufort-1')   // 0.5-1.6
      expect(getWindBeaufortIcon(3.0, 'ms')).toBe('wind-beaufort-2')   // 1.6-3.4
      expect(getWindBeaufortIcon(5.0, 'ms')).toBe('wind-beaufort-3')   // 3.4-5.5
      expect(getWindBeaufortIcon(8.0, 'ms')).toBe('wind-beaufort-5')   // 8.0-10.8
      expect(getWindBeaufortIcon(13.9, 'ms')).toBe('wind-beaufort-7')  // 13.9-17.2
      expect(getWindBeaufortIcon(25.0, 'ms')).toBe('wind-beaufort-10') // 24.5-28.5
      expect(getWindBeaufortIcon(35.0, 'ms')).toBe('wind-beaufort-12') // >= 32.7
    })
  })

  describe('Precision and Rounding', () => {
    it('should round temperatures to nearest integer', () => {
      expect(formatTemperature(22.1, 'celsius')).toBe('22°C')
      expect(formatTemperature(22.9, 'celsius')).toBe('23°C')
      expect(formatTemperature(22.5, 'celsius')).toBe('23°C')
    })

    it('should round wind speeds to nearest integer', () => {
      expect(formatWindSpeed(10.1, 'ms')).toContain('10 m/s')
      expect(formatWindSpeed(10.9, 'ms')).toContain('11 m/s')
      expect(formatWindSpeed(10.5, 'ms')).toContain('11 m/s')
    })

    it('should show precipitation with 1 decimal place', () => {
      expect(formatPrecipitation(50, 5.567, 'mm')).toBe('50% rain, 5.6mm')
      expect(formatPrecipitation(50, 5.123, 'mm')).toBe('50% rain, 5.1mm')
    })

    it('should show visibility with appropriate precision', () => {
      expect(formatVisibility(1234, 'km')).toBe('1.2 km')
      expect(formatVisibility(10000, 'km')).toBe('10.0 km')
      expect(formatVisibility(1609, 'miles')).toBe('1.0 mi')
    })

    it('should show pressure with appropriate precision', () => {
      expect(formatPressure(1013, 'hpa')).toBe('1013 hPa')
      expect(formatPressure(1013.25, 'inhg')).toBe('29.92 inHg')
    })
  })

  describe('Edge Cases', () => {
    it('should handle extreme temperatures', () => {
      expect(formatTemperature(-273.15, 'kelvin')).toBe('0K') // Absolute zero
      expect(formatTemperature(100, 'celsius')).toBe('100°C') // Boiling point
      expect(formatTemperature(0, 'fahrenheit')).toBe('32°F') // Freezing point
    })

    it('should handle zero wind speed', () => {
      expect(formatWindSpeed(0, 'ms')).toContain('0 m/s')
      expect(formatWindSpeed(0, 'beaufort')).toContain('0 Bft')
      expect(getWindBeaufortIcon(0, 'ms')).toBe('wind-beaufort-0')
    })

    it('should handle maximum Beaufort values', () => {
      expect(getWindBeaufortIcon(40, 'ms')).toBe('wind-beaufort-12')
      expect(formatWindSpeed(40, 'beaufort')).toContain('12 Bft')
    })

    it('should handle zero visibility', () => {
      expect(formatVisibility(0, 'km')).toBe('0 m')
      expect(formatVisibility(0, 'miles')).toBe('0.0 mi')
    })

    it('should handle very low pressure', () => {
      expect(formatPressure(870, 'hpa')).toBe('870 hPa') // Hurricane-level
    })
  })

  describe('Conversion Accuracy', () => {
    it('should have accurate temperature conversions', () => {
      // Test known conversion points
      expect(formatTemperature(0, 'fahrenheit')).toBe('32°F')
      expect(formatTemperature(100, 'fahrenheit')).toBe('212°F')
      expect(formatTemperature(37, 'fahrenheit')).toBe('99°F')
      expect(formatTemperature(-40, 'fahrenheit')).toBe('-40°F') // Same in both scales
    })

    it('should have accurate wind speed conversions', () => {
      // Test with known values
      expect(formatWindSpeed(1, 'kmh')).toContain('4 km/h')   // 1 * 3.6 = 3.6 ≈ 4
      expect(formatWindSpeed(1, 'mph')).toContain('2 mph')     // 1 * 2.237 ≈ 2
      expect(formatWindSpeed(1, 'knots')).toContain('2 kts')   // 1 * 1.944 ≈ 2
    })

    it('should have accurate precipitation conversions', () => {
      // 1 inch = 25.4 mm exactly
      expect(formatPrecipitation(100, 25.4, 'inch')).toBe('100% rain, 1.0"')
      expect(formatPrecipitation(100, 50.8, 'inch')).toBe('100% rain, 2.0"')
      expect(formatPrecipitation(100, 127, 'inch')).toBe('100% rain, 5.0"')
    })

    it('should have accurate visibility conversions', () => {
      // 1 mile = 1609.34 meters
      expect(formatVisibility(1609, 'miles')).toBe('1.0 mi')
      expect(formatVisibility(1000, 'km')).toBe('1.0 km')
    })
  })
})
