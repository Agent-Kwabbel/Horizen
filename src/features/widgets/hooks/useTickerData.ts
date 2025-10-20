import { useState, useEffect } from "react"
import {
  type TickerData,
  type TickerSymbolInput,
  createCacheKey,
  getCachedTickers,
  setCachedTickers,
  clearTickerCache,
  fetchTickerData
} from "../services/ticker-api"

export function useTickerData(symbols: TickerSymbolInput[]) {
  const [tickers, setTickers] = useState<TickerData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const run = async () => {
      if (symbols.length === 0) {
        setTickers([])
        setLoading(false)
        return
      }

      const key = createCacheKey(symbols)
      const cached = getCachedTickers(key)

      if (cached) {
        setTickers(cached)
        setLoading(false)
        return
      }

      setLoading(true)
      const data = await fetchTickerData(symbols).catch(() => [])
      setTickers(data)
      setCachedTickers(key, data)
      setLoading(false)
    }
    run()
  }, [symbols, refreshTrigger])

  const refresh = () => {
    const key = createCacheKey(symbols)
    clearTickerCache(key)
    setRefreshTrigger(prev => prev + 1)
  }

  return { tickers, loading, refresh }
}
