import { useRef, useState } from 'react'
import './SpotlightCard.css'

interface SpotlightCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
  spotlightColor?: string
  children: React.ReactNode
}

export function SpotlightCard({
  as: Component = 'div',
  spotlightColor = 'rgba(59, 109, 214, 0.12)',
  children,
  className = '',
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <Component
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      {...props}
      style={{
        ['--spotlight-color' as any]: spotlightColor,
        ['--x' as any]: `${coords.x}px`,
        ['--y' as any]: `${coords.y}px`,
        ...props.style
      } as React.CSSProperties}
    >
      <div className="spotlight-card-border" />
      <div className="spotlight-card-content">{children}</div>
    </Component>
  )
}
