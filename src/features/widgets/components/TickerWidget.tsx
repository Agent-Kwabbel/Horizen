import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import type { TickerWidgetConfig } from "@/lib/widgets"
import { useTickerData } from "../hooks/useTickerData"
import { formatPrice, formatChange, getCryptoId } from "../services/ticker-api"

type TickerWidgetProps = {
  config: TickerWidgetConfig
}

export default function TickerWidget({ config }: TickerWidgetProps) {
  const { tickers, loading, refresh } = useTickerData(config.settings.symbols)

  if (config.settings.symbols.length === 0) {
    return (
      <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem]">
        <CardContent className="p-4">
          <div className="text-sm text-white/60 text-center py-2">
            No tickers configured
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] py-0">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Market Tracker</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            title="Refresh"
            onClick={refresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-0">
          {loading ? (
            config.settings.symbols.map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <Skeleton className="h-4 w-16 bg-white/10" />
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-4 w-20 bg-white/10" />
                  <Skeleton className="h-3 w-14 bg-white/10" />
                </div>
              </div>
            ))
          ) : (
            tickers.map((ticker, idx) => {
              const isPositive = ticker.changePercent24h >= 0
              const Icon = isPositive ? TrendingUp : TrendingDown
              const colorClass = isPositive ? "text-green-400" : "text-red-400"
              const symbolItem = config.settings.symbols[idx]
              const url = symbolItem?.type === "crypto"
                ? `https://www.coingecko.com/en/coins/${getCryptoId(symbolItem.symbol)}`
                : `https://finance.yahoo.com/quote/${ticker.symbol}`

              return (
                <a
                  key={ticker.symbol}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="font-medium text-sm">{ticker.symbol}</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm tabular-nums">{formatPrice(ticker.price)}</div>
                    <div className={`flex items-center gap-0.5 text-xs ${colorClass}`}>
                      <Icon className="w-3 h-3" />
                      <span className="tabular-nums">{formatChange(ticker.change24h, ticker.changePercent24h)}</span>
                    </div>
                  </div>
                </a>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
