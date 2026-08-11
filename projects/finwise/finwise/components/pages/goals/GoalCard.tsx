'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { useDeleteGoal } from '@/hooks/useGoals'
import { daysUntil, formatCurrency, formatDate, formatPercent, withAlpha } from '@/lib/utils'
import type { Goal } from '@/lib/types'

interface GoalCardProps {
  goal: Goal
  onContribute?: () => void
  onEdit?: () => void
}

export default function GoalCard({ goal, onContribute, onEdit }: GoalCardProps) {
  const ratio = (goal.currentAmount / goal.targetAmount) * 100
  const remaining = goal.targetAmount - goal.currentAmount
  const days = goal.deadline ? daysUntil(goal.deadline) : null
  const del = useDeleteGoal()

  return (
    <GlassCard
      style={{ padding: 22, cursor: onEdit ? 'pointer' : 'default' }}
      onClick={onEdit}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            aria-hidden
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: withAlpha(goal.color, 0.22),
              fontSize: 24,
            }}
          >
            {goal.icon}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{goal.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginTop: 4 }}>
              {goal.deadline
                ? `截止 ${formatDate(goal.deadline, { withYear: true })} · 还剩 ${days} 天`
                : '无截止日期'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.4,
              color: goal.color,
            }}
          >
            {formatPercent(ratio, 0)}
          </div>
          <button
            type="button"
            title="删除目标"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`确认删除目标「${goal.name}」?`)) del.mutate(goal.id)
            }}
            disabled={del.isPending}
            style={{
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
              marginTop: 4,
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

      <ProgressBar value={goal.currentAmount} max={goal.targetAmount} color={goal.color} height={7} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginTop: 16,
          fontSize: 13,
        }}
      >
        <Cell label="已存入" value={formatCurrency(goal.currentAmount)} />
        <Cell label="还差" value={formatCurrency(remaining)} />
        <Cell label="目标" value={formatCurrency(goal.targetAmount)} />
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onContribute?.()
          }}
          disabled={!onContribute || goal.status === 'completed'}
          style={{
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 10,
            background: withAlpha(goal.color, 0.16),
            border: `1px solid ${withAlpha(goal.color, 0.4)}`,
            color: goal.color,
            cursor: onContribute && goal.status !== 'completed' ? 'pointer' : 'not-allowed',
            opacity: goal.status === 'completed' ? 0.5 : 1,
          }}
        >
          {goal.status === 'completed' ? '已完成' : '存入金额'}
        </button>
      </div>
    </GlassCard>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, color: 'var(--color-label-primary)' }}>{value}</div>
    </div>
  )
}
