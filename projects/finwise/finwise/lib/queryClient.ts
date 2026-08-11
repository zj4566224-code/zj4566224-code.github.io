import { QueryClient } from '@tanstack/react-query'

// 全局 React Query 默认值
// staleTime 设大一点,在用户切换页面时复用缓存,不重新拉
// gcTime 给一段保留期(原 cacheTime)
// 关键 mutation 主动通过 setQueryData / invalidateQueries 刷数据,而不是依赖 refetch
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000, // 2 分钟内复用缓存,不发请求
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // 已缓存就直接用,不再重拉
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
