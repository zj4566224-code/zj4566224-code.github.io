'use client'

import GlassCard from '@/components/ui/GlassCard'
import BarChart from '@/components/charts/BarChart'
import { formatCompactCurrency, formatCurrency } from '@/lib/utils'
import type { ForecastData } from '@/lib/types'

export default function SavingsForecast({ data }: { data: ForecastData[] }) {
  // 将 actual / forecast 拆为两列，且预测列透明度递减
  const series = data.map((d, i, arr) => {
    const [, m] = d.month.split('-')
    const totalForecast = arr.filter((x) => x.isForecast).length
    const forecastIdx = arr.slice(0, i + 1).filter((x) => x.isForecast).length - 1
    const fadeStep = totalForecast > 0 ? (forecastIdx / Math.max(totalForecast - 1, 1)) * 0.45 : 0
    return {
      month: `${Number(m)}月`,
      actual: d.isForecast ? 0 : d.savings,
      forecast: d.isForecast ? d.savings : 0,
      forecastOpacity: 1 - fadeStep,
    }
  })

  return (
    <GlassCard style={{ padding: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>未来 6 个月储蓄预测</div>
        <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          基于近半年趋势预测
        </div>
      </div>

      <BarChart
        data={series}
        xKey="month"
        height={240}
        formatTick={(v) => formatCompactCurrency(v)}
        formatTooltip={(v) => [formatCurrency(Number(v)), '储蓄']}
        series={[
          { key: 'actual', label: '本月实际', color: '#32d74b' },
          { key: 'forecast', label: '预测', color: '#5ac8fa', opacity: 0.6 },
        ]}
      />
    </GlassCard>
  )
}
