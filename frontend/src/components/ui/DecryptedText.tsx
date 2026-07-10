import { useEffect, useState } from 'react'

interface DecryptedTextProps {
  text: string
  speed?: number
  maxIterations?: number
  sequential?: boolean
  className?: string
}

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 5,
  sequential = true,
  className = '',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'

  useEffect(() => {
    let active = true
    let iteration = 0
    const interval = setInterval(() => {
      if (!active) return

      const nextText = text
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' '
          const solvedThreshold = sequential ? (iteration / maxIterations) : (iteration >= maxIterations ? text.length : 0)
          if (index < solvedThreshold) {
            return text[index]
          }
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join('')

      setDisplayText(nextText)

      if (iteration >= text.length * maxIterations) {
        setDisplayText(text)
        clearInterval(interval)
      }

      iteration++
    }, speed)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [text, speed, maxIterations, sequential])

  return <span className={className}>{displayText}</span>
}
