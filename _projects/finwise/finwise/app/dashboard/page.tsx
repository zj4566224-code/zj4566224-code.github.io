'use client'

import PageShell from '@/components/layout/PageShell'
import HeroCard from '@/components/pages/dashboard/HeroCard'
import TrendChart from '@/components/pages/dashboard/TrendChart'
import ExpensePie from '@/components/pages/dashboard/ExpensePie'
import BudgetOverview from '@/components/pages/dashboard/BudgetOverview'
import { useAppStore } from '@/store/useAppStore'
import { useTrend } from '@/hooks/useAnalysis'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { currentYearMonth, daysLeftInMonth, greeting } from '@/lib/utils'

export default function DashboardPage() {
  const user = useAppStore((s) => s.user)
  const { data: trend } = useTrend()
  const { data: transactions = [] } = useTransactions()
  const { data: budgets = [] } = useBudgets()

  const now = new Date()
  const displayName = user?.name ?? user?.email ?? ''

  return (
    <PageShell>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>
          {greeting(now)}{displayName ? `，${displayName}` : ''}
        </h1>
        <div
          style={{
            marginTop: 6,
            fontSize: 14,
            color: 'var(--color-label-secondary)',
          }}
        >
          {currentYearMonth(now)} · 本月还剩 {daysLeftInMonth(now)} 天
        </div>
      </header>

      {trend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <HeroCard
            net={trend.summary.monthNet}
            income={trend.summary.monthIncome}
            expense={trend.summary.monthExpense}
            savingsRate={trend.summary.savingsRate}
            delta={trend.summary.deltaVsPrev}
          />

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <TrendChart data={trend.monthly} />
            <ExpensePie transactions={transactions} />
          </div>

          <BudgetOverview budgets={budgets} />
        </div>
      )}
    </PageShell>
  )
}
