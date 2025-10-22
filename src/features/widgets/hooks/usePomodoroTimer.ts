import { useState, useEffect, useRef, useCallback } from "react"

export type TimerMode = "pomodoro" | "shortBreak" | "longBreak"

type UsePomodoroTimerProps = {
  pomodoroDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  onComplete?: (mode: TimerMode) => void
}

export function usePomodoroTimer({
  pomodoroDuration,
  shortBreakDuration,
  longBreakDuration,
  onComplete,
}: UsePomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(pomodoroDuration)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const getDuration = useCallback(
    (timerMode: TimerMode) => {
      switch (timerMode) {
        case "pomodoro":
          return pomodoroDuration
        case "shortBreak":
          return shortBreakDuration
        case "longBreak":
          return longBreakDuration
      }
    },
    [pomodoroDuration, shortBreakDuration, longBreakDuration]
  )

  useEffect(() => {
    setTimeLeft(getDuration(mode))
  }, [mode, getDuration])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            onComplete?.(mode)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, mode, onComplete])

  const start = useCallback(() => {
    if (timeLeft === 0) {
      setTimeLeft(getDuration(mode))
    }
    setIsRunning(true)
  }, [timeLeft, mode, getDuration])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(getDuration(mode))
  }, [mode, getDuration])

  const switchMode = useCallback(
    (newMode: TimerMode) => {
      setIsRunning(false)
      setMode(newMode)
      setTimeLeft(getDuration(newMode))
    },
    [getDuration]
  )

  const progress = 1 - timeLeft / getDuration(mode)

  return {
    mode,
    timeLeft,
    isRunning,
    progress,
    start,
    pause,
    reset,
    switchMode,
  }
}
