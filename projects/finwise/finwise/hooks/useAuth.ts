'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { User } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

interface TokenResponse {
  access_token: string
  token_type: string
}

async function fetchMe(): Promise<User> {
  const res = await api.get<User>('/auth/me')
  return res.data
}

export function useCurrentUser() {
  const token = useAppStore((s) => s.token)
  const setUser = useAppStore((s) => s.setUser)
  const logout = useAppStore((s) => s.logout)

  return useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: async () => {
      try {
        const user = await fetchMe()
        setUser(user)
        return user
      } catch (e) {
        if (e instanceof AxiosError && e.response?.status === 401) {
          logout()
        }
        throw e
      }
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const setAuth = useAppStore((s) => s.setAuth)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await api.post<TokenResponse>('/auth/login', payload)
      const token = res.data.access_token

      // 切换账号:先清空旧用户的缓存,避免脏数据被复用
      qc.clear()
      // 立即写入 localStorage 以便随后的 /auth/me 请求带上 token
      if (typeof window !== 'undefined') localStorage.setItem('token', token)
      const meRes = await api.get<User>('/auth/me')
      setAuth(token, meRes.data)
      return meRes.data
    },
  })
}

export function useRegister() {
  const setAuth = useAppStore((s) => s.setAuth)
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { email: string; name: string; password: string }) => {
      const res = await api.post<TokenResponse>('/auth/register', payload)
      const token = res.data.access_token

      qc.clear()
      if (typeof window !== 'undefined') localStorage.setItem('token', token)
      const meRes = await api.get<User>('/auth/me')
      setAuth(token, meRes.data)
      return meRes.data
    },
  })
}

export function useUpdateProfile() {
  const setUser = useAppStore((s) => s.setUser)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name?: string; currency?: string }) => {
      const res = await api.patch<User>('/auth/me', input)
      setUser(res.data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { old_password: string; new_password: string }) => {
      await api.post('/auth/change-password', input)
    },
  })
}
