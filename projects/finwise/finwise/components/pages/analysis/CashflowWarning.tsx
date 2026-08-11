'use client'

import GlassCard from '@/components/ui/GlassCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatCurrency, withAlpha } from '@/lib/utils'
import type { CashflowData, RunwayLevel } from '@/lib/types'

const LEVEL_COLOR: Record<RunwayLevel, string> = {
  critical: '#ff453a',
  warning: '#ff9f0a',
  ok: '#32d74b',
  inflow: '#5ac8fa',
}

const LEVEL_LABEL: Record<RunwayLevel, string> = {
  critical: '紧急',
  warning: '注意',
  ok: '安全',
  inflow: '净流入',
}

export default function CashflowWarning({ data }: { data: CashflowData }) {
  const sorted = data.accounts
  const hasCritical = sorted.some((a) => a.level === 'critical')
  const hasWarning = sorted.some((a) => a.level === 'warning')

  const overallText = hasCritical
    ? `有账户按当前节奏将在 30 天内耗尽`
    : hasWarning
      ? `有账户余额将在 90 天内告急`
      : data.totalDailyBurn <= 0
        ? `近 ${data.windowDays} 天整体净流入,无消耗压力`
        : `按近 ${data.windowDays} 天节奏,总余额可支撑约 ${formatDays(data.totalDaysRemaining)}`

  return (
    <GlassCard style={{ padding: 26 }}>
      <Header
        title="账户现金流预警"
        subtitle={`基于近 ${data.windowDays} 天净流出速率`}
      />

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          paddingBottom: 14,
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <Stat label="总余额" value={formatCurrency(data.totalBalance)} />
        <Stat
          label="日均净流出"
          value={
            data.totalDailyBurn > 0
              ? formatCurrency(data.totalDailyBurn)
              : `净流入 ${formatCurrency(-data.totalDailyBurn)}`
          }
          color={data.totalDailyBurn > 0 ? '#ff9f0a' : '#32d74b'}
        />
        <Stat
          label="总体可撑"
          value={
            data.totalDailyBurn <= 0
              ? '—'
              : data.totalDaysRemaining != null
                ? formatDays(data.totalDaysRemaining)
                : '—'
          }
        />
      </div>

      <div
        style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 11,
          fontSize: 13,
          color: hasCritical ? '#ff453a' : hasWarning ? '#ff9f0a' : 'var(--color-label-secondary)',
          background: hasCritical
            ? 'rgba(255,67,58,0.10)'
            : hasWarning
              ? 'rgba(255,159,10,0.10)'
              : 'var(--color-input-bg)',
        }}
      >
        {overallText}
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: '14px 0 0',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {sorted.length === 0 && (
          <li style={{ fontSize: 13, color: 'var(--color-label-tertiary)' }}>暂无账户</li>
        )}
        {sorted.map((a) => (
          <AccountRow key={a.accountId} account={a} />
        ))}
      </ul>
    </GlassCard>
  )
}

function AccountRow({ account }: { account: CashflowData['accounts'][number] }) {
  const color = LEVEL_COLOR[account.level]
  const isInflow = account.level === 'inflow'
  const text = isInflow
    ? `近 30 天日均净流入 ${formatCurrency(-account.dailyBurn)}`
    : account.daysRemaining != null
      ? `按日均 ${formatCurrency(account.dailyBurn)} 流出,可支撑 ${formatDays(account.daysRemaining)}`
      : `日均净流出 ${formatCurrency(account.dailyBurn)}`

  // 进度条:剩余天数相对于 90 天阈值的"安全度"
  const safetyRatio = isInflow
    ? 1
    : account.daysRemaining != null
      ? Math.min(account.daysRemaining / 90, 1)
      : 0

  return (
    <li
      style={{
        padding: 12,
        background: 'var(--color-input-bg)',
        border: `1px solid var(--color-border-subtle)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: account.color || '#0a84ff',
          }}
        />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{account.name}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 9px',
            borderRadius: 999,
            background: withAlpha(color, 0.18),
            color,
            border: `1px solid ${withAlpha(color, 0.35)}`,
          }}
        >
          {LEVEL_LABEL[account.level]}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formatCurrency(account.balance)}</span>
      </div>
      <ProgressBar value={safetyRatio} max={1} color={color} height={4} />
      <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--color-label-tertiary)' }}>
        {text}
      </div>
    </li>
  )
}

function formatDays(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return '—'
  if (days < 1) return '不足 1 天'
  if (days < 60) return `${Math.floor(days)} 天`
  const months = days / 30
  if (months < 24) return `约 ${months.toFixed(1)} 个月`
  return `约 ${(months / 12).toFixed(1)} 年`
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--color-label-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? 'var(--color-label-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
