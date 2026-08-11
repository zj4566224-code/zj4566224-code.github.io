import { create } from 'zustand'
import type { User } from '@/lib/types'
import { queryClient } from '@/lib/queryClient'

interface AppState {
  user: User | null
  token: string | null
  isAddTxModalOpen: boolean
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
  openAddTxModal: () => void
  closeAddTxModal: () => void
}

const TOKEN_KEY = 'token'

function readInitialToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: readInitialToken(),
  isAddTxModalOpen: false,
  setAuth: (token, user) => {
    if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
    set({ token, user })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
    queryClient.clear()
    set({ token: null, user: null })
  },
  openAddTxModal: () => set({ isAddTxModalOpen: true }),
  closeAddTxModal: () => set({ isAddTxModalOpen: false }),
}))
