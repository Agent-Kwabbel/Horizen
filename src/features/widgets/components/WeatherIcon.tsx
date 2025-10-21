import { useEffect, useState } from "react"

type WeatherIconProps = {
  icon: string
  size?: number
  className?: string
}

export default function WeatherIcon({ icon, size = 48, className = "" }: WeatherIconProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const iconPath = prefersReducedMotion
    ? `/weather-icons/static/${icon}.svg`
    : `/weather-icons/animated/${icon}.svg`

  return (
    <img
      src={iconPath}
      alt={icon}
      width={size}
      height={size}
      className={className}
    />
  )
}
