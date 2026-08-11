'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import Modal from '@/components/ui/Modal'
import { useCreateAsset, useUpdateAsset } from '@/hooks/useAssets'
import type { Asset } from '@/lib/types'

interface FormValues {
  name: string
  value: number
}

const ASSET_TYPES = ['现金存款', '股票基金', '货币基金', '房产', '其他']

interface AddAssetModalProps {
  open: boolean
  onClose: () => void
  asset?: Asset
}

export default function AddAssetModal({ open, onClose, asset }: AddAssetModalProps) {
  const isEdit = !!asset
  const [type, setType] = useState<string>(ASSET_TYPES[0])
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    defaultValues: { name: '', value: 0 },
  })
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()

  useEffect(() => {
    if (!open) {
      reset({ name: '', value: 0 })
      setType(ASSET_TYPES[0])
      createAsset.reset()
      updateAsset.reset()
      return
    }
    if (asset) {
      setType(asset.type || ASSET_TYPES[0])
      reset({ name: asset.name, value: asset.value })
    } else {
      reset({ name: '', value: 0 })
      setType(ASSET_TYPES[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateAsset.mutateAsync({
          id: asset.id,
          input: { name: values.name, type, value: Number(values.value) },
        })
      } else {
        await createAsset.mutateAsync({
          name: values.name,
          type,
          value: Number(values.value),
        })
      }
      onClose()
    } catch {
      /* error rendered below */
    }
  })

  const activeMutation = isEdit ? updateAsset : createAsset
  const errorMessage =
    activeMutation.error instanceof AxiosError
      ? (activeMutation.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : activeMutation.isError
        ? '保存失败,请稍后再试'
        : null

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{isEdit ? '编辑资产' : '新增资产'}</div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>名称</span>
            <input
              type="text"
              autoFocus
              placeholder="例如:招商银行储蓄"
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
              {ASSET_TYPES.map((t) => {
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
                      background: active ? 'rgba(50,215,75,0.18)' : 'var(--color-input-bg)',
                      border: `1px solid ${active ? '#32d74b' : 'var(--color-border-subtle)'}`,
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

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>估值</span>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              {...register('value', { required: true, valueAsNumber: true, min: 0.01 })}
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.4,
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
                    ? 'linear-gradient(135deg, #32d74b, #5ac8fa)'
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
