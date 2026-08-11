'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import type {
  Family,
  FamilyBudget,
  FamilyGoal,
  FamilyInvitation,
  FamilyMember,
  FamilyRole,
  FamilySummary,
} from '@/lib/types'

// ─── 后端原始结构 → 前端 camelCase ────────────────────
interface RawMember {
  user_id: number
  name: string
  email: string
  role: FamilyRole
  joined_at: string
}
interface RawFamily {
  id: number
  name: string
  owner_id: number
  created_at: string
  my_role: FamilyRole
  members: RawMember[]
}
interface RawInvitation {
  id: number
  family_id: number
  family_name: string
  inviter_name: string
  invited_email: string
  status: FamilyInvitation['status']
  created_at: string
  responded_at: string | null
}
interface RawBudget {
  id: number
  amount: number | string
  period: 'monthly' | 'yearly'
  spent: number | string
  remaining: number | string
  usage_rate: number
  over_budget: boolean
}
interface RawGoal {
  id: number
  name: string
  icon: string | null
  color: string | null
  target_amount: number | string
  current_amount: number | string
  deadline: string | null
  status: 'active' | 'completed'
}
interface RawSummary {
  family_id: number
  family_name: string
  month: string
  total_income: number | string
  total_expense: number | string
  net: number | string
  contributions: { user_id: number; name: string; income: number | string; expense: number | string }[]
}

const mapMember = (m: RawMember): FamilyMember => ({
  userId: m.user_id,
  name: m.name,
  email: m.email,
  role: m.role,
  joinedAt: m.joined_at,
})
const mapFamily = (f: RawFamily): Family => ({
  id: f.id,
  name: f.name,
  ownerId: f.owner_id,
  createdAt: f.created_at,
  myRole: f.my_role,
  members: f.members.map(mapMember),
})
const mapInvitation = (i: RawInvitation): FamilyInvitation => ({
  id: i.id,
  familyId: i.family_id,
  familyName: i.family_name,
  inviterName: i.inviter_name,
  invitedEmail: i.invited_email,
  status: i.status,
  createdAt: i.created_at,
  respondedAt: i.responded_at,
})
const mapBudget = (b: RawBudget): FamilyBudget => ({
  id: b.id,
  amount: Number(b.amount),
  period: b.period,
  spent: Number(b.spent),
  remaining: Number(b.remaining),
  usageRate: b.usage_rate,
  overBudget: b.over_budget,
})
const mapGoal = (g: RawGoal): FamilyGoal => ({
  id: g.id,
  name: g.name,
  icon: g.icon,
  color: g.color,
  targetAmount: Number(g.target_amount),
  currentAmount: Number(g.current_amount),
  deadline: g.deadline,
  status: g.status,
})
const mapSummary = (s: RawSummary): FamilySummary => ({
  familyId: s.family_id,
  familyName: s.family_name,
  month: s.month,
  totalIncome: Number(s.total_income),
  totalExpense: Number(s.total_expense),
  net: Number(s.net),
  contributions: s.contributions.map((c) => ({
    userId: c.user_id,
    name: c.name,
    income: Number(c.income),
    expense: Number(c.expense),
  })),
})

const FAMILY_KEYS = {
  family: ['family', 'me'] as const,
  invitations: ['family', 'invitations', 'me'] as const,
  budget: ['family', 'budget'] as const,
  goals: ['family', 'goals'] as const,
  summary: (month: string) => ['family', 'summary', month] as const,
}

function isNotFound(e: unknown): boolean {
  return e instanceof AxiosError && e.response?.status === 404
}

// ─── 我的家庭 ────────────────────────────────────────
export function useMyFamily() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: FAMILY_KEYS.family,
    queryFn: async () => {
      try {
        const res = await api.get<RawFamily>('/families/me')
        return mapFamily(res.data)
      } catch (e) {
        if (isNotFound(e)) return null
        throw e
      }
    },
    enabled: !!token,
    staleTime: 60_000,
  })
}

