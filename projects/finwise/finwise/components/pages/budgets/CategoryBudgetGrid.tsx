'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { useDeleteBudget } from '@/hooks/useBudgets'
import { formatCurrency, formatPercent, withAlpha } from '@/lib/utils'
import type { Budget } from '@/lib/types'

interface CategoryBudgetGridProps {
  items: Budget[]
  onEdit?: (b: Budget) => void
}

export default function CategoryBudgetGrid({ items, onEdit }: CategoryBudgetGridProps) {
  const del = useDeleteBudget()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 14,
      }}
    >
      {items.map((b) => {
        const over = b.spent > b.amount
        const ratio = (b.spent / b.amount) * 100
        return (
          <GlassCard
            key={b.id}
            onClick={() => onEdit?.(b)}
            style={{
              padding: 22,
              borderColor: over ? 'rgba(255,67,58,0.22)' : undefined,
              cursor: onEdit ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  aria-hidden
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: withAlpha(b.categoryColor, 0.18),
                    fontSize: 20,
                  }}
                >
                  {b.categoryIcon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{b.categoryName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
                    预算 {formatCurrency(b.amount)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: over ? '#ff453a' : 'var(--color-label-primary)',
                  }}
                >
                  {formatPercent(ratio, 0)}
                </div>
                <button
                  type="button"
                  title="删除预算"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确认删除「${b.categoryName}」预算?`)) del.mutate(b.id)
                  }}
                  disabled={del.isPending}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--color-label-tertiary)',
                    cursor: del.isPending ? 'wait' : 'pointer',
                    fontSize: 13,
                    lineHeight: 1,
                    transition: 'background 0.18s, color 0.18s, border-color 0.18s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,67,58,0.12)'
                    e.currentTarget.style.color = '#ff453a'
                    e.currentTarget.style.borderColor = 'rgba(255,67,58,0.30)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-label-tertiary)'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <ProgressBar value={b.spent} max={b.amount} color={b.categoryColor} height={6} />

            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--color-label-tertiary)',
              }}
            >
              <span>已用 {formatCurrency(b.spent)}</span>
              <span style={{ color: over ? '#ff453a' : 'var(--color-label-secondary)' }}>
                {over ? '超支 ' : '剩余 '}
                {formatCurrency(Math.abs(b.amount - b.spent))}
              </span>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}
