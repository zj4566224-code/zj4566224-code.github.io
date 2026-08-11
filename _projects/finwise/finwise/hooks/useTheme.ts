'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  THEME_STORAGE_KEY,
  computeAutoTheme,
  resolveTheme,
  type ThemeName,
  type ThemePreference,
} from '@/lib/theme'

const THEME_NAMES = ['dawn', 'day', 'dusk', 'night'] as const

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto'
  const raw = localStorage.getItem(THEME_STORAGE_KEY)
  if (raw === 'auto' || raw === 'dawn' || raw === 'day' || raw === 'dusk' || raw === 'night') {
    return raw
  }
  return 'auto'
}

function readDomTheme(): ThemeName {
  if (typeof document === 'undefined') return 'night'
  const current = document.documentElement.getAttribute('data-theme')
  if (current && (THEME_NAMES as readonly string[]).includes(current)) {
    return current as ThemeName
  }
  return 'night'
}

function applyTheme(theme: ThemeName) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root.getAttribute('data-theme') === theme) return
  const swap = () => root.setAttribute('data-theme', theme)
  // 现代浏览器走 View Transitions API,浏览器自动做画面级擦除动画。
  // 不支持的浏览器(Firefox/老 Safari)直接 swap,无动画但功能正常。
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
  if (doc.startViewTransition) doc.startViewTransition(swap)
  else swap()
}

export function useTheme() {
  // 初始 state 直接读 localStorage 和 DOM,不在 useEffect 里再次 applyTheme,
  // bootstrap 脚本已经在首屏前把 data-theme 设对了。
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)
  const [effective, setEffective] = useState<ThemeName>(readDomTheme)

  // 自动模式下每分钟检查一次时段
  useEffect(() => {
    if (preference !== 'auto') return
    const tick = () => {
      const next = computeAutoTheme()
      setEffective((prev) => {
        if (prev !== next) applyTheme(next)
        return next
      })
    }
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [preference])

  const setPreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
    const theme = resolveTheme(pref)
    setPreferenceState(pref)
    setEffective(theme)
    applyTheme(theme)
  }, [])

  return { preference, effective, setPreference }
}
