'use client'

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface BarSeries {
  key: string
  label: string
  color: string
  opacity?: number
}

interface BarChartProps {
  data: Record<string, string | number>[]
  xKey: string
  series: BarSeries[]
  height?: number
  formatTick?: (v: number) => string
  formatTooltip?: (v: number, name: string) => [string, string]
  showLegend?: boolean
}

export default function BarChart({
  data,
  xKey,
  series,
  height = 240,
  formatTick,
  formatTooltip,
  showLegend = true,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--color-label-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--color-border-subtle)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--color-label-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatTick}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-label-quaternary)' }}
          contentStyle={{
            background: 'var(--color-modal-bg)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 12,
            fontSize: 12,
            padding: '8px 12px',
            color: 'var(--color-label-primary)',
          }}
          labelStyle={{ color: 'var(--color-label-secondary)' }}
          itemStyle={{ color: 'var(--color-label-primary)' }}
          formatter={formatTooltip as never}
        />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 4, color: 'var(--color-label-secondary)' }}
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            radius={[6, 6, 0, 0]}
            opacity={s.opacity ?? 1}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  )
}
