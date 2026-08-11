'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { matchesPath } from '@/lib/paths'

const PUBLIC_ROUTES = ['/login', '/register']

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const token = useAppStore((s) => s.token)
  const [hydrated, setHydrated] = useState(false)

  // /auth/me 在后台跑,401 时拦截器会触发 logout
  useCurrentUser()

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const isPublic = matchesPath(pathname, PUBLIC_ROUTES)
    if (!token && !isPublic) {
      router.replace('/login')
    } else if (token && isPublic) {
      router.replace('/dashboard')
    }
    // 不把 router 放进 deps:Next.js 16 中 useRouter() 引用不稳定会无限循环。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token, pathname])

  // 水合前返回 null 避免闪烁。其余情况乐观渲染,不阻塞在 /auth/me 上。
  if (!hydrated) return null
  const isPublic = matchesPath(pathname, PUBLIC_ROUTES)
  if (!token && !isPublic) return null

  return <>{children}</>
}
