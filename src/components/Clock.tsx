import { useEffect, useState } from "react"

type Props = {
  timeZone?: string
  showSeconds?: boolean
}

export default function Clock({ timeZone, showSeconds = false }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12: false,
    timeZone,
  }

  const parts = new Intl.DateTimeFormat(undefined, opts).formatToParts(now)
  const get = (t: "hour" | "minute" | "second") =>
    parts.find(p => p.type === t)?.value ?? ""

  const hh = get("hour")
  const mm = get("minute")
  const ss = showSeconds ? get("second") : ""

  return (
    <div
      className="text-white text-[8rem] sm:text-[10rem] leading-[0.8] font-bold text-center tracking-tight select-none"
      style={{
        fontFamily:
          'OZIK, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontFeatureSettings: '"tnum","lnum"',
      }}
      aria-label="Current time"
    >
      <span>{hh}</span>
      <span className="clock-colon" aria-hidden="true">:</span>
      <span>{mm}</span>
      {showSeconds && (
        <>
          <span className="clock-colon" aria-hidden="true">:</span>
          <span>{ss}</span>
        </>
      )}
    </div>
  )
}
