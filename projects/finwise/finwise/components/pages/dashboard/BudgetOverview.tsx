'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { Budget } from '@/lib/types'

export default function BudgetOverview({ budgets }: { budgets: Budget[] }) {
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null)

  return (
    <GlassCard style={{ padding: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>预算执行</div>
        <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          共 {categoryBudgets.length} 项分类
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 18,
        }}
      >
        {categoryBudgets.map((b) => {
          const over = b.spent > b.amount
          const ratio = (b.spent / b.amount) * 100
          return (
            <div
              key={b.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '14px 14px',
                borderRadius: 14,
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span style={{ fontSize: 16 }}>{b.categoryIcon}</span>
                  {b.categoryName}
                </span>
                {over && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,67,58,0.18)',
                      color: '#ff453a',
                    }}
                  >
                    超支
                  </span>
                )}
              </div>
              <ProgressBar value={b.spent} max={b.amount} color={b.categoryColor} height={6} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--color-label-tertiary)',
                }}
              >
                <span>
                  {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                </span>
                <span style={{ color: over ? '#ff453a' : 'var(--color-label-secondary)' }}>
                  {formatPercent(ratio, 0)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