export function useCreateFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<RawFamily>('/families', { name })
      return mapFamily(res.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family'] })
    },
  })
}

export function useRenameFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.patch<RawFamily>('/families/me', { name })
      return mapFamily(res.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  })
}

export function useDisbandFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/families/me')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  })
}

export function useLeaveFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/families/me/leave')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  })
}

// ─── 成员 ────────────────────────────────────────────
export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: 'co_owner' | 'member' }) => {
      await api.patch(`/families/me/members/${userId}/role`, { role })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.family }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/families/me/members/${userId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.family }),
  })
}

// ─── 邀请(家庭侧) ───────────────────────────────────
export function useFamilyInvitations() {
  const family = useMyFamily()
  return useQuery({
    queryKey: ['family', 'invitations', 'sent'],
    queryFn: async () => {
      const res = await api.get<RawInvitation[]>('/families/me/invitations')
      return res.data.map(mapInvitation)
    },
    enabled: !!family.data && (family.data.myRole === 'owner' || family.data.myRole === 'co_owner'),
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<RawInvitation>('/families/me/invitations', { email })
      return mapInvitation(res.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', 'invitations'] }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: number) => {
      await api.delete(`/families/me/invitations/${invitationId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', 'invitations'] }),
  })
}

// ─── 邀请(被邀人侧) ─────────────────────────────────
export function useMyPendingInvitations() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: FAMILY_KEYS.invitations,
    queryFn: async () => {
      const res = await api.get<RawInvitation[]>('/invitations/me')
      return res.data.map(mapInvitation)
    },
    enabled: !!token,
  })
}

export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await api.post<RawFamily>(`/invitations/${invitationId}/accept`)
      return mapFamily(res.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  })
}

export function useDeclineInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: number) => {
      await api.post(`/invitations/${invitationId}/decline`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.invitations }),
  })
}

// ─── 预算 ────────────────────────────────────────────
export function useFamilyBudget() {
  const family = useMyFamily()
  return useQuery({
    queryKey: FAMILY_KEYS.budget,
    queryFn: async () => {
      const res = await api.get<RawBudget | null>('/families/me/budget')
      return res.data ? mapBudget(res.data) : null
    },
    enabled: !!family.data,
  })
}

export function useUpsertFamilyBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { amount: number; period: 'monthly' | 'yearly' }) => {
      const res = await api.put<RawBudget>('/families/me/budget', input)
      return mapBudget(res.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.budget }),
  })
}

// ─── 目标 ────────────────────────────────────────────
export function useFamilyGoals() {
  const family = useMyFamily()
  return useQuery({
    queryKey: FAMILY_KEYS.goals,
    queryFn: async () => {
      const res = await api.get<RawGoal[]>('/families/me/goals')
      return res.data.map(mapGoal)
    },
    enabled: !!family.data,
  })
}

export function useCreateFamilyGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      icon?: string
      color?: string
      target_amount: number
      deadline?: string
    }) => {
      const res = await api.post<RawGoal>('/families/me/goals', input)
      return mapGoal(res.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.goals }),
  })
}

export function useDeleteFamilyGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goalId: number) => {
      await api.delete(`/families/me/goals/${goalId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.goals }),
  })
}

export function useContributeFamilyGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: number; amount: number }) => {
      const res = await api.post<RawGoal>(`/families/me/goals/${goalId}/contribute`, { amount })
      return mapGoal(res.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILY_KEYS.goals }),
  })
}

// ─── 月度汇总 + 成员贡献 ──────────────────────────────
export function useFamilySummary(month: string) {
  const family = useMyFamily()
  return useQuery({
    queryKey: FAMILY_KEYS.summary(month),
    queryFn: async () => {
      const res = await api.get<RawSummary>(`/families/me/summary?month=${month}`)
      return mapSummary(res.data)
    },
    enabled: !!family.data,
  })
}
