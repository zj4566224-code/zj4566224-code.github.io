'use client'

import GlassCard from '@/components/ui/GlassCard'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface HeroCardProps {
  net: number
  income: number
  expense: number
  savingsRate: number
  delta: number
}

export default function HeroCard({ net, income, expense, savingsRate, delta }: HeroCardProps) {
  const deltaPositive = delta >= 0
  return (
    <GlassCard
      style={{
        padding: 32,
        backgroundImage:
          'linear-gradient(135deg, var(--color-glass-bg), transparent)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-label-secondary)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            本月净结余
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: -1,
              lineHeight: 1.05,
              color: 'var(--color-label-primary)',
            }}
          >
            {formatCurrency(net)}
          </div>

          <div style={{ display: 'flex', gap: 28, marginTop: 22, flexWrap: 'wrap' }}>
            <MiniStat label="收入" value={formatCurrency(income)} color="#32d74b" />
            <MiniStat label="支出" value={formatCurrency(expense)} color="#ff453a" />
            <MiniStat label="储蓄率" value={formatPercent(savingsRate)} color="#5ac8fa" />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-label-tertiary)',
              marginBottom: 6,
            }}
          >
            较上月
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: deltaPositive ? '#32d74b' : '#ff453a',
            }}
          >
            {deltaPositive ? '+' : '-'}
            {formatCurrency(Math.abs(delta))}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}
