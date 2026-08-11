'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { mockAccounts } from '@/lib/mockData'
import type { Account } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface BackendAccount {
  id: number
  name: string
  type: string | null
  balance: number | string
  color: string | null
}

function mapAccount(a: BackendAccount): Account {
  return {
    id: a.id,
    name: a.name,
    type: (a.type ?? 'cash') as Account['type'],
    balance: Number(a.balance),
    color: a.color ?? '#0a84ff',
  }
}

async function fetchAccounts(): Promise<Account[]> {
  if (USE_MOCK) return mockAccounts
  const res = await api.get<BackendAccount[]>('/accounts')
  return res.data.map(mapAccount)
}

export function useAccounts() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? mockAccounts : undefined,
    staleTime: 10 * 60_000,
  })
}

function bumpAccountsRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['trend'] })
}

export interface CreateAccountInput {
  name: string
  type: Account['type']
  balance?: number
  color?: string
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const res = await api.post<BackendAccount>('/accounts', input)
      return mapAccount(res.data)
    },
    onSuccess: (created) => {
      qc.setQueryData<Account[]>(['accounts'], (old) => (old ? [...old, created] : [created]))
      bumpAccountsRelated(qc)
    },
  })
}

export interface UpdateAccountInput {
  name?: string
  type?: Account['type']
  balance?: number
  color?: string
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateAccountInput }) => {
      const res = await api.put<BackendAccount>(`/accounts/${id}`, input)
      return mapAccount(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<Account[]>(['accounts'], (old) =>
        old ? old.map((a) => (a.id === updated.id ? updated : a)) : old,
      )
      bumpAccountsRelated(qc)
    },
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accounts/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<Account[]>(['accounts'], (old) =>
        old ? old.filter((a) => a.id !== id) : old,
      )
      // 删账户会级联删交易,需要更广泛的失效
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['trend'] })
      qc.invalidateQueries({ queryKey: ['analysis'] })
    },
  })
}
