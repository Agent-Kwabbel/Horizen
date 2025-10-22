import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TickerWidget from '@/features/widgets/components/TickerWidget'
import { PrefsProvider } from '@/lib/prefs'
import type { TickerWidgetConfig } from '@/lib/widgets'

const mockCryptoResponse = {
  bitcoin: {
    usd: 45000.50,
    usd_24h_change: 2.5,
  }
}

const mockStockResponse = {
  chart: {
    result: [{
      meta: {
        symbol: 'AAPL',
        regularMarketPrice: 180.25,
        chartPreviousClose: 175.00,
      }
    }]
  }
}

describe('TickerWidget', () => {
  const defaultConfig: TickerWidgetConfig = {
    id: 'ticker-test',
    type: 'ticker',
    enabled: true,
    order: 0,
    settings: {
      symbols: []
    }
  }

  const renderTickerWidget = (config: TickerWidgetConfig = defaultConfig) =>
    render(
      <PrefsProvider>
        <TickerWidget config={config} />
      </PrefsProvider>
    )

  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  it('should render empty state when no symbols are configured', () => {
    renderTickerWidget()
    expect(screen.getByText('No tickers configured')).toBeInTheDocument()
  })

  it('should display Market Tracker header', () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    renderTickerWidget(config)
    expect(screen.getByText('Market Tracker')).toBeInTheDocument()
  })

  it('should render refresh button', () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    renderTickerWidget(config)
    expect(screen.getByTitle('Refresh')).toBeInTheDocument()
  })

  it('should display loading skeletons while fetching', () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [
          { symbol: 'BTC', type: 'crypto' },
          { symbol: 'AAPL', type: 'stock' }
        ]
      }
    }

    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {})
    )

    renderTickerWidget(config)

    const skeletons = document.querySelectorAll('.bg-white\\/10')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should fetch and display crypto ticker data', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const bitcoinResponse = {
      bitcoin: {
        usd: 45123.75,
        usd_24h_change: 2.5,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => bitcoinResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('$45,123.75')).toBeInTheDocument()
      expect(screen.getByText('+2.50%')).toBeInTheDocument()
    })
  })

  it('should fetch and display stock ticker data', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'AAPL', type: 'stock' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('$180.25')).toBeInTheDocument()
      expect(screen.getByText('+3.00%')).toBeInTheDocument()
    })
  })

  it('should display multiple tickers', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [
          { symbol: 'BTC', type: 'crypto' },
          { symbol: 'AAPL', type: 'stock' }
        ]
      }
    }

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCryptoResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStockResponse
      } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
  })

  it('should show positive change with green color', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCryptoResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const changeElement = screen.getByText('+2.50%')
      const parentDiv = changeElement.closest('.text-green-400')
      expect(parentDiv).toBeInTheDocument()
    })
  })

  it('should show negative change with red color', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const negativeResponse = {
      bitcoin: {
        usd: 45000.50,
        usd_24h_change: -2.5,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => negativeResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const changeElement = screen.getByText('-2.50%')
      const parentDiv = changeElement.closest('.text-red-400')
      expect(parentDiv).toBeInTheDocument()
    })
  })

  it('should use cached ticker data', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const cacheKey = 'ticker:cache:BTC:crypto'
    const cachedData = {
      t: Date.now(),
      data: [{
        symbol: 'BTC',
        price: 45000.50,
        change24h: 1125.0125,
        changePercent24h: 2.5,
      }]
    }

    localStorage.setItem(cacheKey, JSON.stringify(cachedData))

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('$45,000.50')).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should ignore expired cache', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const cacheKey = 'ticker:cache:BTC:crypto'
    const expiredData = {
      t: Date.now() - 10 * 60 * 1000,
      data: [{
        symbol: 'BTC',
        price: 45000.50,
        change24h: 1125.0125,
        changePercent24h: 2.5,
      }]
    }

    localStorage.setItem(cacheKey, JSON.stringify(expiredData))

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCryptoResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should refresh ticker data when refresh button is clicked', async () => {
    const user = userEvent.setup()
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const cacheKey = 'ticker:cache:BTC:crypto'
    const cachedData = {
      t: Date.now(),
      data: [{
        symbol: 'BTC',
        price: 45000.50,
        change24h: 1125.0125,
        changePercent24h: 2.5,
      }]
    }

    localStorage.setItem(cacheKey, JSON.stringify(cachedData))

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('$45,000.50')).toBeInTheDocument()
    })

    const newResponse = {
      bitcoin: {
        usd: 46000.75,
        usd_24h_change: 3.0,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => newResponse
    } as Response)

    const refreshButton = screen.getByTitle('Refresh')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should link crypto tickers to CoinGecko', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCryptoResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://www.coingecko.com/en/coins/bitcoin')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('should link stock tickers to Yahoo Finance', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'AAPL', type: 'stock' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://finance.yahoo.com/quote/AAPL')
    })
  })

  it('should handle fetch errors gracefully', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    renderTickerWidget(config)

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.bg-white\\/10')
      expect(skeletons.length).toBe(0)
    })
  })

  it('should format small crypto prices correctly', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'shib', type: 'crypto' }]
      }
    }

    const smallPriceResponse = {
      'shib': {
        usd: 0.00001234,
        usd_24h_change: 5.0,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => smallPriceResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('SHIB')).toBeInTheDocument()
      expect(screen.getByText('$0.000012')).toBeInTheDocument()
    })
  })

  it('should format medium crypto prices correctly', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'DOGE', type: 'crypto' }]
      }
    }

    const mediumPriceResponse = {
      dogecoin: {
        usd: 0.0750,
        usd_24h_change: 1.5,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mediumPriceResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('$0.0750')).toBeInTheDocument()
    })
  })

  it('should format large prices with commas', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const largeResponse = {
      bitcoin: {
        usd: 65432.10,
        usd_24h_change: 2.0,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => largeResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      expect(screen.getByText('$65,432.10')).toBeInTheDocument()
    })
  })

  it('should display trending up icon for positive changes', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCryptoResponse
    } as Response)

    const { container } = renderTickerWidget(config)

    await waitFor(() => {
      const trendingIcons = container.querySelectorAll('svg')
      expect(trendingIcons.length).toBeGreaterThan(0)
    })
  })

  it('should display trending down icon for negative changes', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const negativeResponse = {
      bitcoin: {
        usd: 45000.50,
        usd_24h_change: -3.0,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => negativeResponse
    } as Response)

    const { container } = renderTickerWidget(config)

    await waitFor(() => {
      const trendingIcons = container.querySelectorAll('svg')
      expect(trendingIcons.length).toBeGreaterThan(0)
    })
  })

  it('should handle zero change correctly', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    const zeroChangeResponse = {
      bitcoin: {
        usd: 45000.00,
        usd_24h_change: 0,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => zeroChangeResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const changeElement = screen.getByText('+0.00%')
      expect(changeElement).toBeInTheDocument()
      const parentDiv = changeElement.closest('.text-green-400')
      expect(parentDiv).toBeInTheDocument()
    })
  })

  it('should render ticker rows with hover effect', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'BTC', type: 'crypto' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCryptoResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveClass('hover:bg-white/5')
      expect(link).toHaveClass('transition-colors')
      expect(link).toHaveClass('cursor-pointer')
    })
  })

  it('should map known crypto symbols to CoinGecko IDs', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'ETH', type: 'crypto' }]
      }
    }

    const ethResponse = {
      ethereum: {
        usd: 3000.00,
        usd_24h_change: 1.5,
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ethResponse
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://www.coingecko.com/en/coins/ethereum')
    })
  })

  it('should handle unknown crypto symbols', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [{ symbol: 'UNKNOWN', type: 'crypto' }]
      }
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const container = screen.queryByText('UNKNOWN')
      expect(container).not.toBeInTheDocument()
    })
  })

  it('should maintain ticker order from config', async () => {
    const config: TickerWidgetConfig = {
      ...defaultConfig,
      settings: {
        symbols: [
          { symbol: 'AAPL', type: 'stock' },
          { symbol: 'BTC', type: 'crypto' },
          { symbol: 'GOOGL', type: 'stock' }
        ]
      }
    }

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStockResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCryptoResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chart: {
            result: [{
              meta: {
                symbol: 'GOOGL',
                regularMarketPrice: 140.50,
                chartPreviousClose: 138.00,
              }
            }]
          }
        })
      } as Response)

    renderTickerWidget(config)

    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
    })
  })
})
