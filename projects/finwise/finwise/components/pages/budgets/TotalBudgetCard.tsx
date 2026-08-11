'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { useDeleteBudget } from '@/hooks/useBudgets'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { Budget } from '@/lib/types'

interface TotalBudgetCardProps {
  total: Budget
  onEdit?: () => void
}

export default function TotalBudgetCard({ total, onEdit }: TotalBudgetCardProps) {
  const ratio = (total.spent / total.amount) * 100
  const remaining = total.amount - total.spent
  const over = remaining < 0
  const del = useDeleteBudget()

  return (
    <GlassCard
      onClick={onEdit}
      style={{
        padding: 32,
        backgroundImage:
          'linear-gradient(135deg, rgba(10,132,255,0.18), rgba(110,108,232,0.06))',
        cursor: onEdit ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-label-secondary)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            本月总预算
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: -0.8,
              color: 'var(--color-label-primary)',
            }}
          >
            {formatCurrency(total.amount)}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: 'var(--color-label-tertiary)',
            }}
          >
            已用 {formatCurrency(total.spent)} · {over ? '超支' : '剩余'}{' '}
            <span style={{ color: over ? '#ff453a' : '#32d74b' }}>
              {formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', position: 'relative' }}>
          <button
            type="button"
            title="删除总预算"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('确认删除本月总预算?')) del.mutate(total.id)
            }}
            disabled={del.isPending}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--color-label-tertiary)',
              cursor: del.isPending ? 'wait' : 'pointer',
              fontSize: 14,
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
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: -1,
              color: over ? '#ff453a' : 'var(--color-label-primary)',
              lineHeight: 1,
            }}
          >
            {formatPercent(ratio, 0)}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: 'var(--color-label-tertiary)',
            }}
          >
            已使用
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <ProgressBar value={total.spent} max={total.amount} color="#0a84ff" height={8} />
      </div>
    </GlassCard>
  )
}
