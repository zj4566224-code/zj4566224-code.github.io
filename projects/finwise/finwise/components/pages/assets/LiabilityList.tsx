'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { useDeleteLiability } from '@/hooks/useAssets'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Liability } from '@/lib/types'

interface LiabilityListProps {
  items: Liability[]
  onAdd?: () => void
  onEdit?: (l: Liability) => void
}

export default function LiabilityList({ items, onAdd, onEdit }: LiabilityListProps) {
  const del = useDeleteLiability()

  return (
    <GlassCard enableGlow={false} style={{ padding: 0 }}>
      <Header title="负债" onAdd={onAdd} />
      {items.length === 0 ? (
        <Empty text="还没有负债记录" />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((l) => {
            const paid = Math.max(0, l.totalAmount - l.remaining)
            return (
              <li
                key={l.id}
                onClick={() => onEdit?.(l)}
                style={{
                  padding: '14px 22px',
                  borderTop: '1px solid var(--color-row-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
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
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{l.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-label-tertiary)',
                        marginTop: 2,
                      }}
                    >
                      {l.type} · {l.interestRate}%
                      {l.dueDate && ` · 到期 ${formatDate(l.dueDate, { withYear: true })}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#ff453a' }}>
                      {formatCurrency(l.remaining)}
                    </div>
                    <DeleteButton
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`确认删除「${l.name}」?`)) del.mutate(l.id)
                      }}
                      disabled={del.isPending}
                    />
                  </div>
                </div>
                <ProgressBar value={paid} max={l.totalAmount} color="#ff453a" height={4} />
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}

function Header({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 22px 8px',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <button
        type="button"
        onClick={onAdd}
        disabled={!onAdd}
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 9,
          background: 'var(--color-label-quaternary)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-label-secondary)',
          cursor: onAdd ? 'pointer' : 'not-allowed',
        }}
      >
        ＋ 添加
      </button>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '24px 22px',
        fontSize: 13,
        color: 'var(--color-label-tertiary)',
        textAlign: 'center',
        borderTop: '1px solid var(--color-row-divider)',
      }}
    >
      {text}
    </div>
  )
}

function DeleteButton({
  onClick,
  disabled,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="删除"
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--color-label-tertiary)',
        cursor: disabled ? 'wait' : 'pointer',
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
  )
}
