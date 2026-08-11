'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { mockAssets, mockLiabilities } from '@/lib/mockData'
import type { Asset, Liability } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface BackendAsset {
  id: number
  name: string
  type: string | null
  value: number | string
  updated_at: string
}

interface BackendLiability {
  id: number
  name: string
  type: string | null
  total_amount: number | string | null
  remaining: number | string | null
  interest_rate: number | string | null
  due_date: string | null
}

function mapAsset(a: BackendAsset): Asset {
  return {
    id: a.id,
    name: a.name,
    type: a.type ?? '',
    value: Number(a.value),
    updatedAt: a.updated_at,
  }
}

function mapLiability(l: BackendLiability): Liability {
  return {
    id: l.id,
    name: l.name,
    type: l.type ?? '',
    totalAmount: Number(l.total_amount ?? 0),
    remaining: Number(l.remaining ?? 0),
    interestRate: Number(l.interest_rate ?? 0),
    dueDate: l.due_date ?? '',
  }
}

type AssetsData = { assets: Asset[]; liabilities: Liability[] }

async function fetchAssets(): Promise<AssetsData> {
  if (USE_MOCK) return { assets: mockAssets, liabilities: mockLiabilities }
  const [a, l] = await Promise.all([
    api.get<BackendAsset[]>('/assets'),
    api.get<BackendLiability[]>('/liabilities'),
  ])
  return {
    assets: a.data.map(mapAsset),
    liabilities: l.data.map(mapLiability),
  }
}

export function useAssets() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    enabled: USE_MOCK || !!token,
    initialData: USE_MOCK ? { assets: mockAssets, liabilities: mockLiabilities } : undefined,
  })
}

// asset/liability 变更会影响净资产、趋势、分析,统一一处失效
function bumpAssetsRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['trend'] })
  qc.invalidateQueries({ queryKey: ['analysis'] })
}

// ─── Assets CRUD ───────────────────────────────────────
export interface CreateAssetInput {
  name: string
  type: string
  value: number
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const res = await api.post<BackendAsset>('/assets', input)
      return mapAsset(res.data)
    },
    onSuccess: (created) => {
      qc.setQueryData<AssetsData>(['assets'], (old) =>
        old ? { ...old, assets: [...old.assets, created] } : old,
      )
      bumpAssetsRelated(qc)
    },
  })
}

export interface UpdateAssetInput {
  name?: string
  type?: string
  value?: number
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateAssetInput }) => {
      const res = await api.put<BackendAsset>(`/assets/${id}`, input)
      return mapAsset(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<AssetsData>(['assets'], (old) =>
        old
          ? { ...old, assets: old.assets.map((a) => (a.id === updated.id ? updated : a)) }
          : old,
      )
      bumpAssetsRelated(qc)
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/assets/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<AssetsData>(['assets'], (old) =>
        old ? { ...old, assets: old.assets.filter((a) => a.id !== id) } : old,
      )
      bumpAssetsRelated(qc)
    },
  })
}

// ─── Liabilities CRUD ──────────────────────────────────
export interface CreateLiabilityInput {
  name: string
  type: string
  total_amount: number
  remaining: number
  interest_rate?: number
  due_date?: string
}

export function useCreateLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateLiabilityInput) => {
      const res = await api.post<BackendLiability>('/liabilities', input)
      return mapLiability(res.data)
    },
    onSuccess: (created) => {
      qc.setQueryData<AssetsData>(['assets'], (old) =>
        old ? { ...old, liabilities: [...old.liabilities, created] } : old,
      )
      bumpAssetsRelated(qc)
    },
  })
}

export interface UpdateLiabilityInput {
  name?: string
  remaining?: number
  interest_rate?: number
  due_date?: string
}

export function useUpdateLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateLiabilityInput }) => {
      const res = await api.put<BackendLiability>(`/liabilities/${id}`, input)
      return mapLiability(res.data)
    },
    onSuccess: (updated) => {
      qc.setQueryData<AssetsData>(['assets'], (old) =>
        old
          ? {
              ...old,
              liabilities: old.liabilities.map((l) => (l.id === updated.id ? updated : l)),
            }
          : old,
      )
      bumpAssetsRelated(qc)
    },
  })
}

export function useDeleteLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/liabilities/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<AssetsData>(['assets'], (old) =>
        old ? { ...old, liabilities: old.liabilities.filter((l) => l.id !== id) } : old,
      )
      bumpAssetsRelated(qc)
    },
  })
}
