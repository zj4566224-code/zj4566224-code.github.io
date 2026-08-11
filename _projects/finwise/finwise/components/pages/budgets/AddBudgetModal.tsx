'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import PillGroup from '@/components/ui/PillGroup'
import { useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { withAlpha } from '@/lib/utils'
import type { Budget } from '@/lib/types'

interface FormValues {
  amount: number
}

type Scope = 'total' | 'category'

interface AddBudgetModalProps {
  open: boolean
  onClose: () => void
  hasTotalBudget?: boolean
  usedCategoryIds?: number[]
  budget?: Budget
}

function firstDayOfThisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function AddBudgetModal({
  open,
  onClose,
  hasTotalBudget = false,
  usedCategoryIds = [],
  budget,
}: AddBudgetModalProps) {
  const isEdit = !!budget
  const [scope, setScope] = useState<Scope>(hasTotalBudget ? 'category' : 'total')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    defaultValues: { amount: 0 },
  })
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const { data: allCategories = [] } = useCategories()

  const availableCategories = allCategories.filter(
    (c) => c.type === 'expense' && !usedCategoryIds.includes(c.id),
  )

  useEffect(() => {
    if (!open) {
      reset({ amount: 0 })
      setScope(hasTotalBudget ? 'category' : 'total')
      setCategoryId(null)
      createBudget.reset()
      updateBudget.reset()
      return
    }
    if (budget) {
      reset({ amount: budget.amount })
      setScope(budget.categoryId === null ? 'total' : 'category')
      setCategoryId(budget.categoryId)
    } else {
      reset({ amount: 0 })
      setScope(hasTotalBudget ? 'category' : 'total')
      setCategoryId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, budget, hasTotalBudget])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateBudget.mutateAsync({
          id: budget.id,
          input: { amount: Number(values.amount) },
        })
      } else {
        await createBudget.mutateAsync({
          category_id: scope === 'total' ? null : categoryId,
          amount: Number(values.amount),
          period: 'monthly',
          start_date: firstDayOfThisMonth(),
        })
      }
      onClose()
    } catch {
      /* error rendered below */
    }
  })

  const activeMutation = isEdit ? updateBudget : createBudget
  const errorMessage =
    activeMutation.error instanceof AxiosError
      ? (activeMutation.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : activeMutation.isError
        ? '保存失败,请稍后再试'
        : null

  const canSubmit =
    formState.isValid &&
    !activeMutation.isPending &&
    (isEdit || (scope === 'total' ? !hasTotalBudget : categoryId !== null))

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? '编辑预算' : '新建预算'}</div>

        {!isEdit && (
          <PillGroup
            options={[
              { value: 'total', label: '本月总预算' },
              { value: 'category', label: '分类预算' },
            ]}
            value={scope}
            onChange={(v) => {
              setScope(v)
              setCategoryId(null)
            }}
          />
        )}

        {isEdit && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-label-secondary)',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>{budget?.categoryIcon}</span>
            <span>{budget?.categoryName}</span>
          </div>
        )}

        {!isEdit && scope === 'total' && hasTotalBudget && (
          <div
            style={{
              fontSize: 12.5,
              color: '#ff9f0a',
              background: 'rgba(255,159,10,0.10)',
              border: '1px solid rgba(255,159,10,0.30)',
              borderRadius: 10,
              padding: '8px 12px',
            }}
          >
            已经设置过总预算了。如需修改请直接点击总预算卡片。
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!isEdit && scope === 'category' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>分类</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableCategories.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
                    所有支出分类都已设置预算
                  </div>
                )}
                {availableCategories.map((c) => {
                  const active = categoryId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
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
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
              预算金额(本月)
            </span>
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
