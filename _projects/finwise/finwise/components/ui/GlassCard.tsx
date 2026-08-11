'use client'

import { CSSProperties, ReactNode, forwardRef } from 'react'
import GlowOverlay from './GlowOverlay'

interface GlassCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  enableGlow?: boolean
  onClick?: () => void
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { children, className = '', style, enableGlow = true, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`glass-card ${className}`}
      style={style}
    >
      {enableGlow && <GlowOverlay />}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
})

export default GlassCard
