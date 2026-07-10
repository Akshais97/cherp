import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './RotatingText.css'

interface RotatingTextProps {
  texts: string[]
  interval?: number
  className?: string
}

export function RotatingText({
  texts,
  interval = 3000,
  className = '',
}: RotatingTextProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length)
    }, interval)
    return () => clearInterval(timer)
  }, [texts, interval])

  return (
    <div className={`rotating-text-wrapper ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="rotating-text-item"
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -22, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
