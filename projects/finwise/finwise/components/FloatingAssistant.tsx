'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AxiosError } from 'axios'
import { useAppStore } from '@/store/useAppStore'
import { useChat } from '@/hooks/useAI'
import type { ChatMessage } from '@/lib/types'

const BUBBLE_SIZE = 56
const PANEL_W = 380
const PANEL_H = 520
const POS_KEY = 'assistant-pos-v1'
const OPEN_KEY = 'assistant-open-v1'
const DRAG_THRESHOLD = 4
const TOPBAR_PAD = 60

const SUGGESTIONS = [
  '本月 vs 上月有什么变化?',
  '哪个预算可能会爆?',
  '最近 6 个月走势怎样?',
  '本月有什么异常大额?',
]

const HIDDEN_ROUTES = ['/login', '/register']

function clampPos(x: number, y: number, w: number, h: number) {
  if (typeof window === 'undefined') return { x, y }
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: Math.max(8, Math.min(vw - w - 8, x)),
    y: Math.max(TOPBAR_PAD, Math.min(vh - h - 8, y)),
  }
}

export default function FloatingAssistant() {
  const token = useAppStore((s) => s.token)
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const chat = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY)
      if (saved) {
        setPos(JSON.parse(saved))
      } else {
        setPos({ x: 16, y: Math.max(TOPBAR_PAD, window.innerHeight / 2 - BUBBLE_SIZE / 2) })
      }
      if (localStorage.getItem(OPEN_KEY) === '1') setOpen(true)
    } catch {
      setPos({ x: 16, y: 200 })
    }
  }, [])

  useEffect(() => {
    if (pos === null) return
    try {
      localStorage.setItem(OPEN_KEY, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [open, pos])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, chat.isPending, open])

  const dragRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
    ptrId: number
  } | null>(null)

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!pos) return
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        moved: false,
        ptrId: e.pointerId,
      }
    },
    [pos],
  )

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d || d.ptrId !== e.pointerId) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
      d.moved = true
      const w = open ? PANEL_W : BUBBLE_SIZE
      const h = open ? PANEL_H : BUBBLE_SIZE
      setPos(clampPos(d.origX + dx, d.origY + dy, w, h))
    },
    [open],
  )

  const onDragEnd = useCallback(
    (e: React.PointerEvent, allowClick: boolean) => {
      const d = dragRef.current
      if (!d || d.ptrId !== e.pointerId) return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      const moved = d.moved
      dragRef.current = null
      if (moved && pos) {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(pos))
        } catch {
          /* ignore */
        }
      }
      if (!moved && allowClick) {
        setOpen((o) => !o)
      }
    },
    [pos],
  )

  useEffect(() => {
    const onResize = () => {
      const w = open ? PANEL_W : BUBBLE_SIZE
      const h = open ? PANEL_H : BUBBLE_SIZE
      setPos((p) => (p ? clampPos(p.x, p.y, w, h) : p))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  const send = async (text: string) => {
    if (!text.trim() || chat.isPending) return
    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    try {
      const result = await chat.mutateAsync({ message: text.trim(), history: messages })
      setMessages([...next, { role: 'assistant', content: result.reply }])
    } catch (e) {
      const detail =
        e instanceof AxiosError
          ? (e.response?.data as { detail?: string } | undefined)?.detail ?? '请求失败'
          : '请求失败'
      setMessages([
        ...next,
        {
          role: 'assistant',
          content:
            detail === 'DEEPSEEK_API_KEY 未配置,无法使用 AI 功能'
              ? '⚠️ AI 功能未启用 — 后端缺 DEEPSEEK_API_KEY'
              : `⚠️ ${detail}`,
        },
      ])
    }
  }

  if (!token || !pos) return null
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null

  if (!open) {
    return (
      <button
        type="button"
        aria-label="打开财务助手"
        title="财务助手 — 点击打开,长按拖动"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={(e) => onDragEnd(e, true)}
        onPointerCancel={(e) => onDragEnd(e, false)}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #bf5af2, #6e6ce8)',
          boxShadow:
            '0 10px 32px rgba(110,108,232,0.45), 0 2px 8px rgba(0,0,0,0.18)',
          color: '#fff',
          fontSize: 24,
          cursor: 'grab',
          touchAction: 'none',
          zIndex: 200,
          transition: 'transform 0.18s, box-shadow 0.18s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        ✨
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        height: PANEL_H,
        background: 'var(--color-surface-glass-bg, rgba(28,28,30,0.85))',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 16,
        boxShadow:
          '0 24px 60px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 200,
      }}
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={(e) => onDragEnd(e, false)}
        onPointerCancel={(e) => onDragEnd(e, false)}
        style={{
          padding: '11px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--color-row-divider)',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #bf5af2, #6e6ce8)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          ✨
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-label-primary)' }}>
            财务助手
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--color-label-tertiary)' }}>
            拖动标题栏可移动
          </span>
        </div>
        <button
          type="button"
          aria-label="关闭"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-label-secondary)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-label-quaternary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ×
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && !chat.isPending && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--color-label-tertiary)',
              padding: '14px 0',
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>试试这些问题:</div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  style={{
                    padding: '6px 11px',
                    fontSize: 12,
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 999,
                    color: 'var(--color-label-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}

        {chat.isPending && <Typing />}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-row-divider)',
          padding: '10px 12px',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="问关于你财务的问题…"
          disabled={chat.isPending}
          style={{
            flex: 1,
            fontSize: 13,
            padding: '9px 12px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-input-border)',
            borderRadius: 10,
            outline: 'none',
            color: 'var(--color-label-primary)',
            minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={!input.trim() || chat.isPending}
          style={{
            padding: '9px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#fff',
            background:
              !input.trim() || chat.isPending
                ? 'var(--color-label-quaternary)'
                : 'linear-gradient(135deg, #bf5af2, #6e6ce8)',
            border: 'none',
            borderRadius: 10,
            cursor: chat.isPending ? 'wait' : input.trim() ? 'pointer' : 'not-allowed',
            opacity: !input.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {chat.isPending ? '…' : '发送'}
        </button>
      </div>
    </div>
  )
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '9px 12px',
          borderRadius: 12,
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          background: isUser
            ? 'linear-gradient(135deg, #0a84ff, #6e6ce8)'
            : 'var(--color-input-bg)',
          color: isUser ? '#fff' : 'var(--color-label-primary)',
          border: isUser ? 'none' : '1px solid var(--color-border-subtle)',
        }}
      >
        {content}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          padding: '10px 12px',
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 12,
          display: 'flex',
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: 'var(--color-label-tertiary)',
              animation: `assist-pulse 1.2s ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes assist-pulse {
            0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
            40% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    </div>
  )
}
