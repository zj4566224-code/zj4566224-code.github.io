'use client'

import { ReactNode } from 'react'
import GlassCard from './GlassCard'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  accentColor?: string
  className?: string
}

export default function StatCard({
  label,
  value,
  hint,
  accentColor,
  className = '',
}: StatCardProps) {
  return (
    <GlassCard className={className} style={{ padding: 22 }}>
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-label-secondary)',
          letterSpacing: 0.2,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -0.4,
          color: accentColor ?? 'var(--color-label-primary)',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          {hint}
        </div>
      )}
    </GlassCard>
  )
}
