'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 根路径仅作跳转用。AuthGuard 会根据登录状态再决定去 /dashboard 还是 /login。
// 用客户端跳转而不是 server-side redirect 以兼容 Tauri 的静态导出。
export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
    // Next.js 16 中 useRouter() 的引用每次渲染都可能变化,放进 deps 会无限循环。
    // router.replace 本身是稳定的,空依赖即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
