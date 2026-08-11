'use client'

import GlassCard from '@/components/ui/GlassCard'
import { useDeleteAsset } from '@/hooks/useAssets'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Asset } from '@/lib/types'

interface AssetListProps {
  items: Asset[]
  onAdd?: () => void
  onEdit?: (a: Asset) => void
}

export default function AssetList({ items, onAdd, onEdit }: AssetListProps) {
  const del = useDeleteAsset()

  return (
    <GlassCard enableGlow={false} style={{ padding: 0 }}>
      <Header title="资产" onAdd={onAdd} />
      {items.length === 0 ? (
        <Empty text="还没有资产记录" />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((a) => (
            <li
              key={a.id}
              onClick={() => onEdit?.(a)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                borderTop: '1px solid var(--color-row-divider)',
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginTop: 2 }}>
                  {a.type} · 更新于 {formatDate(a.updatedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#32d74b' }}>
                  {formatCurrency(a.value)}
                </div>
                <DeleteButton
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确认删除「${a.name}」?`)) del.mutate(a.id)
                  }}
                  disabled={del.isPending}
                />
              </div>
            </li>
          ))}
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
