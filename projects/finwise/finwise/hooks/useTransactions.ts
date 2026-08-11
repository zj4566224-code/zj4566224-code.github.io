'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { mockTransactions } from '@/lib/mockData'
import type { Transaction } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface BackendTransaction {
  id: number
  account_id: number
  category_id: number
  category_name: string
  category_icon: string | null
  category_color: string | null
  amount: number | string
  type: 'income' | 'expense'
  date: string
  note: string | null
}

function mapTx(t: BackendTransaction): Transaction {
  return {
    id: t.id,
    accountId: t.account_id,
    categoryId: t.category_id,
    categoryName: t.category_name,
    categoryIcon: t.category_icon ?? '',
    categoryColor: t.category_color ?? '#0a84ff',
    amount: Number(t.amount),
    type: t.type,
    date: t.date,
    note: t.note ?? undefined,
  }
}

async function fetchTransactions(): Promise<Transaction[]> {
  if (USE_MOCK) return mockTransactions
  const res = await api.get<BackendTransaction[]>('/transactions')
  return res.data.map(mapTx)
}

export function useTransactions() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? mockTransactions : undefined,
  })
}

export interface CreateTxInput {
  account_id: number
  category_id: number
  amount: number
  type: 'income' | 'expense'
  date: string
  note?: string
}

// 一次性失效所有受交易变更影响的衍生数据。
// 列出来便于审计;其他 hook 同样直接复用这个集合。
function invalidateTxRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['budgets'] })
  qc.invalidateQueries({ queryKey: ['trend'] })
  qc.invalidateQueries({ queryKey: ['analysis'] })
  qc.invalidateQueries({ queryKey: ['accounts'] })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTxInput) => {
      const res = await api.post<BackendTransaction>('/transactions', input)
      return mapTx(res.data)
    },
    onSuccess: (created) => {
      // 把新交易塞进列表缓存,避免立即重拉
      qc.setQueryData<Transaction[]>(['transactions'], (old) =>
        old ? [created, ...old] : [created],
      )
      // 余额、预算执行、分析数据需要重算 — invalidate 让下次访问时刷新
      invalidateTxRelated(qc)
    },
  })
}

export interface UpdateTxInput {
  amount?: number
  category_id?: number
  date?: string
  note?: string
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateTxInput }) => {
      const res = await api.put<BackendTransaction>(`/transactions/${id}`, input)
      return mapTx(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<Transaction[]>(['transactions'], (old) =>
        old ? old.map((t) => (t.id === updated.id ? updated : t)) : old,
      )
      invalidateTxRelated(qc)
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/transactions/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<Transaction[]>(['transactions'], (old) =>
        old ? old.filter((t) => t.id !== id) : old,
      )
      invalidateTxRelated(qc)
    },
  })
}
