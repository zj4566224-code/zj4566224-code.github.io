'use client'

import { forwardRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { AxiosError } from 'axios'
import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'
import { useLogin } from '@/hooks/useAuth'

interface FormValues {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { register, handleSubmit, formState } = useForm<FormValues>()
  const login = useLogin()

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values)
      router.replace('/dashboard')
    } catch {
      /* error rendered via login.error */
    }
  })

  const errorMessage =
    login.error instanceof AxiosError
      ? (login.error.response?.data as { detail?: string } | undefined)?.detail ?? '登录失败'
      : login.isError
        ? '登录失败,请稍后再试'
        : null

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.34, 1.3, 0.64, 1] }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        <GlassCard enableGlow={false} style={{ padding: 36 }}>
          <Brand />

          <div style={{ marginTop: 24, marginBottom: 26 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>欢迎回来</h1>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: 'var(--color-label-secondary)',
              }}
            >
              用账号登录继续管理你的财务
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field
              label="邮箱"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              error={formState.errors.email?.message}
              {...register('email', {
                required: '请输入邮箱',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' },
              })}
            />
            <Field
              label="密码"
              type="password"
              placeholder="至少 6 位"
              autoComplete="current-password"
              error={formState.errors.password?.message}
              {...register('password', { required: '请输入密码', minLength: { value: 6, message: '密码至少 6 位' } })}
            />

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

            <button
              type="submit"
              disabled={login.isPending}
              style={{
                marginTop: 6,
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #0a84ff, #6e6ce8)',
                border: 'none',
                borderRadius: 12,
                cursor: login.isPending ? 'wait' : 'pointer',
                opacity: login.isPending ? 0.7 : 1,
                boxShadow: '0 6px 18px rgba(10,132,255,0.28)',
                transition: 'opacity 0.18s',
              }}
            >
              {login.isPending ? '登录中…' : '登录'}
            </button>
          </form>

          <div
            style={{
              marginTop: 22,
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--color-label-secondary)',
            }}
          >
            还没有账户?{' '}
            <Link href="/register" style={{ color: '#5ac8fa', textDecoration: 'none', fontWeight: 500 }}>
              立即注册
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </main>
  )
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 9,
          background: 'linear-gradient(135deg, rgba(10,132,255,0.85), rgba(110,108,232,0.85))',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        ◆
      </span>
      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>FinWise</span>
    </div>
  )
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, ...rest },
  ref,
) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--color-label-tertiary)' }}>{label}</span>
      <input
        ref={ref}
        {...rest}
        style={{
          fontSize: 14,
          padding: '11px 13px',
          background: 'var(--color-input-bg)',
          border: `1px solid ${error ? 'rgba(255,67,58,0.45)' : 'var(--color-border-subtle)'}`,
          borderRadius: 11,
          outline: 'none',
          color: 'var(--color-label-primary)',
        }}
      />
      {error && <span style={{ fontSize: 11.5, color: '#ff453a' }}>{error}</span>}
    </label>
  )
})
