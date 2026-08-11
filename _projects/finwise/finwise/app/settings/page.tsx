'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import PageShell from '@/components/layout/PageShell'
import GlassCard from '@/components/ui/GlassCard'
import AccountModal from '@/components/pages/settings/AccountModal'
import { useAppStore } from '@/store/useAppStore'
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts'
import { useChangePassword, useUpdateProfile } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { THEME_LABELS, type ThemePreference } from '@/lib/theme'
import { formatCurrency, withAlpha } from '@/lib/utils'
import type { Account } from '@/lib/types'

export default function SettingsPage() {
  return (
    <PageShell maxWidth={760}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>设置</h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--color-label-secondary)' }}>
          管理个人资料、密码和账户
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <ProfileSection />
        <ThemeSection />
        <PasswordSection />
        <AccountsSection />
      </div>
    </PageShell>
  )
}

// ─────────────────────────────────────────
// 个人资料
// ─────────────────────────────────────────
function ProfileSection() {
  const user = useAppStore((s) => s.user)
  const { register, handleSubmit, formState, reset } = useForm<{ name: string; currency: string }>({
    defaultValues: { name: user?.name ?? '', currency: user?.currency ?? 'CNY' },
  })
  const updateProfile = useUpdateProfile()
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    reset({ name: user?.name ?? '', currency: user?.currency ?? 'CNY' })
  }, [user, reset])

  const submit = handleSubmit(async (values) => {
    setSuccess(false)
    try {
      await updateProfile.mutateAsync(values)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch {
      /* */
    }
  })

  const errorMessage =
    updateProfile.error instanceof AxiosError
      ? (updateProfile.error.response?.data as { detail?: string } | undefined)?.detail ?? '保存失败'
      : updateProfile.isError
        ? '保存失败'
        : null

  return (
    <GlassCard enableGlow={false} style={{ padding: 26 }}>
      <SectionHeader title="个人资料" />
      <form
        onSubmit={submit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}
      >
        <Field label="邮箱(不可修改)">
          <input value={user?.email ?? ''} disabled style={readonlyInputStyle} />
        </Field>
        <Field label="昵称">
          <input
            type="text"
            {...register('name', { required: true, minLength: 1 })}
            style={inputStyle}
          />
        </Field>
        <Field label="币种">
          <select {...register('currency', { required: true })} style={inputStyle}>
            <option value="CNY">CNY (¥)</option>
            <option value="USD">USD ($)</option>
            <option value="HKD">HKD (HK$)</option>
            <option value="EUR">EUR (€)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <button
            type="submit"
            disabled={!formState.isDirty || updateProfile.isPending}
            style={primaryButtonStyle(formState.isDirty && !updateProfile.isPending)}
          >
            {updateProfile.isPending ? '保存中…' : '保存'}
          </button>
          {success && <Hint color="#32d74b">已保存</Hint>}
          {errorMessage && <Hint color="#ff453a">{errorMessage}</Hint>}
        </div>
      </form>
    </GlassCard>
  )
}

// ─────────────────────────────────────────
// 主题
// ─────────────────────────────────────────
function ThemeSection() {
  const { preference, effective, setPreference } = useTheme()
  const options: ThemePreference[] = ['auto', 'dawn', 'day', 'dusk', 'night']

  return (
    <GlassCard enableGlow={false} style={{ padding: 26 }}>
      <SectionHeader
        title="外观主题"
        subtitle="自动模式按本地时间切换:5:30 黎明、7:00 白天、17:00 黄昏、19:00 黑夜"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
          marginTop: 18,
        }}
      >
        {options.map((opt) => {
          const active = preference === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setPreference(opt)}
              style={{
                padding: '12px 10px',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: 'var(--color-label-primary)',
                background: active ? 'var(--color-glass-bg)' : 'transparent',
                border: `1px solid ${active ? 'var(--color-border-base)' : 'var(--color-border-subtle)'}`,
                borderRadius: 11,
                cursor: 'pointer',
                transition: 'background 0.18s, border-color 0.18s',
              }}
            >
              {THEME_LABELS[opt]}
            </button>
          )
        })}
      </div>
      {preference === 'auto' && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          当前生效:{THEME_LABELS[effective]}
        </div>
      )}
    </GlassCard>
  )
}

