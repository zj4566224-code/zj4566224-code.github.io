'use client'

import {
  Cell,
  Legend,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export interface PieDatum {
  name: string
  value: number
  color: string
}

interface PieChartProps {
  data: PieDatum[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  formatTooltip?: (v: number, name: string) => [string, string]
}

export default function PieChart({
  data,
  height = 240,
  innerRadius = 56,
  outerRadius = 88,
  formatTooltip,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          stroke="var(--color-bg-primary)"
          strokeWidth={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
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
        <Legend
          iconType="circle"
          iconSize={8}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: 12, color: 'var(--color-label-secondary)' }}
        />
      </RPieChart>
    </ResponsiveContainer>
  )
}
