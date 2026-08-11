'use client'

import { clamp, withAlpha } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  color: string
  height?: number
  animate?: boolean
}

export default function ProgressBar({
  value,
  max,
  color,
  height = 5,
  animate = true,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1
  const overflow = value > safeMax
  const ratio = clamp(value / safeMax, 0, 1)
  const fillColor = overflow ? '#ff453a' : color
  const trackColor = withAlpha(fillColor, 0.16)

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      style={{
        width: '100%',
        height,
        borderRadius: height,
        background: trackColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${ratio * 100}%`,
          height: '100%',
          background: fillColor,
          borderRadius: height,
          transition: animate ? 'width 0.7s cubic-bezier(0.34, 1.2, 0.64, 1)' : 'none',
        }}
      />
    </div>
  )
}
