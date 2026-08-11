'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { queryClient } from '@/lib/queryClient'
import { useTheme } from '@/hooks/useTheme'

function ThemeBoot() {
  // 启动主题自动切换:跟 localStorage 同步 + 每分钟检查一次时段
  useTheme()
  return null
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBoot />
      {children}
    </QueryClientProvider>
  )
}
