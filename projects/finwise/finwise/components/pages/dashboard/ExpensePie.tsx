'use client'

import GlassCard from '@/components/ui/GlassCard'
import PieChart, { PieDatum } from '@/components/charts/PieChart'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

export default function ExpensePie({ transactions }: { transactions: Transaction[] }) {
  const grouped = new Map<string, PieDatum>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const entry = grouped.get(t.categoryName)
    if (entry) entry.value += t.amount
    else grouped.set(t.categoryName, { name: t.categoryName, value: t.amount, color: t.categoryColor })
  }
  const data = Array.from(grouped.values()).sort((a, b) => b.value - a.value)
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <GlassCard style={{ padding: 22, flex: 1, minWidth: 280 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>本月支出分布</div>
        <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          合计 {formatCurrency(total)}
        </div>
      </div>
      {data.length > 0 ? (
        <PieChart
          data={data}
          height={240}
          formatTooltip={(v, name) => [formatCurrency(Number(v)), name]}
        />
      ) : (
        <Empty />
      )}
    </GlassCard>
  )
}

function Empty() {
  return (
    <div
      style={{
        height: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-label-tertiary)',
        fontSize: 13,
      }}
    >
      本月暂无支出记录
    </div>
  )
}
