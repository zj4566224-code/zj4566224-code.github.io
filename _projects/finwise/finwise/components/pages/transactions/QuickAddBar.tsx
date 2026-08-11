'use client'

import { useState } from 'react'
import { AxiosError } from 'axios'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useParseTransaction } from '@/hooks/useAI'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { formatCurrency, withAlpha } from '@/lib/utils'
import type { ParsedTransaction } from '@/lib/types'

export default function QuickAddBar() {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ParsedTransaction | null>(null)
  const [accountId, setAccountId] = useState<number | null>(null)
  const parse = useParseTransaction()
  const create = useCreateTransaction()

  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()

  // 默认选第一个账户
  if (accountId === null && accounts.length > 0) setAccountId(accounts[0].id)

  const cat = preview ? categories.find((c) => c.id === preview.categoryId) : null

  const handleParse = async () => {
    if (!text.trim()) return
    try {
      const result = await parse.mutateAsync(text.trim())
      setPreview(result)
    } catch {
      /* error rendered via parse.error */
    }
  }

  const handleConfirm = async () => {
    if (!preview || !accountId) return
    try {
      await create.mutateAsync({
        account_id: accountId,
        category_id: preview.categoryId,
        amount: preview.amount,
        type: preview.type,
        date: preview.date,
        note: preview.note,
      })
      setText('')
      setPreview(null)
      parse.reset()
      create.reset()
    } catch {
      /* */
    }
  }

  const parseError =
    parse.error instanceof AxiosError
      ? (parse.error.response?.data as { detail?: string } | undefined)?.detail ?? '解析失败'
      : parse.isError
        ? '解析失败'
        : null

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !parse.isPending) handleParse()
          }}
          placeholder="✨ 试一下:'昨天午饭花了 35'、'下午星巴克 38'、'上周打车两次共 60'"
          disabled={parse.isPending}
          style={{
            flex: 1,
            fontSize: 14,
            padding: '11px 14px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-input-border)',
            borderRadius: 11,
            outline: 'none',
            color: 'var(--color-label-primary)',
          }}
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={!text.trim() || parse.isPending}
          style={{
            padding: '10px 18px',
            fontSize: 13.5,
            fontWeight: 600,
            color: '#fff',
            background:
              !text.trim() || parse.isPending
                ? 'var(--color-label-quaternary)'
                : 'linear-gradient(135deg, #bf5af2, #6e6ce8)',
            border: 'none',
            borderRadius: 11,
            cursor: parse.isPending ? 'wait' : text.trim() ? 'pointer' : 'not-allowed',
            opacity: !text.trim() ? 0.5 : 1,
          }}
        >
          {parse.isPending ? '解析中…' : 'AI 记账'}
        </button>
      </div>

      {parseError && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12.5,
            color: '#ff453a',
            background: 'rgba(255,67,58,0.10)',
            border: '1px solid rgba(255,67,58,0.30)',
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          {parseError === 'DEEPSEEK_API_KEY 未配置,无法使用 AI 功能'
            ? 'AI 功能未启用 — 后端缺 DEEPSEEK_API_KEY,请联系管理员配置'
            : parseError}
        </div>
      )}

      {preview && cat && (
        <div
          style={{
            marginTop: 10,
            padding: 14,
            background: 'var(--color-input-bg)',
            border: `1px solid ${preview.confidence >= 0.8 ? 'rgba(50,215,75,0.35)' : 'rgba(255,159,10,0.35)'}`,
            borderLeft: `3px solid ${preview.confidence >= 0.8 ? '#32d74b' : '#ff9f0a'}`,
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 12.5, color: 'var(--color-label-tertiary)', marginBottom: 6 }}>
            AI 解析(置信度 {(preview.confidence * 100).toFixed(0)}%)— 请确认
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              fontSize: 14,
            }}
          >
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                background: withAlpha(cat.color || '#0a84ff', 0.22),
                color: cat.color || '#0a84ff',
              }}
            >
              {cat.icon} {cat.name}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: preview.type === 'income' ? '#32d74b' : 'var(--color-label-primary)',
              }}
            >
              {preview.type === 'income' ? '+' : '-'}
              {formatCurrency(preview.amount)}
            </span>
            <span style={{ color: 'var(--color-label-secondary)' }}>{preview.date}</span>
            <select
              value={accountId ?? ''}
              onChange={(e) => setAccountId(Number(e.target.value))}
              style={{
                fontSize: 13,
                padding: '5px 8px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                borderRadius: 8,
                color: 'var(--color-label-primary)',
              }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                parse.reset()
              }}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                background: 'transparent',
                border: '1px solid var(--color-border-base)',
                borderRadius: 9,
                color: 'var(--color-label-secondary)',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={create.isPending || !accountId}
              style={{
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #32d74b, #5ac8fa)',
                border: 'none',
                borderRadius: 9,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {create.isPending ? '保存中…' : '确认入账'}
            </button>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12.5,
              color: 'var(--color-label-tertiary)',
            }}
          >
            💬 {preview.interpretation}
            {preview.note && <span> · 备注:{preview.note}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
