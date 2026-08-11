export type ThemeName = 'dawn' | 'day' | 'dusk' | 'night'
export type ThemePreference = 'auto' | ThemeName

export const THEME_STORAGE_KEY = 'theme-pref'

export const THEME_LABELS: Record<ThemePreference, string> = {
  auto: '自动(跟随时间)',
  dawn: '黎明',
  day: '白天',
  dusk: '黄昏',
  night: '黑夜',
}

/**
 * 自动模式下根据本地时间映射主题。
 * 时段:
 *   05:30–07:00  黎明
 *   07:00–17:00  白天
 *   17:00–19:00  黄昏
 *   其余         黑夜
 */
export function computeAutoTheme(now: Date = new Date()): ThemeName {
  const h = now.getHours() + now.getMinutes() / 60
  if (h >= 5.5 && h < 7) return 'dawn'
  if (h >= 7 && h < 17) return 'day'
  if (h >= 17 && h < 19) return 'dusk'
  return 'night'
}

export function resolveTheme(pref: ThemePreference, now: Date = new Date()): ThemeName {
  return pref === 'auto' ? computeAutoTheme(now) : pref
}
