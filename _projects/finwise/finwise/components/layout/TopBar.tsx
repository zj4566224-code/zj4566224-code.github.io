'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { matchesPath, normalizePath } from '@/lib/paths'
import NavDropdown from './NavDropdown'
import type { NavKey } from '@/lib/types'

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: 'dashboard', label: '总览', href: '/dashboard' },
  { key: 'transactions', label: '收支记录', href: '/transactions' },
  { key: 'budgets', label: '预算', href: '/budgets' },
  { key: 'assets', label: '资产负债', href: '/assets' },
  { key: 'goals', label: '目标', href: '/goals' },
  { key: 'analysis', label: '分析报告', href: '/analysis' },
  { key: 'family', label: '家庭', href: '/family' },
]

const HIDDEN_ROUTES = ['/login', '/register']

export default function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const token = useAppStore((s) => s.token)
  const logout = useAppStore((s) => s.logout)
  const [hoveredKey, setHoveredKey] = useState<NavKey | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (matchesPath(pathname, HIDDEN_ROUTES)) return null

  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }
  const scheduleHide = () => {
    cancelHide()
    hideTimer.current = setTimeout(() => setHoveredKey(null), 120)
  }
  const showKey = (k: NavKey) => {
    cancelHide()
    setHoveredKey(k)
  }

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <header
      className="topbar-glass"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 20,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--color-label-primary)',
          textDecoration: 'none',
        }}
      >
        <Logo />
        <span>FinWise</span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isHovered = hoveredKey === item.key
          return (
            <div
              key={item.key}
              style={{ position: 'relative' }}
              onPointerEnter={() => showKey(item.key)}
              onPointerLeave={scheduleHide}
            >
              <Link
                href={item.href}
                style={{
                  display: 'inline-block',
                  padding: '6px 15px',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: 'var(--color-label-primary)',
                  background: isActive
                    ? 'var(--color-border-base)'
                    : isHovered
                      ? 'var(--color-label-quaternary)'
                      : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.18s, color 0.18s',
                }}
              >
                {item.label}
              </Link>

              <AnimatePresence>
                {isHovered && token && (
                  <NavDropdown
                    navKey={item.key}
                    onPointerEnter={cancelHide}
                    onPointerLeave={scheduleHide}
                  />
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {token && user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/settings"
            title="设置"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 8px 4px 4px',
              borderRadius: 999,
              textDecoration: 'none',
              transition: 'background 0.18s',
              background: pathname.startsWith('/settings')
                ? 'var(--color-label-quaternary)'
                : 'transparent',
            }}
          >
            <Avatar name={user.name ?? '?'} />
            <span style={{ fontSize: 14, color: 'var(--color-label-primary)', fontWeight: 500 }}>
              {user.name ?? user.email}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="退出登录"
            style={{
              marginLeft: 6,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--color-label-secondary)',
              background: 'transparent',
              border: '1px solid var(--color-border-base)',
              borderRadius: 9,
              cursor: 'pointer',
              transition: 'background 0.18s, color 0.18s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,67,58,0.12)'
              e.currentTarget.style.color = '#ff453a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-label-secondary)'
            }}
          >
            退出
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          style={{
            padding: '7px 16px',
            fontSize: 13.5,
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #0a84ff, #6e6ce8)',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          登录
        </Link>
      )}
    </header>
  )
}

function Logo() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 6,
        background:
          'linear-gradient(135deg, rgba(10,132,255,0.85), rgba(110,108,232,0.85))',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      ◆
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1) || '?'
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 999,
        background:
          'linear-gradient(135deg, rgba(50,215,75,0.55), rgba(90,200,250,0.55))',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {initial}
    </span>
  )
}
