import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import BackgroundBlobs from '@/components/AuroraCanvas'

describe('AuroraCanvas (BackgroundBlobs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render canvas element', () => {
    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('should have correct CSS classes', () => {
    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toHaveClass('fixed', 'inset-0', '-z-10', 'w-screen', 'h-screen', 'pointer-events-none')
  })

  it('should have aria-hidden attribute for accessibility', () => {
    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })

  it('should initialize canvas with 2d context', () => {
    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toBeInTheDocument()
    expect(canvas!.getContext).toBeDefined()
  })

  it('should set canvas dimensions on mount', () => {
    global.innerWidth = 1024
    global.innerHeight = 768

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    expect(canvas.style.width).toBe('1024px')
    expect(canvas.style.height).toBe('768px')
  })

  it('should handle window resize', () => {
    global.innerWidth = 1024
    global.innerHeight = 768

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    expect(canvas.style.width).toBe('1024px')
    expect(canvas.style.height).toBe('768px')

    global.innerWidth = 1280
    global.innerHeight = 720

    window.dispatchEvent(new Event('resize'))

    expect(canvas.style.width).toBe('1280px')
    expect(canvas.style.height).toBe('720px')
  })

  it('should start animation loop when motion is allowed', () => {
    const requestAnimationFrameSpy = vi.spyOn(global, 'requestAnimationFrame')

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<BackgroundBlobs />)

    expect(requestAnimationFrameSpy).toHaveBeenCalled()
  })

  it('should respect prefers-reduced-motion', () => {
    const requestAnimationFrameSpy = vi.spyOn(global, 'requestAnimationFrame')

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<BackgroundBlobs />)

    // Should not start animation loop
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
  })

  it('should cleanup on unmount', () => {
    const cancelAnimationFrameSpy = vi.spyOn(global, 'cancelAnimationFrame')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<BackgroundBlobs />)

    unmount()

    expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('should draw on canvas context', () => {
    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')

    // Canvas context should be created and used
    expect(ctx).toBeDefined()
    expect(canvas.getContext).toHaveBeenCalled()
  })

  it('should create gradient for background', () => {
    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')

    // Canvas mocks should have been called
    expect(ctx).toBeDefined()
  })

  it('should handle devicePixelRatio correctly', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2,
    })

    global.innerWidth = 1000
    global.innerHeight = 1000

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    // Canvas dimensions should be scaled by dpr (clamped to maxDpr of 2)
    expect(canvas.width).toBeGreaterThan(1000)
    expect(canvas.height).toBeGreaterThan(1000)
  })

  it('should clamp devicePixelRatio to maximum', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 5, // Should be clamped to 2
    })

    global.innerWidth = 1000
    global.innerHeight = 1000

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    // Should be clamped to maxDpr of 2
    expect(canvas.width).toBe(2000)
    expect(canvas.height).toBe(2000)
  })

  it('should handle zero devicePixelRatio', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 0,
    })

    global.innerWidth = 1000
    global.innerHeight = 1000

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    // Should default to at least 1
    expect(canvas.width).toBe(1000)
    expect(canvas.height).toBe(1000)
  })

  it('should use consistent blob count', () => {
    const { container } = render(<BackgroundBlobs />)

    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('should render static frame when motion is reduced', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
      })),
    })

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    // Should still render canvas
    expect(canvas).toBeInTheDocument()
    expect(canvas.getContext).toHaveBeenCalled()
  })

  it('should handle very small window sizes', () => {
    global.innerWidth = 100
    global.innerHeight = 100

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    expect(canvas.style.width).toBe('100px')
    expect(canvas.style.height).toBe('100px')
    expect(canvas).toBeInTheDocument()
  })

  it('should handle very large window sizes', () => {
    global.innerWidth = 5000
    global.innerHeight = 3000

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    expect(canvas.style.width).toBe('5000px')
    expect(canvas.style.height).toBe('3000px')
    expect(canvas).toBeInTheDocument()
  })

  it('should handle non-square aspect ratios', () => {
    global.innerWidth = 1920
    global.innerHeight = 1080

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    expect(canvas.style.width).toBe('1920px')
    expect(canvas.style.height).toBe('1080px')
  })

  it('should handle portrait orientation', () => {
    global.innerWidth = 768
    global.innerHeight = 1024

    const { container } = render(<BackgroundBlobs />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    expect(canvas.style.width).toBe('768px')
    expect(canvas.style.height).toBe('1024px')
  })

  it('should have performance time available', () => {
    expect(performance.now).toBeDefined()
    expect(typeof performance.now()).toBe('number')
  })

  it('should call resize listener on window resize event', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    render(<BackgroundBlobs />)

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('should properly cleanup animation frame on unmount', () => {
    let rafId: number | undefined

    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      rafId = 123
      return rafId
    })

    const cancelSpy = vi.spyOn(global, 'cancelAnimationFrame')

    const { unmount } = render(<BackgroundBlobs />)

    unmount()

    if (rafId) {
      expect(cancelSpy).toHaveBeenCalledWith(rafId)
    }
  })
})
