'use client'

import GlassCard from '@/components/ui/GlassCard'
import BarChart from '@/components/charts/BarChart'
import { formatCompactCurrency, formatCurrency } from '@/lib/utils'
import type { MonthlyData } from '@/lib/types'

export default function TrendChart({ data }: { data: MonthlyData[] }) {
  const chartData = data.map((d) => {
    const [, m] = d.month.split('-')
    return {
      month: `${Number(m)}月`,
      income: d.income,
      expense: d.expense,
    }
  })

  return (
    <GlassCard style={{ padding: 22, flex: 2, minWidth: 360 }}>
      <Header title="近 6 个月收支" subtitle="单位：元" />
      <BarChart
        data={chartData}
        xKey="month"
        height={240}
        formatTick={(v) => formatCompactCurrency(v)}
        formatTooltip={(v, name) => [formatCurrency(Number(v)), name]}
        series={[
          { key: 'income', label: '收入', color: '#32d74b' },
          { key: 'expense', label: '支出', color: '#ff453a' },
        ]}
      />
    </GlassCard>
  )
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>{subtitle}</div>
      )}
    </div>
  )
}
