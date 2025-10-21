import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeatherWidget from '@/features/widgets/components/WeatherWidget'
import { PrefsProvider } from '@/lib/prefs'
import type { WeatherWidgetConfig } from '@/lib/widgets'

// Raw API response format (what the Open-Meteo API returns)
const mockApiResponse = {
  current: {
    temperature_2m: 22.5,
    apparent_temperature: 20.1,
    wind_speed_10m: 15.3,
    wind_gusts_10m: 18.0,
    wind_direction_10m: 180,
    precipitation_probability: 30,
    precipitation: 1.2,
    rain: 0,
    showers: 0,
    snowfall: 0,
    visibility: 10000,
    cloud_cover: 10,
    is_day: 1 as const,
    weather_code: 0,
    relative_humidity_2m: 65,
    surface_pressure: 1013,
  },
  hourly: {
    temperature_2m: Array(30).fill(22),
    apparent_temperature: Array(30).fill(20),
    precipitation_probability: Array(30).fill(30),
    precipitation: Array(30).fill(1.2),
    weather_code: Array(30).fill(0),
    uv_index: Array(30).fill(5),
    wind_speed_10m: Array(30).fill(15),
    wind_gusts_10m: Array(30).fill(18),
  },
  daily: {
    temperature_2m_max: [25.0],
    temperature_2m_min: [18.0],
    apparent_temperature_max: [23.0],
    apparent_temperature_min: [16.0],
    precipitation_sum: [2.5],
    precipitation_hours: [2],
    weather_code: [0],
    wind_speed_10m_max: [20],
    wind_gusts_10m_max: [25],
    uv_index_max: [8],
    sunrise: ['2024-01-01T07:00:00'],
    sunset: ['2024-01-01T17:00:00'],
  },
}

// Processed weather data (what gets stored in cache after fetchCurrentWeather processes it)
const mockWeatherData = {
  current: mockApiResponse.current,
  hourly: mockApiResponse.hourly,
  daily: {
    temperature_2m_max: 25.0,
    temperature_2m_min: 18.0,
    apparent_temperature_max: 23.0,
    apparent_temperature_min: 16.0,
    precipitation_sum: 2.5,
    precipitation_hours: 2,
    weather_code: 0,
    wind_speed_10m_max: 20,
    wind_gusts_10m_max: 25,
    uv_index_max: 8,
    sunrise: '2024-01-01T07:00:00',
    sunset: '2024-01-01T17:00:00',
  },
  airQuality: null,
  latitude: 51.5074,
  longitude: -0.1278,
}

const mockGeoResults = [
  {
    id: 1,
    name: 'London',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    admin1: 'England',
  },
  {
    id: 2,
    name: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    admin1: 'Île-de-France',
  },
]

