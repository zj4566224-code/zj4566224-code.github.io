'use client'

import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ChatMessage, ParsedTransaction } from '@/lib/types'

interface RawParsed {
  amount: number | string
  type: 'income' | 'expense'
  date: string
  category_id: number
  note: string
  confidence: number
  interpretation: string
}

export function useParseTransaction() {
  return useMutation({
    mutationFn: async (text: string): Promise<ParsedTransaction> => {
      const res = await api.post<RawParsed>('/ai/parse-transaction', { text })
      const r = res.data
      return {
        amount: Number(r.amount),
        type: r.type,
        date: r.date,
        categoryId: r.category_id,
        note: r.note ?? '',
        confidence: r.confidence,
        interpretation: r.interpretation,
      }
    },
  })
}

interface RawChat {
  reply: string
  tool_calls: string[]
}

export interface ChatReply {
  reply: string
  toolCalls: string[]
}

export function useChat() {
  return useMutation({
    mutationFn: async ({
      message,
      history,
    }: {
      message: string
      history: ChatMessage[]
    }): Promise<ChatReply> => {
      const res = await api.post<RawChat>('/ai/chat', { message, history })
      return { reply: res.data.reply, toolCalls: res.data.tool_calls }
    },
  })
}
