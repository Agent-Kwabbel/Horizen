import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { act } from "react"
import PomodoroWidget from "@/features/widgets/components/PomodoroWidget"
import { PrefsProvider } from "@/lib/prefs"
import type { PomodoroWidgetConfig } from "@/lib/widgets"

const mockConfig: PomodoroWidgetConfig = {
  id: "pomodoro-test",
  type: "pomodoro",
  enabled: true,
  order: 0,
  settings: {
    pomodoroDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    notificationSound: true,
  },
}

describe("PomodoroWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers()

    const NotificationMock = vi.fn().mockImplementation(() => ({}))
    NotificationMock.permission = "default"
    NotificationMock.requestPermission = vi.fn().mockResolvedValue("granted")
    global.Notification = NotificationMock as any

    global.AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 0 },
        type: "sine",
      }),
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      }),
      destination: {},
      currentTime: 0,
    })) as any
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe("Timer Display", () => {
    it("should display initial pomodoro duration", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      expect(screen.getByText("25:00")).toBeInTheDocument()
    })

    it("should display short break duration when switched", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByText("Short Break"))
      expect(screen.getByText("05:00")).toBeInTheDocument()
    })

    it("should display long break duration when switched", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByText("Long Break"))
      expect(screen.getByText("15:00")).toBeInTheDocument()
    })
  })

  describe("Timer Controls", () => {
    it("should start timer when Start button is clicked", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      const startButton = screen.getByRole("button", { name: /start/i })
      fireEvent.click(startButton)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText("24:59")).toBeInTheDocument()
    })

    it("should pause timer when Pause button is clicked", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      fireEvent.click(screen.getByRole("button", { name: /pause/i }))

      const timeAfterPause = screen.getByText(/24:58/).textContent

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(screen.getByText(timeAfterPause!)).toBeInTheDocument()
    })

    it("should reset timer when Reset button is clicked", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      fireEvent.click(screen.getByRole("button", { name: /reset/i }))
      expect(screen.getByText("25:00")).toBeInTheDocument()
    })

    it("should automatically reset and start when Start is clicked after timer completes", () => {
      const shortConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 2,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={shortConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.getByText("00:00")).toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText("00:01")).toBeInTheDocument()
    })
  })

  describe("Mode Switching", () => {
    it("should stop timer when switching modes", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      fireEvent.click(screen.getByText("Short Break"))

      expect(screen.getByText("05:00")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument()
    })

    it("should highlight active mode", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      const pomodoroButton = screen.getByText("Pomodoro").closest("button")!
      expect(pomodoroButton.className).toContain("bg-white/20")

      fireEvent.click(screen.getByText("Short Break"))

      const shortBreakButton = screen.getByText("Short Break").closest("button")!
      expect(shortBreakButton.className).toContain("bg-white/20")
    })
  })

  describe("Circular Progress", () => {
    it("should render circular progress indicator", () => {
      const { container } = render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      const circles = container.querySelectorAll("circle")
      expect(circles.length).toBe(2)
    })

    it("should update progress as timer runs", () => {
      const { container } = render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      const progressCircle = container.querySelectorAll("circle")[1]
      const initialOffset = progressCircle.getAttribute("stroke-dashoffset")

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      const newOffset = progressCircle.getAttribute("stroke-dashoffset")
      expect(newOffset).not.toBe(initialOffset)
    })
  })

  describe("Notifications", () => {
    it("should request notification permission on mount", () => {
      render(
        <PrefsProvider>
          <PomodoroWidget config={mockConfig} />
        </PrefsProvider>
      )

      expect(global.Notification.requestPermission).toHaveBeenCalled()
    })

    it("should show notification when timer completes", async () => {
      const NotificationMock = vi.fn().mockImplementation(() => ({}))
      NotificationMock.permission = "granted"
      NotificationMock.requestPermission = vi.fn().mockResolvedValue("granted")
      global.Notification = NotificationMock as any

      const shortConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 2,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={shortConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      await act(async () => {
        vi.advanceTimersByTime(3000)
      })

      expect(global.Notification).toHaveBeenCalledWith(
        "Pomodoro Complete!",
        expect.objectContaining({
          body: "Time to switch tasks!",
        })
      )
    })

    it("should play sound when timer completes", async () => {
      const mockOscillator = {
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 0 },
        type: "sine",
      }

      const mockAudioContext = {
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }),
        destination: {},
        currentTime: 0,
      }

      global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext) as any

      const shortConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 1,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={shortConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockOscillator.start).toHaveBeenCalled()
    })

    it("should not play sound when notification sound is disabled", async () => {
      const mockOscillator = {
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 0 },
        type: "sine",
      }

      const mockAudioContext = {
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }),
        destination: {},
        currentTime: 0,
      }

      global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext) as any

      const shortConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 1,
          notificationSound: false,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={shortConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockOscillator.start).not.toHaveBeenCalled()
    })
  })

  describe("Time Formatting", () => {
    it("should format time correctly with leading zeros", () => {
      const shortConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 65,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={shortConfig} />
        </PrefsProvider>
      )

      expect(screen.getByText("01:05")).toBeInTheDocument()
    })

    it("should show 00:00 when timer completes", () => {
      const shortConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 1,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={shortConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByRole("button", { name: /start/i }))

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(screen.getByText("00:00")).toBeInTheDocument()
    })
  })

  describe("Custom Durations", () => {
    it("should respect custom pomodoro duration", () => {
      const customConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          pomodoroDuration: 30 * 60,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={customConfig} />
        </PrefsProvider>
      )

      expect(screen.getByText("30:00")).toBeInTheDocument()
    })

    it("should respect custom short break duration", () => {
      const customConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          shortBreakDuration: 10 * 60,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={customConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByText("Short Break"))
      expect(screen.getByText("10:00")).toBeInTheDocument()
    })

    it("should respect custom long break duration", () => {
      const customConfig: PomodoroWidgetConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          longBreakDuration: 20 * 60,
        },
      }

      render(
        <PrefsProvider>
          <PomodoroWidget config={customConfig} />
        </PrefsProvider>
      )

      fireEvent.click(screen.getByText("Long Break"))
      expect(screen.getByText("20:00")).toBeInTheDocument()
    })
  })
})
