'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import PillGroup from '@/components/ui/PillGroup'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions'
import { withAlpha } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

interface FormValues {
  amount: number
  categoryId: number
  note: string
  date: string
}

interface AddTransactionModalProps {
  open: boolean
  onClose: () => void
  transaction?: Transaction
}

export default function AddTransactionModal({ open, onClose, transaction }: AddTransactionModalProps) {
  const isEdit = !!transaction
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const { register, handleSubmit, formState, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: { amount: 0, note: '', categoryId: 0, date: new Date().toISOString().slice(0, 10) },
  })

  const { data: allCategories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()

  const categories = allCategories.filter((c) => c.type === type)
  const selectedCategoryId = watch('categoryId')
  const accountId = transaction?.accountId ?? accounts[0]?.id

  // 只在 open / transaction 变化时执行;mutation 的 reset 通过 ref 拿到稳定引用
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) {
      reset({ amount: 0, note: '', categoryId: 0, date: new Date().toISOString().slice(0, 10) })
      setType('expense')
      createTx.reset()
      updateTx.reset()
      return
    }
    if (transaction) {
      setType(transaction.type)
      reset({
        amount: transaction.amount,
        note: transaction.note ?? '',
        categoryId: transaction.categoryId,
        date: transaction.date,
      })
    } else {
      reset({ amount: 0, note: '', categoryId: 0, date: new Date().toISOString().slice(0, 10) })
      setType('expense')
    }
  }, [open, transaction])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateTx.mutateAsync({
          id: transaction.id,
          input: {
            amount: Number(values.amount),
            category_id: values.categoryId,
            date: values.date,
            note: values.note || undefined,
          },
        })
      } else {
        if (!accountId) return
        await createTx.mutateAsync({
          account_id: accountId,
          category_id: values.categoryId,
          amount: Number(values.amount),
          type,
          date: values.date,
          note: values.note || undefined,
        })
      }
      onClose()
    } catch {
      /* error rendered below */
    }
  })

  const activeMutation = isEdit ? updateTx : createTx
  const errorMessage =
    activeMutation.error instanceof AxiosError
      ? (activeMutation.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : activeMutation.isError
        ? '保存失败,请稍后再试'
        : null

  const canSubmit =
    formState.isValid &&
    !!selectedCategoryId &&
    (isEdit || !!accountId) &&
    !activeMutation.isPending

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? '编辑记录' : '新增记录'}</div>

        <PillGroup
          options={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
          ]}
          value={type}
          onChange={(v) => {
            if (isEdit) return // 编辑模式下类型不可变
            setType(v)
            setValue('categoryId', 0)
          }}
        />
        {isEdit && (
          <div style={{ fontSize: 11.5, color: 'var(--color-label-tertiary)', marginTop: -10 }}>
            类型创建后无法修改
          </div>
        )}

        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>金额</span>
            <input
              type="number"
              step="0.01"
              min={0}
              autoFocus
              placeholder="0.00"
              {...register('amount', { required: true, valueAsNumber: true, min: 0.01 })}
              style={{
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: -0.6,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border-base)',
                outline: 'none',
                color: 'var(--color-label-primary)',
                padding: '6px 0',
              }}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>分类</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
                  暂无分类
                </div>
              )}
              {categories.map((c) => {
                const active = selectedCategoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValue('categoryId', c.id, { shouldValidate: true })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 12,
                      fontSize: 13,
                      background: active ? withAlpha(c.color, 0.22) : 'var(--color-input-bg)',
                      border: `1px solid ${active ? c.color : 'var(--color-border-subtle)'}`,
                      color: 'var(--color-label-primary)',
                      cursor: 'pointer',
                      transition: 'background 0.18s, border-color 0.18s',
                    }}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>日期</span>
              <input
                type="date"
                {...register('date', { required: true })}
                style={{
                  fontSize: 14,
                  padding: '10px 12px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 10,
                  outline: 'none',
                  color: 'var(--color-label-primary)',
                  colorScheme: 'dark',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>备注</span>
              <input
                type="text"
                placeholder="可选"
                {...register('note')}
                style={{
                  fontSize: 14,
                  padding: '10px 12px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 10,
                  outline: 'none',
                  color: 'var(--color-label-primary)',
                }}
              />
            </label>
          </div>

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

          {!isEdit && !accountId && (
            <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
              正在加载账户…
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
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
              disabled={!canSubmit}
              style={{
                padding: '10px 22px',
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 600,
                background: canSubmit
                  ? 'linear-gradient(135deg, #0a84ff, #6e6ce8)'
                  : 'var(--color-label-quaternary)',
                border: 'none',
                color: '#fff',
                cursor: activeMutation.isPending ? 'wait' : canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.5,
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
