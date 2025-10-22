import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw } from "lucide-react"
import { usePomodoroTimer } from "../hooks/usePomodoroTimer"
import type { TimerMode } from "../hooks/usePomodoroTimer"
import type { PomodoroWidgetConfig } from "@/lib/widgets"
import { useEffect } from "react"

type PomodoroWidgetProps = {
  config: PomodoroWidgetConfig
}

export default function PomodoroWidget({ config }: PomodoroWidgetProps) {
  const playNotificationSound = () => {
    if (!config.settings.notificationSound) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const handleComplete = (mode: TimerMode) => {
    playNotificationSound()

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        const titles = {
          pomodoro: "Pomodoro Complete!",
          shortBreak: "Break Complete!",
          longBreak: "Long Break Complete!",
        }
        new Notification(titles[mode], {
          body: "Time to switch tasks!",
          icon: "/favicon.ico",
        })
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            const titles = {
              pomodoro: "Pomodoro Complete!",
              shortBreak: "Break Complete!",
              longBreak: "Long Break Complete!",
            }
            new Notification(titles[mode], {
              body: "Time to switch tasks!",
              icon: "/favicon.ico",
            })
          }
        })
      }
    }
  }

  const {
    mode,
    timeLeft,
    isRunning,
    progress,
    start,
    pause,
    reset,
    switchMode,
  } = usePomodoroTimer({
    pomodoroDuration: config.settings.pomodoroDuration,
    shortBreakDuration: config.settings.shortBreakDuration,
    longBreakDuration: config.settings.longBreakDuration,
    onComplete: handleComplete,
  })

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = -circumference * progress

  const modeLabels: Record<TimerMode, string> = {
    pomodoro: "Pomodoro",
    shortBreak: "Short Break",
    longBreak: "Long Break",
  }

  return (
    <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] shrink-0 py-0">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <svg width="128" height="128" className="transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-mono font-semibold">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <button
              onClick={() => switchMode("pomodoro")}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                mode === "pomodoro"
                  ? "bg-white/20 font-semibold"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {modeLabels.pomodoro}
            </button>
            <button
              onClick={() => switchMode("shortBreak")}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                mode === "shortBreak"
                  ? "bg-white/20 font-semibold"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {modeLabels.shortBreak}
            </button>
            <button
              onClick={() => switchMode("longBreak")}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                mode === "longBreak"
                  ? "bg-white/20 font-semibold"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {modeLabels.longBreak}
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-3"
            onClick={isRunning ? pause : start}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-3"
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