// ─────────────────────────────────────────
// 修改密码
// ─────────────────────────────────────────
function PasswordSection() {
  const { register, handleSubmit, formState, reset } = useForm<{
    oldPassword: string
    newPassword: string
    confirmPassword: string
  }>()
  const changePassword = useChangePassword()
  const [success, setSuccess] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const submit = handleSubmit(async (values) => {
    setSuccess(false)
    setMismatch(false)
    if (values.newPassword !== values.confirmPassword) {
      setMismatch(true)
      return
    }
    try {
      await changePassword.mutateAsync({
        old_password: values.oldPassword,
        new_password: values.newPassword,
      })
      setSuccess(true)
      reset()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      /* */
    }
  })

  const errorMessage =
    changePassword.error instanceof AxiosError
      ? (changePassword.error.response?.data as { detail?: string } | undefined)?.detail ?? '修改失败'
      : changePassword.isError
        ? '修改失败'
        : null

  return (
    <GlassCard enableGlow={false} style={{ padding: 26 }}>
      <SectionHeader title="修改密码" />
      <form
        onSubmit={submit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}
      >
        <Field label="当前密码">
          <input
            type="password"
            autoComplete="current-password"
            {...register('oldPassword', { required: true })}
            style={inputStyle}
          />
        </Field>
        <Field label="新密码">
          <input
            type="password"
            autoComplete="new-password"
            {...register('newPassword', { required: true, minLength: 6 })}
            style={inputStyle}
          />
        </Field>
        <Field label="确认新密码">
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword', { required: true, minLength: 6 })}
            style={inputStyle}
          />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <button
            type="submit"
            disabled={!formState.isValid || changePassword.isPending}
            style={primaryButtonStyle(formState.isValid && !changePassword.isPending)}
          >
            {changePassword.isPending ? '修改中…' : '修改密码'}
          </button>
          {success && <Hint color="#32d74b">密码已更新</Hint>}
          {mismatch && <Hint color="#ff453a">两次输入不一致</Hint>}
          {errorMessage && <Hint color="#ff453a">{errorMessage}</Hint>}
        </div>
      </form>
    </GlassCard>
  )
}

// ─────────────────────────────────────────
// 账户管理
// ─────────────────────────────────────────
function AccountsSection() {
  const { data: accounts = [] } = useAccounts()
  const del = useDeleteAccount()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  return (
    <GlassCard enableGlow={false} style={{ padding: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 22px 12px',
        }}
      >
        <SectionHeader title="账户管理" subtitle="管理你的银行卡、信用卡、现金钱包等" />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #0a84ff, #6e6ce8)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          ＋ 新增账户
        </button>
      </div>

      {accounts.length === 0 ? (
        <div
          style={{
            padding: '24px 22px',
            fontSize: 13,
            color: 'var(--color-label-tertiary)',
            textAlign: 'center',
          }}
        >
          还没有账户
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {accounts.map((a) => (
            <li
              key={a.id}
              onClick={() => setEditing(a)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 22px',
                borderTop: '1px solid var(--color-row-divider)',
                cursor: 'pointer',
                transition: 'background 0.18s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-row-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: withAlpha(a.color || '#0a84ff', 0.22),
                  border: `1px solid ${withAlpha(a.color || '#0a84ff', 0.4)}`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-label-tertiary)', marginTop: 2 }}>
                  {accountTypeLabel(a.type)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: a.balance < 0 ? '#ff453a' : 'var(--color-label-primary)',
                }}
              >
                {formatCurrency(a.balance)}
              </div>
              <button
                type="button"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation()
                  if (
                    confirm(
                      `确认删除账户「${a.name}」?此账户下的所有交易也会被删除,余额信息将无法恢复。`,
                    )
                  ) {
                    del.mutate(a.id)
                  }
                }}
                disabled={del.isPending}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--color-label-tertiary)',
                  cursor: del.isPending ? 'wait' : 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  transition: 'background 0.18s, color 0.18s, border-color 0.18s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,67,58,0.12)'
                  e.currentTarget.style.color = '#ff453a'
                  e.currentTarget.style.borderColor = 'rgba(255,67,58,0.30)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-label-tertiary)'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <AccountModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AccountModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        account={editing ?? undefined}
      />
    </GlassCard>
  )
}

// ─────────────────────────────────────────
// helpers
// ─────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--color-label-tertiary)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>{label}</span>
      {children}
    </label>
  )
}

function Hint({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 12.5, color }}>{children}</span>
}

const inputStyle: React.CSSProperties = {
  fontSize: 14,
  padding: '11px 13px',
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-input-border)',
  borderRadius: 11,
  outline: 'none',
  color: 'var(--color-label-primary)',
}

const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--color-input-bg-readonly)',
  color: 'var(--color-label-tertiary)',
  cursor: 'not-allowed',
}

function primaryButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 22px',
    borderRadius: 11,
    fontSize: 14,
    fontWeight: 600,
    background: active
      ? 'linear-gradient(135deg, #0a84ff, #6e6ce8)'
      : 'var(--color-label-quaternary)',
    border: 'none',
    color: '#fff',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
    transition: 'opacity 0.18s',
  }
}

function accountTypeLabel(t: Account['type']): string {
  return { bank: '银行', cash: '现金', credit: '信用卡', investment: '投资' }[t] ?? t
}
