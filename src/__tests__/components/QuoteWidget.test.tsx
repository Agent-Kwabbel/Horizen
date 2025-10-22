import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QuoteWidget from '@/components/QuoteWidget'
import type { QuoteWidgetConfig } from '@/lib/widgets'

const mockConfig: QuoteWidgetConfig = {
  id: 'quote-test',
  type: 'quote',
  enabled: true,
  order: 0,
  settings: {
    autoRotate: false,
    rotateInterval: 86400000,
  },
}

describe('QuoteWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('should render with quote icon', () => {
      render(<QuoteWidget config={mockConfig} />)
      const icon = document.querySelector('.lucide-quote')
      expect(icon).toBeInTheDocument()
    })

    it('should display a quote text', () => {
      render(<QuoteWidget config={mockConfig} />)
      const quoteText = screen.getByText(/"/i)
      expect(quoteText).toBeInTheDocument()
    })

    it('should display an author', () => {
      render(<QuoteWidget config={mockConfig} />)
      const author = screen.getByText(/—/i)
      expect(author).toBeInTheDocument()
    })

    it('should quote text in italic', () => {
      render(<QuoteWidget config={mockConfig} />)
      const quoteText = document.querySelector('.italic')
      expect(quoteText).toBeInTheDocument()
    })
  })

  describe('Quote Display', () => {
    it('should display quotes from mixed categories', () => {
      render(<QuoteWidget config={mockConfig} />)
      expect(screen.getByText(/—/i)).toBeInTheDocument()
    })

    it('should render consistently with same config', () => {
      const { rerender } = render(<QuoteWidget config={mockConfig} />)
      const firstAuthor = screen.getByText(/—/i).textContent

      rerender(<QuoteWidget config={mockConfig} />)
      expect(screen.getByText(/—/i)).toBeInTheDocument()
    })
  })

  describe('Auto Rotate', () => {
    it('should not set interval when autoRotate is false', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, autoRotate: false } }
      render(<QuoteWidget config={config} />)

      expect(vi.getTimerCount()).toBe(0)
    })

    it('should set interval when autoRotate is true', () => {
      const config = {
        ...mockConfig,
        settings: { ...mockConfig.settings, autoRotate: true, rotateInterval: 1000 }
      }
      render(<QuoteWidget config={config} />)

      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })

    it('should clean up interval on unmount', () => {
      const config = {
        ...mockConfig,
        settings: { ...mockConfig.settings, autoRotate: true, rotateInterval: 1000 }
      }
      const { unmount } = render(<QuoteWidget config={config} />)

      const timersCount = vi.getTimerCount()
      unmount()

      expect(vi.getTimerCount()).toBeLessThan(timersCount)
    })
  })

  describe('Styling and Layout', () => {
    it('should have correct width', () => {
      const { container } = render(<QuoteWidget config={mockConfig} />)
      const widget = container.firstChild as HTMLElement
      expect(widget.className).toContain('w-[18rem]')
    })

    it('should have backdrop blur', () => {
      const { container } = render(<QuoteWidget config={mockConfig} />)
      const widget = container.firstChild as HTMLElement
      expect(widget.className).toContain('backdrop-blur')
    })

    it('should have rounded corners', () => {
      const { container } = render(<QuoteWidget config={mockConfig} />)
      const widget = container.firstChild as HTMLElement
      expect(widget.className).toContain('rounded-xl')
    })

    it('should display icon in blue color', () => {
      render(<QuoteWidget config={mockConfig} />)
      const icon = document.querySelector('.text-blue-400')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Quote Format', () => {
    it('should wrap quote text in quotation marks', () => {
      render(<QuoteWidget config={mockConfig} />)
      const quoteText = document.querySelector('.italic')
      expect(quoteText?.textContent).toMatch(/^".*"$/)
    })

    it('should prefix author with em dash', () => {
      render(<QuoteWidget config={mockConfig} />)
      const authorText = screen.getByText(/^— /i)
      expect(authorText).toBeInTheDocument()
    })

    it('should display author in muted color', () => {
      render(<QuoteWidget config={mockConfig} />)
      const author = document.querySelector('.text-white\\/60')
      expect(author).toBeInTheDocument()
      expect(author?.textContent).toMatch(/^— /)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid rerenders', () => {
      const { rerender } = render(<QuoteWidget config={mockConfig} />)

      for (let i = 0; i < 10; i++) {
        rerender(<QuoteWidget config={mockConfig} />)
      }

      expect(screen.getByText(/—/i)).toBeInTheDocument()
    })

    it('should create new interval when rotation settings change', () => {
      const config = { ...mockConfig, settings: { ...mockConfig.settings, autoRotate: true, rotateInterval: 1000 } }
      const { rerender } = render(<QuoteWidget config={config} />)

      const initialTimerCount = vi.getTimerCount()

      const newConfig = { ...mockConfig, settings: { ...mockConfig.settings, autoRotate: true, rotateInterval: 2000 } }
      rerender(<QuoteWidget config={newConfig} />)

      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })
  })
})
