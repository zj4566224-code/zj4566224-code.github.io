'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type BillSource = 'alipay' | 'wechat'

export interface PreviewRow {
  fingerprint: string
  date: string
  counterparty: string
  note: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  isInternalTransfer: boolean
  isDuplicate: boolean
  suggestedCategoryId: number | null
}

export interface PreviewResponse {
  source: BillSource
  total: number
  importable: number
  duplicates: number
  internalTransfers: number
  rows: PreviewRow[]
}

interface RawPreviewRow {
  fingerprint: string
  date: string
  counterparty: string
  note: string
  amount: number | string
  type: 'income' | 'expense' | 'transfer'
  is_internal_transfer: boolean
  is_duplicate: boolean
  suggested_category_id: number | null
}
interface RawPreviewResponse {
  source: BillSource
  total: number
  importable: number
  duplicates: number
  internal_transfers: number
  rows: RawPreviewRow[]
}

const mapPreview = (r: RawPreviewResponse): PreviewResponse => ({
  source: r.source,
  total: r.total,
  importable: r.importable,
  duplicates: r.duplicates,
  internalTransfers: r.internal_transfers,
  rows: r.rows.map((row) => ({
    fingerprint: row.fingerprint,
    date: row.date,
    counterparty: row.counterparty,
    note: row.note,
    amount: Number(row.amount),
    type: row.type,
    isInternalTransfer: row.is_internal_transfer,
    isDuplicate: row.is_duplicate,
    suggestedCategoryId: row.suggested_category_id,
  })),
})

export function useParseBill() {
  return useMutation({
    mutationFn: async ({ file, source }: { file: File; source: BillSource }) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('source', source)
      const res = await api.post<RawPreviewResponse>('/transactions/import/parse', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return mapPreview(res.data)
    },
  })
}

export interface CommitItem {
  date: string
  amount: number
  type: 'income' | 'expense'
  category_id: number
  note?: string
}

export function useCommitBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ accountId, items }: { accountId: number; items: CommitItem[] }) => {
      const res = await api.post<{ inserted: number }>('/transactions/import/commit', {
        account_id: accountId,
        items,
      })
      // 等数据真正刷新完再 resolve,让 modal 关闭时已经显示新数据。
      // 一次导入会改账户余额 + 交易列表 + 预算 + 分析。
      await Promise.all([
        qc.refetchQueries({ queryKey: ['transactions'] }),
        qc.refetchQueries({ queryKey: ['accounts'] }),
        qc.refetchQueries({ queryKey: ['budgets'] }),
        qc.refetchQueries({ queryKey: ['trend'] }),
        qc.refetchQueries({ queryKey: ['analysis'] }),
        qc.refetchQueries({ queryKey: ['insights'] }),
        qc.refetchQueries({ queryKey: ['cashflow'] }),
      ])
      return res.data
    },
  })
}
