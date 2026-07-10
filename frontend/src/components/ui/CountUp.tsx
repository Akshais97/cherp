import { useEffect, useState } from 'react'

interface CountUpProps {
  end: number
  start?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function CountUp({
  end,
  start = 0,
  duration = 1.5,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpProps) {
  const [count, setCount] = useState(start)

  useEffect(() => {
    let startTimestamp: number | null = null
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1)
      setCount(Math.floor(progress * (end - start) + start))
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    animationFrameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [end, start, duration])

  return (
    <span className={className}>
      {prefix}
      {count}
      {suffix}
    </span>
  )
}
