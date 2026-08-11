'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import { useCreateAccount, useUpdateAccount } from '@/hooks/useAccounts'
import { withAlpha } from '@/lib/utils'
import type { Account } from '@/lib/types'

interface FormValues {
  name: string
  balance: number
}

const ACCOUNT_TYPES: { value: Account['type']; label: string }[] = [
  { value: 'bank', label: '银行' },
  { value: 'cash', label: '现金' },
  { value: 'credit', label: '信用卡' },
  { value: 'investment', label: '投资' },
]
const COLOR_CHOICES = ['#0a84ff', '#32d74b', '#bf5af2', '#ff9f0a', '#ff453a', '#5ac8fa', '#6e6ce8']

interface AccountModalProps {
  open: boolean
  onClose: () => void
  account?: Account
}

export default function AccountModal({ open, onClose, account }: AccountModalProps) {
  const isEdit = !!account
  const [type, setType] = useState<Account['type']>('bank')
  const [color, setColor] = useState<string>('#0a84ff')
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    defaultValues: { name: '', balance: 0 },
  })
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()

  useEffect(() => {
    if (!open) {
      reset({ name: '', balance: 0 })
      setType('bank')
      setColor('#0a84ff')
      createAccount.reset()
      updateAccount.reset()
      return
    }
    if (account) {
      reset({ name: account.name, balance: account.balance })
      setType(account.type)
      setColor(account.color || '#0a84ff')
    } else {
      reset({ name: '', balance: 0 })
      setType('bank')
      setColor('#0a84ff')
    }
    // reset / createAccount / updateAccount 每次渲染都是新引用,放进 deps 会无限循环。
    // 只在 open/account 变化时重置即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateAccount.mutateAsync({
          id: account.id,
          input: { name: values.name, type, balance: Number(values.balance), color },
        })
      } else {
        await createAccount.mutateAsync({
          name: values.name,
          type,
          balance: Number(values.balance),
          color,
        })
      }
      onClose()
    } catch {
      /* */
    }
  })

  const activeMutation = isEdit ? updateAccount : createAccount
  const errorMessage =
    activeMutation.error instanceof AxiosError
      ? (activeMutation.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : activeMutation.isError
        ? '保存失败,请稍后再试'
        : null

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? '编辑账户' : '新增账户'}</div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>名称</span>
            <input
              type="text"
              autoFocus
              placeholder="例如:招商银行储蓄卡"
              {...register('name', { required: true })}
              style={{
                fontSize: 16,
                padding: '11px 13px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 11,
                outline: 'none',
                color: 'var(--color-label-primary)',
              }}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>类型</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACCOUNT_TYPES.map((t) => {
                const active = type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      fontSize: 13,
                      background: active ? withAlpha(color, 0.22) : 'var(--color-input-bg)',
                      border: `1px solid ${active ? color : 'var(--color-border-subtle)'}`,
                      color: 'var(--color-label-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>颜色</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLOR_CHOICES.map((c) => {
                const active = color === c
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: c,
                      border: `2px solid ${active ? '#fff' : 'transparent'}`,
                      cursor: 'pointer',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                      transition: 'border-color 0.18s, transform 0.18s',
                    }}
                  />
                )
              })}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
              余额{isEdit ? '(可手动调整)' : '(初始)'}
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('balance', { valueAsNumber: true })}
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: -0.3,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border-base)',
                outline: 'none',
                color: 'var(--color-label-primary)',
                padding: '6px 0',
              }}
            />
          </label>

          {errorMessage && (
            <div
              style={{
                fontSize: 12.5,
                color: '#ff453a',
                background: 'rgba(255,67,58,0.10)',
                border: '1px solid rgba(255,67,58,0.30)',
                borderRadius: 10,
                padding: '8px 12px',
              }}
            >
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 500,
                background: 'transparent',
                border: '1px solid var(--color-border-base)',
                color: 'var(--color-label-secondary)',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formState.isValid || activeMutation.isPending}
              style={{
                padding: '10px 22px',
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 600,
                background:
                  formState.isValid && !activeMutation.isPending
                    ? `linear-gradient(135deg, ${color}, ${withAlpha(color, 0.7)})`
                    : 'var(--color-label-quaternary)',
                border: 'none',
                color: '#fff',
                cursor: activeMutation.isPending ? 'wait' : formState.isValid ? 'pointer' : 'not-allowed',
                opacity: formState.isValid ? 1 : 0.5,
              }}
            >
              {activeMutation.isPending ? '保存中…' : isEdit ? '保存修改' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
