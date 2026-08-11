import type {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  Asset,
  Liability,
  Goal,
  HealthScore,
  Suggestion,
  MonthlyData,
  ForecastData,
} from './types'

export const mockUser: User = {
  id: 1,
  name: '陈知行',
  email: 'zhixing@finwise.app',
  currency: 'CNY',
}

export const mockAccounts: Account[] = [
  { id: 1, name: '招商银行', type: 'bank', balance: 38540.12, color: '#0a84ff' },
  { id: 2, name: '现金', type: 'cash', balance: 1230.0, color: '#32d74b' },
  { id: 3, name: '中信信用卡', type: 'credit', balance: -2380.5, color: '#ff453a' },
  { id: 4, name: '券商账户', type: 'investment', balance: 76210.6, color: '#bf5af2' },
]

export const mockCategories: Category[] = [
  { id: 1, name: '餐饮', type: 'expense', icon: '🍜', color: '#ff9f0a' },
  { id: 2, name: '交通', type: 'expense', icon: '🚇', color: '#0a84ff' },
  { id: 3, name: '住房', type: 'expense', icon: '🏠', color: '#bf5af2' },
  { id: 4, name: '娱乐', type: 'expense', icon: '🎮', color: '#5ac8fa' },
  { id: 5, name: '购物', type: 'expense', icon: '🛍️', color: '#ff453a' },
  { id: 6, name: '医疗', type: 'expense', icon: '💊', color: '#6e6ce8' },
  { id: 7, name: '工资', type: 'income', icon: '💰', color: '#32d74b' },
  { id: 8, name: '副业', type: 'income', icon: '💼', color: '#5ac8fa' },
]

export const mockTransactions: Transaction[] = [
  {
    id: 1,
    accountId: 1,
    categoryId: 7,
    categoryName: '工资',
    categoryIcon: '💰',
    categoryColor: '#32d74b',
    amount: 18500,
    type: 'income',
    date: '2026-05-10',
    note: '5 月工资',
  },
  {
    id: 2,
    accountId: 1,
    categoryId: 3,
    categoryName: '住房',
    categoryIcon: '🏠',
    categoryColor: '#bf5af2',
    amount: 4800,
    type: 'expense',
    date: '2026-05-12',
    note: '房租',
  },
  {
    id: 3,
    accountId: 3,
    categoryId: 5,
    categoryName: '购物',
    categoryIcon: '🛍️',
    categoryColor: '#ff453a',
    amount: 638.0,
    type: 'expense',
    date: '2026-05-13',
    note: '运动鞋',
  },
  {
    id: 4,
    accountId: 2,
    categoryId: 1,
    categoryName: '餐饮',
    categoryIcon: '🍜',
    categoryColor: '#ff9f0a',
    amount: 56.0,
    type: 'expense',
    date: '2026-05-14',
    note: '日料晚餐',
  },
  {
    id: 5,
    accountId: 1,
    categoryId: 2,
    categoryName: '交通',
    categoryIcon: '🚇',
    categoryColor: '#0a84ff',
    amount: 32.5,
    type: 'expense',
    date: '2026-05-15',
    note: '打车',
  },
  {
    id: 6,
    accountId: 1,
    categoryId: 8,
    categoryName: '副业',
    categoryIcon: '💼',
    categoryColor: '#5ac8fa',
    amount: 2400,
    type: 'income',
    date: '2026-05-15',
    note: '设计外包',
  },
]

export const mockBudgets: Budget[] = [
  {
    id: 1,
    categoryId: null,
    categoryName: '总预算',
    categoryIcon: '📊',
    categoryColor: '#0a84ff',
    amount: 12000,
    spent: 6826.5,
    period: 'monthly',
  },
  {
    id: 2,
    categoryId: 1,
    categoryName: '餐饮',
    categoryIcon: '🍜',
    categoryColor: '#ff9f0a',
    amount: 2500,
    spent: 1840,
    period: 'monthly',
  },
  {
    id: 3,
    categoryId: 2,
    categoryName: '交通',
    categoryIcon: '🚇',
    categoryColor: '#0a84ff',
    amount: 800,
    spent: 332.5,
    period: 'monthly',
  },
  {
    id: 4,
    categoryId: 3,
    categoryName: '住房',
    categoryIcon: '🏠',
    categoryColor: '#bf5af2',
    amount: 5000,
    spent: 4800,
    period: 'monthly',
  },
  {
    id: 5,
    categoryId: 4,
    categoryName: '娱乐',
    categoryIcon: '🎮',
    categoryColor: '#5ac8fa',
    amount: 600,
    spent: 712, // 超支
    period: 'monthly',
  },
  {
    id: 6,
    categoryId: 5,
    categoryName: '购物',
    categoryIcon: '🛍️',
    categoryColor: '#ff453a',
    amount: 1500,
    spent: 1226,
    period: 'monthly',
  },
  {
    id: 7,
    categoryId: 6,
    categoryName: '医疗',
    categoryIcon: '💊',
    categoryColor: '#6e6ce8',
    amount: 400,
    spent: 86,
    period: 'monthly',
  },
]

