'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import { useContributeGoal } from '@/hooks/useGoals'
import { formatCurrency, withAlpha } from '@/lib/utils'
import type { Goal } from '@/lib/types'

interface FormValues {
  amount: number
}

interface ContributeGoalModalProps {
  open: boolean
  onClose: () => void
  goal: Goal | null
}

export default function ContributeGoalModal({ open, onClose, goal }: ContributeGoalModalProps) {
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    defaultValues: { amount: 0 },
  })
  const contribute = useContributeGoal()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) {
      reset({ amount: 0 })
      contribute.reset()
    }
  }, [open])

  const submit = handleSubmit(async (values) => {
    if (!goal) return
    try {
      await contribute.mutateAsync({ id: goal.id, amount: Number(values.amount) })
      onClose()
    } catch {
      /* error rendered below */
    }
  })

  const errorMessage =
    contribute.error instanceof AxiosError
      ? (contribute.error.response?.data as { detail?: string } | undefined)?.detail ?? '存入失败'
      : contribute.isError
        ? '存入失败,请稍后再试'
        : null

  const remaining = goal ? Math.max(0, goal.targetAmount - goal.currentAmount) : 0
  const color = goal?.color ?? '#0a84ff'

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginBottom: 4 }}>
            存入金额到
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{goal?.icon}</span>
            <span>{goal?.name}</span>
          </div>
          {goal && (
            <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginTop: 4 }}>
              还差 {formatCurrency(remaining)}
            </div>
          )}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              disabled={!formState.isValid || contribute.isPending}
              style={{
                padding: '10px 22px',
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 600,
                background:
                  formState.isValid && !contribute.isPending
                    ? withAlpha(color, 0.85)
                    : 'var(--color-label-quaternary)',
                border: `1px solid ${formState.isValid ? color : 'transparent'}`,
                color: '#fff',
                cursor: contribute.isPending ? 'wait' : formState.isValid ? 'pointer' : 'not-allowed',
                opacity: formState.isValid ? 1 : 0.5,
              }}
            >
              {contribute.isPending ? '存入中…' : '确认存入'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
