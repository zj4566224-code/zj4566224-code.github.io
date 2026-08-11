'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { mockCategories } from '@/lib/mockData'
import type { Category } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface BackendCategory {
  id: number
  name: string
  type: 'income' | 'expense' | null
  icon: string | null
  color: string | null
  parent_id: number | null
}

function mapCategory(c: BackendCategory): Category {
  return {
    id: c.id,
    name: c.name,
    type: (c.type ?? 'expense') as 'income' | 'expense',
    icon: c.icon ?? '',
    color: c.color ?? '#0a84ff',
  }
}

async function fetchCategories(): Promise<Category[]> {
  if (USE_MOCK) return mockCategories
  const res = await api.get<BackendCategory[]>('/categories')
  return res.data.map(mapCategory)
}

export function useCategories() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? mockCategories : undefined,
    staleTime: 10 * 60_000,
  })
}
