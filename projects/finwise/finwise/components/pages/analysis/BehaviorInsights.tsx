'use client'

import GlassCard from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import type { InsightsData } from '@/lib/types'

export default function BehaviorInsights({ data }: { data: InsightsData }) {
  const { weekdayVsWeekend, dayOfWeek, smallTxTrend, topCategory } = data

  return (
    <GlassCard style={{ padding: 26 }}>
      <Header
        title="行为洞察"
        subtitle={`基于最近 ${data.windowDays} 天的支出习惯`}
      />

      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        <WeekdayWeekendInsight stat={weekdayVsWeekend} />
        <SmallTxInsight stat={smallTxTrend} />
        {topCategory && <TopCategoryInsight stat={topCategory} />}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-label-secondary)', marginBottom: 10 }}>
          按星期分布
        </div>
        <DayOfWeekChart buckets={dayOfWeek} />
      </div>
    </GlassCard>
  )
}

function WeekdayWeekendInsight({ stat }: { stat: InsightsData['weekdayVsWeekend'] }) {
  const more = stat.deltaPct > 0
  const same = Math.abs(stat.deltaPct) < 5
  const color = same ? '#5ac8fa' : more ? '#ff9f0a' : '#32d74b'
  const text = same
    ? '工作日和周末花费基本持平'
    : more
      ? `周末日均比工作日多 ${stat.deltaPct.toFixed(0)}%`
      : `周末日均比工作日少 ${Math.abs(stat.deltaPct).toFixed(0)}%`

  return (
    <InsightTile color={color} label="周末 vs 工作日" headline={text}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Mini label="工作日日均" value={formatCurrency(stat.weekdayAvg)} />
        <Mini label="周末日均" value={formatCurrency(stat.weekendAvg)} />
      </div>
    </InsightTile>
  )
}

function SmallTxInsight({ stat }: { stat: InsightsData['smallTxTrend'] }) {
  const up = stat.deltaPct > 5
  const down = stat.deltaPct < -5
  const color = up ? '#ff9f0a' : down ? '#32d74b' : '#5ac8fa'
  const headline =
    stat.previousCount === 0 && stat.currentCount === 0
      ? `本月暂无 < ${formatCurrency(stat.threshold)} 的小额支出`
      : up
        ? `小额支出次数同比上月 +${stat.deltaPct.toFixed(0)}%,警惕'冲动消费'`
        : down
          ? `小额支出次数同比上月 ${stat.deltaPct.toFixed(0)}%,控制得不错`
          : '小额支出次数基本持平'

  return (
    <InsightTile color={color} label={`小额(< ${formatCurrency(stat.threshold)})趋势`} headline={headline}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Mini label="本月" value={`${stat.currentCount} 笔`} />
        <Mini label="上月" value={`${stat.previousCount} 笔`} />
      </div>
    </InsightTile>
  )
}

function TopCategoryInsight({ stat }: { stat: NonNullable<InsightsData['topCategory']> }) {
  const color = stat.color || '#bf5af2'
  return (
    <InsightTile
      color={color}
      label="头部分类"
      headline={`${stat.icon ?? '📊'} ${stat.name} 占总支出 ${stat.sharePct.toFixed(0)}%,${stat.topDayLabel}最集中`}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <Mini label="累计" value={formatCurrency(stat.total)} />
        <Mini label={`${stat.topDayLabel}占比`} value={`${stat.topDaySharePct.toFixed(0)}%`} />
      </div>
    </InsightTile>
  )
}

function DayOfWeekChart({ buckets }: { buckets: InsightsData['dayOfWeek'] }) {
  const max = Math.max(...buckets.map((b) => b.expense), 1)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 8,
        alignItems: 'end',
      }}
    >
      {buckets.map((b) => {
        const h = max > 0 ? Math.max(2, (b.expense / max) * 100) : 2
        const isWeekend = b.day >= 5
        return (
          <div
            key={b.day}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              title={`${b.label}: ${formatCurrency(b.expense)}`}
              style={{
                width: '100%',
                height: 90,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${h}%`,
                  background: isWeekend
                    ? 'linear-gradient(180deg, #ff9f0a, #ff6a00)'
                    : 'linear-gradient(180deg, #0a84ff, #5ac8fa)',
                  borderRadius: '6px 6px 0 0',
                  opacity: b.expense > 0 ? 1 : 0.25,
                }}
              />
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--color-label-tertiary)' }}>{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function InsightTile({
  color,
  label,
  headline,
  children,
}: {
  color: string
  label: string
  headline: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--color-input-bg)',
        border: `1px solid var(--color-border-subtle)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 11.5, color: 'var(--color-label-tertiary)', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 500, lineHeight: 1.45 }}>
        {headline}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-label-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
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
