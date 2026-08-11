'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { mockBudgets } from '@/lib/mockData'
import type { Budget } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface BackendBudget {
  id: number
  category_id: number | null
  category_name: string | null
  category_icon: string | null
  category_color: string | null
  amount: number | string
  spent: number | string
  period: string
}

function mapBudget(b: BackendBudget): Budget {
  return {
    id: b.id,
    categoryId: b.category_id,
    categoryName: b.category_name ?? '总预算',
    categoryIcon: b.category_icon ?? '📊',
    categoryColor: b.category_color ?? '#0a84ff',
    amount: Number(b.amount),
    spent: Number(b.spent),
    period: (b.period as 'monthly' | 'yearly') ?? 'monthly',
  }
}

async function fetchBudgets(): Promise<Budget[]> {
  if (USE_MOCK) return mockBudgets
  const res = await api.get<BackendBudget[]>('/budgets')
  return res.data.map(mapBudget)
}

export function useBudgets() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? mockBudgets : undefined,
  })
}

export interface CreateBudgetInput {
  category_id: number | null
  amount: number
  period?: 'monthly' | 'yearly'
  start_date: string
}

function bumpAnalysis(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['analysis'] })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const res = await api.post<BackendBudget>('/budgets', input)
      return mapBudget(res.data)
    },
    onSuccess: (created) => {
      qc.setQueryData<Budget[]>(['budgets'], (old) =>
        old ? [...old, created] : [created],
      )
      bumpAnalysis(qc)
    },
  })
}

export interface UpdateBudgetInput {
  amount?: number
  period?: 'monthly' | 'yearly'
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateBudgetInput }) => {
      const res = await api.put<BackendBudget>(`/budgets/${id}`, input)
      return mapBudget(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<Budget[]>(['budgets'], (old) =>
        old ? old.map((b) => (b.id === updated.id ? updated : b)) : old,
      )
      bumpAnalysis(qc)
    },
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/budgets/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<Budget[]>(['budgets'], (old) =>
        old ? old.filter((b) => b.id !== id) : old,
      )
      bumpAnalysis(qc)
    },
  })
}