describe('WeatherWidget', () => {
  const defaultConfig: WeatherWidgetConfig = {
    id: 'weather-test',
    type: 'weather',
    enabled: true,
    order: 0,
    settings: {},
  }

  const renderWeatherWidget = (config: WeatherWidgetConfig = defaultConfig) =>
    render(
      <PrefsProvider>
        <WeatherWidget config={config} />
      </PrefsProvider>
    )

  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  it('should render with "Select location" when no location is set', () => {
    renderWeatherWidget()
    expect(screen.getByText('Select location')).toBeInTheDocument()
  })

  it('should load location from localStorage', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget()

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument()
    })
  })

  it('should display weather data when available', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem('weather-expanded-weather-test', 'true')

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget()

    await waitFor(() => {
      expect(screen.getByText('23°C')).toBeInTheDocument()
      expect(screen.getByText(/Feels\s+20°C/)).toBeInTheDocument()
      expect(screen.getByText(/H: 25°C/)).toBeInTheDocument()
      expect(screen.getByText(/L: 18°C/)).toBeInTheDocument()
    })

    // Check for expanded section data (wind speed defaults to km/h)
    expect(screen.getByText(/55.*km\/h/i)).toBeInTheDocument()
    expect(screen.getByText(/30%/)).toBeInTheDocument()
  })

  it('should display loading skeleton while fetching', () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderWeatherWidget()

    const skeletons = document.querySelectorAll('.bg-white\\/10')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should use cached weather data', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    const cacheKey = 'wx:cache:51.507,-0.128'
    const cachedData = {
      t: Date.now(),
      data: mockWeatherData,
    }

    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem(cacheKey, JSON.stringify(cachedData))

    renderWeatherWidget()

    await waitFor(() => {
      expect(screen.getByText('23°C')).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should ignore expired cache', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    const cacheKey = 'wx:cache:51.507,-0.128'
    const expiredData = {
      t: Date.now() - 20 * 60 * 1000, // 20 minutes ago (expired)
      data: mockWeatherData,
    }

    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem(cacheKey, JSON.stringify(expiredData))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should open location search popover', async () => {
    const user = userEvent.setup()
    renderWeatherWidget()

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search city…')).toBeInTheDocument()
    })
  })

  it('should search for cities', async () => {
    const user = userEvent.setup()
    renderWeatherWidget()

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockGeoResults }),
    } as Response)

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'London')

    await waitFor(() => {
      expect(screen.getByText('London')).toBeInTheDocument()
      expect(screen.getByText('England, United Kingdom')).toBeInTheDocument()
    })
  })

  it('should not search with less than 2 characters', async () => {
    const user = userEvent.setup()
    renderWeatherWidget()

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'L')

    expect(screen.getByText('Type at least 2 characters…')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should select a location from search results', async () => {
    const user = userEvent.setup()
    renderWeatherWidget()

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockGeoResults }),
    } as Response)

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'London')

    await waitFor(() => {
      expect(screen.getByText('London')).toBeInTheDocument()
    })

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    const londonButton = screen.getByRole('button', { name: /London/i })
    await user.click(londonButton)

    await waitFor(() => {
      expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument()
    })

    const stored = JSON.parse(localStorage.getItem('wx:location')!)
    expect(stored.name).toBe('London, England, United Kingdom')
  })

  it('should show "No results" for empty search results', async () => {
    const user = userEvent.setup()
    renderWeatherWidget()

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response)

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'XYZ123')

    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument()
    })
  })

  it('should refresh weather data', async () => {
    const user = userEvent.setup()
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    const cacheKey = 'wx:cache:51.507,-0.128'

    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ t: Date.now(), data: mockWeatherData })
    )

    renderWeatherWidget()

    await waitFor(() => {
      expect(screen.getByText('23°C')).toBeInTheDocument()
    })

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockApiResponse,
          current: { ...mockApiResponse.current, temperature_2m: 25.0 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    const refreshButton = screen.getByTitle('Refresh')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should show refresh button when no location is set', () => {
    renderWeatherWidget()

    const refreshButton = screen.getByTitle('Refresh')
    expect(refreshButton).toBeInTheDocument()
  })

  it('should display weather data with correct formatting', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget()

    await waitFor(() => {
      expect(screen.getByText('London')).toBeInTheDocument()
      expect(screen.getByText('23°C')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    renderWeatherWidget()

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.bg-white\\/10')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  it('should handle search errors gracefully', async () => {
    const user = userEvent.setup()
    renderWeatherWidget()

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'London')

    await waitFor(() => {
      expect(screen.queryByText('London')).not.toBeInTheDocument()
    })
  })

  it('should round temperature values', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockApiResponse,
          current: {
            ...mockApiResponse.current,
            temperature_2m: 22.7,
            apparent_temperature: 20.3,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget()

    await waitFor(() => {
      expect(screen.getByText('23°C')).toBeInTheDocument()
      expect(screen.getByText(/Feels\s+20°C/)).toBeInTheDocument()
    })
  })

  it('should truncate long location names', () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'This is a very long location name that should be truncated',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    const { container } = render(
      <PrefsProvider>
        <WeatherWidget config={defaultConfig} />
      </PrefsProvider>
    )

    const locationElement = container.querySelector('.truncate')
    expect(locationElement).toBeInTheDocument()
    expect(locationElement).toHaveClass('truncate')
  })

  it('should respect configured temperature unit (Fahrenheit)', async () => {
    const config: WeatherWidgetConfig = {
      ...defaultConfig,
      settings: {
        units: {
          temperature: 'fahrenheit',
          windSpeed: 'ms',
          precipitation: 'mm',
        },
      },
    }

    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget(config)

    await waitFor(() => {
      // 22.5°C = 72.5°F ≈ 73°F when rounded
      expect(screen.getByText('73°F')).toBeInTheDocument()
    })
  })

  it('should respect configured wind speed unit (km/h)', async () => {
    const config: WeatherWidgetConfig = {
      ...defaultConfig,
      settings: {
        units: {
          temperature: 'celsius',
          windSpeed: 'kmh',
          precipitation: 'mm',
        },
      },
    }

    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem('weather-expanded-weather-test', 'true')

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget(config)

    await waitFor(() => {
      // 15.3 m/s × 3.6 = 55 km/h
      expect(screen.getByText(/55.*km\/h/i)).toBeInTheDocument()
    })
  })

  it('should respect configured wind speed unit (Beaufort)', async () => {
    const config: WeatherWidgetConfig = {
      ...defaultConfig,
      settings: {
        units: {
          temperature: 'celsius',
          windSpeed: 'beaufort',
          precipitation: 'mm',
        },
      },
    }

    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem('weather-expanded-weather-test', 'true')

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget(config)

    await waitFor(() => {
      // 15.3 m/s = Beaufort 7
      expect(screen.getByText(/7\s*Bft/i)).toBeInTheDocument()
    })
  })

  it('should display precipitation in new format', async () => {
    const config: WeatherWidgetConfig = {
      ...defaultConfig,
      settings: {
        units: {
          temperature: 'celsius',
          windSpeed: 'ms',
          precipitation: 'mm',
        },
      },
    }

    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))
    localStorage.setItem('weather-expanded-weather-test', 'true')

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: null }),
      } as Response)

    renderWeatherWidget(config)

    await waitFor(() => {
      expect(screen.getByText(/30%/)).toBeInTheDocument()
    })
  })
})
