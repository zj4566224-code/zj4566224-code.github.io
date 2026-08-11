'use client'

import GlassCard from '@/components/ui/GlassCard'
import { useDeleteTransaction } from '@/hooks/useTransactions'
import { formatCurrency, formatDate, withAlpha } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

interface TransactionListProps {
  items: Transaction[]
  onEdit?: (t: Transaction) => void
}

export default function TransactionList({ items, onEdit }: TransactionListProps) {
  const del = useDeleteTransaction()

  if (items.length === 0) {
    return (
      <GlassCard enableGlow={false} style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--color-label-tertiary)' }}>暂无记录</div>
      </GlassCard>
    )
  }
  return (
    <GlassCard enableGlow={false} style={{ padding: 0 }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((t, i) => (
          <li
            key={t.id}
            onClick={() => onEdit?.(t)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 22px',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-row-divider)',
              cursor: onEdit ? 'pointer' : 'default',
              transition: 'background 0.18s',
            }}
            onMouseEnter={(e) => {
              if (onEdit) e.currentTarget.style.background = 'var(--color-row-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: withAlpha(t.categoryColor, 0.16),
                fontSize: 18,
              }}
            >
              {t.categoryIcon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--color-label-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.note ?? t.categoryName}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--color-label-tertiary)',
                  marginTop: 2,
                }}
              >
                {t.categoryName} · {formatDate(t.date)}
              </div>
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: t.type === 'income' ? '#32d74b' : 'var(--color-label-primary)',
                letterSpacing: -0.2,
              }}
            >
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </div>

            <button
              type="button"
              title="删除"
              onClick={(e) => {
                e.stopPropagation()
                const label = t.note ?? t.categoryName
                if (confirm(`确认删除「${label}」?`)) del.mutate(t.id)
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
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
