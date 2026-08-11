'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import { useCreateLiability, useUpdateLiability } from '@/hooks/useAssets'
import type { Liability } from '@/lib/types'

interface FormValues {
  name: string
  totalAmount: number
  remaining: number
  interestRate: number
  dueDate: string
}

const LIABILITY_TYPES = ['信用卡', '贷款', '房贷', '车贷', '其他']

interface AddLiabilityModalProps {
  open: boolean
  onClose: () => void
  liability?: Liability
}

export default function AddLiabilityModal({ open, onClose, liability }: AddLiabilityModalProps) {
  const isEdit = !!liability
  const [type, setType] = useState<string>(LIABILITY_TYPES[0])
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    defaultValues: { name: '', totalAmount: 0, remaining: 0, interestRate: 0, dueDate: '' },
  })
  const createLiability = useCreateLiability()
  const updateLiability = useUpdateLiability()

  useEffect(() => {
    if (!open) {
      reset({ name: '', totalAmount: 0, remaining: 0, interestRate: 0, dueDate: '' })
      setType(LIABILITY_TYPES[0])
      createLiability.reset()
      updateLiability.reset()
      return
    }
    if (liability) {
      setType(liability.type || LIABILITY_TYPES[0])
      reset({
        name: liability.name,
        totalAmount: liability.totalAmount,
        remaining: liability.remaining,
        interestRate: liability.interestRate,
        dueDate: liability.dueDate || '',
      })
    } else {
      reset({ name: '', totalAmount: 0, remaining: 0, interestRate: 0, dueDate: '' })
      setType(LIABILITY_TYPES[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, liability])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        // 编辑时后端 schema 只允许更新 name/remaining/interest_rate/due_date(不允许改 total/type)
        await updateLiability.mutateAsync({
          id: liability.id,
          input: {
            name: values.name,
            remaining: Number(values.remaining),
            interest_rate: Number(values.interestRate) || 0,
            due_date: values.dueDate || undefined,
          },
        })
      } else {
        await createLiability.mutateAsync({
          name: values.name,
          type,
          total_amount: Number(values.totalAmount),
          remaining: Number(values.remaining),
          interest_rate: Number(values.interestRate) || 0,
          due_date: values.dueDate || undefined,
        })
      }
      onClose()
    } catch {
      /* error rendered below */
    }
  })

  const activeMutation = isEdit ? updateLiability : createLiability
  const errorMessage =
    activeMutation.error instanceof AxiosError
      ? (activeMutation.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : activeMutation.isError
        ? '保存失败,请稍后再试'
        : null

  const inputStyle: React.CSSProperties = {
    fontSize: 14,
    padding: '11px 13px',
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 11,
    outline: 'none',
    color: 'var(--color-label-primary)',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  }

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? '编辑负债' : '新增负债'}</div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>名称</span>
            <input
              type="text"
              autoFocus
              placeholder="例如:中信信用卡"
              {...register('name', { required: true })}
              style={inputStyle}
            />
          </label>

          {!isEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>类型</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LIABILITY_TYPES.map((t) => {
                  const active = type === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        fontSize: 13,
                        background: active ? 'rgba(255,67,58,0.18)' : 'var(--color-input-bg)',
                        border: `1px solid ${active ? '#ff453a' : 'var(--color-border-subtle)'}`,
                        color: 'var(--color-label-primary)',
                        cursor: 'pointer',
                        transition: 'background 0.18s, border-color 0.18s',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>
                {isEdit ? '总额(只读)' : '总额'}
              </span>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                disabled={isEdit}
                {...register('totalAmount', { required: !isEdit, valueAsNumber: true, min: 0 })}
                style={{ ...inputStyle, opacity: isEdit ? 0.5 : 1 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>剩余</span>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('remaining', { required: true, valueAsNumber: true, min: 0 })}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>年利率 (%)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="0"
                {...register('interestRate', { valueAsNumber: true, min: 0 })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>到期日(可选)</span>
              <input
                type="date"
                {...register('dueDate')}
                style={{ ...inputStyle, colorScheme: 'dark' }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 2 }}>
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
                    ? 'linear-gradient(135deg, #ff453a, #ff9f0a)'
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
