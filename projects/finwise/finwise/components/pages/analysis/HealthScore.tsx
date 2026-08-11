'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import type { HealthScore as HealthScoreT } from '@/lib/types'

export default function HealthScore({ score }: { score: HealthScoreT }) {
  const items = [
    { label: '储蓄率', value: score.breakdown.savingsRate, color: '#32d74b' },
    { label: '预算控制', value: score.breakdown.budgetControl, color: '#ff9f0a' },
    { label: '负债水平', value: score.breakdown.debtRatio, color: '#0a84ff' },
    { label: '目标进度', value: score.breakdown.goalProgress, color: '#bf5af2' },
  ]

  return (
    <GlassCard
      style={{
        padding: 28,
        backgroundImage:
          'linear-gradient(135deg, rgba(50,215,75,0.16), rgba(10,132,255,0.04))',
        flex: 1,
        minWidth: 280,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-label-secondary)',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        财务健康评分
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1.2,
            lineHeight: 1,
            color: 'var(--color-label-primary)',
          }}
        >
          {score.total}
        </span>
        <span style={{ fontSize: 14, color: 'var(--color-label-tertiary)' }}>/100</span>
      </div>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--color-label-secondary)',
              }}
            >
              <span>{it.label}</span>
              <span style={{ color: 'var(--color-label-primary)', fontWeight: 600 }}>
                {it.value}
              </span>
            </div>
            <ProgressBar value={it.value} max={100} color={it.color} height={5} />
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