export const mockAssets: Asset[] = [
  { id: 1, name: '招商银行储蓄', type: '现金存款', value: 38540.12, updatedAt: '2026-05-15' },
  { id: 2, name: '券商账户', type: '股票基金', value: 76210.6, updatedAt: '2026-05-15' },
  { id: 3, name: '现金 / 余额宝', type: '货币基金', value: 21530.45, updatedAt: '2026-05-15' },
]

export const mockLiabilities: Liability[] = [
  {
    id: 1,
    name: '中信信用卡',
    type: '信用卡',
    totalAmount: 12000,
    remaining: 2380.5,
    interestRate: 18.0,
    dueDate: '2026-06-10',
  },
  {
    id: 2,
    name: '助学贷款',
    type: '贷款',
    totalAmount: 50000,
    remaining: 18200,
    interestRate: 4.35,
    dueDate: '2028-09-01',
  },
]

export const mockGoals: Goal[] = [
  {
    id: 1,
    name: '日本旅行基金',
    icon: '🗾',
    color: '#0a84ff',
    targetAmount: 15000,
    currentAmount: 9650,
    deadline: '2026-10-01',
    status: 'active',
  },
  {
    id: 2,
    name: '应急储备',
    icon: '🛟',
    color: '#32d74b',
    targetAmount: 60000,
    currentAmount: 42300,
    deadline: '2026-12-31',
    status: 'active',
  },
  {
    id: 3,
    name: 'MacBook Pro',
    icon: '💻',
    color: '#bf5af2',
    targetAmount: 18000,
    currentAmount: 6200,
    deadline: '2027-03-01',
    status: 'active',
  },
]

export const mockMonthlyTrend: MonthlyData[] = [
  { month: '2025-12', income: 18500, expense: 9420, savings: 9080 },
  { month: '2026-01', income: 19200, expense: 11200, savings: 8000 },
  { month: '2026-02', income: 18500, expense: 8730, savings: 9770 },
  { month: '2026-03', income: 21800, expense: 12450, savings: 9350 },
  { month: '2026-04', income: 18500, expense: 9970, savings: 8530 },
  { month: '2026-05', income: 20900, expense: 6826.5, savings: 14073.5 },
]

export const mockHealthScore: HealthScore = {
  total: 82,
  breakdown: {
    savingsRate: 88,
    budgetControl: 72,
    debtRatio: 90,
    goalProgress: 78,
  },
}

export const mockSuggestions: Suggestion[] = [
  { level: 'warn', text: '本月「娱乐」预算超支 ¥112，下月建议控制在 ¥600 以内' },
  { level: 'ok', text: '储蓄率 67%，超过同年龄段 86% 的用户，继续保持' },
  { level: 'tip', text: '信用卡还款日临近（6/10），账单 ¥2,380.50 建议尽早偿还' },
  { level: 'tip', text: '应急储备已达目标 70%，按当前节奏可在 11 月达成' },
]

export const mockForecast: ForecastData[] = [
  { month: '2026-05', savings: 14073.5, isForecast: false },
  { month: '2026-06', savings: 9800, isForecast: true },
  { month: '2026-07', savings: 9500, isForecast: true },
  { month: '2026-08', savings: 9700, isForecast: true },
  { month: '2026-09', savings: 10100, isForecast: true },
  { month: '2026-10', savings: 10500, isForecast: true },
]

export function getMockSummary() {
  const current = mockMonthlyTrend[mockMonthlyTrend.length - 1]
  const previous = mockMonthlyTrend[mockMonthlyTrend.length - 2]
  const totalAssets = mockAssets.reduce((sum, a) => sum + a.value, 0)
  const totalLiabilities = mockLiabilities.reduce((sum, l) => sum + l.remaining, 0)
  return {
    monthIncome: current.income,
    monthExpense: current.expense,
    monthNet: current.income - current.expense,
    savingsRate: current.income > 0 ? (current.savings / current.income) * 100 : 0,
    deltaVsPrev: (current.income - current.expense) - (previous.income - previous.expense),
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  }
}
