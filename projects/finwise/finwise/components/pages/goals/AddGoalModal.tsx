'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import { useCreateGoal, useUpdateGoal } from '@/hooks/useGoals'
import { withAlpha } from '@/lib/utils'
import type { Goal } from '@/lib/types'

interface FormValues {
  name: string
  targetAmount: number
  deadline: string
}

interface AddGoalModalProps {
  open: boolean
  onClose: () => void
  goal?: Goal
}

const ICON_CHOICES = ['🗾', '🏠', '🚗', '💻', '🛟', '📚', '🎓', '💍', '✈️', '🎮']
const COLOR_CHOICES = ['#0a84ff', '#32d74b', '#bf5af2', '#ff9f0a', '#ff453a', '#5ac8fa', '#6e6ce8']

export default function AddGoalModal({ open, onClose, goal }: AddGoalModalProps) {
  const isEdit = !!goal
  const [icon, setIcon] = useState('🗾')
  const [color, setColor] = useState('#0a84ff')
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    defaultValues: { name: '', targetAmount: 0, deadline: '' },
  })
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()

  useEffect(() => {
    if (!open) {
      reset({ name: '', targetAmount: 0, deadline: '' })
      setIcon('🗾')
      setColor('#0a84ff')
      createGoal.reset()
      updateGoal.reset()
      return
    }
    if (goal) {
      setIcon(goal.icon || '🗾')
      setColor(goal.color || '#0a84ff')
      reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline ?? '',
      })
    } else {
      reset({ name: '', targetAmount: 0, deadline: '' })
      setIcon('🗾')
      setColor('#0a84ff')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateGoal.mutateAsync({
          id: goal.id,
          input: {
            name: values.name,
            icon,
            color,
            target_amount: Number(values.targetAmount),
            deadline: values.deadline || undefined,
          },
        })
      } else {
        await createGoal.mutateAsync({
          name: values.name,
          icon,
          color,
          target_amount: Number(values.targetAmount),
          deadline: values.deadline || undefined,
        })
      }
      onClose()
    } catch {
      /* error rendered below */
    }
  })

  const activeMutation = isEdit ? updateGoal : createGoal
  const errorMessage =
    activeMutation.error instanceof AxiosError
      ? (activeMutation.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : activeMutation.isError
        ? '保存失败,请稍后再试'
        : null

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? '编辑目标' : '新建目标'}</div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>名称</span>
            <input
              type="text"
              autoFocus
              placeholder="例如:日本旅行基金"
              {...register('name', { required: true, minLength: 1 })}
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
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>图标</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICON_CHOICES.map((emoji) => {
                const active = icon === emoji
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      fontSize: 18,
                      background: active ? withAlpha(color, 0.22) : 'var(--color-input-bg)',
                      border: `1px solid ${active ? color : 'var(--color-border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'background 0.18s, border-color 0.18s',
                    }}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>主题色</span>
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
                      transition: 'border-color 0.18s, transform 0.18s',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                )
              })}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>目标金额</span>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              {...register('targetAmount', { required: true, valueAsNumber: true, min: 0.01 })}
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

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>截止日期(可选)</span>
            <input
              type="date"
              {...register('deadline')}
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
              {activeMutation.isPending ? '保存中…' : isEdit ? '保存修改' : '创建目标'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
