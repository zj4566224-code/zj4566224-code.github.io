'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  mockHealthScore,
  mockSuggestions,
  mockForecast,
  mockMonthlyTrend,
  getMockSummary,
} from '@/lib/mockData'
import type { ForecastData, HealthScore, MonthlyData, Suggestion } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface AnalysisPayload {
  health: HealthScore
  suggestions: Suggestion[]
  forecast: ForecastData[]
}

interface BackendHealthScore {
  total: number
  breakdown: {
    savings_rate: number
    budget_control: number
    debt_ratio: number
    goal_progress: number
  }
}

interface BackendForecastEntry {
  month: string
  predicted: number
  is_actual: boolean
}

interface BackendReport {
  health_score: BackendHealthScore
  suggestions: Suggestion[]
  monthly_data: MonthlyData[]
  forecast: BackendForecastEntry[]
}

function mapHealth(h: BackendHealthScore): HealthScore {
  return {
    total: h.total,
    breakdown: {
      savingsRate: h.breakdown.savings_rate,
      budgetControl: h.breakdown.budget_control,
      debtRatio: h.breakdown.debt_ratio,
      goalProgress: h.breakdown.goal_progress,
    },
  }
}

function mapForecast(items: BackendForecastEntry[]): ForecastData[] {
  return items.map((f) => ({
    month: f.month,
    savings: f.predicted,
    isForecast: !f.is_actual,
  }))
}

async function fetchAnalysis(): Promise<AnalysisPayload> {
  if (USE_MOCK) {
    return { health: mockHealthScore, suggestions: mockSuggestions, forecast: mockForecast }
  }
  const res = await api.get<BackendReport>('/analysis/report')
  return {
    health: mapHealth(res.data.health_score),
    suggestions: res.data.suggestions,
    forecast: mapForecast(res.data.forecast),
  }
}

export function useAnalysis() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['analysis'],
    queryFn: fetchAnalysis,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK
      ? { health: mockHealthScore, suggestions: mockSuggestions, forecast: mockForecast }
      : undefined,
  })
}

interface TrendSummary {
  monthIncome: number
  monthExpense: number
  monthNet: number
  savingsRate: number
  deltaVsPrev: number
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

interface TrendPayload {
  monthly: MonthlyData[]
  summary: TrendSummary
}

function summarize(monthly: MonthlyData[], totalAssets = 0, totalLiabilities = 0): TrendSummary {
  const current = monthly[monthly.length - 1] ?? { month: '', income: 0, expense: 0, savings: 0 }
  const previous = monthly[monthly.length - 2] ?? { month: '', income: 0, expense: 0, savings: 0 }
  const monthNet = current.income - current.expense
  const prevNet = previous.income - previous.expense
  return {
    monthIncome: current.income,
    monthExpense: current.expense,
    monthNet,
    savingsRate: current.income > 0 ? (current.savings / current.income) * 100 : 0,
    deltaVsPrev: monthNet - prevNet,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  }
}

async function fetchTrend(): Promise<TrendPayload> {
  if (USE_MOCK) return { monthly: mockMonthlyTrend, summary: getMockSummary() }
  const [monthlyRes, netRes] = await Promise.all([
    api.get<MonthlyData[]>('/analysis/monthly'),
    api.get<{ total_assets: number; total_liabilities: number; net_worth: number }>('/net-worth'),
  ])
  // 后端用 Decimal,axios 反序列化后是字符串,在这里转 number
  const monthly = monthlyRes.data.map((m) => ({
    month: m.month,
    income: Number(m.income),
    expense: Number(m.expense),
    savings: Number(m.savings),
  }))
  return {
    monthly,
    summary: summarize(monthly, Number(netRes.data.total_assets), Number(netRes.data.total_liabilities)),
  }
}

export function useTrend() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['trend'],
    queryFn: fetchTrend,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? { monthly: mockMonthlyTrend, summary: getMockSummary() } : undefined,
  })
}

// ─── 行为洞察 + 现金流 ────────────────────
interface RawInsights {
  window_days: number
  weekday_vs_weekend: { weekday_avg: number; weekend_avg: number; delta_pct: number }
  day_of_week: { day: number; label: string; expense: number }[]
  small_tx_trend: { threshold: number; current_count: number; previous_count: number; delta_pct: number }
  top_category: {
    category_id: number
    name: string
    icon: string | null
    color: string | null
    total: number
    share_pct: number
    top_day_label: string
    top_day_share_pct: number
  } | null
}

interface RawCashflow {
  window_days: number
  total_balance: number
  total_daily_burn: number
  total_days_remaining: number | null
  accounts: {
    account_id: number
    name: string
    type: string
    color: string | null
    balance: number
    daily_burn: number
    days_remaining: number | null
    level: 'critical' | 'warning' | 'ok' | 'inflow'
  }[]
}

import type { CashflowData, InsightsData } from '@/lib/types'

export function useInsights() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['insights'],
    queryFn: async (): Promise<InsightsData> => {
      const res = await api.get<RawInsights>('/analysis/insights')
      const r = res.data
      return {
        windowDays: r.window_days,
        weekdayVsWeekend: {
          weekdayAvg: r.weekday_vs_weekend.weekday_avg,
          weekendAvg: r.weekday_vs_weekend.weekend_avg,
          deltaPct: r.weekday_vs_weekend.delta_pct,
        },
        dayOfWeek: r.day_of_week,
        smallTxTrend: {
          threshold: r.small_tx_trend.threshold,
          currentCount: r.small_tx_trend.current_count,
          previousCount: r.small_tx_trend.previous_count,
          deltaPct: r.small_tx_trend.delta_pct,
        },
        topCategory: r.top_category && {
          categoryId: r.top_category.category_id,
          name: r.top_category.name,
          icon: r.top_category.icon,
          color: r.top_category.color,
          total: r.top_category.total,
          sharePct: r.top_category.share_pct,
          topDayLabel: r.top_category.top_day_label,
          topDaySharePct: r.top_category.top_day_share_pct,
        },
      }
    },
    enabled: !USE_MOCK && !!token,
  })
}

export function useCashflow() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['cashflow'],
    queryFn: async (): Promise<CashflowData> => {
      const res = await api.get<RawCashflow>('/analysis/cashflow')
      const r = res.data
      return {
        windowDays: r.window_days,
        totalBalance: r.total_balance,
        totalDailyBurn: r.total_daily_burn,
        totalDaysRemaining: r.total_days_remaining,
        accounts: r.accounts.map((a) => ({
          accountId: a.account_id,
          name: a.name,
          type: a.type,
          color: a.color,
          balance: a.balance,
          dailyBurn: a.daily_burn,
          daysRemaining: a.days_remaining,
          level: a.level,
        })),
      }
    },
    enabled: !USE_MOCK && !!token,
  })
}
