'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { mockGoals } from '@/lib/mockData'
import type { Goal } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface BackendGoal {
  id: number
  name: string
  icon: string | null
  color: string | null
  target_amount: number | string
  current_amount: number | string
  deadline: string | null
  status: 'active' | 'completed'
}

function mapGoal(g: BackendGoal): Goal {
  return {
    id: g.id,
    name: g.name,
    icon: g.icon ?? '🎯',
    color: g.color ?? '#0a84ff',
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.current_amount),
    deadline: g.deadline ?? '',
    status: g.status,
  }
}

async function fetchGoals(): Promise<Goal[]> {
  if (USE_MOCK) return mockGoals
  const res = await api.get<BackendGoal[]>('/goals')
  return res.data.map(mapGoal)
}

export function useGoals() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? mockGoals : undefined,
  })
}

function bumpAnalysis(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['analysis'] })
}

export interface CreateGoalInput {
  name: string
  icon?: string
  color?: string
  target_amount: number
  current_amount?: number
  deadline?: string
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const res = await api.post<BackendGoal>('/goals', input)
      return mapGoal(res.data)
    },
    onSuccess: (created) => {
      qc.setQueryData<Goal[]>(['goals'], (old) => (old ? [...old, created] : [created]))
      bumpAnalysis(qc)
    },
  })
}

export interface UpdateGoalInput {
  name?: string
  icon?: string
  color?: string
  target_amount?: number
  deadline?: string
  status?: 'active' | 'completed'
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateGoalInput }) => {
      const res = await api.put<BackendGoal>(`/goals/${id}`, input)
      return mapGoal(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<Goal[]>(['goals'], (old) =>
        old ? old.map((g) => (g.id === updated.id ? updated : g)) : old,
      )
      bumpAnalysis(qc)
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/goals/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<Goal[]>(['goals'], (old) => (old ? old.filter((g) => g.id !== id) : old))
      bumpAnalysis(qc)
    },
  })
}

export function useContributeGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await api.post<BackendGoal>(`/goals/${id}/contribute`, { amount })
      return mapGoal(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<Goal[]>(['goals'], (old) =>
        old ? old.map((g) => (g.id === updated.id ? updated : g)) : old,
      )
      bumpAnalysis(qc)
    },
  })
}
