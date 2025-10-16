import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeatherWidget from '@/components/WeatherWidget'

const mockWeatherData = {
  temperature_2m: 22.5,
  apparent_temperature: 20.1,
  wind_speed_10m: 15.3,
  relative_humidity_2m: 65,
  is_day: 1 as const,
  weather_code: 0,
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
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  it('should render with "Select location" when no location is set', () => {
    render(<WeatherWidget />)
    expect(screen.getByText('Select location')).toBeInTheDocument()
  })

  it('should load location from localStorage', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London, England, United Kingdom',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ current: mockWeatherData }),
    } as Response)

    render(<WeatherWidget />)

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

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ current: mockWeatherData }),
    } as Response)

    render(<WeatherWidget />)

    await waitFor(() => {
      expect(screen.getByText('23°C')).toBeInTheDocument()
      expect(screen.getByText(/Feels\s+20°C/)).toBeInTheDocument()
      expect(screen.getByText(/15 km\/h/)).toBeInTheDocument()
      expect(screen.getByText(/65%/)).toBeInTheDocument()
    })
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

    render(<WeatherWidget />)

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

    render(<WeatherWidget />)

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

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ current: mockWeatherData }),
    } as Response)

    render(<WeatherWidget />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should open location search popover', async () => {
    const user = userEvent.setup()
    render(<WeatherWidget />)

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search city…')).toBeInTheDocument()
    })
  })

  it('should search for cities', async () => {
    const user = userEvent.setup()
    render(<WeatherWidget />)

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
    render(<WeatherWidget />)

    const locationButton = screen.getByTitle('Change location')
    await user.click(locationButton)

    const searchInput = screen.getByPlaceholderText('Search city…')
    await user.type(searchInput, 'L')

    expect(screen.getByText('Type at least 2 characters…')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should select a location from search results', async () => {
    const user = userEvent.setup()
    render(<WeatherWidget />)

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

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ current: mockWeatherData }),
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
    render(<WeatherWidget />)

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

    render(<WeatherWidget />)

    await waitFor(() => {
      expect(screen.getByText('23°C')).toBeInTheDocument()
    })

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: { ...mockWeatherData, temperature_2m: 25.0 },
      }),
    } as Response)

    const refreshButton = screen.getByTitle('Refresh')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should disable refresh button when no location is set', () => {
    render(<WeatherWidget />)

    const refreshButton = screen.getByTitle('Refresh')
    expect(refreshButton).toBeDisabled()
  })

  it('should display correct weather icon for clear day', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: { ...mockWeatherData, weather_code: 0, is_day: 1 },
      }),
    } as Response)

    render(<WeatherWidget />)

    await waitFor(() => {
      expect(screen.getByText('☀️')).toBeInTheDocument()
    })
  })

  it('should display correct weather icon for clear night', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: { ...mockWeatherData, weather_code: 0, is_day: 0 },
      }),
    } as Response)

    render(<WeatherWidget />)

    await waitFor(() => {
      expect(screen.getByText('🌙')).toBeInTheDocument()
    })
  })

  it('should display rainy weather icon', async () => {
    const storedLocation = {
      lat: 51.5074,
      lon: -0.1278,
      name: 'London',
    }
    localStorage.setItem('wx:location', JSON.stringify(storedLocation))

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: { ...mockWeatherData, weather_code: 61 },
      }),
    } as Response)

    render(<WeatherWidget />)

    await waitFor(() => {
      expect(screen.getByText('🌧️')).toBeInTheDocument()
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

    render(<WeatherWidget />)

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.bg-white\\/10')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  it('should handle search errors gracefully', async () => {
    const user = userEvent.setup()
    render(<WeatherWidget />)

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

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: {
          ...mockWeatherData,
          temperature_2m: 22.7,
          apparent_temperature: 20.3,
        },
      }),
    } as Response)

    render(<WeatherWidget />)

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

    const { container } = render(<WeatherWidget />)

    const locationElement = container.querySelector('.truncate')
    expect(locationElement).toBeInTheDocument()
    expect(locationElement).toHaveClass('truncate')
  })
})
