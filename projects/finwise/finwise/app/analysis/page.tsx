'use client'

import PageShell from '@/components/layout/PageShell'
import HealthScore from '@/components/pages/analysis/HealthScore'
import Suggestions from '@/components/pages/analysis/Suggestions'
import SavingsForecast from '@/components/pages/analysis/SavingsForecast'
import BehaviorInsights from '@/components/pages/analysis/BehaviorInsights'
import CashflowWarning from '@/components/pages/analysis/CashflowWarning'
import { useAnalysis, useCashflow, useInsights } from '@/hooks/useAnalysis'

export default function AnalysisPage() {
  const { data } = useAnalysis()
  const { data: insights } = useInsights()
  const { data: cashflow } = useCashflow()

  return (
    <PageShell>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>分析报告</h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--color-label-secondary)' }}>
          FinWise 根据你的最近 6 个月数据给出诊断
        </div>
      </header>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <HealthScore score={data.health} />
            <Suggestions items={data.suggestions} />
          </div>
          {cashflow && <CashflowWarning data={cashflow} />}
          {insights && <BehaviorInsights data={insights} />}
          <SavingsForecast data={data.forecast} />
        </div>
      )}
    </PageShell>
  )
}
