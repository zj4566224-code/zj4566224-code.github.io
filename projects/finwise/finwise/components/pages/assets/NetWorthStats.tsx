'use client'

import GlassCard from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'

interface NetWorthStatsProps {
  totalAssets: number
  totalLiabilities: number
}

export default function NetWorthStats({ totalAssets, totalLiabilities }: NetWorthStatsProps) {
  const net = totalAssets - totalLiabilities
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      <Cell label="总资产" value={totalAssets} color="#32d74b" hint="包含现金、存款、投资" />
      <Cell label="总负债" value={totalLiabilities} color="#ff453a" hint="信用卡、贷款" />
      <Cell label="净资产" value={net} hint="资产 − 负债" />
    </div>
  )
}

function Cell({
  label,
  value,
  color,
  hint,
}: {
  label: string
  value: number
  color?: string
  hint: string
}) {
  return (
    <GlassCard style={{ padding: 22, flex: '1 1 220px' }}>
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
          color: color ?? 'var(--color-label-primary)',
        }}
      >
        {formatCurrency(value)}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
        {hint}
      </div>
    </GlassCard>
  )
}
