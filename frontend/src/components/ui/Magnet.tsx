import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface MagnetProps {
  children: React.ReactNode
  range?: number
  strength?: number
  className?: string
}

export function Magnet({
  children,
  range = 40,
  strength = 0.35,
  className = '',
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2
    const distanceX = clientX - centerX
    const distanceY = clientY - centerY
    const distance = Math.hypot(distanceX, distanceY)

    if (distance < range) {
      setPosition({ x: distanceX * strength, y: distanceY * strength })
    } else {
      setPosition({ x: 0, y: 0 })
    }
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      style={{ display: 'inline-block' }}
    >
      {children}
    </motion.div>
  )
}
