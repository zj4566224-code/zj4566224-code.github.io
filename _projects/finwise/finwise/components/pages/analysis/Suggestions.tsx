'use client'

import GlassCard from '@/components/ui/GlassCard'
import type { Suggestion } from '@/lib/types'

interface LevelStyle {
  bg: string
  border: string
  iconBg: string
  icon: string
}

const LEVEL_STYLE: Record<Suggestion['level'], LevelStyle> = {
  warn: {
    bg: 'rgba(255,67,58,0.10)',
    border: 'rgba(255,67,58,0.32)',
    iconBg: 'rgba(255,67,58,0.22)',
    icon: '⚠',
  },
  ok: {
    bg: 'rgba(50,215,75,0.10)',
    border: 'rgba(50,215,75,0.32)',
    iconBg: 'rgba(50,215,75,0.22)',
    icon: '✓',
  },
  tip: {
    bg: 'rgba(10,132,255,0.10)',
    border: 'rgba(10,132,255,0.32)',
    iconBg: 'rgba(10,132,255,0.22)',
    icon: '💡',
  },
}

export default function Suggestions({ items }: { items: Suggestion[] }) {
  return (
    <GlassCard style={{ padding: 22, flex: 1, minWidth: 280 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>个性化建议</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => {
          const s = LEVEL_STYLE[it.level]
          return (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: s.bg,
                border: `1px solid ${s.border}`,
              }}
            >
              <span
                aria-hidden
                style={{
                  flex: '0 0 auto',
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: s.iconBg,
                  fontSize: 13,
                }}
              >
                {s.icon}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-label-primary)' }}>
                {it.text}
              </span>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
