export type TickerData = {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  name?: string
}

type TickerCache = {
  t: number
  data: TickerData[]
}

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export function createCacheKey(symbols: TickerSymbolInput[]): string {
  if (!symbols || symbols.length === 0) return 'ticker:cache:empty'
  const sorted = [...symbols].sort((a, b) => {
    const symbolA = typeof a === 'string' ? a : a.symbol
    const symbolB = typeof b === 'string' ? b : b.symbol
    return symbolA.localeCompare(symbolB)
  })
  return `ticker:cache:${sorted.map(s => typeof s === 'string' ? s : `${s.symbol}:${s.type}`).join(',')}`
}

export function getCachedTickers(key: string): TickerData[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TickerCache
    if (Date.now() - parsed.t > TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function setCachedTickers(key: string, data: TickerData[]): void {
  localStorage.setItem(key, JSON.stringify({
    t: Date.now(),
    data
  } satisfies TickerCache))
}

export function clearTickerCache(key: string): void {
  localStorage.removeItem(key)
}

export const CRYPTO_ID_MAP: Record<string, string> = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'bnb': 'binancecoin',
  'sol': 'solana',
  'ada': 'cardano',
  'xrp': 'ripple',
  'dot': 'polkadot',
  'doge': 'dogecoin',
  'avax': 'avalanche-2',
  'matic': 'matic-network',
  'link': 'chainlink',
  'uni': 'uniswap',
  'ltc': 'litecoin',
  'atom': 'cosmos',
  'etc': 'ethereum-classic',
  'xlm': 'stellar',
}

export function getCryptoId(symbol: string): string {
  const normalized = symbol.toLowerCase()
  return CRYPTO_ID_MAP[normalized] || normalized
}

async function fetchCryptoPrice(symbol: string): Promise<TickerData | null> {
  try {
    const normalized = symbol.toLowerCase()
    const coinId = CRYPTO_ID_MAP[normalized] || normalized

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    const response = await fetch(url)
    const data = await response.json()

    if (!data[coinId]) {
      return null
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data[coinId].usd,
      change24h: data[coinId].usd * (data[coinId].usd_24h_change / 100),
      changePercent24h: data[coinId].usd_24h_change,
      name: symbol.toUpperCase()
    }
  } catch (error) {
    console.error(`Failed to fetch crypto ${symbol}:`, error)
    return null
  }
}

async function fetchStockPrice(symbol: string): Promise<TickerData | null> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`

    const response = await fetch(url)
    const data = await response.json()

    const quote = data?.chart?.result?.[0]
    if (!quote) {
      return null
    }

    const meta = quote.meta
    const price = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose
    const change = price - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      symbol: symbol.toUpperCase(),
      price,
      change24h: change,
      changePercent24h: changePercent,
      name: meta.symbol
    }
  } catch (error) {
    console.error(`Failed to fetch stock ${symbol}:`, error)
    return null
  }
}

export type TickerSymbolInput = {
  symbol: string
  type: "stock" | "crypto"
}

export async function fetchTickerData(symbols: TickerSymbolInput[]): Promise<TickerData[]> {
  const promises = symbols.map(async (item) => {
    if (item.type === "crypto") {
      return fetchCryptoPrice(item.symbol)
    } else {
      return fetchStockPrice(item.symbol)
    }
  })

  const results = await Promise.all(promises)
  return results.filter((r): r is TickerData => r !== null)
}

export function formatPrice(price: number): string {
  if (price < 0.01) {
    return `$${price.toFixed(6)}`
  } else if (price < 1) {
    return `$${price.toFixed(4)}`
  } else if (price < 100) {
    return `$${price.toFixed(2)}`
  } else {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function formatChange(change: number, changePercent: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}
