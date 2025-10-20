import { useState, useEffect } from "react"
import { getRandomQuote, type QuoteData } from "../data/quotes"

export function useQuoteRotation(autoRotate: boolean, rotateInterval: number, category: string = "mixed") {
  const [quote, setQuote] = useState<QuoteData>(() => getRandomQuote(category))

  useEffect(() => {
    if (autoRotate) {
      const interval = setInterval(() => {
        setQuote(getRandomQuote(category))
      }, rotateInterval)

      return () => clearInterval(interval)
    }
  }, [autoRotate, rotateInterval, category])

  return quote
}
