export interface User {
  id: number
  name: string
  email: string
  currency: string
}

export interface Account {
  id: number
  name: string
  type: 'cash' | 'bank' | 'credit' | 'investment'
  balance: number
  color: string
}

export interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
}

export interface Transaction {
  id: number
  accountId: number
  categoryId: number
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amount: number
  type: 'income' | 'expense'
  date: string
  note?: string
}

export interface Budget {
  id: number
  categoryId: number | null
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amount: number
  spent: number
  period: 'monthly' | 'yearly'
}

export interface Asset {
  id: number
  name: string
  type: string
  value: number
  updatedAt: string
}

export interface Liability {
  id: number
  name: string
  type: string
  totalAmount: number
  remaining: number
  interestRate: number
  dueDate: string
}

export interface Goal {
  id: number
  name: string
  icon: string
  color: string
  targetAmount: number
  currentAmount: number
  deadline: string
  status: 'active' | 'completed'
}

export interface HealthScore {
  total: number
  breakdown: {
    savingsRate: number
    budgetControl: number
    debtRatio: number
    goalProgress: number
  }
}

export interface Suggestion {
  level: 'warn' | 'ok' | 'tip'
  text: string
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
  savings: number
}

export interface ForecastData {
  month: string
  savings: number
  isForecast: boolean
}

// ─── 行为洞察 + 现金流 ────────────────────
export interface DayOfWeekBucket {
  day: number
  label: string
  expense: number
}

export interface WeekdayWeekendStat {
  weekdayAvg: number
  weekendAvg: number
  deltaPct: number
}

export interface SmallTxTrend {
  threshold: number
  currentCount: number
  previousCount: number
  deltaPct: number
}

export interface TopCategorySkew {
  categoryId: number
  name: string
  icon: string | null
  color: string | null
  total: number
  sharePct: number
  topDayLabel: string
  topDaySharePct: number
}

export interface InsightsData {
  windowDays: number
  weekdayVsWeekend: WeekdayWeekendStat
  dayOfWeek: DayOfWeekBucket[]
  smallTxTrend: SmallTxTrend
  topCategory: TopCategorySkew | null
}

export type RunwayLevel = 'critical' | 'warning' | 'ok' | 'inflow'

export interface AccountRunway {
  accountId: number
  name: string
  type: string
  color: string | null
  balance: number
  dailyBurn: number
  daysRemaining: number | null
  level: RunwayLevel
}

export interface CashflowData {
  windowDays: number
  totalBalance: number
  totalDailyBurn: number
  totalDaysRemaining: number | null
  accounts: AccountRunway[]
}

export type NavKey =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'assets'
  | 'goals'
  | 'analysis'
  | 'family'

// ─── AI ────────────────────────────────────
export interface ParsedTransaction {
  amount: number
  type: 'income' | 'expense'
  date: string
  categoryId: number
  note: string
  confidence: number
  interpretation: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── 家庭 ──────────────────────────────────
export type FamilyRole = 'owner' | 'co_owner' | 'member'

export interface FamilyMember {
  userId: number
  name: string
  email: string
  role: FamilyRole
  joinedAt: string
}

export interface Family {
  id: number
  name: string
  ownerId: number
  createdAt: string
  myRole: FamilyRole
  members: FamilyMember[]
}

export interface FamilyInvitation {
  id: number
  familyId: number
  familyName: string
  inviterName: string
  invitedEmail: string
  status: 'pending' | 'accepted' | 'declined' | 'revoked'
  createdAt: string
  respondedAt: string | null
}

export interface FamilyBudget {
  id: number
  amount: number
  period: 'monthly' | 'yearly'
  spent: number
  remaining: number
  usageRate: number
  overBudget: boolean
}

export interface FamilyGoal {
  id: number
  name: string
  icon: string | null
  color: string | null
  targetAmount: number
  currentAmount: number
  deadline: string | null
  status: 'active' | 'completed'
}

export interface FamilyMemberContribution {
  userId: number
  name: string
  income: number
  expense: number
}

export interface FamilySummary {
  familyId: number
  familyName: string
  month: string
  totalIncome: number
  totalExpense: number
  net: number
  contributions: FamilyMemberContribution[]
}
