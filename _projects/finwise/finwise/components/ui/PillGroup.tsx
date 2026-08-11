'use client'

interface PillOption<T extends string> {
  value: T
  label: string
}

interface PillGroupProps<T extends string> {
  options: PillOption<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}

export default function PillGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: PillGroupProps<T>) {
  const pad = size === 'sm' ? '6px 14px' : '8px 18px'
  const fontSize = size === 'sm' ? 13 : 14

  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        borderRadius: 12,
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: pad,
              fontSize,
              fontWeight: active ? 600 : 500,
              color: active
                ? 'var(--color-label-primary)'
                : 'var(--color-label-secondary)',
              background: active ? 'var(--color-border-base)' : 'transparent',
              border: 'none',
              borderRadius: 9,
              cursor: 'pointer',
              transition: 'background 0.18s, color 0.18s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
