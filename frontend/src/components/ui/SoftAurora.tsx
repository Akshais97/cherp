import './SoftAurora.css'

interface SoftAuroraProps {
  color1?: string
  color2?: string
  color3?: string
  children?: React.ReactNode
  className?: string
}

export function SoftAurora({
  color1 = 'var(--blue-light)',
  color2 = 'var(--teal-light)',
  color3 = 'var(--purple-light)',
  children,
  className = '',
}: SoftAuroraProps) {
  return (
    <div className={`soft-aurora-container ${className}`}>
      <div className="soft-aurora-ambient">
        <div className="aurora-blob blob-1" style={{ backgroundColor: color1 }} />
        <div className="aurora-blob blob-2" style={{ backgroundColor: color2 }} />
        <div className="aurora-blob blob-3" style={{ backgroundColor: color3 }} />
      </div>
      <div className="soft-aurora-content">{children}</div>
    </div>
  )
}
