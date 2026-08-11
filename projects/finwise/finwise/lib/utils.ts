export function formatCurrency(value: number, currency = 'CNY'): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${symbol}${formatted}`
}

export function formatCompactCurrency(value: number, currency = 'CNY'): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  return `${value < 0 ? '-' : ''}${symbol}${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatPercent(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`
}

export function formatDate(iso: string, opts: { withYear?: boolean } = {}): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const m = d.getMonth() + 1
  const day = d.getDate()
  return opts.withYear ? `${d.getFullYear()}-${m}-${day}` : `${m}月${day}日`
}

export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((target - now) / 86_400_000))
}

export function daysLeftInMonth(d: Date = new Date()): number {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return end.getDate() - d.getDate()
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function currentYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}

export function withAlpha(hex: string, alpha: number): string {
  // 支持 #RRGGBB
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}
